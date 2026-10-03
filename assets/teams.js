// Full teams grid (teams.html), sorted alphabetically.
(function () {
  "use strict";
  var TEAMS = window.AutopilotData.TEAMS;

  window.AutopilotData.loadSeason().then(function (data) {
    var teams = Object.values(data.teams).sort(function (a, b) { return a.abbr.localeCompare(b.abbr); });

    document.getElementById("teams-grid").innerHTML = teams.map(function (t) {
      var color = (TEAMS[t.abbr] || {}).color || "#333";
      var acc = t.modelAccuracy.ml !== null ? t.modelAccuracy.ml + "% ML" : "—";
      return (
        '<a class="team-tile glass" href="./team.html?team=' + t.abbr + '" style="border-top:2px solid ' + color + '">' +
          '<div class="abbr">' + t.abbr + '</div>' +
          '<div class="acc">' + acc + '</div>' +
        '</a>'
      );
    }).join("");
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
