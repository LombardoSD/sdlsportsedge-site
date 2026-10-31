// Metrics: NFL-style rings + accuracy-by-week (directive 026 — no CLV block).
(function () {
  "use strict";

  var CIRC = 2 * Math.PI * 64;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KINDS = [
    { key: "ml", title: "ML Accuracy", short: "ML", label: "ML accuracy", color: "var(--win)" },
    { key: "ats", title: "ATS Accuracy", short: "ATS", label: "ATS accuracy", color: "var(--accent)" },
    { key: "tot", title: "Totals Accuracy", short: "Totals", label: "Totals accuracy", color: "var(--push)" },
  ];
  var seasons = {};
  var meta = null;
  var activeYear = null;

  function fmt1(v) {
    if (v == null || !isFinite(v)) return "—";
    return (Math.round(v * 10) / 10).toFixed(1);
  }

  function weeklyFor(data) {
    return data.weekly || [];
  }

  function pooled(weeks, key) {
    var w = 0,
      l = 0;
    weeks.forEach(function (x) {
      if (!x[key]) return;
      w += x[key].wins || 0;
      l += x[key].losses || 0;
    });
    return { wins: w, losses: l, pct: w + l ? (100 * w) / (w + l) : null };
  }

  function ringHtml(kind, agg) {
    var empty = agg.pct === null;
    var pct = empty ? 0 : agg.pct;
    var num = empty
      ? '<span class="ring-dash">—</span>'
      : '<span data-count="' +
        fmt1(pct) +
        '">' +
        (reduceMotion ? fmt1(pct) : "0.0") +
        '</span><span class="unit">%</span>';
    return (
      '<div class="ring-card glass" style="--c:' +
      kind.color +
      '">' +
      '<div class="ring">' +
      '<svg viewBox="0 0 160 160" aria-hidden="true">' +
      '<circle class="ring-track" cx="80" cy="80" r="64"></circle>' +
      '<circle class="ring-fill" cx="80" cy="80" r="64" data-pct="' +
      pct.toFixed(2) +
      '" stroke-dasharray="' +
      CIRC.toFixed(2) +
      '" stroke-dashoffset="' +
      CIRC.toFixed(2) +
      '"></circle></svg>' +
      '<div class="ring-center"><div class="ring-num">' +
      num +
      "</div></div></div>" +
      '<div class="ring-label">' +
      (kind.label || kind.short + " accuracy") +
      "</div>" +
      '<div class="ring-record">' +
      (empty ? "— · 0 graded" : agg.wins + "–" + agg.losses + " · " + (agg.wins + agg.losses) + " graded") +
      "</div></div>"
    );
  }

  function barsHtml(kind, weeks, smallN) {
    var threshold = smallN != null ? smallN : 20;
    var rows = weeks
      .map(function (x) {
        var d = x[kind.key] || { wins: 0, losses: 0 };
        var n = x.n != null ? x.n : (d.wins || 0) + (d.losses || 0);
        var decided = (d.wins || 0) + (d.losses || 0);
        var pct = decided ? (100 * d.wins) / decided : null;
        var thin = !!x.smallSample || n < threshold;
        return (
          '<div class="wk-row' +
          (thin ? " wk-thin" : "") +
          '" style="' +
          (thin ? "opacity:0.45;" : "") +
          '" title="' +
          (d.wins || 0) +
          "–" +
          (d.losses || 0) +
          " · n=" +
          n +
          '">' +
          '<span class="wk-label">Week ' +
          x.week +
          " (n=" +
          n +
          ")</span><span class=\"wk-pct\">" +
          (pct == null ? "—" : fmt1(pct) + "%") +
          '</span><div class="wk-track"><div class="wk-fill" data-w="' +
          (pct == null ? 0 : pct.toFixed(2)) +
          '"></div></div></div>'
        );
      })
      .join("");
    return (
      '<div class="bars-card glass" style="--c:' +
      kind.color +
      '">' +
      '<div class="bars-title">' +
      kind.title +
      " by Week</div>" +
      '<div class="bars-note">Per-week rate (n = graded games). Weeks with n&lt;' +
      threshold +
      " are faded. The ring pools weeks (pushes excluded), not an average of weekly rates.</div>" +
      rows +
      "</div>"
    );
  }

  function animate(root) {
    var rings = root.querySelectorAll(".ring-fill");
    var bars = root.querySelectorAll(".wk-fill");
    function apply() {
      Array.prototype.forEach.call(rings, function (c) {
        c.style.strokeDashoffset = (
          CIRC *
          (1 - parseFloat(c.getAttribute("data-pct")) / 100)
        ).toFixed(2);
      });
      Array.prototype.forEach.call(bars, function (b) {
        b.style.width = b.getAttribute("data-w") + "%";
      });
    }
    if (reduceMotion) {
      apply();
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(apply);
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / 1100, 1);
        el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(1);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function render() {
    var data = seasons[activeYear];
    var weeks = weeklyFor(data).filter(function (w) {
      return w.graded;
    });
    var root = document.getElementById("season-columns");
    root.innerHTML = KINDS.map(function (kind) {
      var agg = pooled(weeks, kind.key);
      return (
        '<div class="metric-col">' +
        ringHtml(kind, agg) +
        barsHtml(kind, weeks, data.smallSampleN) +
        "</div>"
      );
    }).join("");
    animate(root);
    document.getElementById("metrics-denominators").textContent =
      "Denominators: pushes are excluded. Season rings are pooled (sum of correct picks ÷ sum of eligible games), not an unweighted average of weekly rates. ML accuracy grades the predicted winner.";
    var acad = data.academicLabel || "";
    document.getElementById("metrics-note").textContent =
      acad +
      " · Ridge. Straight-up, against-the-spread and totals accuracy by week. Confidence calibration lives at the bottom of the Matchup Board.";
  }

  function setSeason(year) {
    activeYear = year;
    document.querySelectorAll("#season-toggle button").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.year) === year);
    });
    render();
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      seasons[meta.retrospectiveSeason] = results[1];
      seasons[meta.liveSeason] = results[2];
      var toggle = document.getElementById("season-toggle");
      toggle.innerHTML =
        '<button type="button" data-year="' +
        meta.retrospectiveSeason +
        '">' +
        (meta.retrospectiveLabel || "Retrospective") +
        "</button>" +
        '<button type="button" data-year="' +
        meta.liveSeason +
        '">' +
        (meta.liveLabel || "Live") +
        "</button>";
      toggle.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (b) setSeason(Number(b.dataset.year));
      });
      setSeason(window.AutopilotData.defaultSeasonYear(meta));
    })
    .catch(function (err) {
      console.error(err);
    });
})();
