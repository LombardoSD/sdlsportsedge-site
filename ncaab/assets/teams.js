// Teams page: conference cards with ML/ATS/Tot accuracy (NFL-style).
(function () {
  "use strict";

  var seasons = {};
  var meta = null;
  var activeYear = null;
  var query = "";

  function isGradedGame(game) {
    return !!(game && (game.mlOutcome != null || game.atsOutcome != null || game.totOutcome != null));
  }

  function gradedCount(team) {
    return (team.games || []).filter(isGradedGame).length;
  }

  function fmtMarket(v) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    return (Math.round(v * 10) / 10).toFixed(1) + "%";
  }

  function gamesLabel(n) {
    return n + (n === 1 ? " game graded" : " games graded");
  }

  function confOf(team) {
    if (team.conference) return team.conference;
    if (team.independent) return "Ind.";
    return "Other";
  }

  function colorFor(team) {
    var c = window.AutopilotData.TEAMS[team.id] || {};
    return c.color || team.color || "#3a4150";
  }

  function nameColorFor(team) {
    var c = window.AutopilotData.TEAMS[team.id] || {};
    var F = window.AutopilotFormat;
    if (F && F.resolveCardNameColor) return F.resolveCardNameColor(c);
    return c.cardNameColor || colorFor(team);
  }

  function displayName(team) {
    var c = window.AutopilotData.TEAMS[team.id] || {};
    return c.fullName || team.name || team.location || team.id;
  }

  function accuracyFor(team) {
    // Season export stores Ridge modelAccuracy; fall back to recomputing from outcomes.
    if (team.modelAccuracy) return team.modelAccuracy;
    var games = team.games || [];
    function pct(field) {
      var w = 0, l = 0;
      games.forEach(function (g) {
        var o = g[field];
        if (o === "win") w += 1;
        else if (o === "loss") l += 1;
      });
      var n = w + l;
      return n ? Math.round((1000 * w) / n) / 10 : null;
    }
    return { ml: pct("mlOutcome"), ats: pct("atsOutcome"), tot: pct("totOutcome") };
  }

  function compareTeams(a, b) {
    var ag = gradedCount(a) > 0 ? 0 : 1;
    var bg = gradedCount(b) > 0 ? 0 : 1;
    if (ag !== bg) return ag - bg;
    var am = accuracyFor(a).ml;
    var bm = accuracyFor(b).ml;
    var aNull = typeof am !== "number";
    var bNull = typeof bm !== "number";
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (!aNull && am !== bm) return bm - am;
    return String(displayName(a)).localeCompare(String(displayName(b)));
  }

  function card(team) {
    var n = gradedCount(team);
    var acc = accuracyFor(team);
    var color = colorFor(team);
    var nameColor = nameColorFor(team);
    var ml = n ? fmtMarket(acc.ml) : "—";
    var ats = n ? fmtMarket(acc.ats) : "—";
    var tot = n ? fmtMarket(acc.tot) : "—";
    return (
      '<a class="team-tile glass team-card" href="./team.html?team=' +
      encodeURIComponent(team.id) +
      '" style="border-top:2px solid ' +
      color +
      '">' +
      '<div class="team-card-name" style="color:' +
      nameColor +
      '">' +
      displayName(team) +
      "</div>" +
      '<div class="team-card-acc">' +
      '<span><span class="k">ML</span> ' +
      ml +
      "</span>" +
      '<span><span class="k">ATS</span> ' +
      ats +
      "</span>" +
      '<span><span class="k">Tot</span> ' +
      tot +
      "</span>" +
      "</div>" +
      '<div class="team-card-n">' +
      gamesLabel(n) +
      "</div>" +
      "</a>"
    );
  }

  function render(data) {
    var teams = Object.keys(data.teams || {}).map(function (id) {
      return data.teams[id];
    });
    if (query) {
      var q = query.toLowerCase();
      teams = teams.filter(function (t) {
        return (
          displayName(t).toLowerCase().indexOf(q) >= 0 ||
          String(t.location || "").toLowerCase().indexOf(q) >= 0 ||
          String(t.abbr || "").toLowerCase().indexOf(q) >= 0 ||
          String(confOf(t)).toLowerCase().indexOf(q) >= 0
        );
      });
    }
    var byConf = {};
    teams.forEach(function (t) {
      var c = confOf(t);
      (byConf[c] || (byConf[c] = [])).push(t);
    });
    var confs = Object.keys(byConf).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var jump = document.getElementById("conf-jump");
    jump.innerHTML = confs
      .map(function (c) {
        var id = "conf-" + c.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
        return '<a href="#' + id + '">' + c + "</a>";
      })
      .join("");
    var html = "";
    confs.forEach(function (c) {
      var id = "conf-" + c.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
      var list = byConf[c].slice().sort(function (a, b) {
        return compareTeams(a, b);
      });
      html +=
        '<section class="conference" id="' +
        id +
        '"><h2 class="conference-name">' +
        c +
        "</h2>" +
        '<div class="division-cards">' +
        list.map(function (t) {
          return card(t);
        }).join("") +
        "</div></section>";
    });
    document.getElementById("teams-root").innerHTML = html || '<p class="teams-hint">No teams match.</p>';
  }

  function setSeason(year) {
    activeYear = year;
    var data = seasons[year];
    var acad = data.academicLabel || meta.retrospectiveLabel || String(year);
    var kind =
      data.kind === "live_season" || (data.label || "").indexOf("live") >= 0
        ? "live season"
        : "retrospective replay";
    document.getElementById("teams-note").textContent =
      "Showing " +
      acad +
      " (" +
      kind +
      "). Ridge model. Ordered by ML accuracy within each conference.";
    document.querySelectorAll("#season-toggle button").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.year) === year);
    });
    render(data);
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadColors(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ]).then(function (results) {
    meta = results[0];
    var retro = results[2];
    var live = results[3];
    seasons[meta.retrospectiveSeason] = retro;
    seasons[meta.liveSeason] = live;
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
      if (!b) return;
      setSeason(Number(b.dataset.year));
    });
    document.getElementById("team-search").addEventListener("input", function (e) {
      query = e.target.value || "";
      if (activeYear != null) render(seasons[activeYear]);
    });
    setSeason(window.AutopilotData.defaultSeasonYear(meta));
  }).catch(function (err) {
    console.error(err);
  });
})();
