// Shared data loader for NCAAB showcase pages (static JSON only).
(function (global) {
  "use strict";

  var TEAMS = {};
  var DISPLAY_SIGMAS = null;
  var COLORS = null;
  var META = null;

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("fetch " + r.status + " " + url);
      return r.json();
    });
  }

  function nicknameFrom(displayName, location) {
    if (global.AutopilotFormat && global.AutopilotFormat.nicknameFrom) {
      return global.AutopilotFormat.nicknameFrom(displayName, location);
    }
    var name = String(displayName || "").trim();
    var loc = String(location || "").trim();
    if (loc && name.toLowerCase().indexOf(loc.toLowerCase()) === 0) {
      var rest = name.slice(loc.length).trim();
      return rest || name;
    }
    return name;
  }

  function applyTeam(id, t, colorMeta) {
    colorMeta = colorMeta || {};
    var location = t.location || colorMeta.location || t.name;
    var fullName = t.name || colorMeta.displayName || location;
    TEAMS[id] = {
      name: nicknameFrom(fullName, location) || location,
      nickname: nicknameFrom(fullName, location) || location,
      city: location,
      location: location,
      shortName: location,
      abbr: t.abbr || colorMeta.abbr || null,
      conference: t.conference || null,
      color: colorMeta.color || t.color || "#3a4150",
      alternateColor: colorMeta.alternate || null,
      primaryColor: colorMeta.primary || null,
      plateColor: colorMeta.plateColor || null,
      plateTextColor: colorMeta.plateTextColor || null,
      cardNameColor: colorMeta.cardNameColor || null,
      fullName: fullName,
    };
  }

  function loadColors() {
    if (COLORS) return Promise.resolve(COLORS);
    return fetchJson("./data/team_colors.json").then(function (data) {
      COLORS = data;
      return data;
    }).catch(function () {
      COLORS = { teams: {} };
      return COLORS;
    });
  }

  function loadSigmas() {
    if (DISPLAY_SIGMAS) return Promise.resolve(DISPLAY_SIGMAS);
    return fetchJson("./data/display_sigmas.json").then(function (data) {
      DISPLAY_SIGMAS = data;
      if (global.AutopilotBoard && global.AutopilotBoard.setSigmas) {
        global.AutopilotBoard.setSigmas(data);
      }
      return data;
    }).catch(function () {
      DISPLAY_SIGMAS = {};
      return DISPLAY_SIGMAS;
    });
  }

  function loadMeta() {
    if (META) return Promise.resolve(META);
    return fetchJson("./data/meta.json").then(function (data) {
      META = data;
      return data;
    });
  }

  function decorateSeason(data, meta, colors) {
    data.meta = meta;
    if (data.teams) {
      Object.keys(data.teams).forEach(function (id) {
        applyTeam(id, data.teams[id], (colors.teams || {})[id]);
      });
    }
    return data;
  }

  function loadSeasonByYear(year) {
    return Promise.all([loadMeta(), loadColors(), loadSigmas()]).then(function (results) {
      var meta = results[0];
      var colors = results[1];
      return fetchJson("./data/season_" + year + ".json").then(function (data) {
        return decorateSeason(data, meta, colors);
      });
    });
  }

  function retrospectiveYear(meta) {
    return meta.retrospectiveSeason || 2025;
  }

  function liveYear(meta) {
    return meta.liveSeason || 2027;
  }

  /** True when export found at least one sealed live pick (directive 029). */
  function liveHasSealedPicks(meta) {
    if (!meta) return false;
    if (typeof meta.liveHasSealedPicks === "boolean") return meta.liveHasSealedPicks;
    // Legacy meta: boardSeason pointed at live only after sealed games existed.
    return !!(meta.boardSeason && meta.boardSeason === liveYear(meta) && meta.nGames > 0);
  }

  /**
   * Shared default season tab (directive 029):
   * retrospective replay until live has sealed picks; then live.
   * `?season=` deep links override when they match a known season year.
   */
  function defaultSeasonYear(meta) {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("season");
    if (raw != null && raw !== "") {
      var y = Number(raw);
      if (y === retrospectiveYear(meta) || y === liveYear(meta)) return y;
    }
    if (liveHasSealedPicks(meta)) return liveYear(meta);
    return retrospectiveYear(meta);
  }

  /** @deprecated alias — prefer defaultSeasonYear */
  function defaultBoardYear(meta) {
    if (meta && meta.boardSeason != null && !("liveHasSealedPicks" in meta)) {
      return meta.boardSeason;
    }
    return defaultSeasonYear(meta);
  }

  /** Default season from shared rule (replay until sealed live picks). */
  function loadSeason() {
    return loadMeta().then(function (meta) {
      return loadSeasonByYear(defaultSeasonYear(meta));
    });
  }

  function loadLiveSeason() {
    return loadMeta().then(function (meta) {
      return loadSeasonByYear(liveYear(meta));
    });
  }

  function loadRetrospectiveSeason() {
    return loadMeta().then(function (meta) {
      return loadSeasonByYear(retrospectiveYear(meta));
    });
  }

  /** Prefer live when sealed picks exist; otherwise retrospective (029). */
  function loadTeamsSeason() {
    return loadMeta().then(function (meta) {
      var year = defaultSeasonYear(meta);
      var source = year === liveYear(meta) ? "live" : "retrospective";
      return loadSeasonByYear(year).then(function (season) {
        return { season: season, source: source };
      });
    });
  }

  function loadTeams() {
    return Promise.all([fetchJson("./data/teams.json"), loadColors(), loadMeta()]).then(function (results) {
      var data = results[0];
      var colors = results[1];
      data.meta = results[2];
      (data.teams || []).forEach(function (t) {
        applyTeam(String(t.id), t, (colors.teams || {})[String(t.id)]);
      });
      return data;
    });
  }

  function loadParlays(year) {
    return fetchJson("./data/parlays_" + year + ".json");
  }

  // Backward-compatible alias used by older overview boot path.
  function loadSeason2026() {
    return loadLiveSeason();
  }

  global.AutopilotData = {
    TEAMS: TEAMS,
    get DISPLAY_SIGMAS() { return DISPLAY_SIGMAS; },
    loadMeta: loadMeta,
    loadSeason: loadSeason,
    loadSeasonByYear: loadSeasonByYear,
    loadLiveSeason: loadLiveSeason,
    loadRetrospectiveSeason: loadRetrospectiveSeason,
    loadTeamsSeason: loadTeamsSeason,
    loadSeason2026: loadSeason2026,
    loadTeams: loadTeams,
    loadParlays: loadParlays,
    loadColors: loadColors,
    loadSigmas: loadSigmas,
    retrospectiveYear: retrospectiveYear,
    liveYear: liveYear,
    liveHasSealedPicks: liveHasSealedPicks,
    defaultSeasonYear: defaultSeasonYear,
    defaultBoardYear: defaultBoardYear,
  };
})(window);
