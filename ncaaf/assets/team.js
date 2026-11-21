// NCAAF team page against kit team.html + flat season.teams[*].games export.
(function () {
  "use strict";

  var meta = null;
  var retro = null;
  var live = null;
  var CIRC = 2 * Math.PI * 52;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function teamId() {
    return new URLSearchParams(window.location.search).get("team") || "";
  }

  function teamFrom(season) {
    var id = teamId();
    return (season && season.teams && season.teams[id]) || null;
  }

  function fmtPct(v) {
    return v == null ? "—" : (Math.round(v * 10) / 10).toFixed(1) + "%";
  }

  function outcomeHtml(o) {
    if (o === "win") return '<span class="gb-outcome win">W</span>';
    if (o === "loss") return '<span class="gb-outcome loss">L</span>';
    if (o === "push") return '<span class="gb-outcome push">P</span>';
    return "—";
  }

  function ringHtml(label, pct) {
    var p = pct == null ? 0 : pct;
    return (
      '<div class="ring-card glass" style="--c:var(--accent)">' +
      '<div class="ring"><svg viewBox="0 0 140 140" aria-hidden="true">' +
      '<circle class="ring-track" cx="70" cy="70" r="52"></circle>' +
      '<circle class="ring-fill" cx="70" cy="70" r="52" data-pct="' +
      p.toFixed(2) +
      '" stroke-dasharray="' +
      CIRC.toFixed(2) +
      '" stroke-dashoffset="' +
      CIRC.toFixed(2) +
      '"></circle></svg>' +
      '<div class="ring-center"><div class="ring-num">' +
      fmtPct(pct) +
      '</div><div class="ring-label">' +
      label +
      "</div></div></div></div>"
    );
  }

  function animate(root) {
    Array.prototype.forEach.call(root.querySelectorAll(".ring-fill"), function (c) {
      var pct = parseFloat(c.getAttribute("data-pct") || "0");
      c.style.strokeDashoffset = (CIRC * (1 - pct / 100)).toFixed(2);
      if (reduceMotion) c.style.transition = "none";
    });
  }

  function renderHero(season) {
    var t = teamFrom(season);
    var el = document.getElementById("team-hero");
    if (!el) return;
    if (!t) {
      el.innerHTML = "<p>Team not found.</p>";
      return;
    }
    var chrome = (window.AutopilotData.TEAMS && window.AutopilotData.TEAMS[teamId()]) || {};
    var edition =
      ((document.querySelector(".footer-edition") || {}).textContent || "NCAA Football").trim();
    document.title = (chrome.fullName || t.name) + " — SDL Sports EDGE " + edition;
    var color = chrome.color || "#3a4150";
    el.innerHTML =
      '<div class="glass" style="padding:1rem;border-top:3px solid ' +
      color +
      '"><h1 style="margin:0 0 6px;font-family:var(--font-display)">' +
      (chrome.fullName || t.name) +
      "</h1>" +
      '<p style="color:var(--dim);margin:0">' +
      (t.conference || "") +
      " · " +
      ((season.season && season.season.academicLabel) || "") +
      " · ML " +
      fmtPct(t.modelAccuracy && t.modelAccuracy.ml) +
      " · ATS lean " +
      fmtPct(t.modelAccuracy && t.modelAccuracy.ats) +
      "</p></div>";
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function seasonGame(season, gameId) {
    var games = (season && season.games) || [];
    var id = String(gameId);
    for (var i = 0; i < games.length; i++) {
      if (games[i] && String(games[i].gameId) === id) return games[i];
    }
    return null;
  }

  function kickoffMinutes(kickoff) {
    var match = String(kickoff || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 9999;
    var hour = Number(match[1]) % 12;
    if (/pm/i.test(match[3])) hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function kickoffKey(season, row) {
    var game = seasonGame(season, row && row.gameId);
    if (!game) return "9|" + (row && row.week != null ? row.week : 99);
    var minutes = String(kickoffMinutes(game.kickoff));
    while (minutes.length < 4) minutes = "0" + minutes;
    return "0|" + (game.date || "") + "|" + minutes + "|" + (game.gameId || "");
  }

  function dateCell(row, game) {
    var week = row && row.week != null ? row.week : game && game.week;
    var weekHtml = week != null ? '<span class="team-log-week">Wk ' + week + "</span>" : "";
    var dayHtml = "";
    var iso = game && game.date;
    if (iso) {
      var parts = String(iso).split("-");
      if (parts.length === 3) {
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        if (month && day && month >= 1 && month <= 12) {
          dayHtml = '<span class="team-log-day">' + MONTHS[month - 1] + " " + day + "</span>";
        }
      }
    }
    if (!dayHtml && !weekHtml) return "—";
    return '<span class="team-log-date">' + dayHtml + weekHtml + "</span>";
  }

  function scoreCell(row, game) {
    if (!game || game.final !== true) return "—";
    var home = Number(game.homeScore);
    var away = Number(game.awayScore);
    if (!isFinite(home) || !isFinite(away)) return "—";
    var teamScore = row && row.home ? home : away;
    var oppScore = row && row.home ? away : home;
    var mark = teamScore > oppScore ? "W " : teamScore < oppScore ? "L " : "";
    return mark + teamScore + "\u2013" + oppScore;
  }

  function renderLog(season) {
    var t = teamFrom(season);
    var body = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    var table = document.getElementById("game-log");
    var section = document.getElementById("current-season");
    if (!t) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    document.getElementById("current-heading").textContent =
      ((season.season && season.season.academicLabel) || "") + " · 10/90 blend";
    var acc = t.modelAccuracy || {};
    var rings = document.getElementById("current-rings");
    rings.innerHTML =
      ringHtml("ML", acc.ml) +
      ringHtml("ATS lean", acc.ats) +
      ringHtml("TOT lean", acc.tot);
    animate(rings);
    var games = (t.games || []).slice().sort(function (a, b) {
      return kickoffKey(season, a) < kickoffKey(season, b) ? -1 : 1;
    });
    document.getElementById("current-caption").textContent =
      games.filter(function (g) {
        return g.final;
      }).length + " graded games";
    if (!games.length) {
      body.innerHTML = "";
      table.hidden = true;
      empty.hidden = false;
      empty.textContent = "No games for this team on the selected board.";
      return;
    }
    table.hidden = false;
    empty.hidden = true;
    // Repurpose Date/Game/Score/ML/ATS/Tot columns.
    body.innerHTML = games
      .map(function (g) {
        var oppMeta = (season.teams && season.teams[g.opponent]) || {};
        var opp =
          (window.AutopilotData.TEAMS[g.opponent] || {}).abbr ||
          oppMeta.abbr ||
          g.opponent;
        var game = seasonGame(season, g.gameId);
        return (
          "<tr><td>" +
          dateCell(g, game) +
          "</td><td>" +
          (g.home ? "vs " : "@ ") +
          opp +
          "</td><td>" +
          scoreCell(g, game) +
          "</td><td>" +
          (g.pickedMl ? outcomeHtml(g.mlOutcome) : "—") +
          "</td><td>" +
          (g.pickedAts ? outcomeHtml(g.atsOutcome) : "—") +
          "</td><td>" +
          (g.pickedTot ? outcomeHtml(g.totOutcome) : "—") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function recordText(rows, pickedKey, outcomeKey) {
    var w = 0;
    var l = 0;
    var p = 0;
    (rows || []).forEach(function (g) {
      if (!g || !g[pickedKey]) return;
      if (g[outcomeKey] === "win") w += 1;
      else if (g[outcomeKey] === "loss") l += 1;
      else if (g[outcomeKey] === "push") p += 1;
    });
    if (!w && !l && !p) return "—";
    var body = w + "\u2013" + l;
    if (p) body += "\u2013" + p + "P";
    return body;
  }

  function renderNoLive() {
    var section = document.getElementById("current-season");
    section.hidden = false;
    var year = window.AutopilotData.liveYear(meta);
    document.getElementById("current-heading").textContent = year + " · 10/90 blend";
    document.getElementById("current-rings").innerHTML = "";
    document.getElementById("current-caption").textContent = "";
    document.getElementById("game-log").hidden = true;
    document.getElementById("game-log-body").innerHTML = "";
    var empty = document.getElementById("game-log-empty");
    empty.hidden = false;
    empty.textContent = "No " + year + " games for this team.";
  }

  function renderPast(team) {
    var section = document.getElementById("past-seasons");
    if (!team) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var acc = team.modelAccuracy || {};
    var rings = document.getElementById("past-rings");
    rings.innerHTML =
      ringHtml("ML", acc.ml) +
      ringHtml("ATS lean", acc.ats) +
      ringHtml("TOT lean", acc.tot);
    animate(rings);
    var year = (retro.season && retro.season.academicLabel) || "2025";
    var games = team.games || [];
    document.getElementById("past-years").innerHTML =
      '<table class="game-log-table"><thead><tr><th>Year</th><th>ML</th><th>ATS lean</th><th>TOT lean</th><th>Games</th></tr></thead><tbody><tr><td>' +
      year +
      " · replay</td><td>" +
      recordText(games, "pickedMl", "mlOutcome") +
      "</td><td>" +
      recordText(games, "pickedAts", "atsOutcome") +
      "</td><td>" +
      recordText(games, "pickedTot", "totOutcome") +
      "</td><td>" +
      games.length +
      "</td></tr></tbody></table>";
    document.getElementById("replay-key").textContent =
      year + " · replay is the retrospective replay (10/90 blend), not a live record.";
  }

  function boot() {
    var liveTeam = teamFrom(live);
    var retroTeam = teamFrom(retro);
    if (!liveTeam && !retroTeam) {
      document.getElementById("team-hero").innerHTML = "<p>Team not found.</p>";
      document.getElementById("current-season").hidden = true;
      document.getElementById("past-seasons").hidden = true;
      return;
    }
    if (liveTeam) {
      renderHero(live);
      renderLog(live);
    } else {
      renderHero(retro);
      renderNoLive();
    }
    renderPast(retroTeam);
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      retro = results[1];
      live = results[2];
      boot();
    })
    .catch(function (err) {
      console.error(err);
    });
})();
