// Team page: current-season rings and game log, then past seasons.
(function () {
  "use strict";

  var TEAMS = window.AutopilotData.TEAMS;
  // Later replay years (2021-2024) and a future live year slot in here.
  var SEASONS = [
    { year: 2025, kind: "replay", loader: function () { return window.AutopilotData.loadSeason(); } },
    { year: 2026, kind: "live", loader: function () { return window.AutopilotData.loadSeason2026(); } },
  ];
  var KINDS = [
    { key: "ml", field: "mlOutcome", short: "ML", color: "var(--win)" },
    { key: "ats", field: "atsOutcome", short: "ATS", color: "var(--accent)" },
    { key: "tot", field: "totOutcome", short: "Totals", color: "var(--push)" },
  ];
  var CIRC = 2 * Math.PI * 64;
  var reduceMotion = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isGradedGame(game) {
    if (!game) return false;
    return game.mlOutcome != null || game.atsOutcome != null || game.totOutcome != null;
  }

  function gradedCount(team) {
    if (!team) return 0;
    return (team.games || []).filter(isGradedGame).length;
  }

  function seasonHasGraded(data) {
    if (!data || !data.teams) return false;
    return Object.keys(data.teams).some(function (abbr) {
      return gradedCount(data.teams[abbr]) > 0;
    });
  }

  // One decimal, ties to even, matching the Metrics rings and the published modelAccuracy.
  function fmt1(v) {
    var x = v * 10;
    var f = Math.floor(x);
    if (x - f === 0.5) x = f % 2 === 0 ? f : f + 1;
    else x = Math.round(x);
    return (x / 10).toFixed(1);
  }

  function fmtMarket(v) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    var text = String(v);
    if (/^-?\d+$/.test(text)) text += ".0";
    else if (!/^-?\d+\.\d$/.test(text)) text = fmt1(v);
    return text + "%";
  }

  function gamesLabel(n) {
    return n + (n === 1 ? " game graded" : " games graded");
  }

  function replayIcon() {
    return (
      '<svg class="replay-icon" viewBox="0 0 24 24" role="img" aria-label="Retrospective replay year">' +
        '<title>Retrospective replay year</title>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 2.6-6.3"/>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 4v5h5"/>' +
      '</svg>'
    );
  }

  function outcomeHtml(value) {
    if (value === "win") return '<span class="out-win">WIN</span>';
    if (value === "loss") return '<span class="out-loss">LOSS</span>';
    if (value === "push") return '<span class="out-push">PUSH</span>';
    if (value === "tie") return '<span class="out-tie">TIE</span>';
    return '<span class="out-none">—</span>';
  }

  function scoreHtml(game) {
    if (game.won !== true && game.won !== false) return "—";
    if (game.teamScore == null || game.oppScore == null) return "—";
    return (game.won ? "W" : "L") + " " + game.teamScore + "\u2013" + game.oppScore;
  }

  function marketCounts(games, field) {
    var wins = 0;
    var losses = 0;
    (games || []).forEach(function (game) {
      if (game[field] === "win") wins += 1;
      else if (game[field] === "loss") losses += 1;
    });
    var n = wins + losses;
    return { wins: wins, losses: losses, pct: n ? (100 * wins) / n : null };
  }

  function poolReplay(rows, abbr, field) {
    var games = [];
    rows.forEach(function (row) {
      if (row.spec.kind !== "replay" || !row.data || !row.data.teams) return;
      var team = row.data.teams[abbr];
      if (team && team.games) games = games.concat(team.games);
    });
    return marketCounts(games, field);
  }

  function ringHtml(kind, agg, sizeClass) {
    var empty = agg.pct === null;
    var pct = empty ? 0 : agg.pct;
    var shown = empty ? "" : fmt1(pct);
    var num = empty
      ? '<span class="ring-dash">—</span>'
      : '<span data-count="' + shown + '">' + (reduceMotion ? shown : "0.0") + '</span><span class="unit">%</span>';
    return (
      '<div class="ring-card glass" style="--c:' + kind.color + '">' +
        '<div class="ring ' + sizeClass + '">' +
          '<svg viewBox="0 0 160 160" aria-hidden="true">' +
            '<circle class="ring-track" cx="80" cy="80" r="64"></circle>' +
            '<circle class="ring-fill" cx="80" cy="80" r="64" data-pct="' + (empty ? "0" : pct.toFixed(2)) + '" ' +
              'stroke-dasharray="' + CIRC.toFixed(2) + '" stroke-dashoffset="' + CIRC.toFixed(2) + '"></circle>' +
          '</svg>' +
          '<div class="ring-center">' +
            '<div class="ring-num">' + num + '</div>' +
            '<div class="ring-label">' + kind.short + ' accuracy</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function ringsHtml(sizeClass, aggFor) {
    return KINDS.map(function (kind) {
      return ringHtml(kind, aggFor(kind), sizeClass);
    }).join("");
  }

  function animate(root) {
    if (!root || !root.querySelectorAll) return;
    var rings = root.querySelectorAll(".ring-fill");
    function apply() {
      Array.prototype.forEach.call(rings, function (c) {
        var pct = parseFloat(c.getAttribute("data-pct")) || 0;
        c.style.strokeDashoffset = (CIRC * (1 - pct / 100)).toFixed(2);
      });
    }
    if (reduceMotion || !window.requestAnimationFrame) {
      apply();
      return;
    }
    window.requestAnimationFrame(function () { window.requestAnimationFrame(apply); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / 1100, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(1);
        if (t < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  function publishedAgg(team, key) {
    var acc = (team && team.modelAccuracy) || {};
    var value = acc[key];
    if (gradedCount(team) === 0 || typeof value !== "number") return { pct: null };
    return { pct: value };
  }

  function notFound() {
    document.getElementById("team-hero").innerHTML =
      '<h1>Team not found</h1><p style="color:var(--dim)">Try the <a href="./teams.html" style="color:var(--accent)">team list</a>.</p>';
    var current = document.getElementById("current-season");
    var past = document.getElementById("past-seasons");
    if (current) current.hidden = true;
    if (past) past.hidden = true;
    var log = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    if (log) log.innerHTML = "";
    if (empty) { empty.hidden = true; empty.textContent = ""; }
  }

  function renderLog(team, year) {
    var table = document.getElementById("game-log");
    var body = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    if (gradedCount(team) === 0) {
      if (body) body.innerHTML = "";
      if (table) table.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = "No graded games yet for " + year + ".";
      }
      return;
    }
    if (table) table.hidden = false;
    if (empty) { empty.hidden = true; empty.textContent = ""; }
    var games = (team.games || []).slice().sort(function (a, b) {
      return a.week - b.week || String(a.opponent).localeCompare(String(b.opponent));
    });
    body.innerHTML = games.map(function (game) {
      var place = game.isHome ? "vs" : "at";
      return (
        "<tr>" +
          "<td>" + game.week + "</td>" +
          "<td>" + place + ' <a class="team-link" href="./team.html?team=' + game.opponent + '">' + game.opponent + "</a></td>" +
          "<td>" + scoreHtml(game) + "</td>" +
          "<td>" + outcomeHtml(game.mlOutcome) + "</td>" +
          "<td>" + outcomeHtml(game.atsOutcome) + "</td>" +
          "<td>" + outcomeHtml(game.totOutcome) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderPast(past, abbr) {
    var section = document.getElementById("past-seasons");
    if (!past.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    var rings = document.getElementById("past-rings");
    rings.innerHTML = ringsHtml("ring-sm", function (kind) {
      return poolReplay(past, abbr, kind.field);
    });
    animate(rings);
    var rows = past.map(function (row) {
      var team = row.data.teams[abbr];
      var n = gradedCount(team);
      var acc = (team && team.modelAccuracy) || {};
      var icon = row.spec.kind === "replay" ? replayIcon() : "";
      var cell = function (value) { return n ? fmtMarket(value) : "—"; };
      return (
        '<tr class="past-year" data-kind="' + row.spec.kind + '">' +
          '<td><span class="past-year-label">' + icon + '<span class="past-year-num">' + row.spec.year + "</span></span></td>" +
          "<td>" + cell(acc.ml) + "</td>" +
          "<td>" + cell(acc.ats) + "</td>" +
          "<td>" + cell(acc.tot) + "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("past-years").innerHTML =
      '<table class="game-log-table past-year-table">' +
        "<thead><tr><th>Year</th><th>ML</th><th>ATS</th><th>Totals</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>";
    document.getElementById("replay-key").innerHTML =
      replayIcon() +
      '<span>Retrospective replay year: picks made week by week from earlier games only, then graded. Not a live record.</span>';
  }

  function render(current, past, abbr) {
    var team = current.data.teams[abbr];
    if (!team) {
      notFound();
      return;
    }
    var meta = TEAMS[abbr] || { name: team.name, color: "#333" };
    var year = current.spec.year;
    document.getElementById("page-title").textContent = meta.name + " — SDL Sports EDGE NFL";
    document.getElementById("team-hero").innerHTML =
      '<div class="crest glass" style="background:' + meta.color + "22; color:" + meta.color + "; border:1px solid " + meta.color + '55;">' + abbr + "</div>" +
      "<div>" +
        "<h1>" + meta.name + "</h1>" +
        '<div class="record-line">' + year + " season: " + team.record.wins + "\u2013" + team.record.losses + "</div>" +
      "</div>";

    document.getElementById("current-season").hidden = false;
    document.getElementById("current-heading").innerHTML =
      year + ' season <span class="season-kind">' + current.spec.kind + "</span>";
    var n = gradedCount(team);
    var rings = document.getElementById("current-rings");
    rings.innerHTML = ringsHtml("ring-lg", function (kind) {
      return n ? publishedAgg(team, kind.key) : { pct: null };
    });
    animate(rings);
    document.getElementById("current-caption").textContent = gamesLabel(n);
    renderLog(team, year);
    renderPast(past, abbr);
  }

  function loadSpecs(specs) {
    return Promise.all(specs.map(function (spec) {
      return Promise.resolve().then(function () { return spec.loader(); }).then(function (data) {
        return { spec: spec, data: data };
      }).catch(function () {
        return { spec: spec, data: null };
      });
    }));
  }

  function pickCurrent(loaded) {
    var usable = loaded.filter(function (row) { return row.data && row.data.teams; });
    var live = usable.filter(function (row) {
      return row.spec.kind === "live" && seasonHasGraded(row.data);
    });
    if (live.length) return live[live.length - 1];
    var replay = usable.filter(function (row) { return row.spec.kind === "replay"; });
    return replay.length ? replay[replay.length - 1] : null;
  }

  var specs = SEASONS.slice();
  var extra = (window.AutopilotData && window.AutopilotData.extraSeasons) || [];
  extra.forEach(function (item) {
    specs.push({
      year: item.year,
      kind: item.kind,
      loader: function () { return Promise.resolve(item.data); },
    });
  });
  specs.sort(function (a, b) { return a.year - b.year; });

  loadSpecs(specs).then(function (loaded) {
    var params = new URLSearchParams(window.location.search);
    var abbr = (params.get("team") || "").toUpperCase();
    var current = pickCurrent(loaded);
    if (!current || !current.data.teams[abbr]) {
      notFound();
      return;
    }
    var past = loaded.filter(function (row) {
      return row.data && row.data.teams && row.spec.year < current.spec.year;
    }).sort(function (a, b) { return b.spec.year - a.spec.year; });
    render(current, past, abbr);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
