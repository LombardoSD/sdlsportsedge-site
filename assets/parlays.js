// Parlay Builder page: season toggle + full week tabs + three probability-ranked buckets.
// Every scheduled week gets a button, even ones with no parlays generated yet.
(function () {
  "use strict";

  var COLUMNS = [
    {
      key: "high_conf",
      title: "High-Probability Parlays",
      note: "2–10 leg parlays built from high-confidence ML, ATS, and Totals legs (no specific requirement on underdogs).",
    },
    {
      key: "with_dogs",
      title: "High Prob Parlays w/ Underdogs",
      note: "2–10 leg parlays using only ML and ATS legs (no Totals), with 1–3 underdogs mixed in.",
    },
    {
      key: "all_dogs",
      title: "All Underdogs Mania",
      note: "2–10 leg parlays made entirely of ML and ATS underdogs (no Totals).",
    },
  ];

  function legRow(leg) {
    return (
      '<div class="parlay-leg">' +
        '<span class="parlay-pick">' + leg.description + '</span>' +
        '<span class="parlay-matchup">' + leg.matchup + '</span>' +
        '<span class="parlay-prob">Prob: ' + Math.round(leg.prob * 100) + '%</span>' +
      '</div>'
    );
  }

  function parlayCard(p) {
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-meta">~Hit: ' + (p.hitProb * 100).toFixed(1) + '% · Underdogs: ' + p.dogCount + '</div>' +
        p.legs.map(legRow).join("") +
      '</div>'
    );
  }

  function renderColumn(col, bucket) {
    var counts = bucket ? Object.keys(bucket).map(Number).sort(function (a, b) { return a - b; }) : [];
    var html =
      '<div class="parlay-col glass">' +
        '<h3>' + col.title + '</h3>' +
        '<p class="parlay-col-note">' + col.note + '</p>';

    if (!counts.length) {
      html += '<p class="parlay-empty">No combinations available for this slate.</p></div>';
      return html;
    }

    html += '<div class="parlay-leg-selector">' + counts.map(function (n, i) {
      return '<button class="' + (i === 0 ? "active" : "") + '" data-count="' + n + '">' + n + '-Leg (' + bucket[n].length + ')</button>';
    }).join("") + '</div>';

    html += '<div class="parlay-list">' + bucket[counts[0]].map(parlayCard).join("") + '</div>';
    html += '</div>';
    return html;
  }

  function render(buckets) {
    var container = document.getElementById("parlay-columns");
    container.innerHTML = COLUMNS.map(function (col) { return renderColumn(col, buckets[col.key]); }).join("");

    container.querySelectorAll(".parlay-col").forEach(function (colEl, i) {
      var bucket = buckets[COLUMNS[i].key];
      var selector = colEl.querySelector(".parlay-leg-selector");
      if (!selector) return;
      selector.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        selector.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
        colEl.querySelector(".parlay-list").innerHTML = bucket[btn.dataset.count].map(parlayCard).join("");
      });
    });
  }

  function calibrationTable(title, rows) {
    if (!rows || !rows.length) {
      return '<div class="glass calibration-col"><h3>' + title + '</h3><p class="parlay-empty">Not enough resolved parlays yet.</p></div>';
    }
    var body = rows.map(function (row) {
      var gap = Math.round((row.actualPct - row.predictedAvg) * 10) / 10;
      var gapColor = gap > 0 ? "var(--accent)" : gap < 0 ? "var(--accent-2)" : "var(--dim)";
      var gapStr = (gap > 0 ? "+" : "") + gap.toFixed(1) + "pt";
      return (
        '<tr>' +
          '<td>' + row.range + '</td>' +
          '<td>' + row.n.toLocaleString() + '</td>' +
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
          '<thead><tr><th>Predicted Hit %</th><th>Sampled</th><th>Predicted</th><th>Actual</th><th>Gap</th></tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function sampledCount(rows) {
    if (!rows || !rows.length) return 0;
    return rows.reduce(function (sum, row) { return sum + (Number(row.n) || 0); }, 0);
  }

  function renderParlayCalibration(parlaysData, season) {
    var cal = (parlaysData && parlaysData.calibration) || {};
    document.getElementById("parlay-calibration-columns").innerHTML =
      calibrationTable("High-Probability Parlays", cal.high_conf) +
      calibrationTable("High Prob w/ Underdogs", cal.with_dogs) +
      calibrationTable("All Underdogs Mania", cal.all_dogs);
    var weekNums = Object.keys((parlaysData && parlaysData.weeks) || {}).map(Number);
    var span = weekNums.length ? "weeks " + Math.min.apply(null, weekNums) + "–" + Math.max.apply(null, weekNums) : "";
    var nHigh = sampledCount(cal.high_conf);
    var nDogs = sampledCount(cal.with_dogs);
    var nAllDogs = sampledCount(cal.all_dogs);
    var nTotal = nHigh + nDogs + nAllDogs;
    document.getElementById("parlay-calibration-note").textContent =
      "Sample of graded parlays for the " + season + " season" + (span ? ", " + span + (season === 2026 ? " so far" : "") : "") +
      ", not every combination. n is the number of parlays sampled in that predicted-hit band " +
      "(high-probability n=" + nHigh.toLocaleString() +
      ", with underdogs n=" + nDogs.toLocaleString() +
      ", all underdogs n=" + nAllDogs.toLocaleString() +
      ", " + nTotal.toLocaleString() + " sampled in total). " +
      "Each sampled parlay is graded as a whole (it wins only if every leg won).";
  }

  function renderUnavailable(week) {
    document.getElementById("parlay-columns").innerHTML =
      '<div class="glass" style="grid-column: 1 / -1; padding: 32px; text-align:center; color: var(--dim);">' +
      'Week ' + week + ' hasn’t been generated yet — check back closer to kickoff.</div>';
  }

  function maxWeek(seasonData) {
    if (seasonData.season && seasonData.season.scheduledWeeks) return seasonData.season.scheduledWeeks;
    return Math.max.apply(null, seasonData.weekly.map(function (w) { return w.week; }));
  }

  // The highest week with any game data (graded or pending). For a completed
  // season that's its last week; for the live season that's the current week.
  function defaultWeek(seasonData) {
    if (!seasonData.games.length) return 1;
    return Math.max.apply(null, seasonData.games.map(function (g) { return g.week; }));
  }

  function main() {
    var state = { season: 2025, seasonData: {}, parlays: {} };

    function showWeek(week) {
      document.getElementById("parlays-title").textContent = "Parlay Builder — " + state.season + " Week " + week;
      var buckets = state.parlays[state.season].weeks[week];
      if (!buckets) renderUnavailable(week);
      else render(buckets);
      document.querySelectorAll(".week-tabs button").forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.week) === week);
      });
    }

    function showSeason(season) {
      state.season = season;
      var seasonData = state.seasonData[season];
      renderParlayCalibration(state.parlays[season], season);
      var available = {};
      seasonData.weekly.forEach(function (w) { available[w.week] = true; });
      var last = maxWeek(seasonData);

      var tabs = document.getElementById("week-tabs");
      tabs.style.display = "";
      var html = "";
      for (var w = 1; w <= last; w++) {
        html += '<button data-week="' + w + '"' + (available[w] ? "" : ' class="unavailable"') + '>Week ' + w + '</button>';
      }
      tabs.innerHTML = html;
      tabs.onclick = function (e) {
        var btn = e.target.closest("button");
        if (btn) showWeek(Number(btn.dataset.week));
      };
      showWeek(defaultWeek(seasonData));
    }

    Promise.all([
      window.AutopilotData.loadSeason(),
      window.AutopilotData.loadParlays(2025),
      window.AutopilotData.loadSeason2026().catch(function () { return null; }),
      window.AutopilotData.loadParlays(2026).catch(function () { return null; }),
    ]).then(function (results) {
      state.seasonData[2025] = results[0];
      state.parlays[2025] = results[1];
      var has2026 = results[2] && results[3];
      if (has2026) {
        state.seasonData[2026] = results[2];
        state.parlays[2026] = results[3];
      }

      var toggle = document.getElementById("season-toggle");
      if (!has2026) toggle.querySelector('[data-season="2026"]').style.display = "none";

      toggle.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        toggle.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
        showSeason(Number(btn.dataset.season));
      });

      // Open on the current season (2026) when it's available, since that's
      // the live one; fall back to 2025 otherwise.
      var initialSeason = has2026 ? 2026 : 2025;
      toggle.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.season) === initialSeason);
      });
      showSeason(initialSeason);
    }).catch(function (err) { console.error("Failed to load parlay data", err); });
  }

  main();
})();
