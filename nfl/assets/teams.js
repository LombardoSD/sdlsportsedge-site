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

  function isGradedGame(game) {
    if (!game) return false;
    return game.mlOutcome != null || game.atsOutcome != null || game.totOutcome != null;
  }

  function gradedCount(team) {
    return (team.games || []).filter(isGradedGame).length;
  }

  function seasonHasGraded(data) {
    if (!data || !data.teams) return false;
    return Object.keys(data.teams).some(function (abbr) {
      return gradedCount(data.teams[abbr]) > 0;
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

  function teamFor(data, abbr) {
    var team = data && data.teams ? data.teams[abbr] : null;
    if (team) return team;
    return {
      abbr: abbr,
      name: (TEAMS[abbr] || {}).name || abbr,
      modelAccuracy: { ml: null, ats: null, tot: null },
      games: [],
    };
  }

  function compareTeams(a, b) {
    var ag = gradedCount(a) > 0 ? 0 : 1;
    var bg = gradedCount(b) > 0 ? 0 : 1;
    if (ag !== bg) return ag - bg;
    var am = a.modelAccuracy ? a.modelAccuracy.ml : null;
    var bm = b.modelAccuracy ? b.modelAccuracy.ml : null;
    var aNull = typeof am !== "number";
    var bNull = typeof bm !== "number";
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (!aNull && am !== bm) return bm - am;
    return String(a.name).localeCompare(String(b.name));
  }

  function card(team) {
    var color = (TEAMS[team.abbr] || {}).color || "#333";
    var n = gradedCount(team);
    var acc = team.modelAccuracy || {};
    var ml = n ? fmtMarket(acc.ml) : "—";
    var ats = n ? fmtMarket(acc.ats) : "—";
    var tot = n ? fmtMarket(acc.tot) : "—";
    return (
      '<a class="team-tile glass team-card" href="./team.html?team=' + team.abbr + '" style="border-top:2px solid ' + color + '">' +
        '<div class="team-card-name">' + team.name + '</div>' +
        '<div class="team-card-acc">' +
          '<span><span class="k">ML</span> ' + ml + '</span>' +
          '<span><span class="k">ATS</span> ' + ats + '</span>' +
          '<span><span class="k">Tot</span> ' + tot + '</span>' +
        '</div>' +
        '<div class="team-card-n">' + gamesLabel(n) + '</div>' +
      '</a>'
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
    var current = pickCurrent(loaded);
    if (!current) return;
    render(current.data);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
