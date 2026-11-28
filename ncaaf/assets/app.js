// NCAAF overview — week slate, ML + ATS-lean records, TOT blank.
(function () {
  "use strict";

  var liveData = null;
  var retroData = null;
  var meta = null;
  // Live top teams: prefer 5 graded ML games. Early season falls back to 1.
  var LIVE_TEAMS_MIN_ML_GAMES = 5;
  var LIVE_TEAMS_PREVIEW_N = 8;

  function seasonRecord(block, key) {
    return (block && block[key]) || { wins: 0, losses: 0, push: 0, pct: null };
  }

  function setUnitVisible(pctId, visible) {
    var el = document.getElementById(pctId);
    if (!el || !el.parentElement) return;
    var unit = el.parentElement.querySelector(".unit");
    if (unit) unit.hidden = !visible;
  }

  function renderHeroCards(season) {
    [
      ["stat-ml-pct", "stat-ml-sub", seasonRecord(season, "ml")],
      ["stat-ats-pct", "stat-ats-sub", seasonRecord(season, "ats")],
      ["stat-tot-pct", "stat-tot-sub", seasonRecord(season, "tot")],
    ].forEach(function (entry) {
      var rec = entry[2];
      var el = document.getElementById(entry[0]);
      if (!el) return;
      var n = (rec.wins || 0) + (rec.losses || 0);
      if (!n || rec.pct == null) {
        el.textContent = "—";
        setUnitVisible(entry[0], false);
        document.getElementById(entry[1]).textContent = "—";
        return;
      }
      setUnitVisible(entry[0], true);
      el.textContent = (Math.round(rec.pct * 10) / 10).toFixed(1);
      var extra = rec.tie ? ", " + rec.tie + " tie" : rec.push ? ", " + rec.push + " push" : "";
      document.getElementById(entry[1]).textContent =
        (rec.wins || 0) + "\u2013" + (rec.losses || 0) + extra;
    });
  }

  function renderStatCaptions(liveSeason, retroSeason) {
    var cap = document.getElementById("stat-caption");
    var retroEl = document.getElementById("stat-caption-retro");
    if (!cap) return;
    function fmt(block, key) {
      var rec = (block && block[key]) || {};
      return rec.pct == null ? "—" : Number(rec.pct).toFixed(1) + "%";
    }
    if (liveSeason) {
      cap.textContent =
        liveSeason.year +
        " · tracked live · " +
        (liveSeason.gamesGraded || 0) +
        " graded games so far (small sample)";
      if (retroEl && retroSeason) {
        retroEl.textContent =
          retroSeason.year +
          " · retrospective replay, not a live record · each week uses only earlier games · Moneyline " +
          fmt(retroSeason, "ml") +
          " · Spread " +
          fmt(retroSeason, "ats") +
          " · Totals " +
          fmt(retroSeason, "tot");
      }
      return;
    }
    if (retroSeason) {
      cap.textContent =
        retroSeason.year +
        " · retrospective replay, not a live record · " +
        (retroSeason.gamesGraded || 0) +
        " games";
    }
    if (retroEl) retroEl.textContent = "";
  }

  function currentWeek(data) {
    if (!data.games || !data.games.length) return 1;
    return Math.max.apply(
      null,
      data.games.map(function (g) {
        return g.week;
      })
    );
  }

  function sortSlate(games) {
    var byDay = {};
    var order = [];
    (games || []).forEach(function (g) {
      var d = (g && g.date) || "unknown";
      if (!byDay[d]) {
        byDay[d] = [];
        order.push(d);
      }
      byDay[d].push(g);
    });
    order.sort();
    var sorted = [];
    order.forEach(function (d) {
      var prepared = window.AutopilotBoard.gamesForBoardSort(byDay[d]);
      var day = window.AutopilotFormat.sortBoardGames(prepared, false);
      for (var i = 0; i < day.length; i++) sorted.push(day[i]);
    });
    return sorted;
  }

  function renderBoardPreview(data, isLive) {
    var week = currentWeek(data);
    var games = sortSlate(
      (data.games || []).filter(function (g) {
        return g.week === week;
      })
    ).slice(0, 8);
    var acad = (data.season && data.season.academicLabel) || String((data.season && data.season.year) || "");
    document.getElementById("board-tag").textContent = isLive
      ? (data.season && data.season.year ? data.season.year : acad) +
        " Season · Week " +
        week +
        " · Current Week"
      : "Week " + week + " · Most Recent Results";
    document.getElementById("board-grid").innerHTML = window.AutopilotBoard.renderTable(games);
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
      .sort(function (a, b) {
        return b.modelAccuracy.ml - a.modelAccuracy.ml;
      })
      .slice(0, LIVE_TEAMS_PREVIEW_N);
    document.getElementById("teams-grid").innerHTML = teams
      .map(function (t) {
        var id = t.id || t.abbr;
        var nGraded = gradedMlCount(t);
        var few = source === "live" && nGraded < LIVE_TEAMS_MIN_ML_GAMES;
        return (
          '<a class="team-tile glass" href="./team.html?team=' +
          encodeURIComponent(id) +
          '" style="border-top:2px solid var(--accent)">' +
          '<div class="abbr">' +
          (t.location || t.abbr || id) +
          "</div>" +
          '<div class="acc">' +
          t.modelAccuracy.ml +
          "% ML" +
          (few ? " · " + nGraded + " graded" : "") +
          "</div>" +
          "</a>"
        );
      })
      .join("");
    return { minApplied: minApplied, shown: teams.length };
  }

  function renderChart(data, source) {
    var acad = (data.season && data.season.academicLabel) || "";
    var note = document.getElementById("performance-note");
    if (note) {
      note.textContent =
        "Straight-up accuracy by week, " +
        acad +
        " season. Every graded game, no exclusions.";
    }
    var byWeek = {};
    (data.weekly || []).forEach(function (w) {
      byWeek[w.week] = w;
    });
    var total = (data.season && data.season.scheduledWeeks) || 15;
    var weeks = [];
    for (var k = 1; k <= total; k++) weeks.push(k);

    var svg = document.getElementById("chart-svg");
    var labelsEl = document.getElementById("chart-labels");
    if (!svg || !labelsEl) return;
    var W = 1000,
      H = 220,
      padTop = 10,
      padBottom = 6;
    var n = weeks.length;
    var gap = 6;
    var barW = (W - gap * (n - 1)) / n;
    var avg = (data.season && data.season.ml && data.season.ml.pct) || 0;
    var thinN = (meta && meta.smallSampleN) || 20;

    function yFor(pct) {
      return padTop + (H - padTop - padBottom) * (1 - pct / 100);
    }

    var bars = weeks
      .map(function (wk, i) {
        var x = i * (barW + gap);
        var w = byWeek[wk];
        if (!w || w.ml.pct == null) {
          return (
            '<rect class="bar-rect pending" x="' +
            x.toFixed(1) +
            '" y="' +
            (H - padBottom - 3) +
            '" width="' +
            barW.toFixed(1) +
            '" height="3" rx="1.5"><title>Week ' +
            wk +
            ": not graded</title></rect>"
          );
        }
        var pct = w.ml.pct || 0;
        var nGraded = (w.ml.wins || 0) + (w.ml.losses || 0);
        var thin = nGraded < thinN;
        var cls = "bar-rect" + (pct >= avg ? " above" : "") + (thin ? " partial" : "");
        return (
          '<rect class="' +
          cls +
          '" data-week="' +
          wk +
          '" data-pct="' +
          pct +
          '" x="' +
          x.toFixed(1) +
          '" y="' +
          (H - padBottom) +
          '" width="' +
          barW.toFixed(1) +
          '" height="0" rx="2" opacity="' +
          (thin ? "0.45" : "1") +
          '">' +
          "<title>Week " +
          w.week +
          ": " +
          w.ml.wins +
          "–" +
          w.ml.losses +
          " (" +
          pct +
          "%)</title></rect>"
        );
      })
      .join("");

    var avgY = yFor(avg || 50);
    var avgLine =
      '<line class="avg-line" x1="0" y1="' +
      avgY.toFixed(1) +
      '" x2="' +
      W +
      '" y2="' +
      avgY.toFixed(1) +
      '"></line>' +
      '<text class="avg-label" x="' +
      (W - 2) +
      '" y="' +
      (avgY - 6).toFixed(1) +
      '" text-anchor="end">SEASON AVG ' +
      (avg ? avg.toFixed(1) : "—") +
      "%</text>";

    svg.innerHTML = bars + avgLine;
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(svg.querySelectorAll("rect.bar-rect[data-week]"), function (r, i) {
        var pct = parseFloat(r.getAttribute("data-pct") || "0");
        var y = yFor(pct);
        var h = H - padBottom - y;
        r.style.transition =
          "y 0.7s cubic-bezier(0.22,1,0.36,1) " +
          i * 16 +
          "ms, height 0.7s cubic-bezier(0.22,1,0.36,1) " +
          i * 16 +
          "ms";
        r.setAttribute("y", y.toFixed(1));
        r.setAttribute("height", Math.max(0, h).toFixed(1));
      });
    });
    labelsEl.innerHTML = weeks
      .map(function (wk) {
        return "<span>" + wk + "</span>";
      })
      .join("");
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      retroData = results[1];
      liveData = results[2];
      var defaultYear = window.AutopilotData.defaultSeasonYear(meta);
      var liveY = window.AutopilotData.liveYear(meta);
      var gradedLive = defaultYear === liveY;
      var sealedLive = window.AutopilotData.liveHasSealedPicks(meta);
      var hero = gradedLive ? liveData : retroData;
      var body = sealedLive ? liveData : retroData;
      var bodySource = sealedLive ? "live" : "retro";
      renderHeroCards(hero && hero.season);
      renderStatCaptions(
        gradedLive ? liveData && liveData.season : null,
        retroData && retroData.season
      );
      renderBoardPreview(body, sealedLive);
      renderChart(body, bodySource);
      var teamsInfo = renderTeamsPreview(body, bodySource);
      var teamsNote = document.querySelector("#teams-preview .section-note");
      if (teamsNote && body && body.season) {
        var acad = body.season.academicLabel || "";
        if (bodySource === "live") {
          if (!teamsInfo.shown) {
            teamsNote.textContent = acad + " season · no graded moneyline games yet";
          } else {
            var fewTeams = teamsInfo.minApplied < LIVE_TEAMS_MIN_ML_GAMES;
            teamsNote.textContent =
              acad +
              " season · top teams by moneyline accuracy (min " +
              teamsInfo.minApplied +
              " graded ML)" +
              (fewTeams
                ? ". Teams with fewer than " +
                  LIVE_TEAMS_MIN_ML_GAMES +
                  " graded games are marked"
                : "");
          }
        } else {
          teamsNote.textContent =
            acad + " retrospective replay · top teams by moneyline accuracy";
        }
      }
    })
    .catch(function (err) {
      console.error("Failed to load season data", err);
    });
})();
