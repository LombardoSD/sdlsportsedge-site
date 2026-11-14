// Overview page (index.html) for the NCAAW edition.
(function () {
  "use strict";

  // Public site is Ridge-only (directive 025).
  var MODEL = "ridge";
  var liveData = null;
  var retroData = null;
  var meta = null;

  function seasonRecord(block, key) {
    var r = (block && block[key]) || { wins: 0, losses: 0, pct: null };
    return r;
  }

  function setUnitVisible(pctId, visible) {
    var el = document.getElementById(pctId);
    if (!el || !el.parentElement) return;
    var unit = el.parentElement.querySelector(".unit");
    if (unit) unit.hidden = !visible;
  }

  function liveEmptyMessage() {
    return "No graded picks yet";
  }

  function latestSlateDate(data) {
    var dates = data && data.dates && data.dates.length
      ? data.dates.slice()
      : Array.from(new Set(((data && data.games) || []).map(function (g) { return g.date; }))).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }

  function renderHeroCards(season, source) {
    var emptyMsg =
      source === "live" ? liveEmptyMessage() : "No graded picks in retrospective replay";
    var hasGraded = season && (
      ((season.ml && (season.ml.wins || season.ml.losses)) ||
        (season.ats && (season.ats.wins || season.ats.losses)) ||
        (season.tot && (season.tot.wins || season.tot.losses)))
    );
    var tag = source === "live" ? "live" : "2025–26 retrospective replay";
    [
      ["stat-ml-pct", "stat-ml-sub", seasonRecord(season, "ml")],
      ["stat-ats-pct", "stat-ats-sub", seasonRecord(season, "ats")],
      ["stat-tot-pct", "stat-tot-sub", seasonRecord(season, "tot")],
    ].forEach(function (entry) {
      var rec = entry[2];
      var n = (rec.wins || 0) + (rec.losses || 0);
      var el = document.getElementById(entry[0]);
      var ungradedSide = entry[0] !== "stat-ml-pct" && (n === 0 || rec.pct == null);
      if (ungradedSide) {
        el.textContent = "Not graded yet";
        el.style.fontSize = "1.15rem";
        el.style.letterSpacing = "0";
        setUnitVisible(entry[0], false);
        document.getElementById(entry[1]).textContent = "Shown for reference where lines post";
        return;
      }
      el.style.fontSize = "";
      if (!hasGraded || n === 0 || rec.pct == null) {
        el.textContent = "—";
        setUnitVisible(entry[0], false);
        document.getElementById(entry[1]).textContent = emptyMsg;
        return;
      }
      setUnitVisible(entry[0], true);
      el.textContent = (Math.round(rec.pct * 10) / 10).toFixed(1);
      var extra = rec.push ? ", " + rec.push + " push" : "";
      document.getElementById(entry[1]).textContent =
        (rec.wins || 0) + "–" + (rec.losses || 0) + extra + " · " + tag;
    });
  }

  function renderBoardPreview(data, source) {
    var model = MODEL;
    var date = latestSlateDate(data);
    var games = date
      ? window.AutopilotFormat.sortBoardGames(
          (data.games || []).filter(function (g) { return g.date === date; }),
          true
        ).slice(0, 8)
      : [];
    var acad = data.academicLabel || (source === "live" ? "2026–27" : "2025–26");
    var kind = source === "live" ? "live sealed ledger" : "retrospective";
    document.getElementById("board-tag").textContent = date
      ? acad + " " + kind + " · " + date + " ET · " + model
      : acad + " " + kind;
    document.getElementById("board-grid").innerHTML = window.AutopilotBoard.renderTable(games, model);
  }

  function renderTeamsPreview(data) {
    var teams = Object.values(data.teams || {})
      .filter(function (t) { return t.modelAccuracy && t.modelAccuracy.ml != null; })
      .sort(function (a, b) { return b.modelAccuracy.ml - a.modelAccuracy.ml; })
      .slice(0, 8);
    document.getElementById("teams-grid").innerHTML = teams.map(function (t) {
      return (
        '<a class="team-tile glass" href="./team.html?team=' + encodeURIComponent(t.id) + '" style="border-top:2px solid #2f6fed">' +
          '<div class="abbr">' + (t.location || t.abbr) + "</div>" +
          '<div class="acc">' + t.modelAccuracy.ml + "% ML</div>" +
        "</a>"
      );
    }).join("");
  }

  function renderChart(data, source) {
    var model = MODEL;
    var acad = data.academicLabel || (source === "live" ? "2026–27" : "2025–26");
    document.getElementById("performance-note").textContent = source === "live"
      ? ("Straight-up (" + model + ") accuracy by ET game day, " + acad +
        " season · live sealed ledger.")
      : ("Straight-up (" + model + ") accuracy by ET game day, " + acad +
        " retrospective replay. Not live skill.");
    var byDate = {};
    (data.games || []).forEach(function (g) {
      var pick = ((g.arms || {})[model] || {}).ml;
      if (!pick || (pick.outcome !== "win" && pick.outcome !== "loss")) return;
      if (!byDate[g.date]) byDate[g.date] = { date: g.date, wins: 0, losses: 0 };
      if (pick.outcome === "win") byDate[g.date].wins += 1;
      else byDate[g.date].losses += 1;
    });
    var daily = Object.keys(byDate).sort().map(function (d) {
      var row = byDate[d];
      var n = row.wins + row.losses;
      row.pct = n ? Math.round((1000 * row.wins) / n) / 10 : null;
      return row;
    }).filter(function (d) { return d.pct != null; });
    var weeks = daily.slice(-40);
    var svg = document.getElementById("chart-svg");
    var labelsEl = document.getElementById("chart-labels");
    if (!weeks.length) {
      svg.innerHTML = "";
      labelsEl.innerHTML = "";
      return;
    }
    var W = 1000, H = 220, padTop = 10, padBottom = 6;
    var n = weeks.length;
    var gap = 4;
    var barW = (W - gap * (n - 1)) / n;
    var season = data.season;
    var avg = (season.ml && season.ml.pct) || 50;
    function yFor(pct) { return padTop + (H - padTop - padBottom) * (1 - pct / 100); }
    var bars = weeks.map(function (w, i) {
      var x = i * (barW + gap);
      var pct = w.pct || 0;
      var cls = "bar-rect" + (pct >= avg ? " above" : "");
      return (
        '<rect class="' + cls + '" data-i="' + i + '" x="' + x.toFixed(1) + '" y="' + (H - padBottom) + '" ' +
          'width="' + barW.toFixed(1) + '" height="0" rx="2">' +
          "<title>" + w.date + ": " + w.wins + "–" + w.losses + " (" + pct + "%)</title></rect>"
      );
    }).join("");
    var avgY = yFor(avg);
    svg.innerHTML = bars +
      '<line class="avg-line" x1="0" y1="' + avgY.toFixed(1) + '" x2="' + W + '" y2="' + avgY.toFixed(1) + '"></line>';
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(svg.querySelectorAll("rect.bar-rect"), function (r, i) {
        var pct = weeks[i].pct || 0;
        var y = yFor(pct);
        r.setAttribute("y", y.toFixed(1));
        r.setAttribute("height", Math.max(0, H - padBottom - y).toFixed(1));
      });
    });
    labelsEl.innerHTML = weeks.map(function (w, i) {
      return i % 5 === 0 ? "<span>" + w.date.slice(5) + "</span>" : "<span></span>";
    }).join("");
  }

  function refresh() {
    if (!liveData || !retroData || !meta) return;
    var model = MODEL;
    var defaultYear = window.AutopilotData.defaultSeasonYear(meta);
    var useLive = defaultYear === window.AutopilotData.liveYear(meta);
    var hero = useLive ? liveData : retroData;
    var source = useLive ? "live" : "retrospective";
    renderHeroCards(hero.season, source);
    if (useLive) {
      var liveAcad = (liveData && liveData.academicLabel) || "2026–27";
      document.getElementById("stat-caption").textContent =
        liveAcad + " season · " + model + " · live sealed ledger";
    } else {
      var acad = (retroData && retroData.academicLabel) || "2025–26";
      document.getElementById("stat-caption").textContent =
        acad + " retrospective replay · " + model;
    }
    var body = useLive ? liveData : retroData;
    var bodySource = useLive ? "live" : "retrospective";
    renderBoardPreview(body, bodySource);
    renderChart(body, bodySource);
    renderTeamsPreview(body);
    var teamsNote = document.querySelector("#teams-preview .section-note");
    if (teamsNote) {
      var bodyAcad = (body && body.academicLabel) || (useLive ? "2026–27" : "2025–26");
      teamsNote.textContent = useLive
        ? bodyAcad + " live sealed ledger · top teams by moneyline accuracy"
        : bodyAcad + " retrospective replay · top teams by moneyline accuracy";
    }
    if (useLive) {
      var more = document.querySelector(".research-notice-more");
      if (more) more.textContent = "Live sealed ledger. These figures are not a claim of edge.";
    }
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadLiveSeason(),
    window.AutopilotData.loadRetrospectiveSeason(),
  ]).then(function (results) {
    meta = results[0];
    liveData = results[1];
    retroData = results[2];
    refresh();
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
