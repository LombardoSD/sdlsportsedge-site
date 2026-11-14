// Overview page (index.html) for NCAAB edition.
(function () {
  "use strict";

  // Public site is Ridge-only (directive 025).
  var MODEL = "ridge";
  // Overview Teams (live): prefer ≥5 graded ML decisions; if fewer than 8 teams
  // clear that floor (early season), fall back to any team with ≥1 graded ML.
  var LIVE_TEAMS_MIN_ML_GAMES = 5;
  var LIVE_TEAMS_PREVIEW_N = 8;
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
    var start = (liveData && liveData.liveLedgerStarts) ||
      (meta && meta.liveLedgerStarts) ||
      "2026-11-01";
    var today = new Date().toISOString().slice(0, 10);
    if (today < start) {
      return "No graded picks yet";
    }
    return "No graded picks yet";
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

  function gradedMlCount(team) {
    var games = (team && team.games) || [];
    var n = 0;
    for (var i = 0; i < games.length; i++) {
      var o = games[i].mlOutcome;
      if (o === "win" || o === "loss") n += 1;
    }
    return n;
  }

  function renderBoardPreview(data, source) {
    var model = MODEL;
    var dates = data.dates || [];
    var date = dates.length ? dates[dates.length - 1] : null;
    var games = date
      ? window.AutopilotFormat.sortBoardGames(
          data.games.filter(function (g) { return g.date === date; }),
          false
        ).slice(0, 8)
      : [];
    var acad = data.academicLabel || (source === "live" ? "2026–27" : "2025–26");
    var kind = source === "live" ? "season" : "retrospective";
    document.getElementById("board-tag").textContent = date
      ? acad + " " + kind + " · " + date + " ET · " + model
      : acad + " " + kind;
    document.getElementById("board-grid").innerHTML =
      window.AutopilotBoard.renderTable(games, model);
  }

  function renderTeamsPreview(data, source) {
    var eligible = Object.values(data.teams || {}).filter(function (t) {
      return t.modelAccuracy && t.modelAccuracy.ml != null;
    });
    var teams;
    var minApplied = 1;
    if (source === "live") {
      var preferred = eligible.filter(function (t) {
        return gradedMlCount(t) >= LIVE_TEAMS_MIN_ML_GAMES;
      });
      if (preferred.length >= LIVE_TEAMS_PREVIEW_N) {
        teams = preferred;
        minApplied = LIVE_TEAMS_MIN_ML_GAMES;
      } else {
        teams = eligible;
        minApplied = 1;
      }
    } else {
      teams = eligible;
    }
    teams = teams
      .sort(function (a, b) { return b.modelAccuracy.ml - a.modelAccuracy.ml; })
      .slice(0, LIVE_TEAMS_PREVIEW_N);
    document.getElementById("teams-grid").innerHTML = teams.map(function (t) {
      var nGraded = gradedMlCount(t);
      var few = source === "live" && nGraded < LIVE_TEAMS_MIN_ML_GAMES;
      return (
        '<a class="team-tile glass" href="./team.html?team=' + encodeURIComponent(t.id) + '" style="border-top:2px solid #2f6fed">' +
          '<div class="abbr">' + (t.location || t.abbr) + "</div>" +
          '<div class="acc">' + t.modelAccuracy.ml + "% ML" +
            (few ? " · " + nGraded + " graded" : "") +
          "</div>" +
        "</a>"
      );
    }).join("");
    return minApplied;
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
    var body = useLive ? liveData : retroData;
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
    renderBoardPreview(body, source);
    renderChart(body, source);
    var teamsMin = renderTeamsPreview(body, source);
    var teamsNote = document.querySelector("#teams-preview .section-note");
    if (teamsNote) {
      if (useLive) {
        var liveLabel = (liveData && liveData.academicLabel) || "2026–27";
        var fewTeams = teamsMin < LIVE_TEAMS_MIN_ML_GAMES;
        teamsNote.textContent =
          liveLabel + " season · top teams by moneyline accuracy (min " +
          teamsMin + " graded ML)" +
          (fewTeams
            ? ". Teams with fewer than " + LIVE_TEAMS_MIN_ML_GAMES + " graded games are marked"
            : "");
      } else if (retroData && retroData.academicLabel) {
        teamsNote.textContent =
          retroData.academicLabel + " retrospective replay · top teams by moneyline accuracy";
      }
    }
    var notice = document.querySelector(".research-notice");
    if (notice && !useLive) {
      notice.innerHTML =
        "<strong>Research notice</strong> Hero cards show the " +
        ((retroData && retroData.academicLabel) || "2025–26") +
        " retrospective replay." +
        '<span class="research-notice-more">These figures are not a claim of edge.</span>';
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
