// Model Metrics page: season and postseason accuracy rings + per-week bars.
(function () {
  "use strict";

  // Week 1 is included: its picks are graded on the model's confidence percentages.
  var FIRST_REGULAR_WEEK = 1;
  var LAST_REGULAR_WEEK = 18;
  var CURRENT_SEASON = 2026;
  var ROUNDS = { 19: "Wild Card", 20: "Divisional", 21: "Conference", 22: "Super Bowl" };
  var KINDS = [
    { key: "ml", title: "ML Accuracy", short: "ML", color: "var(--win)" },
    { key: "ats", title: "ATS Accuracy", short: "ATS", color: "var(--accent)" },
    { key: "tot", title: "Totals Accuracy", short: "Totals", color: "var(--push)" },
  ];
  var CIRC = 2 * Math.PI * 64;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pooled(weeks, key) {
    var w = 0, l = 0;
    weeks.forEach(function (x) { w += x[key].wins; l += x[key].losses; });
    return { wins: w, losses: l, pct: w + l ? (100 * w) / (w + l) : null };
  }

  // One decimal, ties to even, to match the Python-rounded numbers elsewhere (56.25 -> 56.2).
  function fmt1(v) {
    var x = v * 10;
    var f = Math.floor(x);
    if (x - f === 0.5) x = f % 2 === 0 ? f : f + 1;
    else x = Math.round(x);
    return (x / 10).toFixed(1);
  }
  function fmtPct(v) { return v === null ? "—" : fmt1(v) + "%"; }

  function ringHtml(kind, agg) {
    var pct = agg.pct === null ? 0 : agg.pct;
    return (
      '<div class="ring-card glass" style="--c:' + kind.color + '">' +
        '<div class="ring">' +
          '<svg viewBox="0 0 160 160" aria-hidden="true">' +
            '<circle class="ring-track" cx="80" cy="80" r="64"></circle>' +
            '<circle class="ring-fill" cx="80" cy="80" r="64" data-pct="' + pct.toFixed(2) + '" ' +
              'stroke-dasharray="' + CIRC.toFixed(2) + '" stroke-dashoffset="' + CIRC.toFixed(2) + '"></circle>' +
          '</svg>' +
          '<div class="ring-center">' +
            '<div class="ring-num"><span data-count="' + fmt1(pct) + '">' + (reduceMotion ? fmt1(pct) : "0.0") + '</span><span class="unit">%</span></div>' +
            '<div class="ring-label">' + kind.short + ' accuracy</div>' +
          '</div>' +
        '</div>' +
        '<div class="ring-record">' + agg.wins + '–' + agg.losses + ' · ' + (agg.wins + agg.losses) + ' graded</div>' +
      '</div>'
    );
  }

  function barsHtml(kind, weeks, labelFor, note, partialFor) {
    var rows = weeks.map(function (x) {
      var d = x[kind.key];
      var n = d.wins + d.losses;
      var pct = n ? (100 * d.wins) / n : null;
      var extra = d.push ? " · " + d.push + " push" : d.tie ? " · " + d.tie + " tie" : "";
      return (
        '<div class="wk-row" title="' + d.wins + '–' + d.losses + extra + '">' +
          '<span class="wk-label">' + labelFor(x.week) + (partialFor && partialFor(x.week) ? ' <em class="wk-partial">in progress</em>' : '') + '</span>' +
          '<span class="wk-pct">' + fmtPct(pct) + '</span>' +
          '<div class="wk-track"><div class="wk-fill" data-w="' + (pct === null ? 0 : pct.toFixed(2)) + '"></div></div>' +
        '</div>'
      );
    }).join("");
    return (
      '<div class="bars-card glass" style="--c:' + kind.color + '">' +
        '<div class="bars-title">' + kind.title + ' by Week</div>' +
        '<div class="bars-note">' + note + '</div>' +
        rows +
      '</div>'
    );
  }

  function renderSection(el, weeks, labelFor, note, partialFor) {
    el.innerHTML = KINDS.map(function (kind) {
      return (
        '<div class="metric-col">' +
          ringHtml(kind, pooled(weeks, kind.key)) +
          barsHtml(kind, weeks, labelFor, note, partialFor) +
        '</div>'
      );
    }).join("");
  }

  function animate(root) {
    var rings = root.querySelectorAll(".ring-fill");
    var bars = root.querySelectorAll(".wk-fill");
    var counts = root.querySelectorAll("[data-count]");
    function apply() {
      Array.prototype.forEach.call(rings, function (c) {
        c.style.strokeDashoffset = (CIRC * (1 - parseFloat(c.getAttribute("data-pct")) / 100)).toFixed(2);
      });
      Array.prototype.forEach.call(bars, function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    }
    if (reduceMotion) {
      Array.prototype.forEach.call(rings, function (c) { c.style.transition = "none"; });
      Array.prototype.forEach.call(bars, function (b) { b.style.transition = "none"; });
      apply();
      return;
    }
    requestAnimationFrame(function () { requestAnimationFrame(apply); });
    Array.prototype.forEach.call(counts, function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / 1100, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(1);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function draw(data) {
    var year = data.season.year;
    var scheduled = {};
    data.games.forEach(function (g) { scheduled[g.week] = (scheduled[g.week] || 0) + 1; });
    function partialFor(wk) {
      var row = data.weekly.filter(function (w) { return w.week === wk; })[0];
      return !!row && row.games < (scheduled[wk] || 0);
    }

    var regular = data.weekly.filter(function (w) { return w.week >= FIRST_REGULAR_WEEK && w.week <= LAST_REGULAR_WEEK; });
    var post = data.weekly.filter(function (w) { return w.week > LAST_REGULAR_WEEK; });

    var noteEl = document.getElementById("metrics-note");
    var maxWeek = regular.length ? regular[regular.length - 1].week : FIRST_REGULAR_WEEK;
    noteEl.textContent = year + (year === CURRENT_SEASON ? " season so far" : " regular season") + ", weeks " +
      FIRST_REGULAR_WEEK + "–" + maxWeek + ". Straight-up, against-the-spread and totals accuracy, pooled across every eligible game. " +
      "Confidence calibration by pick type lives at the bottom of the Matchup Board.";

    var seasonEl = document.getElementById("season-columns");
    renderSection(seasonEl, regular, function (wk) { return "Week " + wk; },
      "Per-week rate. The ring is pooled across weeks " + FIRST_REGULAR_WEEK + "–" + maxWeek + ", not averaged by week.",
      partialFor);
    animate(seasonEl);

    var postSection = document.getElementById("post-section");
    var postEl = document.getElementById("post-columns");
    if (post.length) {
      postSection.hidden = false;
      renderSection(postEl, post, function (wk) { return "Wk " + wk + " · " + (ROUNDS[wk] || "Playoffs"); },
        "The ring is pooled across all postseason games.", partialFor);
      animate(postEl);
    } else {
      postSection.hidden = true;
      postEl.innerHTML = "";
    }
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
      draw(season === 2026 && data2026 ? data2026 : data2025);
    }

    toggle.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      activate(Number(btn.dataset.season), btn);
    });

    // Open on the current season when it has graded games; fall back to 2025.
    var initialSeason = data2026 && data2026.weekly.length ? 2026 : 2025;
    activate(initialSeason, toggle.querySelector('[data-season="' + initialSeason + '"]'));
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
