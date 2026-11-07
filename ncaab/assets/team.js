// Single-team page: NFL-style rings, game log, past seasons (directive 019).
(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var teamId = params.get("team");
  var MODEL = "ridge"; // Ridge only (directive 025)
  var meta = null;
  var live = null;
  var retro = null;
  var CIRC = 2 * Math.PI * 64;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KINDS = [
    { key: "ml", field: "ml", short: "ML", label: "ML accuracy", color: "var(--win)" },
    { key: "ats", field: "ats", short: "ATS", label: "ATS accuracy", color: "var(--accent)" },
    { key: "tot", field: "tot", short: "Totals", label: "Totals accuracy", color: "var(--push)" },
  ];

  function outcomeHtml(value) {
    if (value === "win") return '<span class="out-win">WIN</span>';
    if (value === "loss") return '<span class="out-loss">LOSS</span>';
    if (value === "push") return '<span class="out-push">PUSH</span>';
    return '<span class="out-none">—</span>';
  }

  function replayIcon() {
    return (
      '<svg class="replay-icon" viewBox="0 0 24 24" role="img" aria-label="Retrospective replay year">' +
      '<title>Retrospective replay year</title>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 2.6-6.3"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 4v5h5"/>' +
      "</svg>"
    );
  }

  function fmt1(v) {
    if (v == null || !isFinite(v)) return null;
    return (Math.round(v * 10) / 10).toFixed(1);
  }

  function teamFrom(season) {
    return season && season.teams ? season.teams[teamId] : null;
  }

  function pickOutcome(season, gameId, market, model) {
    var g = (season.games || []).find(function (x) {
      return x.gameId === gameId;
    });
    if (!g) return null;
    var pick = ((g.arms || {})[model] || {})[market];
    return pick ? pick.outcome : null;
  }

  function marketAgg(season, team, market, model) {
    var wins = 0,
      losses = 0;
    (team.games || []).forEach(function (tg) {
      var o = pickOutcome(season, tg.gameId, market, model);
      if (o === "win") wins += 1;
      else if (o === "loss") losses += 1;
    });
    var n = wins + losses;
    return { wins: wins, losses: losses, pct: n ? (100 * wins) / n : null, n: n };
  }

  function gradedCount(season, team, model) {
    return (team.games || []).filter(function (tg) {
      return (
        pickOutcome(season, tg.gameId, "ml", model) != null ||
        pickOutcome(season, tg.gameId, "ats", model) != null ||
        pickOutcome(season, tg.gameId, "tot", model) != null
      );
    }).length;
  }

  function ringHtml(kind, agg) {
    var empty = agg.pct === null;
    var pct = empty ? 0 : agg.pct;
    var shown = empty ? "" : fmt1(pct);
    var num = empty
      ? '<span class="ring-dash">—</span>'
      : '<span data-count="' +
        shown +
        '">' +
        (reduceMotion ? shown : "0.0") +
        '</span><span class="unit">%</span>';
    var record = empty
      ? "— · 0 graded"
      : agg.wins + "–" + agg.losses + " · " + (agg.wins + agg.losses) + " graded";
    return (
      '<div class="ring-card glass" style="--c:' +
      kind.color +
      '">' +
      '<div class="ring">' +
      '<svg viewBox="0 0 160 160" aria-hidden="true">' +
      '<circle class="ring-track" cx="80" cy="80" r="64"></circle>' +
      '<circle class="ring-fill" cx="80" cy="80" r="64" data-pct="' +
      (empty ? "0" : pct.toFixed(2)) +
      '" stroke-dasharray="' +
      CIRC.toFixed(2) +
      '" stroke-dashoffset="' +
      CIRC.toFixed(2) +
      '"></circle>' +
      "</svg>" +
      '<div class="ring-center">' +
      '<div class="ring-num">' +
      num +
      "</div>" +
      "</div></div>" +
      '<div class="ring-label">' +
      (kind.label || kind.short + " accuracy") +
      "</div>" +
      '<div class="ring-record">' +
      record +
      "</div></div>"
    );
  }

  function animate(root) {
    if (!root) return;
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
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(apply);
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / 1100, 1);
        el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(1);
        if (t < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  function renderHero(team, season, source) {
    var colors = window.AutopilotData.TEAMS[teamId] || {};
    var abbr = team.abbr || colors.abbr || teamId;
    var name = colors.fullName || team.name || team.location;
    var color = colors.color || "#3a4150";
    var acad = season.academicLabel || "";
    var wl = (team.record && team.record.wins) || 0;
    var ll = (team.record && team.record.losses) || 0;
    var liveLabel = source === "live" ? acad + " season" : acad + " retrospective replay";
    document.title = name + " — SDL Sports EDGE NCAAM Basketball";
    var F = window.AutopilotFormat;
    // Prefer ESPN primary (color/alternate are often white for many schools).
    var candidate = colors.primaryColor || colors.color || color || "#3a4150";
    var alt = colors.alternateColor || colors.color || candidate;
    var bg =
      F && F.resolveBannerColor ? F.resolveBannerColor(candidate, alt) : candidate;
    // If resolve still lands on a light fill, fall back to primary / dark navy.
    if (
      F &&
      F.contrastRatio &&
      F.contrastRatio("#0b0d12", bg) < 2.5 &&
      colors.primaryColor
    ) {
      bg = colors.primaryColor;
    }
    var fg =
      F && F.contrastRatio && F.contrastRatio("#ffffff", bg) >= 3 ? "#ffffff" : "#0b0d12";
    document.getElementById("team-hero").innerHTML =
      '<div class="glass team-hero-card" style="padding:24px;margin:28px 0 12px">' +
      '<div class="team-hero-top">' +
      '<span class="team-abbr-badge" style="background:' +
      bg +
      ";color:" +
      fg +
      '">' +
      abbr +
      "</span>" +
      "<div><h1 style=\"margin:0 0 6px;font-family:var(--font-display)\">" +
      name +
      "</h1>" +
      '<p style="color:var(--dim);margin:0">' +
      liveLabel +
      ": " +
      wl +
      "–" +
      ll +
      "</p></div></div></div>";
  }

  function renderLog(season, team, model) {
    var body = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    var table = document.getElementById("game-log");
    var games = (team.games || []).slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    if (!games.length) {
      body.innerHTML = "";
      table.hidden = true;
      empty.hidden = false;
      empty.textContent = "No graded games for this team in the selected season.";
      return;
    }
    table.hidden = false;
    empty.hidden = true;
    body.innerHTML = games
      .map(function (g) {
        var oppMeta = season.teams[g.opponent] || {};
        var opp = (window.AutopilotData.TEAMS[g.opponent] || {}).fullName || oppMeta.name || g.opponent;
        var vs = g.neutral ? "vs" : g.home ? "vs" : "at";
        var gameLabel = vs + " " + opp + (g.neutral ? " (N)" : "");
        var score =
          g.teamScore == null ? "—" : (g.won ? "W " : "L ") + g.teamScore + "–" + g.oppScore;
        return (
          "<tr>" +
          "<td>" +
          g.date +
          "</td>" +
          "<td>" +
          gameLabel +
          "</td>" +
          "<td>" +
          score +
          "</td>" +
          "<td>" +
          outcomeHtml(pickOutcome(season, g.gameId, "ml", model)) +
          "</td>" +
          "<td>" +
          outcomeHtml(pickOutcome(season, g.gameId, "ats", model)) +
          "</td>" +
          "<td>" +
          outcomeHtml(pickOutcome(season, g.gameId, "tot", model)) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderCurrent(season, source) {
    var team = teamFrom(season);
    var model = MODEL;
    var section = document.getElementById("current-season");
    if (!team) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var acad = season.academicLabel || "";
    var kind = source === "live" ? "season" : "retrospective replay";
    document.getElementById("current-heading").textContent =
      acad + " " + kind + " · Ridge";
    var rings = document.getElementById("current-rings");
    var n = gradedCount(season, team, model);
    if (source === "live" && n === 0) {
      rings.innerHTML = KINDS.map(function (k) {
        return ringHtml(k, { pct: null });
      }).join("");
      document.getElementById("current-caption").textContent = "0 games graded";
    } else {
      rings.innerHTML = KINDS.map(function (k) {
        return ringHtml(k, marketAgg(season, team, k.key, model));
      }).join("");
      document.getElementById("current-caption").textContent =
        n + (n === 1 ? " game graded" : " games graded");
    }
    animate(rings);
    renderLog(season, team, model);
  }

  function renderPast() {
    var section = document.getElementById("past-seasons");
    var team = teamFrom(retro);
    if (!team || !gradedCount(retro, team, MODEL)) {
      // Still show retrospective marker row when live is active current.
      if (!team) {
        section.hidden = true;
        return;
      }
    }
    section.hidden = false;
    var model = MODEL;
    var rings = document.getElementById("past-rings");
    rings.innerHTML = KINDS.map(function (k) {
      return ringHtml(k, marketAgg(retro, team, k.key, model));
    }).join("");
    animate(rings);
    var acad = retro.academicLabel || meta.retrospectiveLabel || "2025–26";
    var n = gradedCount(retro, team, model);
    document.getElementById("past-years").innerHTML =
      '<table class="game-log-table"><thead><tr><th>Year</th><th>ML</th><th>ATS</th><th>Tot</th><th>Games</th></tr></thead><tbody>' +
      "<tr>" +
      "<td>" +
      replayIcon() +
      " " +
      acad +
      "</td>" +
      "<td>" +
      (fmt1(marketAgg(retro, team, "ml", model).pct) || "—") +
      (marketAgg(retro, team, "ml", model).pct != null ? "%" : "") +
      "</td>" +
      "<td>" +
      (fmt1(marketAgg(retro, team, "ats", model).pct) || "—") +
      (marketAgg(retro, team, "ats", model).pct != null ? "%" : "") +
      "</td>" +
      "<td>" +
      (fmt1(marketAgg(retro, team, "tot", model).pct) || "—") +
      (marketAgg(retro, team, "tot", model).pct != null ? "%" : "") +
      "</td>" +
      "<td>" +
      n +
      "</td>" +
      "</tr></tbody></table>";
    document.getElementById("replay-key").innerHTML =
      replayIcon() +
      " marks a retrospective-replay season (walk-forward on committed data — not a live record).";
  }

  function refresh() {
    var year = window.AutopilotData.defaultSeasonYear(meta);
    var current = year === meta.liveSeason ? live : retro;
    var source = year === meta.liveSeason ? "live" : "retrospective";
    var team = teamFrom(current);
    if (!team) {
      document.getElementById("team-hero").innerHTML =
        '<div class="glass" style="padding:24px">Team not found. <a href="./teams.html">Back to teams</a></div>';
      document.getElementById("current-season").hidden = true;
      document.getElementById("past-seasons").hidden = true;
      return;
    }
    renderHero(team, current, source);
    renderCurrent(current, source);
    // Past seasons: show retrospective when current is live; when current is retro, past is still that year table.
    renderPast();
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadColors(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      retro = results[2];
      live = results[3];
      refresh();
    })
    .catch(function (err) {
      console.error(err);
    });
})();
