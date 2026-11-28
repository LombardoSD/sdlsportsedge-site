// Teams page: one card per club, grouped by division, for the current season.
(function () {
  "use strict";

  var TEAMS = window.AutopilotData.TEAMS;
  // Later replay years (2021-2024) and a future live year slot in here.
  var SEASONS = [
    { year: 2025, kind: "replay", loader: function () { return window.AutopilotData.loadSeason(); } },
    { year: 2026, kind: "live", loader: function () { return window.AutopilotData.loadSeason2026(); } },
  ];
  var DIVISIONS = [
    { conference: "AFC", name: "East", abbrs: ["BUF", "MIA", "NE", "NYJ"] },
    { conference: "AFC", name: "North", abbrs: ["BAL", "CIN", "CLE", "PIT"] },
    { conference: "AFC", name: "South", abbrs: ["HOU", "IND", "JAX", "TEN"] },
    { conference: "AFC", name: "West", abbrs: ["DEN", "KC", "LV", "LAC"] },
    { conference: "NFC", name: "East", abbrs: ["DAL", "NYG", "PHI", "WAS"] },
    { conference: "NFC", name: "North", abbrs: ["CHI", "DET", "GB", "MIN"] },
    { conference: "NFC", name: "South", abbrs: ["ATL", "CAR", "NO", "TB"] },
    { conference: "NFC", name: "West", abbrs: ["ARI", "LA", "SEA", "SF"] },
  ];

  function resultsOf(team) {
    return (team && team.results) || null;
  }

  function hasTeamResults(team) {
    var r = resultsOf(team);
    if (!r) return false;
    return (r.ml && r.ml.gamesGraded > 0) ||
      (r.ats && r.ats.gamesGraded > 0) ||
      (r.totals && r.totals.gamesGraded > 0);
  }

  function seasonHasResults(data) {
    if (!data || !data.teams) return false;
    return Object.keys(data.teams).some(function (abbr) {
      return hasTeamResults(data.teams[abbr]);
    });
  }

  function fmtMarket(v) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    var text = String(v);
    if (/^-?\d+$/.test(text)) text += ".0";
    else if (!/^-?\d+\.\d$/.test(text)) {
      var x = v * 10;
      var f = Math.floor(x);
      if (x - f === 0.5) x = f % 2 === 0 ? f : f + 1;
      else x = Math.round(x);
      text = (x / 10).toFixed(1);
    }
    return text + "%";
  }

  function gamesLabel(n) {
    return n + (n === 1 ? " game graded" : " games graded");
  }

  function recordText(wins, losses, ties) {
    var text = (wins || 0) + "\u2013" + (losses || 0);
    if (ties) text += "\u2013" + ties;
    return text;
  }

  function avgTotalPoints(team) {
    var games = (team && team.games) || [];
    var sum = 0;
    var n = 0;
    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      var teamScore = g && g.teamScore;
      var oppScore = g && g.oppScore;
      if (typeof teamScore !== "number" || !isFinite(teamScore)) continue;
      if (typeof oppScore !== "number" || !isFinite(oppScore)) continue;
      sum += teamScore + oppScore;
      n += 1;
    }
    if (!n) return null;
    return Math.round((sum / n) * 10) / 10;
  }

  function fmtAvgTotal(v) {
    if (typeof v !== "number" || !isFinite(v)) return "\u2014";
    return v.toFixed(1);
  }

  function teamFor(data, abbr) {
    var team = data && data.teams ? data.teams[abbr] : null;
    if (team) return team;
    return {
      abbr: abbr,
      name: (TEAMS[abbr] || {}).name || abbr,
      record: { wins: 0, losses: 0, ties: 0 },
      results: {
        ml: { wins: 0, losses: 0, ties: 0, pct: null, gamesGraded: 0 },
        ats: { wins: 0, losses: 0, pushes: 0, pct: null, gamesGraded: 0 },
        totals: { overs: 0, unders: 0, pushes: 0, overPct: null, underPct: null, gamesGraded: 0 },
      },
      modelAccuracy: { ml: null, ats: null, tot: null },
      games: [],
    };
  }

  function mlSortKey(team) {
    var r = resultsOf(team);
    var ml = r && r.ml;
    if (!ml || !ml.gamesGraded) return null;
    return typeof ml.pct === "number" ? ml.pct : null;
  }

  function compareTeams(a, b) {
    var ag = hasTeamResults(a) ? 0 : 1;
    var bg = hasTeamResults(b) ? 0 : 1;
    if (ag !== bg) return ag - bg;
    var am = mlSortKey(a);
    var bm = mlSortKey(b);
    var aNull = typeof am !== "number";
    var bNull = typeof bm !== "number";
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (!aNull && am !== bm) return bm - am;
    return String(a.name).localeCompare(String(b.name));
  }

  function card(team) {
    var color = (TEAMS[team.abbr] || {}).color || "#333";
    var r = resultsOf(team) || {};
    var ml = r.ml || {};
    var ats = r.ats || {};
    var tot = r.totals || {};
    var graded = Math.max(ml.gamesGraded || 0, ats.gamesGraded || 0, tot.gamesGraded || 0);
    var mlText = graded && typeof ml.pct === "number"
      ? recordText(ml.wins, ml.losses, ml.ties) + " · " + fmtMarket(ml.pct)
      : "\u2014";
    var atsText = (ats.gamesGraded || 0) && typeof ats.pct === "number"
      ? (ats.wins || 0) + "\u2013" + (ats.losses || 0) + "\u2013" + (ats.pushes || 0) + " · " + fmtMarket(ats.pct)
      : "\u2014";
    var overText = (tot.gamesGraded || 0) && typeof tot.overPct === "number"
      ? fmtMarket(tot.overPct)
      : "\u2014";
    var avgText = fmtAvgTotal(avgTotalPoints(team));
    return (
      '<a class="team-tile glass team-card" href="./team.html?team=' + team.abbr + '" style="border-top:2px solid ' + color + '">' +
        '<div class="team-card-name">' + team.name + "</div>" +
        '<div class="team-card-acc">' +
          '<span class="team-card-line"><span class="k">ML</span> ' + mlText + "</span>" +
          '<span class="team-card-line"><span class="k">ATS</span> ' + atsText + "</span>" +
          '<span class="team-card-line" title="Average combined points in this team\'s games this season">' +
            '<span class="k">Avg total</span> ' + avgText + " · " +
            '<span class="k">Over</span> ' + overText +
          "</span>" +
        "</div>" +
        '<div class="team-card-n">' + gamesLabel(graded) + "</div>" +
      "</a>"
    );
  }

  function render(data) {
    var html = "";
    var seen = "";
    DIVISIONS.forEach(function (div) {
      if (div.conference !== seen) {
        if (seen) html += "</section>";
        seen = div.conference;
        html += '<section class="conference"><h2 class="conference-name">' + div.conference + "</h2>";
      }
      var teams = div.abbrs.map(function (abbr) { return teamFor(data, abbr); });
      teams.sort(compareTeams);
      html += '<div class="division"><h3 class="division-name">' + div.name + "</h3>";
      html += '<div class="division-cards">' + teams.map(card).join("") + "</div></div>";
    });
    if (seen) html += "</section>";
    document.getElementById("teams-root").innerHTML = html;
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
      return row.spec.kind === "live" && seasonHasResults(row.data);
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
    var current = pickCurrent(loaded);
    if (!current) return;
    render(current.data);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
