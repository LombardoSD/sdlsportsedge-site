// Home page (index.html) rendering.
(function () {
  "use strict";

  var TEAMS = window.AutopilotData.TEAMS;

  function countUp(el, target, opts) {
    opts = opts || {};
    var duration = opts.duration || 1100;
    var decimals = opts.decimals || 0;
    var t0 = null;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / duration);
      var v = target * ease(p);
      el.textContent = decimals ? v.toFixed(decimals) : Math.round(v);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = decimals ? target.toFixed(decimals) : target;
    }
    requestAnimationFrame(step);
  }

  // Headline numbers: the current season, tracked live. The 2025 numbers are a retrospective
  // reconstruction (not a live record), so they are shown separately and never pooled with 2026.
  function seasonRecord(d, key) {
    var r = d.season[key];
    var w = r.wins, l = r.losses;
    return { wins: w, losses: l, tie: r.tie || 0, push: r.push || 0, pct: w + l ? (100 * w) / (w + l) : 0 };
  }

  function renderStats(live, retro) {
    var main = live || retro;
    [
      ["stat-ml-pct", "stat-ml-sub", seasonRecord(main, "ml")],
      ["stat-ats-pct", "stat-ats-sub", seasonRecord(main, "ats")],
      ["stat-tot-pct", "stat-tot-sub", seasonRecord(main, "tot")],
    ].forEach(function (entry) {
      var pctEl = document.getElementById(entry[0]);
      var subEl = document.getElementById(entry[1]);
      var rec = entry[2];
      countUp(pctEl, Math.round(rec.pct * 10) / 10, { decimals: 1 });
      var extra = rec.tie ? ", " + rec.tie + " tie" : rec.push ? ", " + rec.push + " push" : "";
      subEl.textContent = rec.wins + "–" + rec.losses + extra;
    });
    var year = main.season.year;
    var games = main.season.gamesGraded;
    document.getElementById("stat-caption").textContent = live
      ? year + " · tracked live · " + games + " graded games so far (small sample)"
      : year + " · retrospective reconstruction, not a live record · " + games + " graded games";
    var retroEl = document.getElementById("stat-caption-retro");
    if (live && retro) {
      var fmt = function (k) { return seasonRecord(retro, k).pct.toFixed(1) + "%"; };
      retroEl.textContent = retro.season.year + " · retrospective, not a live record · Moneyline " + fmt("ml") +
        " · Spread " + fmt("ats") + " · Totals " + fmt("tot") + " · " + retro.season.gamesGraded + " graded games";
    } else {
      retroEl.textContent = "";
    }
  }

  function mostRecentFullWeek(data) {
    var fullWeeks = data.weekly.filter(function (w) { return w.games >= 8; });
    var pool = fullWeeks.length ? fullWeeks : data.weekly;
    return pool[pool.length - 1].week;
  }

  function currentWeek(data) {
    return Math.max.apply(null, data.games.map(function (g) { return g.week; }));
  }

  // Preview the live 2026 season's current week when available; otherwise the
  // most recent full week of the 2025 season.
  function renderBoardPreview(live, fallback) {
    var isLive = !!(live && live.games && live.games.length);
    var data = isLive ? live : fallback;
    var week = isLive ? currentWeek(live) : mostRecentFullWeek(fallback);
    var games = data.games.filter(function (g) { return g.week === week; }).slice(0, 8);
    document.getElementById("board-tag").textContent = isLive
      ? data.season.year + " Season · Week " + week + " · Current Week"
      : "Week " + week + " · Most Recent Results";
    document.getElementById("board-grid").innerHTML = window.AutopilotBoard.renderTable(games);
  }

  function renderChart(data) {
    document.getElementById("performance-note").textContent =
      "Straight-up accuracy by week, " + data.season.year + " season. Every graded game, no exclusions.";
    var byWeek = {};
    data.weekly.forEach(function (w) { byWeek[w.week] = w; });
    var scheduled = {};
    data.games.forEach(function (g) { scheduled[g.week] = (scheduled[g.week] || 0) + 1; });
    var total = data.season.scheduledWeeks || data.weekly.length;
    var weeks = [];
    for (var k = 1; k <= total; k++) weeks.push(k);

    var svg = document.getElementById("chart-svg");
    var labelsEl = document.getElementById("chart-labels");
    var W = 1000, H = 220, padTop = 10, padBottom = 6;
    var n = weeks.length;
    var gap = 6;
    var barW = (W - gap * (n - 1)) / n;
    var avg = data.season.ml.pct;
    var withPct = data.weekly.filter(function (w) { return w.ml.pct !== null; });
    var worst = withPct.reduce(function (a, b) { return b.ml.pct < a.ml.pct ? b : a; }, withPct[0]);

    function yFor(pct) { return padTop + (H - padTop - padBottom) * (1 - pct / 100); }

    var bars = weeks.map(function (wk, i) {
      var x = i * (barW + gap);
      var w = byWeek[wk];
      if (!w) {
        return (
          '<rect class="bar-rect pending" x="' + x.toFixed(1) + '" y="' + (H - padBottom - 3) + '" ' +
            'width="' + barW.toFixed(1) + '" height="3" rx="1.5"><title>Week ' + wk + ': not played yet</title></rect>'
        );
      }
      var pct = w.ml.pct || 0;
      var cls = "bar-rect";
      if (worst && w.week === worst.week) cls += " worst";
      else if (pct >= avg) cls += " above";
      var isPartial = w.games < (scheduled[wk] || 0);
      if (isPartial) cls += " partial";
      var partial = isPartial ? " — in progress" : "";
      return (
        '<rect class="' + cls + '" data-week="' + wk + '" x="' + x.toFixed(1) + '" y="' + (H - padBottom) + '" ' +
          'width="' + barW.toFixed(1) + '" height="0" rx="2">' +
          '<title>Week ' + w.week + ': ' + w.ml.wins + '–' + w.ml.losses + ' (' + pct + '%)' + partial + '</title>' +
        '</rect>'
      );
    }).join("");

    var avgY = yFor(avg);
    var avgLine =
      '<line class="avg-line" x1="0" y1="' + avgY.toFixed(1) + '" x2="' + W + '" y2="' + avgY.toFixed(1) + '"></line>' +
      '<text class="avg-label" x="' + (W - 2) + '" y="' + (avgY - 6).toFixed(1) + '" text-anchor="end">SEASON AVG ' + avg.toFixed(1) + '%</text>';

    svg.innerHTML = bars + avgLine;

    requestAnimationFrame(function () {
      setTimeout(function () {
        var rects = svg.querySelectorAll("rect.bar-rect[data-week]");
        Array.prototype.forEach.call(rects, function (r, i) {
          var w = byWeek[Number(r.getAttribute("data-week"))];
          var pct = w.ml.pct || 0;
          var y = yFor(pct);
          var h = H - padBottom - y;
          r.style.transition = "y 0.7s cubic-bezier(0.22,1,0.36,1) " + (i * 16) + "ms, height 0.7s cubic-bezier(0.22,1,0.36,1) " + (i * 16) + "ms";
          r.setAttribute("y", y.toFixed(1));
          r.setAttribute("height", Math.max(0, h).toFixed(1));
        });
      }, 60);
    });

    labelsEl.innerHTML = weeks.map(function (wk) { return "<span>" + wk + "</span>"; }).join("");
  }

  function renderTeamsPreview(data) {
    var teams = Object.values(data.teams)
      .filter(function (t) { return t.modelAccuracy.ml !== null; })
      .sort(function (a, b) { return b.modelAccuracy.ml - a.modelAccuracy.ml; })
      .slice(0, 8);

    document.getElementById("teams-grid").innerHTML = teams.map(function (t) {
      var color = (TEAMS[t.abbr] || {}).color || "#333";
      return (
        '<a class="team-tile glass" href="./team.html?team=' + t.abbr + '" style="border-top:2px solid ' + color + '">' +
          '<div class="abbr">' + t.abbr + '</div>' +
          '<div class="acc">' + t.modelAccuracy.ml + '% ML</div>' +
        '</a>'
      );
    }).join("");
  }

  Promise.all([
    window.AutopilotData.loadSeason(),
    window.AutopilotData.loadSeason2026().catch(function () { return null; }),
  ]).then(function (results) {
    var data2025 = results[0];
    var data2026 = results[1];
    var current = data2026 && data2026.weekly && data2026.weekly.length ? data2026 : data2025;
    renderStats(data2026 && data2026.weekly && data2026.weekly.length ? data2026 : null, data2025);
    renderBoardPreview(data2026, data2025);
    renderChart(current);
    renderTeamsPreview(data2025);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
