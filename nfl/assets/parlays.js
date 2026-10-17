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
    if (season === 2025 || !(buckets && buckets.jackpot)) {
      cols.push({
        key: "all_dogs",
        title: "All underdogs",
        note: poolNote(season === 2025 || frozenSpan ? "2-10" : span, "all"),
        kind: "cards",
      });
    }
    if (season !== 2025) {
      cols.push({
        key: "hedge",
        title: "Hedge Parlays",
        note: "Each ticket ends with a hedge leg: the latest game on the ticket. If every earlier leg wins, you can hedge that last bet by taking the other side to lock in a return. Hedging locks in a result; it does not add expected profit, and the sportsbook's margin applies to the hedge bet. Experimental model picks, no promised results. Prices are Tuesday opening moneylines and may have moved since. Underdogs come from the 1:00 PM and 4:00 PM games.",
        kind: "hedge",
      });
    }
    return cols;
  }

  function legMark(leg) {
    var kind = leg && leg.outcome;
    var label = kind === "win" ? "won" : kind === "loss" ? "lost" : kind === "push" ? "push" : "";
    if (!label) return "";
    var glyph = kind === "win" ? "\u2713" : kind === "loss" ? "\u2717" : "\u2013";
    return (
      '<span class="parlay-leg-mark parlay-leg-mark-' + kind + '">' +
        '<span aria-hidden="true">' + glyph + '</span>' +
        '<span class="sr-only">' + label + '</span>' +
      '</span>'
    );
  }

  function legLabel(leg) {
    var text = leg && leg.description != null ? String(leg.description) : "";
    if (text.indexOf("None") === -1) return text;
    var pick = leg && leg.pick != null ? String(leg.pick) : "";
    var market = leg && (leg.betType || leg.bet_type) ? String(leg.betType || leg.bet_type) : "";
    if (pick && market) return pick + " " + market;
    return pick;
  }

  function boardLabel(leg) {
    var text = leg && leg.boardPick != null ? String(leg.boardPick) : "";
    if (text.indexOf("None") === -1) return text;
    return "";
  }

  function legRow(leg) {
    return (
      '<div class="parlay-leg">' +
        legMark(leg) +
        '<span class="parlay-pick">' + legLabel(leg) + '</span>' +
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
          legMark(leg) +
          '<span class="parlay-dog-tag">UNDERDOG</span>' +
          '<span class="parlay-pick">' + legLabel(leg) + '</span>' +
          '<span class="parlay-matchup">' + leg.matchup + '</span>' +
          '<span class="parlay-prob">Model ' + pct1(leg.modelProb) + ' · Market ' + pct1(leg.marketProb) + '</span>' +
          (boardLabel(leg) ? '<span class="parlay-board-pick">Board pick: ' + boardLabel(leg) + '</span>' : '') +
        '</div>'
      );
    }
    return legRow(leg);
  }

  function jackpotCard(ticket) {
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-meta">6-Leg Jackpot · ' + ticket.historical + '</div>' +
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


  var HEDGE_SPECS = [
    ["hedge2", "Hedge 2-Leg"],
    ["hedge3", "Hedge 3-Leg"],
    ["hedge4", "Hedge 4-Leg"],
    ["hedge5", "Hedge 5-Leg"],
    ["hedge6", "Hedge 6-Leg"],
  ];
  var HEDGE_ROLE = { underdog: "Underdog", favorite: "Favorite", hedge: "Hedge" };

  function hedgePrice(price) {
    var number = Number(price);
    if (!isFinite(number)) return "";
    return number > 0 ? "+" + number : String(number);
  }

  function hedgeKickoff(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function hedgeStatus(outcome) {
    var kind = outcome === "win" || outcome === "loss" || outcome === "ungraded" ? outcome : "pending";
    var cls = kind === "ungraded" ? "push" : kind;
    return '<span class="gb-outcome ' + cls + '">' + kind + '</span>';
  }

  function hedgeLeg(leg) {
    var role = leg && leg.role ? String(leg.role) : "";
    var hedge = role === "hedge";
    return (
      '<div class="parlay-leg parlay-hedge-leg' + (hedge ? " parlay-leg-hedge" : "") + '">' +
        (hedge ? '<span class="parlay-hedge-caption">Hedge leg</span>' : "") +
        '<span class="parlay-leg-main">' +
          legMark(leg) +
          '<span class="parlay-pick">' + (leg.pick || "") + '</span>' +
          '<span class="parlay-role-tag parlay-role-' + role + '">' + (HEDGE_ROLE[role] || role) + '</span>' +
          '<span class="parlay-price">' + hedgePrice(leg.price) + '</span>' +
          '<span class="parlay-prob">' + (Number(leg.prob) * 100).toFixed(1) + '%</span>' +
        '</span>' +
        '<span class="parlay-kickoff">' + hedgeKickoff(leg.kickoffEt) + '</span>' +
      '</div>'
    );
  }

  function hedgeCard(ticket) {
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-hedge-head">' +
          '<div class="parlay-meta">' + ticket.ticket + '</div>' +
          hedgeStatus(ticket.outcome) +
        '</div>' +
        (ticket.legs || []).map(hedgeLeg).join("") +
      '</div>'
    );
  }

  function hedgeRecord(parlaysData, key) {
    var wins = 0;
    var losses = 0;
    var pending = 0;
    var ungraded = 0;
    var weeks = (parlaysData && parlaysData.weeks) || {};
    Object.keys(weeks).forEach(function (week) {
      var bucket = weeks[week] && weeks[week][key];
      if (!bucket || bucket.skipped) return;
      if (bucket.outcome === "win") wins += 1;
      else if (bucket.outcome === "loss") losses += 1;
      else if (bucket.outcome === "pending") pending += 1;
      else if (bucket.outcome === "ungraded") ungraded += 1;
    });
    return wins + "–" + losses + " · " + pending + " pending · " + ungraded + " ungraded";
  }

  function jackpotCards(bucket) {
    var list = bucket && bucket["6"];
    if (list && list.length) {
      return list.map(function (ticket) {
        return jackpotCard(ticket) +
          '<p class="parlay-jackpot-note">Original Jackpot: two early underdogs at +150 or shorter, four favorites, ending with a Sunday or Monday night favorite.</p>';
      }).join("");
    }
    var reason = bucket && bucket.skipped;
    return '<p class="parlay-empty">' + (typeof reason === "string" ? reason : "No 6-leg ticket this week.") + '</p>';
  }

  function hedgeChoices(buckets) {
    var choices = [];
    HEDGE_SPECS.forEach(function (spec) {
      if (buckets && Object.prototype.hasOwnProperty.call(buckets, spec[0])) {
        choices.push({ key: spec[0], count: spec[0].slice("hedge".length), label: spec[0].slice("hedge".length) + "-Leg", title: spec[1] });
      }
    });
    if (buckets && buckets.jackpot) {
      choices.push({ key: "jackpot", count: "jackpot", label: "6-Leg Jackpot", title: "6-Leg Jackpot" });
    }
    return choices;
  }

  function hedgePanel(choice, buckets, parlaysData) {
    if (choice.key === "jackpot") {
      return {
        tally: "2026 6-Leg Jackpot: " + jackpotRecord(parlaysData),
        body: jackpotCards(buckets.jackpot),
      };
    }
    var bucket = buckets[choice.key];
    var body = "";
    if (bucket && typeof bucket.skipped === "string") {
      body = '<p class="parlay-empty">Not available this week: ' + bucket.skipped + '</p>';
    } else if (bucket && bucket.ticket) {
      body = hedgeCard(bucket);
    }
    return {
      tally: "2026 " + choice.title + ": " + hedgeRecord(parlaysData, choice.key),
      body: body,
    };
  }

  function renderHedgeColumn(col, buckets, parlaysData) {
    var html =
      '<div class="parlay-col glass">' +
        '<h3>' + col.title + '</h3>' +
        '<p class="parlay-col-note">' + col.note + '</p>';
    var present = HEDGE_SPECS.some(function (spec) {
      return buckets && Object.prototype.hasOwnProperty.call(buckets, spec[0]);
    });
    if (!present) {
      html += '<p class="parlay-empty">Hedge Parlays started in week 5.</p>';
      if (buckets && buckets.jackpot) {
        html += '<p class="parlay-tally">2026 6-Leg Jackpot: ' + jackpotRecord(parlaysData) + '</p>';
        html += '<div class="parlay-list">' + jackpotCards(buckets.jackpot) + '</div>';
      }
      html += '</div>';
      return html;
    }
    var choices = hedgeChoices(buckets);
    var panel = hedgePanel(choices[0], buckets, parlaysData);
    html += '<div class="parlay-leg-selector">' + choices.map(function (choice, i) {
      return '<button class="' + (i === 0 ? "active" : "") + '" data-count="' + choice.count + '">' + choice.label + '</button>';
    }).join("") + '</div>';
    html += '<p class="parlay-tally">' + panel.tally + '</p>';
    html += '<div class="parlay-list">' + panel.body + '</div></div>';
    return html;
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

  function render(buckets, season, parlaysData) {
    var columns = columnsFor(season, buckets);
    var container = document.getElementById("parlay-columns");
    container.innerHTML = columns.map(function (col) {
      if (col.kind === "hedge") return renderHedgeColumn(col, buckets, parlaysData);
      if (col.kind === "jackpot") return renderJackpotColumn(col, buckets[col.key], parlaysData);
      return renderColumn(col, buckets[col.key]);
    }).join("");

    container.querySelectorAll(".parlay-col").forEach(function (colEl, i) {
      var selector = colEl.querySelector(".parlay-leg-selector");
      if (!selector) return;
      if (columns[i].kind === "hedge") {
        selector.addEventListener("click", function (e) {
          var btn = e.target.closest("button");
          if (!btn) return;
          selector.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
          var selected = hedgeChoices(buckets).filter(function (choice) {
            return choice.count === btn.dataset.count;
          })[0];
          if (!selected) return;
          var panel = hedgePanel(selected, buckets, parlaysData);
          colEl.querySelector(".parlay-tally").textContent = panel.tally;
          colEl.querySelector(".parlay-list").innerHTML = panel.body;
        });
        return;
      }
      var bucket = buckets[columns[i].key];
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
      var gapCls = byLegs && gap > 0 ? "calibration-gap-pos" : byLegs && gap < 0 ? "calibration-gap-neg" : "";
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
          '<td' + (gapCls ? ' class="' + gapCls + '"' : ' style="color:' + gapColor + '"') + '>' + gapStr + '</td>' +
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

  function legTables(title, rowsByCount) {
    return ["2", "3", "4"].map(function (count) {
      return calibrationTable(title + ": " + count + "-leg parlays", rowsByCount[count], "by-legs");
    }).join("");
  }

  function calibrationWeekClause(parlaysData) {
    var weekNums = Object.keys((parlaysData && parlaysData.weeks) || {}).map(Number);
    if (!weekNums.length) return "";
    return "from weeks " + Math.min.apply(null, weekNums) + " to " + Math.max.apply(null, weekNums) + " of the 2026 season so far";
  }

  function calibrationReadList() {
    var rows = [
      ["Record", "how many parlays in the group hit, and how many missed."],
      ["Predicted", "the average chance the model gave that group."],
      ["Actual", "how often the group really hit."],
      ["Gap", 'Actual minus Predicted. A <span class="calibration-gap-pos">blue plus</span> means the group hit more often than predicted. A <span class="calibration-gap-neg">red minus</span> means it hit less often.']
    ];
    return '<ul class="calibration-read">' + rows.map(function (row) {
      return "<li><strong>" + row[0] + ":</strong> " + row[1] + "</li>";
    }).join("") + "</ul>";
  }

  function calibrationIntro(parlaysData, season) {
    var intro;
    var how;
    if (season === 2025) {
      intro = "Every parlay on this page comes with a predicted chance of hitting. These tables check how honest those predictions were for the 2025 retrospective replay: weeks 2–18, each week scored from earlier games only, not a live record. Parlays of all sizes, from 2 to 10 legs, are grouped together by the chance the model gave them, for example 30-40%, in three groups: High-confidence legs, With underdogs and All underdogs.";
      how = "Find the group that matches the kind of parlay you are looking at, then the row that matches its predicted chance. If the gap is red, that kind of parlay has been hitting less often than the model said, so treat its predicted percentage with extra caution. If it is blue, the model has been conservative there.";
    } else {
      var weekClause = calibrationWeekClause(parlaysData);
      intro = "Every parlay on this page comes with a predicted chance of hitting. These tables check how honest those predictions have been, using graded parlays" + (weekClause ? " " + weekClause : "") + ". Each table groups parlays of the same size (2, 3 or 4 legs) by the chance the model gave them, for example 30-40%, and shows what actually happened to the parlays in that group.";
      how = "Find the table for the number of legs in the parlay you are looking at, then the row that matches its predicted chance. If the gap is red, that kind of parlay has been hitting less often than the model said, so treat its predicted percentage with extra caution. If it is blue, the model has been conservative there. Faded rows are groups with only a handful of parlays, so do not lean on them yet.";
    }
    var keep = "These are graded parlays from a sample, not every possible combination, and many parlays share the same legs, so their results tend to move together. Read the tables as a guide to how much to trust a predicted percentage, not as a guarantee. For exploration only, not betting advice.";
    return (
      "<p>" + intro + "</p>" +
      "<h3>How to read a row</h3>" +
      calibrationReadList() +
      "<h3>How to use it</h3>" +
      "<p>" + how + "</p>" +
      "<h3>Keep in mind</h3>" +
      "<p>" + keep + "</p>"
    );
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
    document.getElementById("parlay-calibration-note").innerHTML = calibrationIntro(parlaysData, season);
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
      if (!buckets && state.season === 2025 && week === 1) {
        document.getElementById("parlay-columns").innerHTML =
          '<div class="glass" style="grid-column: 1 / -1; padding: 32px; text-align:center; color: var(--dim);">' +
          'Week 1 is a baseline week and is not graded.</div>';
      } else if (!buckets) renderUnavailable(week);
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
