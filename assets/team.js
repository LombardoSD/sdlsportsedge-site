// Team detail page (team.html?team=ABBR).
(function () {
  "use strict";
  var TEAMS = window.AutopilotData.TEAMS;

  function pill(outcome) {
    if (outcome === "win") return '<span class="pill-hit">WIN</span>';
    if (outcome === "loss") return '<span class="pill-miss">LOSS</span>';
    if (outcome === "push" || outcome === "tie") return '<span style="color:var(--dim)">' + outcome.toUpperCase() + '</span>';
    return '<span style="color:var(--faint)">—</span>';
  }

  window.AutopilotData.loadSeason().then(function (data) {
    var params = new URLSearchParams(window.location.search);
    var abbr = (params.get("team") || "").toUpperCase();
    var team = data.teams[abbr];

    if (!team) {
      document.getElementById("team-hero").innerHTML =
        '<h1>Team not found</h1><p style="color:var(--dim)">Try the <a href="./teams.html" style="color:var(--accent)">team list</a>.</p>';
      return;
    }

    var meta = TEAMS[abbr] || { name: team.name, color: "#333" };
    document.getElementById("page-title").textContent = meta.name + " — SDL Sports EDGE NFL";

    document.getElementById("team-hero").innerHTML =
      '<div class="crest glass" style="background:' + meta.color + '22; color:' + meta.color + '; border:1px solid ' + meta.color + '55;">' + abbr + '</div>' +
      '<div>' +
        '<h1>' + meta.name + '</h1>' +
        '<div class="record-line">' + team.record.wins + '–' + team.record.losses + ' · 2025 Season</div>' +
      '</div>';

    var acc = team.modelAccuracy;
    document.getElementById("team-stat-row").innerHTML =
      '<div class="stat blue"><div class="num">' + (acc.ml ?? "—") + '<span class="unit">%</span></div><div class="label">Model ML Accuracy</div></div>' +
      '<div class="stat"><div class="num">' + (acc.ats ?? "—") + '<span class="unit">%</span></div><div class="label">Model ATS Accuracy</div></div>' +
      '<div class="stat"><div class="num">' + (acc.tot ?? "—") + '<span class="unit">%</span></div><div class="label">Model Totals Accuracy</div></div>';

    document.getElementById("game-log-body").innerHTML = team.games.map(function (g) {
      var vsAt = g.isHome ? "vs" : "@";
      var resultStr = (g.won ? "W" : "L") + " " + g.teamScore + "–" + g.oppScore;
      return (
        '<tr>' +
          '<td>' + g.week + '</td>' +
          '<td>' + vsAt + ' <a class="team-link" href="./team.html?team=' + g.opponent + '">' + g.opponent + '</a></td>' +
          '<td style="color:' + (g.won ? "var(--white)" : "var(--dim)") + '">' + resultStr + '</td>' +
          '<td>' + pill(g.mlOutcome) + '</td>' +
          '<td>' + pill(g.atsOutcome) + '</td>' +
          '<td>' + pill(g.totOutcome) + '</td>' +
        '</tr>'
      );
    }).join("");
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
