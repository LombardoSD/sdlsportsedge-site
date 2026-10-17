// Shared data loader + team metadata for all NFL showcase pages.
(function (global) {
  "use strict";

  var TEAMS = {
    ARI: { name: "Cardinals", city: "Arizona", color: "#97233F" }, ATL: { name: "Falcons", city: "Atlanta", color: "#A71930" },
    BAL: { name: "Ravens", city: "Baltimore", color: "#241773" }, BUF: { name: "Bills", city: "Buffalo", color: "#00338D" },
    CAR: { name: "Panthers", city: "Carolina", color: "#0085CA" }, CHI: { name: "Bears", city: "Chicago", color: "#0B162A" },
    CIN: { name: "Bengals", city: "Cincinnati", color: "#FB4F14" }, CLE: { name: "Browns", city: "Cleveland", color: "#311D00" },
    DAL: { name: "Cowboys", city: "Dallas", color: "#041E42" }, DEN: { name: "Broncos", city: "Denver", color: "#FB4F14" },
    DET: { name: "Lions", city: "Detroit", color: "#0076B6" }, GB: { name: "Packers", city: "Green Bay", color: "#203731" },
    HOU: { name: "Texans", city: "Houston", color: "#03202F" }, IND: { name: "Colts", city: "Indianapolis", color: "#002C5F" },
    JAX: { name: "Jaguars", city: "Jacksonville", color: "#101820" }, KC: { name: "Chiefs", city: "Kansas City", color: "#E31837" },
    LA: { name: "Rams", city: "Los Angeles", color: "#003594" }, LAC: { name: "Chargers", city: "Los Angeles", color: "#0080C6" },
    LV: { name: "Raiders", city: "Las Vegas", color: "#000000" }, MIA: { name: "Dolphins", city: "Miami", color: "#008E97" },
    MIN: { name: "Vikings", city: "Minnesota", color: "#4F2683" }, NE: { name: "Patriots", city: "New England", color: "#002244" },
    NO: { name: "Saints", city: "New Orleans", color: "#D3BC8D" }, NYG: { name: "Giants", city: "New York", color: "#0B2265" },
    NYJ: { name: "Jets", city: "New York", color: "#125740" }, PHI: { name: "Eagles", city: "Philadelphia", color: "#004C54" },
    PIT: { name: "Steelers", city: "Pittsburgh", color: "#FFB612" }, SEA: { name: "Seahawks", city: "Seattle", color: "#002244" },
    SF: { name: "49ers", city: "San Francisco", color: "#AA0000" }, TB: { name: "Buccaneers", city: "Tampa Bay", color: "#D50A0A" },
    TEN: { name: "Titans", city: "Tennessee", color: "#0C2340" }, WAS: { name: "Commanders", city: "Washington", color: "#5A1414" }
  };

  // Single constant for the live API. Must match scripts/public_nfl_api.py API_PORT.
  // Static HTML is served on 4173; this API runs alongside it on 4174.
  var API_BASE = "";

  function isLocalDev() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) {
        throw new Error("fetch " + r.status + " " + url);
      }
      return r.json();
    });
  }

  function fetchApi(path) {
    return fetchJson(API_BASE + path);
  }

  function fetchStatic(relpath) {
    return fetchJson(relpath);
  }

  function loadSeason() {
    if (isLocalDev()) {
      return fetchApi("/api/nfl/season/2025");
    }
    return fetchStatic("./data/season_2025.json");
  }

  function loadSeason2026() {
    if (isLocalDev()) {
      return fetchApi("/api/nfl/season/2026");
    }
    return fetchStatic("./data/season_2026.json");
  }

  function loadParlays(season) {
    if (isLocalDev()) {
      return fetchApi("/api/nfl/parlays/" + season);
    }
    return fetchStatic("./data/parlays_" + season + ".json");
  }

  global.AutopilotData = {
    TEAMS: TEAMS, API_BASE: API_BASE,
    loadSeason: loadSeason, loadSeason2026: loadSeason2026,
    loadParlays: loadParlays,
  };
})(window);
