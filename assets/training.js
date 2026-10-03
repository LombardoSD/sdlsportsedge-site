// Training page: walk-forward weekly logloss/accuracy table with deltas + narrative.
(function () {
  "use strict";

  function isRegularSeason(week) { return week <= 18; }

  function normalizeSeason(seasonData) {
    var byWeek = {};
    seasonData.weekly.forEach(function (w) { byWeek[w.week] = w; });
    var last = (seasonData.season && seasonData.season.scheduledWeeks) ||
      Math.max.apply(null, seasonData.weekly.map(function (w) { return w.week; }));

    var rows = [];
    for (var week = 1; week <= last; week++) {
      var w = byWeek[week];
      if (!w) { rows.push({ week: week, graded: false }); continue; }
      rows.push({
        week: week, graded: true,
        suPct: w.ml.pct, suLogloss: w.mlLogloss,
        atsPct: w.ats.pct, atsLogloss: w.atsLogloss,
        totPct: w.tot.pct, totLogloss: w.totLogloss,
      });
    }
    return rows;
  }

  function fmt(v, decimals) {
    return v === null || v === undefined ? "—" : v.toFixed(decimals);
  }

  function arrow(delta, higherIsBetter) {
    if (delta === null) return '<span class="dim">—</span>';
    var improved = higherIsBetter ? delta > 0.05 : delta < -0.0005;
    var worse = higherIsBetter ? delta < -0.05 : delta > 0.0005;
    if (improved) return '<span class="pill-hit">▲</span>';
    if (worse) return '<span class="pill-miss">▼</span>';
    return '<span class="dim">■</span>';
  }

  function withDeltas(rows) {
    var out = [];
    var prev = null;
    rows.forEach(function (r) {
      if (!r.graded) { out.push(r); return; }
      var d = prev ? {
        suLogloss: r.suLogloss - prev.suLogloss, atsLogloss: r.atsLogloss - prev.atsLogloss, totLogloss: r.totLogloss - prev.totLogloss,
        suPct: r.suPct - prev.suPct, atsPct: r.atsPct - prev.atsPct, totPct: r.totPct - prev.totPct,
      } : null;
      out.push(Object.assign({}, r, { delta: d }));
      prev = r;
    });
    return out;
  }

  function renderTable(rows) {
    document.getElementById("training-body").innerHTML = rows.map(function (r) {
      if (!r.graded) {
        return '<tr style="opacity:0.4"><td>' + r.week + '</td><td colspan="12">Not yet graded</td></tr>';
      }
      var d = r.delta;
      return (
        '<tr>' +
          '<td>' + r.week + '</td>' +
          '<td>' + fmt(r.suLogloss, 3) + '</td><td>' + (d ? arrow(-d.suLogloss, true) : "—") + '</td>' +
          '<td>' + fmt(r.atsLogloss, 3) + '</td><td>' + (d ? arrow(-d.atsLogloss, true) : "—") + '</td>' +
          '<td>' + fmt(r.totLogloss, 3) + '</td><td>' + (d ? arrow(-d.totLogloss, true) : "—") + '</td>' +
          '<td>' + fmt(r.suPct, 1) + '%</td><td>' + (d ? arrow(d.suPct, true) : "—") + '</td>' +
          '<td>' + fmt(r.atsPct, 1) + '%</td><td>' + (d ? arrow(d.atsPct, true) : "—") + '</td>' +
          '<td>' + fmt(r.totPct, 1) + '%</td><td>' + (d ? arrow(d.totPct, true) : "—") + '</td>' +
        '</tr>'
      );
    }).join("");
  }

  function renderNarrative(rows) {
    var graded = rows.filter(function (r) { return r.graded; });
    var tabs = document.getElementById("narrative-tabs");
    tabs.innerHTML = graded.map(function (r) { return '<button data-week="' + r.week + '">Week ' + r.week + '</button>'; }).join("");

    function show(week) {
      var r = graded.find(function (x) { return x.week === week; });
      if (!r) return;
      tabs.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", Number(b.dataset.week) === week); });
      var d = r.delta;
      function deltaLine(label, val, unit, higherIsBetter) {
        if (!d || val === undefined) return "• " + label + " Δ: n/a";
        var dir = (higherIsBetter ? val > 0 : val < 0) ? "improved" : (val === 0 ? "flat" : "worse");
        return "• " + label + " Δ: " + (val > 0 ? "+" : "") + val.toFixed(unit === "%" ? 1 : 3) + unit + " (" + dir + ")";
      }
      document.getElementById("narrative-box").innerHTML =
        '<p style="margin:0 0 12px; font-family: var(--font-display); font-size:1.1rem;">Week ' + r.week + '</p>' +
        '<p style="color:var(--dim); margin:0 0 14px;">Headline: SU ' + fmt(r.suPct, 1) + '% · ATS ' + fmt(r.atsPct, 1) + '% · Totals ' + fmt(r.totPct, 1) + '%</p>' +
        '<p style="color:var(--faint); font-family:var(--font-mono); font-size:0.82rem; line-height:1.9; margin:0;">' +
          deltaLine("SU accuracy", d && d.suPct, "%", true) + '<br>' +
          deltaLine("ATS accuracy", d && d.atsPct, "%", true) + '<br>' +
          deltaLine("Totals accuracy", d && d.totPct, "%", true) +
        '</p>';
    }

    tabs.onclick = function (e) {
      var btn = e.target.closest("button");
      if (btn) show(Number(btn.dataset.week));
    };
    if (graded.length) show(graded[graded.length - 1].week);
  }

  function render(rows) {
    var reg = withDeltas(rows.filter(function (r) { return isRegularSeason(r.week); }));
    var post = withDeltas(rows.filter(function (r) { return !isRegularSeason(r.week); }));
    renderTable(reg.concat(post));
    renderNarrative(reg.concat(post));
  }

  Promise.all([
    window.AutopilotData.loadSeason(),
    window.AutopilotData.loadSeason2026().catch(function () { return null; }),
  ]).then(function (results) {
    var rows2025 = normalizeSeason(results[0]);
    var rows2026 = results[1] ? normalizeSeason(results[1]) : null;

    var toggle = document.getElementById("season-toggle");
    if (!rows2026) toggle.querySelector('[data-season="2026"]').style.display = "none";

    toggle.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      toggle.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b === btn); });
      render(btn.dataset.season === "2026" ? rows2026 : rows2025);
    });

    render(rows2025);
  }).catch(function (err) { console.error("Failed to load training data", err); });
})();
