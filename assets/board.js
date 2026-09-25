// Full matchup board (board.html): season toggle + full week tabs + games for the selected week.
// Both seasons share one code path: every scheduled week gets a button, even
// if that week has no prediction log yet -- picking one just shows a
// "not generated yet" message instead of hiding it, matching how the
// internal dashboard treats an ungenerated week.
(function () {
  "use strict";

  function maxWeek(data) {
    if (data.season && data.season.scheduledWeeks) return data.season.scheduledWeeks;
    return Math.max.apply(null, data.weekly.map(function (w) { return w.week; }));
  }

  // The highest week with any game data (graded or pending). For a completed
  // season that's its last week; for the live season that's the current
  // week, since a week only appears once its prediction log exists.
  function defaultWeek(data) {
    if (!data.games.length) return 1;
    return Math.max.apply(null, data.games.map(function (g) { return g.week; }));
  }

  function statBar(label, pct) {
    var known = pct !== null && pct !== undefined;
    return (
      '<div class="wstat">' +
        '<div class="wstat-top"><span class="wstat-label">' + label + '</span>' +
          '<span class="wstat-val">' + (known ? pct.toFixed(1) + "%" : "—") + '</span></div>' +
        '<div class="wstat-bar"><div class="wstat-fill" style="width:' + (known ? pct : 0) + '%"></div></div>' +
      '</div>'
    );
  }

  function renderWeekStats(weekRecord, hasGames) {
    var strip = document.getElementById("week-stat-strip");
    if (!hasGames) { strip.innerHTML = ""; return; }
    if (!weekRecord) {
      strip.innerHTML =
        statBar("ML", null) + statBar("ATS", null) + statBar("TOT", null) +
        '<span class="wstat-pending">Not yet graded</span>';
      return;
    }
    strip.innerHTML =
      statBar("ML", weekRecord.ml.pct) + statBar("ATS", weekRecord.ats.pct) + statBar("TOT", weekRecord.tot.pct);
  }

  function renderWeek(data, week) {
    var games = data.games.filter(function (g) { return g.week === week; });
    var grid = document.getElementById("board-grid");
    if (!games.length) {
      grid.innerHTML = '<div class="glass" style="padding: 32px; text-align:center; color: var(--dim);">' +
        'Week ' + week + ' hasn’t been generated yet — check back closer to kickoff.</div>';
    } else {
      grid.innerHTML = window.AutopilotBoard.renderTable(games);
    }
    renderWeekStats(data.weekly.find(function (w) { return w.week === week; }), games.length > 0);
    document.querySelectorAll(".week-tabs button").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.dataset.week) === week);
    });
  }

  function calibrationTable(title, rows) {
    if (!rows || !rows.length) {
      return '<div class="glass calibration-col"><h3>' + title + '</h3><p class="parlay-empty">Not enough graded picks yet.</p></div>';
    }
    var body = rows.map(function (row) {
      var gap = Math.round((row.actualPct - row.predictedAvg) * 10) / 10;
      var gapColor = gap > 0 ? "var(--accent)" : gap < 0 ? "var(--accent-2)" : "var(--dim)";
      var gapStr = (gap > 0 ? "+" : "") + gap.toFixed(1) + "pt";
      var wins = Math.round(row.n * row.actualPct / 100);
      return (
        '<tr>' +
          '<td>' + row.range + '</td>' +
          '<td title="' + row.n + ' graded picks">' + wins + '–' + (row.n - wins) + '</td>' +
          '<td>' + row.predictedAvg.toFixed(1) + '%</td>' +
          '<td>' + row.actualPct.toFixed(1) + '%</td>' +
          '<td style="color:' + gapColor + '">' + gapStr + '</td>' +
        '</tr>'
      );
    }).join("");
    return (
      '<div class="glass calibration-col">' +
        '<h3>' + title + '</h3>' +
        '<table class="game-log-table">' +
          '<thead><tr><th>Confidence</th><th>Record</th><th>Predicted</th><th>Actual</th><th>Gap</th></tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function renderCalibration(data) {
    var container = document.getElementById("calibration-columns");
    var cal = data.calibration || { ml: [], ats: [], tot: [] };
    container.innerHTML =
      calibrationTable("Moneyline", cal.ml) +
      calibrationTable("Against The Spread", cal.ats) +
      calibrationTable("Totals", cal.tot);
    document.getElementById("calibration-note").textContent =
      "Every graded pick in " + data.season.year + ", grouped by how confident the model said it was. " +
      "“Actual” should roughly match “Predicted” if a range is well-calibrated.";
  }

  function showSeason(data, opts) {
    document.getElementById("board-title").textContent = opts.title;
    renderCalibration(data);

    var linesNote = document.getElementById("lines-note");
    var book = data.season && data.season.lineBook;
    if (book) {
      linesNote.textContent = "Lines are from " + book + ". A shift is the move from Tuesday's opening line to the last line before kickoff, both from the same book.";
      linesNote.hidden = false;
    } else {
      linesNote.textContent = "";
      linesNote.hidden = true;
    }

    var available = {};
    data.weekly.forEach(function (w) { available[w.week] = true; });
    var last = maxWeek(data);

    var params = new URLSearchParams(window.location.search);
    var initialWeek = Number(params.get("week")) || defaultWeek(data);
    if (initialWeek < 1 || initialWeek > last) initialWeek = defaultWeek(data);

    var tabs = document.getElementById("week-tabs");
    tabs.style.display = "";
    var html = "";
    for (var w = 1; w <= last; w++) {
      html += '<button data-week="' + w + '"' + (available[w] ? "" : ' class="unavailable"') + '>Week ' + w + '</button>';
    }
    tabs.innerHTML = html;
    tabs.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var week = Number(btn.dataset.week);
      var url = new URL(window.location.href);
      url.searchParams.set("week", week);
      window.history.replaceState({}, "", url);
      renderWeek(data, week);
    };

    renderWeek(data, initialWeek);
  }

  Promise.all([
    window.AutopilotData.loadSeason(),
    window.AutopilotData.loadSeason2026().catch(function () { return null; }),
  ]).then(function (results) {
    var data2025 = results[0];
    var data2026 = results[1];
    var toggle = document.getElementById("season-toggle");

    if (!data2026) {
      toggle.querySelector('[data-season="2026"]').style.display = "none";
    }

    function activate(season, btn) {
      toggle.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
      if (season === 2026 && data2026) {
        showSeason(data2026, { title: "2026 Season Matchup Board" });
      } else {
        showSeason(data2025, { title: "Full Matchup Board" });
      }
    }

    toggle.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      activate(Number(btn.dataset.season), btn);
    });

    // Open on the current season (2026) when it's available, since that's
    // the live one; fall back to 2025 otherwise.
    var initialSeason = data2026 ? 2026 : 2025;
    activate(initialSeason, toggle.querySelector('[data-season="' + initialSeason + '"]'));
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
