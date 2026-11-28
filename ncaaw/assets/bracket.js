// Bracket page: locked picks, results, and round-reach odds.
(function () {
  "use strict";

  var BANNER =
    "The 2027 bracket fills after Selection Sunday (Sun Mar 14, 2027) and locks before the first game.";
  var ROUNDS = [
    { id: "first_four", label: "First Four" },
    { id: "round_of_64", label: "Round of 64" },
    { id: "round_of_32", label: "Round of 32" },
    { id: "sweet_16", label: "Sweet 16" },
    { id: "elite_8", label: "Elite Eight" },
    { id: "final_four", label: "Final Four" },
    { id: "championship", label: "Championship" },
  ];
  var REGION_ROUNDS = ["round_of_64", "round_of_32", "sweet_16", "elite_8"];
  var STATUS = {
    right: { cls: "out-win", label: "Right" },
    wrong: { cls: "out-loss", label: "Wrong" },
    busted: { cls: "brk-busted", label: "Busted" },
    pending: { cls: "brk-pending", label: "Pending" },
  };

  var index = null;
  var cache = {};
  var activeYear = null;
  var activeRound = "first_four";
  var showAll = false;

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function academic(year) {
    return String(year - 1) + "\u2013" + String(year).slice(-2);
  }

  function pct(value) {
    if (value == null || !isFinite(value)) return "\u2014";
    return (value * 100).toFixed(1) + "%";
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("fetch " + response.status + " " + url);
      return response.json();
    });
  }

  function rowFor(year) {
    var seasons = (index && index.seasons) || [];
    for (var i = 0; i < seasons.length; i++) {
      if (Number(seasons[i].season) === Number(year)) return seasons[i];
    }
    return null;
  }

  function upcomingUnlocked() {
    var row = rowFor(2027);
    return !row || row.state !== "locked";
  }

  function defaultYear() {
    var query = Number(params().get("season"));
    if (query && rowFor(query)) return query;
    var live = rowFor(2027);
    if (live && live.state === "locked") return 2027;
    if (rowFor(2026)) return 2026;
    var seasons = (index && index.seasons) || [];
    return seasons.length ? Number(seasons[0].season) : 2026;
  }

  function statusMark(status) {
    var meta = STATUS[status] || STATUS.pending;
    return '<span class="' + meta.cls + '">' + esc(meta.label) + "</span>";
  }

  function practiceSentence(data) {
    return (
      "Practice run: model as of " +
      data.asOfLabel +
      ", one second before the first First Four game."
    );
  }

  function teamLine(side, pickId) {
    if (!side) return "";
    var picked = Number(side.teamId) === Number(pickId);
    var shortName = side.shortName || side.name;
    return (
      '<div class="brk-team' +
      (picked ? " pick" : "") +
      '"><span class="brk-seed">' +
      esc(side.seed == null ? "" : side.seed) +
      '</span><span class="brk-name" title="' +
      esc(side.name) +
      '">' +
      esc(shortName) +
      "</span></div>"
    );
  }

  function gameBox(game) {
    return (
      '<div class="brk-game">' +
      teamLine(game.home, game.pickTeamId) +
      teamLine(game.away, game.pickTeamId) +
      "</div>"
    );
  }

  function regionHtml(region, place, mirror) {
    var cols = REGION_ROUNDS.map(function (round) {
      var games = (region.rounds && region.rounds[round]) || [];
      return (
        '<div class="region-col">' +
        games.map(gameBox).join("") +
        "</div>"
      );
    }).join("");
    return (
      '<section class="bracket-region' +
      (mirror ? " mirror" : "") +
      '" data-place="' +
      place +
      '"><h3 class="bracket-region-name">' +
      esc(region.name) +
      '</h3><div class="region-rounds">' +
      cols +
      "</div></section>"
    );
  }

  function renderClassic(data) {
    var host = document.getElementById("bracket-classic");
    var byName = {};
    (data.regions || []).forEach(function (region) {
      byName[region.name] = region;
    });
    var left = (data.layout && data.layout.left) || [];
    var right = (data.layout && data.layout.right) || [];
    var html = "";
    if (byName[left[0]]) html += regionHtml(byName[left[0]], "lt", false);
    if (byName[left[1]]) html += regionHtml(byName[left[1]], "lb", false);
    var centerGames = (data.finalFour || []).map(gameBox).join("");
    html +=
      '<div class="bracket-center"><div class="bracket-center-label">Final Four</div>' +
      centerGames +
      '<div class="bracket-center-label">Championship</div>' +
      gameBox(data.championship) +
      "</div>";
    if (byName[right[0]]) html += regionHtml(byName[right[0]], "rt", true);
    if (byName[right[1]]) html += regionHtml(byName[right[1]], "rb", true);
    host.innerHTML = html;
    host.hidden = false;
  }

  function renderStrip(data) {
    var bits = (data.correctByRound || [])
      .map(function (row) {
        return (
          '<span class="bracket-round-bit">' +
          esc(row.label) +
          " <strong>" +
          esc(row.correct) +
          "/" +
          esc(row.slots) +
          "</strong></span>"
        );
      })
      .join("");
    var champ = data.champion || {};
    document.getElementById("bracket-strip").innerHTML =
      '<div class="glass bracket-stat"><div class="num">' +
      esc(data.score) +
      "<span> / " +
      esc(data.pointScale) +
      '</span></div><div class="label">Score</div></div>' +
      '<div class="glass bracket-stat"><div class="num">' +
      esc(data.maxPossible) +
      '</div><div class="label">Max possible</div></div>' +
      '<div class="glass bracket-stat"><div class="label">Correct by round</div><div class="bracket-rounds">' +
      bits +
      "</div></div>" +
      '<div class="glass bracket-stat"><div class="num" style="font-size:1.05rem">' +
      esc(champ.pickName) +
      "</div><div class=\"label\">Champion pick " +
      statusMark(champ.status) +
      "</div>" +
      (data.practice
        ? ""
        : '<div class="label">Locked ' + esc(data.lockedLabel) + "</div>") +
      "</div>";
    document.getElementById("bracket-strip").hidden = false;
  }

  function renderTabs(data) {
    var host = document.getElementById("bracket-tabs");
    host.innerHTML = ROUNDS.map(function (round) {
      return (
        '<button type="button" data-round="' +
        round.id +
        '"' +
        (round.id === activeRound ? ' class="active"' : "") +
        ">" +
        esc(round.label) +
        "</button>"
      );
    }).join("");
    host.hidden = false;
    var cards = document.getElementById("bracket-cards");
    var games = (data.games || []).filter(function (game) {
      return game.round === activeRound;
    });
    cards.innerHTML = games
      .map(function (game) {
        var actual = "Pending";
        if (game.actualWinnerName) {
          actual = game.actualWinnerName;
          if (game.actualScore) actual += " " + game.actualScore;
        }
        var pickClass = game.status === "busted" ? " brk-busted" : "";
        return (
          '<article class="glass brk-card"><div class="brk-card-top"><span>' +
          esc((ROUNDS.filter(function (r) { return r.id === game.round; })[0] || {}).label || game.round) +
          "</span>" +
          statusMark(game.status) +
          '</div><div class="brk-card-team"><span class="brk-name">' +
          esc((game.home && game.home.seed) || "") +
          " " +
          esc(game.home && game.home.name) +
          '</span></div><div class="brk-card-team"><span class="brk-name">' +
          esc((game.away && game.away.seed) || "") +
          " " +
          esc(game.away && game.away.name) +
          '</span></div><p class="brk-card-meta">Pick <span class="' +
          pickClass.trim() +
          '">' +
          esc(game.pickName) +
          "</span> · " +
          pct(game.pickWinProb) +
          "</p><p class=\"brk-card-meta\">Actual: " +
          esc(actual) +
          "</p></article>"
        );
      })
      .join("");
  }

  function renderReach(data) {
    var rows = data.roundReach || [];
    var body = document.getElementById("bracket-reach");
    body.innerHTML = rows
      .map(function (row, index) {
        var hidden = !showAll && index >= 16 ? " hidden" : "";
        return (
          "<tr" +
          hidden +
          "><td>" +
          esc(row.name) +
          "</td><td>" +
          esc(row.seed) +
          "</td><td>" +
          esc(row.region) +
          "</td><td>" +
          pct(row.roundOf32) +
          "</td><td>" +
          pct(row.sweet16) +
          "</td><td>" +
          pct(row.elite8) +
          "</td><td>" +
          pct(row.finalFour) +
          "</td><td>" +
          pct(row.titleGame) +
          "</td><td>" +
          pct(row.champion) +
          "</td></tr>"
        );
      })
      .join("");
    var button = document.getElementById("bracket-show-all");
    button.hidden = rows.length <= 16;
    button.textContent = showAll ? "Show top 16" : "Show all";
    document.getElementById("bracket-reach-head").hidden = false;
    document.getElementById("bracket-reach-wrap").hidden = false;
  }

  function clearBoard() {
    ["bracket-strip", "bracket-classic", "bracket-tabs", "bracket-reach-head", "bracket-reach-wrap"].forEach(
      function (id) {
        document.getElementById(id).hidden = true;
      }
    );
    document.getElementById("bracket-cards").innerHTML = "";
    document.getElementById("bracket-practice").hidden = true;
  }

  function renderLocked(data) {
    var practice = document.getElementById("bracket-practice");
    practice.hidden = !data.practice;
    practice.textContent = data.practice ? practiceSentence(data) : "";
    document.getElementById("bracket-note").textContent =
      academic(data.season) + " locked bracket. Results update as games finish. The picks do not.";
    renderStrip(data);
    renderClassic(data);
    renderTabs(data);
    renderReach(data);
  }

  function showSeason(year) {
    activeYear = year;
    document.querySelectorAll("#season-toggle button").forEach(function (button) {
      button.classList.toggle("active", Number(button.dataset.year) === Number(year));
    });
    var banner = document.getElementById("bracket-banner");
    banner.hidden = !upcomingUnlocked();
    banner.textContent = BANNER;
    var row = rowFor(year);
    if (!row || row.state !== "locked" || !row.file) {
      clearBoard();
      document.getElementById("bracket-note").textContent =
        "The " + year + " bracket is not locked yet.";
      return fetchJson("./data/bracket_" + year + ".json").then(function (data) {
        if (!data || data.state === "not_locked") {
          banner.hidden = false;
          banner.textContent = BANNER;
        }
        return data;
      }).catch(function () {
        return null;
      });
    }
    var ready = cache[year]
      ? Promise.resolve(cache[year])
      : fetchJson("./data/" + row.file).then(function (data) {
          cache[year] = data;
          return data;
        });
    return ready.then(renderLocked);
  }

  function renderToggle() {
    var seasons = ((index && index.seasons) || []).slice().sort(function (a, b) {
      return Number(b.season) - Number(a.season);
    });
    document.getElementById("season-toggle").innerHTML = seasons
      .map(function (row) {
        return (
          '<button type="button" data-year="' +
          esc(row.season) +
          '">' +
          esc(academic(row.season)) +
          "</button>"
        );
      })
      .join("");
  }

  document.getElementById("season-toggle").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    showSeason(Number(button.dataset.year));
  });
  document.getElementById("bracket-tabs").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || !cache[activeYear]) return;
    activeRound = button.dataset.round;
    renderTabs(cache[activeYear]);
  });
  document.getElementById("bracket-show-all").addEventListener("click", function () {
    showAll = !showAll;
    if (cache[activeYear]) renderReach(cache[activeYear]);
  });

  var requested = params().get("round");
  if (requested && ROUNDS.some(function (round) { return round.id === requested; })) {
    activeRound = requested;
  }
  if (params().get("reach") === "all") showAll = true;

  fetchJson("./data/bracket_index.json")
    .then(function (data) {
      index = data;
      renderToggle();
      return showSeason(defaultYear());
    })
    .catch(function () {
      document.getElementById("bracket-banner").hidden = false;
      document.getElementById("bracket-banner").textContent = BANNER;
      document.getElementById("bracket-note").textContent = "Bracket data is not available yet.";
    });
})();
