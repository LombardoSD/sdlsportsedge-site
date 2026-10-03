// Parlay Builder page: season toggle + full week tabs + three probability-ranked buckets.
// Every scheduled week gets a button, even ones with no parlays generated yet.
(function () {
  "use strict";

  function poolNote(span, kind) {
    if (kind === "high") {
      return span + " leg parlays where every leg is priced at 60% or higher. This is a leg filter, not a claim that the parlay will hit.";
    }
    if (kind === "dogs") {
      return span + " leg parlays from ML and ATS legs only, with 1-3 underdogs mixed in.";
    }
    return span + " leg parlays made entirely of ML and ATS underdogs (no Totals).";
  }

  function maxListedLegs(bucket) {
    if (!bucket) return 0;
    var nums = Object.keys(bucket).map(Number).filter(function (n) { return isFinite(n) && n >= 2; });
    if (!nums.length) return 0;
    return Math.max.apply(null, nums);
  }

  function columnsFor(season, buckets) {
    var frozenSpan = season === 2025 || maxListedLegs(buckets && buckets.high_conf) > 4 || maxListedLegs(buckets && buckets.with_dogs) > 4;
    var span = frozenSpan ? "2-10" : "2-4";
    var cols = [
      { key: "high_conf", title: "High-confidence legs", note: poolNote(span, "high"), kind: "cards" },
      { key: "with_dogs", title: "With underdogs", note: poolNote(span, "dogs"), kind: "cards" },
    ];
    if (season !== 2025 && buckets && buckets.jackpot) {
      cols.push({
        key: "jackpot",
        title: "Jackpot",
        note: "One ticket a week: six legs, one per game, all from Saturday, Sunday and Monday games. Two underdogs priced near even from games that kick off before Sunday 2 PM ET, plus four strong favorites, including a Sunday or Monday night favorite when one is available. The underdogs are chosen by price and by where the model rates them above the market, a comparison that has not been shown to predict upsets. This is a long shot, and most weeks nothing hits.",
        kind: "jackpot",
      });
    } else {
      cols.push({
        key: "all_dogs",
        title: "All underdogs",
        note: poolNote(season === 2025 || frozenSpan ? "2-10" : span, "all"),
        kind: "cards",
      });
    }
    return cols;
  }

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
    var hit = (p.hitProb * 100).toFixed(1);
    var flag = p.hitProb > 0.40 ? " · runs high above 40%" : "";
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-meta">~Hit: ' + hit + '%' + flag + ' · Underdogs: ' + p.dogCount + '</div>' +
        p.legs.map(legRow).join("") +
      '</div>'
    );
  }

  function pct1(value) {
    return (Number(value) * 100).toFixed(1) + "%";
  }

  function jackpotLeg(leg) {
    if (leg.role === "dog") {
      return (
        '<div class="parlay-leg parlay-leg-dog">' +
          '<span class="parlay-dog-tag">UNDERDOG</span>' +
          '<span class="parlay-pick">' + leg.description + '</span>' +
          '<span class="parlay-matchup">' + leg.matchup + '</span>' +
          '<span class="parlay-prob">Model ' + pct1(leg.modelProb) + ' · Market ' + pct1(leg.marketProb) + '</span>' +
          (leg.boardPick ? '<span class="parlay-board-pick">Board pick: ' + leg.boardPick + '</span>' : '') +
        '</div>'
      );
    }
    return legRow(leg);
  }

  function jackpotCard(ticket) {
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-meta">6-leg Jackpot · ' + ticket.historical + '</div>' +
        ticket.legs.map(jackpotLeg).join("") +
      '</div>'
    );
  }

  function jackpotRecord(parlaysData) {
    var wins = 0;
    var losses = 0;
    var weeks = (parlaysData && parlaysData.weeks) || {};
    Object.keys(weeks).forEach(function (week) {
      var bucket = weeks[week] && weeks[week].jackpot;
      if (!bucket) return;
      Object.keys(bucket).forEach(function (key) {
        var list = bucket[key];
        if (!Array.isArray(list)) return;
        list.forEach(function (ticket) {
          if (ticket.outcome === "win") wins += 1;
          else if (ticket.outcome === "loss") losses += 1;
        });
      });
    });
    return wins + "–" + losses;
  }

  function renderJackpotColumn(col, bucket, parlaysData) {
    var html =
      '<div class="parlay-col glass">' +
        '<h3>' + col.title + '</h3>' +
        '<p class="parlay-col-note">' + col.note + '</p>' +
        '<p class="parlay-tally">2026: ' + jackpotRecord(parlaysData) + '</p>';
    var list = bucket && bucket["6"];
    var cards = "";
    if (list && list.length) {
      cards = list.map(jackpotCard).join("");
    } else {
      var reason = bucket && bucket.skipped;
      cards = '<p class="parlay-empty">' + (typeof reason === "string" ? reason : "No 6-leg ticket this week.") + '</p>';
    }
    html += '<div class="parlay-list">' + cards + '</div></div>';
    return html;
  }

  function renderColumn(col, bucket) {
    var counts = bucket ? Object.keys(bucket).map(Number).filter(function (n) { return isFinite(n); }).sort(function (a, b) { return a - b; }) : [];
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

  function ticketResult(outcome) {
    if (outcome === "win") return "Win";
    if (outcome === "loss") return "Loss";
    if (outcome === "push") return "Push";
    if (outcome === "ungraded") return "Ungraded";
    return "Pending";
  }

  function renderRoundRobin(season, buckets) {
    var host = document.getElementById("parlay-round-robin");
    if (!host) return;
    var bucket = season === 2026 && buckets ? buckets.roundRobin : null;
    if (!bucket) {
      host.innerHTML = "";
      return;
    }
    var body = "";
    if (bucket.skipped) {
      body = '<p class="parlay-empty">' + bucket.skipped + '</p>';
    } else {
      var legs = (bucket.legs || []).map(function (leg) {
        return (
          '<div class="parlay-leg">' +
            '<span class="parlay-pick">' + leg.description + '</span>' +
            '<span class="parlay-matchup">' + leg.matchup + '</span>' +
            '<span class="parlay-prob">Prob: ' + Math.round(leg.prob * 100) + '%</span>' +
          '</div>'
        );
      }).join("");
      var tickets = (bucket.tickets || []).map(function (ticket) {
        var shown = (ticket.legs || []).map(function (leg) { return leg.description; }).join(" · ");
        return (
          '<div class="parlay-card parlay-rr-ticket">' +
            '<div class="parlay-meta">' + shown + '</div>' +
            '<div class="parlay-rr-result">' + ticketResult(ticket.outcome) + '</div>' +
          '</div>'
        );
      }).join("");
      var ticketCount = (bucket.tickets || []).length;
      var tallyText = bucket.tally || "pending";
      var ticketsOpen = window.matchMedia("(min-width: 640px)").matches;
      body = '<div class="parlay-card parlay-rr-legs">' + legs + '</div>' +
        '<details class="parlay-rr-details"' + (ticketsOpen ? " open" : "") + '>' +
          '<summary>' +
            '<span class="parlay-rr-summary-label">' + ticketCount + ' tickets</span>' +
            '<span class="parlay-rr-summary-tally">' + tallyText + '</span>' +
          '</summary>' +
          '<div class="parlay-rr-tickets">' + tickets + '</div>' +
        '</details>';
    }
    host.innerHTML =
      '<section class="parlay-round-robin parlay-col glass">' +
        '<h3>Round Robin (6 legs by 3s)</h3>' +
        '<p class="parlay-col-note">Our six strongest legs of the week, bet as all twenty possible three-leg parlays. It does not change the expected return versus betting those parlays separately; it spreads the outcome so one miss does not erase everything. These six legs also appear in the high-confidence parlays above.</p>' +
        '<p class="parlay-meta-line">' + (bucket.historical || "") + '</p>' +
        body +
      '</section>';
  }

  function render(buckets, season, parlaysData) {
    var columns = columnsFor(season, buckets);
    var container = document.getElementById("parlay-columns");
    container.innerHTML = columns.map(function (col) {
      if (col.kind === "jackpot") return renderJackpotColumn(col, buckets[col.key], parlaysData);
      return renderColumn(col, buckets[col.key]);
    }).join("");
    renderRoundRobin(season, buckets);

    container.querySelectorAll(".parlay-col").forEach(function (colEl, i) {
      var bucket = buckets[columns[i].key];
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

  function calibrationTable(title, rows, variant) {
    var byLegs = variant === "by-legs";
    var colClass = "glass calibration-col" + (byLegs ? " calibration-by-legs" : "");
    if (!rows || !rows.length) {
      return '<div class="' + colClass + '"><h3>' + title + '</h3><p class="parlay-empty">Not enough resolved parlays yet.</p></div>';
    }
    var body = rows.map(function (row) {
      var gap = Math.round((row.actualPct - row.predictedAvg) * 10) / 10;
      var gapColor = gap > 0 ? "var(--accent)" : gap < 0 ? "var(--accent-2)" : "var(--dim)";
      var gapStr = (gap > 0 ? "+" : "") + gap.toFixed(1) + "pt";
      var wins = row.wins != null ? row.wins : Math.round(row.n * row.actualPct / 100);
      var losses = row.losses != null ? row.losses : row.n - wins;
      var thin = byLegs && Number(row.n) < 20;
      var tip = thin ? "Small sample: " + row.n + " parlays" : row.n + " sampled parlays";
      return (
        '<tr' + (thin ? ' class="calibration-thin"' : '') + ' title="' + tip + '">' +
          '<td>' + row.range + '</td>' +
          '<td>' + wins + '–' + losses + '</td>' +
          '<td>' + row.predictedAvg.toFixed(1) + '%</td>' +
          '<td>' + row.actualPct.toFixed(1) + '%</td>' +
          '<td style="color:' + gapColor + '">' + gapStr + '</td>' +
        '</tr>'
      );
    }).join("");
    return (
      '<div class="' + colClass + '">' +
        '<h3>' + title + '</h3>' +
        '<table class="game-log-table">' +
          '<thead><tr><th>Predicted Hit %</th><th>Record</th><th>Predicted</th><th>Actual</th><th>Gap</th></tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function sampledCount(rows) {
    if (!rows || !rows.length) return 0;
    return rows.reduce(function (sum, row) { return sum + (Number(row.n) || 0); }, 0);
  }

  function legTables(title, rowsByCount) {
    return ["2", "3", "4"].map(function (count) {
      return calibrationTable(title + ": " + count + "-leg parlays", rowsByCount[count], "by-legs");
    }).join("");
  }

  function legCountNote(rowsByCount) {
    return " (2-leg n=" + sampledCount(rowsByCount["2"]).toLocaleString() +
      ", 3-leg n=" + sampledCount(rowsByCount["3"]).toLocaleString() +
      ", 4-leg n=" + sampledCount(rowsByCount["4"]).toLocaleString() + ")";
  }

  function renderParlayCalibration(parlaysData, season) {
    var cal = (parlaysData && parlaysData.calibration) || {};
    var columns = document.getElementById("parlay-calibration-columns");
    var highByLegs = season !== 2025 && cal.high_conf_by_legs;
    var dogsByLegs = season !== 2025 && cal.with_dogs_by_legs;
    if (highByLegs) {
      var dogsBlock = dogsByLegs
        ? '<div class="calibration-columns calibration-follow">' + legTables("With underdogs", dogsByLegs) + "</div>"
        : '<div class="calibration-columns two calibration-follow">' +
          calibrationTable("With underdogs", cal.with_dogs) + "</div>";
      columns.className = "parlay-calibration-stack";
      columns.innerHTML =
        '<div class="calibration-columns">' + legTables("High-confidence legs", highByLegs) + "</div>" +
        dogsBlock;
    } else {
      var tables = [
        calibrationTable("High-confidence legs", cal.high_conf),
        calibrationTable("With underdogs", cal.with_dogs),
      ];
      if (season === 2025) tables.push(calibrationTable("All underdogs", cal.all_dogs));
      columns.className = "calibration-columns" + (season !== 2025 ? " two" : "");
      columns.innerHTML = tables.join("");
    }
    var weekNums = Object.keys((parlaysData && parlaysData.weeks) || {}).map(Number);
    var span = weekNums.length ? "weeks " + Math.min.apply(null, weekNums) + "–" + Math.max.apply(null, weekNums) : "";
    var nHigh = sampledCount(cal.high_conf);
    var nDogs = sampledCount(cal.with_dogs);
    var nAllDogs = sampledCount(cal.all_dogs);
    var nTotal = season === 2025 ? nHigh + nDogs + nAllDogs : nHigh + nDogs;
    var counts = "high-confidence legs n=" + nHigh.toLocaleString();
    if (highByLegs) counts += legCountNote(highByLegs);
    counts += ", with underdogs n=" + nDogs.toLocaleString();
    if (dogsByLegs) counts += legCountNote(dogsByLegs);
    if (season === 2025) counts += ", all underdogs n=" + nAllDogs.toLocaleString();
    var coverage = highByLegs && dogsByLegs
      ? "The 2025 tables stay pooled across 2-10 legs. The 2026 high-confidence and with-underdogs tables are each split into 2-leg, 3-leg and 4-leg parlays."
      : highByLegs
      ? "The 2025 tables cover 2-10 legs. The 2026 high-confidence tables are split into 2-leg, 3-leg and 4-leg parlays; with underdogs stays pooled."
      : "The 2025 tables cover 2-10 legs and the 2026 tables cover 2-4 legs.";
    document.getElementById("parlay-calibration-note").textContent =
      "Sample of graded parlays for the " + season + " season" + (span ? ", " + span + (season === 2026 ? " so far" : "") : "") +
      ", not every combination. n is the number of parlays sampled in that predicted-hit band " +
      "(" + counts + ", " + nTotal.toLocaleString() + " sampled in total). " +
      "Each sampled parlay is graded as a whole (it wins only if every leg won). " +
      "A card above 40% predicted still shows the model's product, flagged because those bands have run high. " +
      coverage +
      (highByLegs ? " Faded rows have fewer than 20 sampled parlays." : "");
  }

  function renderUnavailable(week) {
    document.getElementById("parlay-columns").innerHTML =
      '<div class="glass" style="grid-column: 1 / -1; padding: 32px; text-align:center; color: var(--dim);">' +
      'Week ' + week + ' hasn’t been generated yet — check back closer to kickoff.</div>';
    var robin = document.getElementById("parlay-round-robin");
    if (robin) robin.innerHTML = "";
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
      else render(buckets, state.season, state.parlays[state.season]);
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
