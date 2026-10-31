// Parlay Builder: season tabs + ET date picker + three sections (Ridge only, directive 025).
(function () {
  "use strict";

  var LIVE_START = "2026-11-01";

  function poolNote(kind) {
    if (kind === "high") {
      return "2-4 leg parlays where every leg is priced at 60% or higher. This is a leg filter, not a claim that the parlay will hit. Hit chance multiplies the legs and assumes they are independent.";
    }
    if (kind === "dogs") {
      return "2-4 leg parlays from ML and ATS legs only, with at least one underdog mixed in. Totals are excluded. Hit chance multiplies the legs and assumes they are independent.";
    }
    return "";
  }

  function columnsFor() {
    return [
      { key: "high_conf", title: "High-confidence legs", note: poolNote("high"), kind: "cards" },
      { key: "with_dogs", title: "With underdogs", note: poolNote("dogs"), kind: "cards" },
      {
        key: "hedge",
        title: "Hedge Parlays",
        note: "Each ticket ends with a hedge leg: the latest tip on the ticket, at least two hours after every earlier leg. If every earlier leg wins, you can hedge that last bet by taking the other side. Hedging locks in a result; it does not add expected profit. Prices are the median of per-book American moneylines at the sealed consensus snapshot (price at pick). For exploration only — not betting advice.",
        kind: "hedge",
      },
    ];
  }

  function legMark(leg) {
    var kind = leg && leg.outcome;
    var label = kind === "win" ? "won" : kind === "loss" ? "lost" : kind === "push" ? "push" : kind === "void" ? "void" : "";
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

  function legMatchup(leg) {
    if (leg && leg.matchup) return String(leg.matchup);
    return "";
  }

  function legRow(leg) {
    return (
      '<div class="parlay-leg">' +
        legMark(leg) +
        '<span class="parlay-pick">' + legLabel(leg) + '</span>' +
        '<span class="parlay-matchup">' + legMatchup(leg) + '</span>' +
        '<span class="parlay-prob">Prob: ' + Math.round(Number(leg.prob) * 100) + '%</span>' +
      '</div>'
    );
  }

  function parlayCard(p) {
    var hit = (Number(p.hitProb) * 100).toFixed(1);
    return (
      '<div class="parlay-card">' +
        '<div class="parlay-meta">~Hit: ' + hit + '% · Underdogs: ' + (p.dogCount || 0) + '</div>' +
        (p.legs || []).map(legRow).join("") +
      '</div>'
    );
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
    // Data may keep half-integer medians (even book counts); show whole American.
    var number = Number(price);
    if (!isFinite(number)) return "";
    var whole = Math.round(number);
    return whole > 0 ? "+" + whole : String(whole);
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
    var kind =
      outcome === "win" || outcome === "loss" || outcome === "void" || outcome === "pending"
        ? outcome
        : "pending";
    var cls = kind === "void" ? "push" : kind;
    return '<span class="gb-outcome ' + cls + '">' + kind + '</span>';
  }

  function hedgeLeg(leg) {
    var role = leg && leg.role ? String(leg.role) : "";
    var hedge = role === "hedge";
    var priceLabel = leg.priceLabel || "price at pick (median of books)";
    return (
      '<div class="parlay-leg parlay-hedge-leg' + (hedge ? " parlay-leg-hedge" : "") + '">' +
        (hedge ? '<span class="parlay-hedge-caption">Hedge leg</span>' : "") +
        '<span class="parlay-leg-main">' +
          legMark(leg) +
          '<span class="parlay-pick">' + (leg.pick || "") + '</span>' +
          '<span class="parlay-role-tag parlay-role-' + role + '">' + (HEDGE_ROLE[role] || role) + '</span>' +
          '<span class="parlay-price" title="' + priceLabel + '">' + hedgePrice(leg.price) + '</span>' +
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

  function hedgeRecord(armPayload, key) {
    var wins = 0;
    var losses = 0;
    var pending = 0;
    var voids = 0;
    var dates = (armPayload && armPayload.dates) || {};
    Object.keys(dates).forEach(function (day) {
      var bucket = dates[day] && dates[day][key];
      if (!bucket || bucket.skipped) return;
      if (bucket.outcome === "win") wins += 1;
      else if (bucket.outcome === "loss") losses += 1;
      else if (bucket.outcome === "void") voids += 1;
      else pending += 1;
    });
    return wins + "–" + losses + " · " + pending + " pending · " + voids + " void";
  }

  function hedgeChoices(buckets) {
    var choices = [];
    HEDGE_SPECS.forEach(function (spec) {
      if (buckets && Object.prototype.hasOwnProperty.call(buckets, spec[0])) {
        choices.push({
          key: spec[0],
          count: spec[0].slice("hedge".length),
          label: spec[0].slice("hedge".length) + "-Leg",
          title: spec[1],
        });
      }
    });
    return choices;
  }

  function hedgePanel(choice, buckets, armPayload, seasonLabel) {
    var bucket = buckets[choice.key];
    var body = "";
    if (bucket && typeof bucket.skipped === "string") {
      body = '<p class="parlay-empty">Not available this day: ' + bucket.skipped + '</p>';
    } else if (bucket && bucket.ticket) {
      body = hedgeCard(bucket);
    } else {
      body = '<p class="parlay-empty">No hedge ticket this day.</p>';
    }
    return {
      tally: seasonLabel + " " + choice.title + ": " + hedgeRecord(armPayload, choice.key),
      body: body,
    };
  }

  function renderHedgeColumn(col, buckets, armPayload, seasonLabel) {
    var html =
      '<div class="parlay-col glass">' +
        '<h3>' + col.title + '</h3>' +
        '<p class="parlay-col-note">' + col.note + '</p>';
    var present = HEDGE_SPECS.some(function (spec) {
      return buckets && Object.prototype.hasOwnProperty.call(buckets, spec[0]);
    });
    if (!present) {
      html += '<p class="parlay-empty">No hedge shapes on this slate.</p></div>';
      return html;
    }
    var choices = hedgeChoices(buckets);
    var panel = hedgePanel(choices[0], buckets, armPayload, seasonLabel);
    html += '<div class="parlay-leg-selector">' + choices.map(function (choice, i) {
      return '<button class="' + (i === 0 ? "active" : "") + '" data-count="' + choice.count + '">' + choice.label + '</button>';
    }).join("") + '</div>';
    html += '<p class="parlay-tally">' + panel.tally + '</p>';
    html += '<div class="parlay-list">' + panel.body + '</div></div>';
    return html;
  }

  function renderColumn(col, bucket) {
    var counts = bucket
      ? Object.keys(bucket).map(Number).filter(function (n) { return isFinite(n); }).sort(function (a, b) { return a - b; })
      : [];
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

  function render(buckets, armPayload, seasonLabel) {
    var columns = columnsFor();
    var container = document.getElementById("parlay-columns");
    container.innerHTML = columns.map(function (col) {
      if (col.kind === "hedge") return renderHedgeColumn(col, buckets, armPayload, seasonLabel);
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
          var panel = hedgePanel(selected, buckets, armPayload, seasonLabel);
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
      var gapCls = gap > 0 ? "calibration-gap-pos" : gap < 0 ? "calibration-gap-neg" : "";
      var gapStr = (gap > 0 ? "+" : "") + gap.toFixed(1) + "pt";
      var wins = row.wins != null ? row.wins : Math.round(row.n * row.actualPct / 100);
      var losses = row.losses != null ? row.losses : row.n - wins;
      var thin = Number(row.n) < 20;
      var tip = thin ? "Low n: " + row.n + " parlays" : row.n + " graded parlays in this band";
      return (
        '<tr' + (thin ? ' class="calibration-thin"' : '') + ' title="' + tip + '">' +
          '<td>' + row.range + '</td>' +
          '<td>' + wins + '–' + losses + '</td>' +
          '<td>' + row.predictedAvg.toFixed(1) + '%</td>' +
          '<td>' + row.actualPct.toFixed(1) + '%</td>' +
          '<td class="' + gapCls + '">' + gapStr + '</td>' +
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
      return calibrationTable(title + ": " + count + "-leg parlays", (rowsByCount || {})[count], "by-legs");
    }).join("");
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

  function isLiveEmpty(parlaysData, meta) {
    var start = (parlaysData && parlaysData.liveLedgerStarts) || (meta && meta.liveLedgerStarts) || LIVE_START;
    var today = new Date().toISOString().slice(0, 10);
    var dates = (((parlaysData || {}).arms || {}).ridge || {}).dates || {};
    return today < start && Object.keys(dates).length === 0;
  }

  function calibrationIntro(parlaysData, isRetro) {
    var intro;
    var how;
    if (isRetro) {
      intro = "Every parlay on this page comes with a predicted chance of hitting. These tables check how honest those predictions were for the 2025–26 retrospective replay: each day was scored from earlier games only, not a live record. Parlays of 2, 3 or 4 legs are grouped by the chance the model gave them. Hit chance multiplies the legs and assumes independence — the tables show how far joint results diverge from that product.";
      how = "Find the table for the number of legs, then the row that matches its predicted chance. If the gap is red, that kind of parlay has been hitting less often than the model said. If it is blue, the model has been conservative there. Faded rows have n under 20.";
    } else {
      intro = "Every parlay on this page comes with a predicted chance of hitting. These tables check how honest those predictions have been on the live sealed ledger. Each table groups parlays of the same size (2, 3 or 4 legs) by predicted hit chance. Independence of legs is an assumption — calibration shows where the product over- or under-states joint hits.";
      how = "Find the table for the number of legs, then the row that matches its predicted chance. Treat red gaps with extra caution. Faded rows have low counts.";
    }
    var keep = "These are graded parlays from a bounded set, not every possible combination, and many parlays share the same legs, so their results tend to move together. Read the tables as a guide to how much to trust a predicted percentage, not as a guarantee. For exploration only — not betting advice.";
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

  function renderParlayCalibration(armPayload, isRetro, emptyLive) {
    var columns = document.getElementById("parlay-calibration-columns");
    var note = document.getElementById("parlay-calibration-note");
    if (emptyLive) {
      columns.className = "calibration-columns";
      columns.innerHTML =
        '<div class="glass" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--dim);">' +
        "Live sealed ledger starts Nov 1, 2026. Calibration appears once graded parlays exist." +
        "</div>";
      note.innerHTML = "<p>Live season has not started. Open the retrospective replay tab for graded walk-forward parlays.</p>";
      return;
    }
    var cal = (armPayload && armPayload.calibration) || {};
    var highByLegs = cal.high_conf_by_legs;
    var dogsByLegs = cal.with_dogs_by_legs;
    if (highByLegs) {
      columns.className = "parlay-calibration-stack";
      columns.innerHTML =
        '<div class="calibration-columns">' + legTables("High-confidence legs", highByLegs) + "</div>" +
        '<div class="calibration-columns calibration-follow">' + legTables("With underdogs", dogsByLegs || {}) + "</div>";
    } else {
      columns.className = "calibration-columns two";
      columns.innerHTML =
        calibrationTable("High-confidence legs", cal.high_conf) +
        calibrationTable("With underdogs", cal.with_dogs);
    }
    note.innerHTML = calibrationIntro(armPayload, isRetro);
  }

  function emptyLiveMessage() {
    return "Season starts Nov 1, 2026";
  }

  function formatTitleDate(date) {
    if (!date) return "";
    var parts = String(date).split("-");
    if (parts.length !== 3) return date;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = months[Number(parts[1]) - 1] || parts[1];
    return m + " " + Number(parts[2]) + ", " + parts[0];
  }

  function main() {
    var meta = null;
    var seasons = {};
    var parlays = {};
    var activeYear = null;
    var currentDate = null;

    function armPayload(year) {
      var data = parlays[year];
      if (!data) return null;
      return (data.arms && data.arms.ridge) || null;
    }

    function seasonLabel(year) {
      if (!meta) return String(year);
      if (year === window.AutopilotData.retrospectiveYear(meta)) {
        return meta.retrospectiveLabel || "Retrospective replay";
      }
      return meta.liveLabel || "Live season";
    }

    function showDay(year, date) {
      currentDate = date;
      var arm = armPayload(year);
      var buckets = arm && arm.dates && arm.dates[date];
      document.getElementById("parlays-title").textContent =
        "PARLAY BUILDER — " + formatTitleDate(date);
      if (!buckets) {
        document.getElementById("parlay-columns").innerHTML =
          '<div class="glass" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--dim);">' +
          "No parlays generated for this day.</div>";
      } else {
        render(buckets, arm, seasonLabel(year));
      }
      document.querySelectorAll("#date-tabs button[data-date]").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.date === date);
      });
      var picker = document.getElementById("date-picker");
      if (picker) picker.value = date;
    }

    function showEmptyLive(year) {
      document.getElementById("parlays-title").textContent = "PARLAY BUILDER";
      document.getElementById("date-tabs").innerHTML = "";
      document.getElementById("parlay-columns").innerHTML =
        '<div class="glass" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--dim);">' +
        emptyLiveMessage() +
        "</div>";
      renderParlayCalibration(armPayload(year), false, true);
    }

    function showSeason(year) {
      activeYear = year;
      var retroY = window.AutopilotData.retrospectiveYear(meta);
      var liveY = window.AutopilotData.liveYear(meta);
      var isRetro = year === retroY;
      var data = parlays[year];
      var arm = armPayload(year);
      var dates = Object.keys((arm && arm.dates) || {}).sort();

      var toggle = document.getElementById("season-toggle");
      if (toggle) {
        Array.prototype.forEach.call(toggle.querySelectorAll("button"), function (btn) {
          btn.classList.toggle("active", String(btn.dataset.season) === String(year));
        });
      }

      if (year === liveY && (!dates.length || isLiveEmpty(data, meta))) {
        showEmptyLive(year);
        return;
      }

      renderParlayCalibration(arm, isRetro, false);

      if (!dates.length) {
        document.getElementById("date-tabs").innerHTML = "";
        document.getElementById("parlay-columns").innerHTML =
          '<div class="glass" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--dim);">' +
          "No parlays in this season yet.</div>";
        return;
      }

      var params = new URLSearchParams(window.location.search);
      var initial = params.get("date") || dates[dates.length - 1];
      if (dates.indexOf(initial) < 0) initial = dates[dates.length - 1];

      var tabs = document.getElementById("date-tabs");
      var F = window.AutopilotFormat;
      var nav = F.mountDateNav(tabs, dates, initial, function (date) {
        showDay(year, date);
      });
      showDay(year, (nav && nav.selected) || initial);
    }

    Promise.all([
      window.AutopilotData.loadMeta(),
      window.AutopilotData.loadRetrospectiveSeason().catch(function () { return null; }),
      window.AutopilotData.loadLiveSeason().catch(function () { return null; }),
    ]).then(function (results) {
      meta = results[0];
      var retroY = window.AutopilotData.retrospectiveYear(meta);
      var liveY = window.AutopilotData.liveYear(meta);
      seasons[retroY] = results[1];
      seasons[liveY] = results[2];

      return Promise.all([
        window.AutopilotData.loadParlays(retroY).catch(function () { return null; }),
        window.AutopilotData.loadParlays(liveY).catch(function () { return null; }),
      ]).then(function (pair) {
        parlays[retroY] = pair[0];
        parlays[liveY] = pair[1];

        var retroLabel = meta.retrospectiveLabel || (String(retroY - 1) + "–" + String(retroY).slice(2) + " (RETROSPECTIVE REPLAY)");
        var liveLabel = meta.liveLabel || (String(liveY - 1) + "–" + String(liveY).slice(2) + " SEASON");
        var toggle = document.getElementById("season-toggle");
        if (toggle) {
          toggle.innerHTML =
            '<button type="button" data-season="' + retroY + '">' + retroLabel + "</button>" +
            '<button type="button" data-season="' + liveY + '">' + liveLabel + "</button>";
          toggle.onclick = function (e) {
            var btn = e.target.closest("button");
            if (!btn) return;
            showSeason(Number(btn.dataset.season));
          };
        }

        function parlayDates(year) {
          var arm = armPayload(year);
          return Object.keys((arm && arm.dates) || {}).sort();
        }

        var defaultYear = window.AutopilotData.defaultSeasonYear(meta);
        if (!parlays[defaultYear] && parlays[retroY]) defaultYear = retroY;
        // Deep link ?date=YYYY-MM-DD selects the season that contains that day.
        var dateParam = new URLSearchParams(window.location.search).get("date");
        if (dateParam) {
          if (parlayDates(retroY).indexOf(dateParam) >= 0) defaultYear = retroY;
          else if (parlayDates(liveY).indexOf(dateParam) >= 0) defaultYear = liveY;
        }
        showSeason(defaultYear);
      });
    }).catch(function (err) {
      console.error("Failed to load parlay data", err);
    });
  }

  main();
})();
