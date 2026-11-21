// NCAAF metrics — ML green / ATS blue / Totals gold lean rings (NCAAM parity).
(function () {
  "use strict";

  var FIRST_REGULAR_WEEK = 1;
  var LAST_REGULAR_WEEK = 15;
  // pathLength=100 → stroke-dashoffset maps 1:1 to percent (fixes arc vs label drift).
  var PATH_LEN = 100;
  var KINDS = [
    {
      key: "ml",
      title: "ML Accuracy",
      short: "ML",
      label: "ML ACCURACY",
      color: "var(--win)",
    },
    {
      key: "ats",
      title: "ATS Lean",
      short: "ATS",
      label: "ATS LEAN ACCURACY",
      color: "var(--accent)",
    },
    {
      key: "tot",
      title: "Total Lean",
      short: "Totals",
      label: "TOTAL LEAN ACCURACY",
      color: "var(--push)",
    },
  ];
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var meta = null;
  var THIN_N = 20;

  function fmt1(v) {
    return (Math.round(v * 10) / 10).toFixed(1);
  }
  function fmtPct(v) {
    return v === null || v === undefined ? "—" : fmt1(v) + "%";
  }

  function seasonAgg(season, key) {
    var rec = (season && season[key]) || { wins: 0, losses: 0, push: 0, pct: null };
    var w = rec.wins || 0;
    var l = rec.losses || 0;
    var pct = w + l ? (100 * w) / (w + l) : null;
    return {
      wins: w,
      losses: l,
      push: rec.push || 0,
      pct: pct,
      marketFavorite: rec.marketFavorite || null,
      baseline: rec.baseline || null,
      marketReference: rec.marketReference || null,
      caption: rec.caption || rec.badge || null,
    };
  }

  function baselineCaption(kind, agg) {
    if (kind.key === "ml" && agg.marketFavorite && agg.marketFavorite.pct != null) {
      var mf = agg.marketFavorite;
      return (
        "Market favorite: " +
        mf.wins +
        "–" +
        mf.losses +
        " (" +
        fmt1(mf.pct) +
        "%)"
      );
    }
    if (kind.key === "ats") {
      return (agg.baseline && agg.baseline.label) || "Coin-flip baseline 50%";
    }
    if (kind.key === "tot") {
      var bits = [];
      if (agg.caption) bits.push(agg.caption);
      var ref = agg.marketReference;
      if (ref && ref.overPct != null) {
        bits.push("Market Over rate: " + fmt1(ref.overPct) + "%");
      }
      return bits.join(" · ") || "no demonstrated edge";
    }
    return "";
  }

  function ringHtml(kind, agg) {
    var empty = agg.pct === null;
    var pct = empty ? 0 : agg.pct;
    // Final % in the label immediately; stroke animates to the same data-pct.
    var num = empty
      ? '<span class="ring-dash">—</span>'
      : '<span data-count="' +
        fmt1(pct) +
        '">' +
        fmt1(pct) +
        '</span><span class="unit">%</span>';
    var record = empty
      ? "— · 0 graded"
      : agg.wins +
        "–" +
        agg.losses +
        (agg.push ? " · " + agg.push + " push" : "") +
        " · " +
        (agg.wins + agg.losses) +
        " graded";
    var base = baselineCaption(kind, agg);
    return (
      '<div class="ring-card glass" style="--c:' +
      kind.color +
      '">' +
      '<div class="ring">' +
      '<svg viewBox="0 0 160 160" aria-hidden="true">' +
      '<circle class="ring-track" cx="80" cy="80" r="64" pathLength="' +
      PATH_LEN +
      '"></circle>' +
      '<circle class="ring-fill" cx="80" cy="80" r="64" pathLength="' +
      PATH_LEN +
      '" data-pct="' +
      pct.toFixed(2) +
      '" stroke-dasharray="' +
      PATH_LEN +
      '" stroke-dashoffset="' +
      PATH_LEN +
      '"></circle></svg>' +
      '<div class="ring-center"><div class="ring-num">' +
      num +
      "</div></div></div>" +
      '<div class="ring-label">' +
      kind.label +
      "</div>" +
      '<div class="ring-record">' +
      record +
      "</div>" +
      (base
        ? '<div class="ring-baseline" style="color:var(--dim);font-size:0.78rem;margin-top:0.25rem;">' +
          base +
          "</div>"
        : "") +
      "</div>"
    );
  }

  function barsHtml(kind, weeks) {
    var rows = weeks
      .map(function (x) {
        var d = x[kind.key] || { wins: 0, losses: 0, push: 0 };
        var n = (d.wins || 0) + (d.losses || 0);
        var pct = n ? (100 * d.wins) / n : null;
        var thin = n > 0 && n < THIN_N;
        var extra = d.push ? " · " + d.push + " push" : "";
        return (
          '<div class="wk-row' +
          (thin ? " thin-sample" : "") +
          '" style="' +
          (thin ? "opacity:0.45;" : "") +
          '" title="' +
          (d.wins || 0) +
          "–" +
          (d.losses || 0) +
          extra +
          " · n=" +
          n +
          (thin ? " (small sample)" : "") +
          '">' +
          '<span class="wk-label">Week ' +
          x.week +
          " (n=" +
          n +
          ")</span>" +
          '<span class="wk-pct">' +
          fmtPct(pct) +
          "</span>" +
          '<div class="wk-track"><div class="wk-fill" data-w="' +
          (pct === null ? 0 : pct.toFixed(2)) +
          '"></div></div>' +
          "</div>"
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
      THIN_N +
      " are faded. The ring pools weeks (pushes excluded), not an average of weekly rates.</div>" +
      rows +
      "</div>"
    );
  }

  function renderSection(el, data) {
    var weeks = (data.weekly || []).filter(function (w) {
      return w.week >= FIRST_REGULAR_WEEK && w.week <= LAST_REGULAR_WEEK;
    });
    el.innerHTML = KINDS.map(function (kind) {
      return (
        '<div class="metric-col">' +
        ringHtml(kind, seasonAgg(data.season, kind.key)) +
        barsHtml(kind, weeks) +
        "</div>"
      );
    }).join("");
  }

  function setRingOffset(c, pct) {
    // pathLength=100 → dashoffset is percent remaining (100 - pct). Never use 2πr.
    var offset = (PATH_LEN - pct).toFixed(2);
    c.style.transition = "none";
    c.setAttribute("stroke-dasharray", String(PATH_LEN));
    c.setAttribute("stroke-dashoffset", offset);
    c.style.strokeDasharray = String(PATH_LEN);
    c.style.strokeDashoffset = offset;
  }

  function animate(root) {
    var rings = root.querySelectorAll(".ring-fill");
    var bars = root.querySelectorAll(".wk-fill");
    // Snap rings to the final arc immediately (label already shows final %).
    // CSS tween from 100→target made mid-frame offsets look like pct×0.628 stubs.
    Array.prototype.forEach.call(rings, function (c) {
      setRingOffset(c, parseFloat(c.getAttribute("data-pct")) || 0);
    });
    function applyBars() {
      Array.prototype.forEach.call(bars, function (b) {
        b.style.width = b.getAttribute("data-w") + "%";
      });
    }
    if (reduceMotion) {
      applyBars();
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(applyBars);
    });
  }

  function draw(data) {
    var year = data.season && data.season.year;
    var denom = document.getElementById("metrics-denominators");
    if (denom) {
      denom.textContent =
        "Denominators: pushes are excluded. Season rings are pooled (sum of correct picks ÷ sum of eligible games), not an unweighted average of weekly rates. " +
        "ML grades the predicted winner; ATS and Totals are labelled leans (no demonstrated edge). " +
        "The 2026 live record will be a few hundred games; ATS and totals edges need thousands to detect. " +
        "2025 is a retrospective replay on closing lines with the published 10/90 blend — not a live sealed ledger.";
    }
    var noteEl = document.getElementById("metrics-note");
    if (noteEl) {
      var acad = (data.season && data.season.academicLabel) || year || "";
      noteEl.textContent =
        acad +
        " · 10/90 blend. Straight-up, against-the-spread lean and total lean accuracy by week. Small-sample weeks are faded.";
    }
    var seasonEl = document.getElementById("season-columns");
    renderSection(seasonEl, data || {});
    animate(seasonEl);
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      THIN_N = (meta && meta.smallSampleN) || 20;
      var retro = results[1];
      var live = results[2];
      var retroYear = window.AutopilotData.retrospectiveYear(meta);
      var liveY = window.AutopilotData.liveYear(meta);
      var toggle = document.getElementById("season-toggle");
      if (toggle) {
        toggle.innerHTML =
          '<button type="button" data-season="' +
          retroYear +
          '">' +
          (meta.retrospectiveLabel || retroYear + " (RETROSPECTIVE REPLAY)") +
          '</button><button type="button" data-season="' +
          liveY +
          '">' +
          (meta.liveLabel || liveY + " SEASON") +
          "</button>";
        toggle.onclick = function (e) {
          var btn = e.target.closest("button");
          if (!btn) return;
          toggle.querySelectorAll("button").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
          draw(Number(btn.dataset.season) === liveY ? live : retro);
        };
      }
      var initial = window.AutopilotData.defaultSeasonYear(meta);
      if (toggle) {
        var btn = toggle.querySelector('[data-season="' + initial + '"]');
        if (btn) btn.classList.add("active");
      }
      draw(initial === liveY ? live : retro);
    })
    .catch(function (err) {
      console.error("Failed to load metrics", err);
    });
})();
