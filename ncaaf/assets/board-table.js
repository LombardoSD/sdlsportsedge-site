// NCAAF matchup cards — NFL board-table anatomy (labels, order, badges).
// ML confidence is the sealed published win probability. Spread and total
// confidence stay "—" until a sealed cover/over probability exists.
(function (global) {
  "use strict";

  var F = global.AutopilotFormat;

  function fmtPrice(p) {
    if (p === null || p === undefined) return "—";
    if (p === "EVEN" || p === "even") return "EVEN";
    return p > 0 ? "+" + p : String(p);
  }

  function fmtSigned(v) {
    if (v === null || v === undefined) return "—";
    return v > 0 ? "+" + v : String(v);
  }

  function fmtLine(open, close, fmt) {
    if (open === null && close === null) return "—";
    if (open === null) return fmt(close);
    if (close === null) return fmt(open);
    if (open === close) return fmt(close);
    return fmt(open) + " → " + fmt(close);
  }

  function teamTag(team) {
    return '<span class="gb-line-team">' + team + "</span>";
  }

  function fmtTeamLine(team, open, close, fmt) {
    if (open === null || open === undefined) open = null;
    if (close === null || close === undefined) close = null;
    if (open === null && close === null) return "—";
    if (open === null) return teamTag(team) + " " + fmt(close);
    if (close === null) return teamTag(team) + " " + fmt(open);
    if (open === close) return teamTag(team) + " " + fmt(close);
    return teamTag(team) + " " + fmt(open) + " → " + teamTag(team) + " " + fmt(close);
  }

  var PICK_LABEL = '<span class="gb-pick-label">Pick:</span>';

  function pct(p) {
    return p === null || p === undefined || !isFinite(Number(p))
      ? "—"
      : Math.round(Number(p) * 100) + "%";
  }

  function confidenceRow(prob) {
    return (
      '<div class="gb-conf"><span class="gb-pick-label">Confidence:</span> ' +
      pct(prob) +
      "</div>"
    );
  }

  function resultRow(outcome) {
    return (
      '<div class="gb-conf gb-result"><span class="gb-pick-label">Result:</span> ' +
      outcomeBadge(outcome) +
      "</div>"
    );
  }

  function outcomeClass(outcome) {
    if (outcome === "win") return "win";
    if (outcome === "loss") return "loss";
    if (outcome === "push" || outcome === "tie") return "push";
    if (outcome === "ungraded") return "push";
    return "pending";
  }

  // Vocabulary matches NFL board-table.js outcomeWord (WINNER / LOSS / PUSH / TIE / PENDING).
  function outcomeWord(outcome) {
    if (outcome === "win") return "WINNER";
    if (outcome === "loss") return "LOSS";
    if (outcome === "push") return "PUSH";
    if (outcome === "tie") return "TIE";
    if (outcome === "ungraded") return "UNGRADED";
    return "PENDING";
  }

  function outcomeBadge(outcome) {
    var word = outcomeWord(outcome);
    if (outcome === "win") word = '<span class="gb-win-text">' + word + "</span>";
    return '<span class="gb-outcome ' + outcomeClass(outcome) + '">' + word + "</span>";
  }

  function teamMeta(id) {
    return (global.AutopilotData && global.AutopilotData.TEAMS && global.AutopilotData.TEAMS[id]) || {};
  }

  function abbrOf(id, fallbackName) {
    var meta = teamMeta(id);
    if (meta.abbr) return meta.abbr;
    if (fallbackName) return String(fallbackName).slice(0, 3).toUpperCase();
    return String(id);
  }

  function teamLink(id) {
    var meta = teamMeta(id);
    var city = meta.city || meta.location || meta.name || id;
    return (
      '<a class="gb-team" href="./team.html?team=' +
      encodeURIComponent(id) +
      '">' +
      city +
      "</a>"
    );
  }

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
      parseInt(h.substr(0, 2), 16),
      parseInt(h.substr(2, 2), 16),
      parseInt(h.substr(4, 2), 16),
    ];
  }

  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function electricColor(hex) {
    var rgb = hexToRgb(hex).map(function (v) {
      return v / 255;
    });
    var mx = Math.max(rgb[0], rgb[1], rgb[2]),
      mn = Math.min(rgb[0], rgb[1], rgb[2]);
    var l = (mx + mn) / 2,
      d = mx - mn,
      h = 0,
      sat = 0;
    if (d > 0) {
      sat = d / (1 - Math.abs(2 * l - 1));
      if (mx === rgb[0]) h = ((rgb[1] - rgb[2]) / d) % 6;
      else if (mx === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
      else h = (rgb[0] - rgb[1]) / d + 4;
      h = Math.round(h * 60 + (h < 0 ? 360 : 0));
    }
    if (sat < 0.12) return "hsl(0,0%,86%)";
    return (
      "hsl(" +
      h +
      "," +
      Math.round(Math.max(sat, 0.72) * 100) +
      "%," +
      Math.round(Math.max(l, 0.62) * 100) +
      "%)"
    );
  }

  function plate(id, side) {
    var meta = teamMeta(id);
    var plateColors = F.resolvePlateColors(meta);
    var color = plateColors.plate;
    var text = plateColors.text;
    var name = (meta.nickname || meta.name || meta.abbr || id).toUpperCase();
    var edge = luminance(color) < 0.02 ? "#9aa0a6" : "#05070a";
    var style =
      "--c:" +
      color +
      ";--t:" +
      text +
      ";--o:" +
      edge +
      ";--e:" +
      electricColor(color);
    return (
      '<span class="gb-wm-wrap ' +
      side +
      '">' +
      teamLink(id) +
      '<span class="gb-wm ' +
      side +
      '" style="' +
      style +
      '" aria-hidden="true">' +
      '<span class="gb-wm-text" data-t="' +
      name +
      '"><span class="f">' +
      name +
      "</span></span>" +
      "</span>" +
      "</span>"
    );
  }

  function header(g, isUpcoming) {
    var matchup;
    var sep = g.neutral ? "vs" : "at";
    if (isUpcoming) {
      matchup =
        plate(g.away, "away") +
        '<span class="gb-matchup-center"><span class="gb-sep">' +
        sep +
        "</span></span>" +
        plate(g.home, "home");
    } else {
      var awayWon = g.awayScore > g.homeScore;
      matchup =
        plate(g.away, "away") +
        '<span class="gb-matchup-center">' +
        '<span class="gb-score' +
        (awayWon ? " winner" : "") +
        '">' +
        g.awayScore +
        "</span>" +
        '<span class="gb-sep">–</span>' +
        '<span class="gb-score' +
        (!awayWon ? " winner" : "") +
        '">' +
        g.homeScore +
        "</span>" +
        "</span>" +
        plate(g.home, "home");
    }
    var neutral = g.neutral ? '<span class="neutral-flag">NEUTRAL</span>' : "";
    return (
      '<div class="gb-header">' +
      '<div class="gb-matchup">' +
      matchup +
      "</div>" +
      '<div class="gb-date">' +
      (g.kickoff || g.tip || g.date || "") +
      neutral +
      "</div>" +
      "</div>"
    );
  }

  var COL_HINT = ' <span class="gb-col-hint">Shifts</span>';

  function pickAbbr(g, side) {
    if (side === "home") return abbrOf(g.home, g.homeName);
    if (side === "away") return abbrOf(g.away, g.awayName);
    return "—";
  }

  function lineNow(lineObj) {
    if (!lineObj) return null;
    if (lineObj.close !== null && lineObj.close !== undefined) return lineObj.close;
    if (lineObj.open !== null && lineObj.open !== undefined) return lineObj.open;
    return null;
  }

  function mlColumn(g) {
    var lines = g.lines || {};
    var a = lines.mlAway || {};
    var h = lines.mlHome || {};
    var ml = g.ml || {};
    var hasPick = ml && !ml.noPick && (ml.pickSide === "home" || ml.pickSide === "away" || ml.pick);
    var pick = hasPick ? pickAbbr(g, ml.pickSide) : "—";
    if (pick === "—" && ml.pick) pick = ml.pick;
    return (
      '<div class="gb-col">' +
      '<div class="gb-col-label">Moneyline' +
      COL_HINT +
      "</div>" +
      '<div class="gb-line"><span class="gb-line-odds">' +
      fmtTeamLine(abbrOf(g.away), a.open, a.close, fmtPrice) +
      "</span></div>" +
      '<div class="gb-line"><span class="gb-line-odds">' +
      fmtTeamLine(abbrOf(g.home), h.open, h.close, fmtPrice) +
      "</span></div>" +
      '<div class="gb-pick">' +
      PICK_LABEL +
      " " +
      pick +
      "</div>" +
      confidenceRow(hasPick ? ml.prob : null) +
      resultRow(hasPick ? liveDisplayOutcome(g, ml, "ml") : null) +
      "</div>"
    );
  }

  function atsColumn(g) {
    var lines = g.lines || {};
    var ats = g.ats;
    if (!ats || ats.noPick) {
      return (
        '<div class="gb-col"><div class="gb-col-label">Spread' +
        COL_HINT +
        '</div><div class="gb-line">' +
        teamTag("Home Team Spread") +
        '</div><div class="gb-line"><span class="gb-line-odds">' +
        fmtTeamLine(
          abbrOf(g.home),
          lines.spread && lines.spread.open,
          lines.spread && lines.spread.close,
          fmtSigned
        ) +
        "</span></div>" +
        '<div class="gb-pick">' +
        PICK_LABEL +
        " —</div>" +
        confidenceRow(null) +
        resultRow(null) +
        "</div>"
      );
    }
    var spreadNow = lineNow(lines.spread);
    var pickIsHome = ats.pickSide === "home";
    var pickAbbrText = pickAbbr(g, ats.pickSide);
    var pickSpread =
      spreadNow === null || spreadNow === undefined
        ? null
        : pickIsHome
          ? spreadNow
          : -spreadNow;
    var pickLabel = pickAbbrText + " (" + fmtSigned(pickSpread) + ")";
    return (
      '<div class="gb-col">' +
      '<div class="gb-col-label">Spread' +
      COL_HINT +
      "</div>" +
      '<div class="gb-line">' +
      teamTag("Home Team Spread") +
      "</div>" +
      '<div class="gb-line"><span class="gb-line-odds">' +
      fmtTeamLine(
        abbrOf(g.home),
        lines.spread && lines.spread.open,
        lines.spread && lines.spread.close,
        fmtSigned
      ) +
      "</span></div>" +
      '<div class="gb-pick">' +
      PICK_LABEL +
      " " +
      pickLabel +
      "</div>" +
      confidenceRow(ats.prob != null ? ats.prob : null) +
      resultRow(liveDisplayOutcome(g, ats, "ats")) +
      "</div>"
    );
  }

  function totColumn(g) {
    var lines = g.lines || {};
    var tot = g.tot || {};
    var hasPick = tot && !tot.noPick && tot.pick;
    var totalNow = lineNow(lines.total);
    if (totalNow === null || totalNow === undefined) {
      totalNow = tot.marketTotal != null ? tot.marketTotal : g.total;
    }
    var word = hasPick ? tot.pick : "—";
    var pickLabel = hasPick ? word + (totalNow != null ? " " + totalNow : "") : "—";
    return (
      '<div class="gb-col">' +
      '<div class="gb-col-label">Total Point' +
      COL_HINT +
      "</div>" +
      '<div class="gb-line">' +
      teamTag("Over/Under") +
      "</div>" +
      '<div class="gb-line"><span class="gb-line-odds">' +
      fmtLine(lines.total && lines.total.open, lines.total && lines.total.close, String) +
      "</span></div>" +
      '<div class="gb-pick">' +
      PICK_LABEL +
      " " +
      pickLabel +
      "</div>" +
      confidenceRow(hasPick && tot.prob != null ? tot.prob : null) +
      resultRow(hasPick ? liveDisplayOutcome(g, tot, "tot") : null) +
      "</div>"
    );
  }

  // Same-night scores (045) and provisional results (046).
  // A final live_scores.json row fills the score and a provisional W/L when
  // the morning grade is not on the game yet. The published outcome wins
  // once present. A non-final row does not change the card.
  // ATS line is lines.spread.close, the sealed spread_home
  // (export_ncaaf_site_data.py writes pick["spread_home"] there;
  // grade.py grade_spread reads that same field).
  // Total line is tot.marketTotal, then game.total, then lines.total.close,
  // the sealed total_market (grade.py grade_total).
  // ML uses pickSide the way grade_ml does, including a tied score.
  var LIVE_SCORES = null;
  var PUSH_EPS_SPREAD = 1e-12;
  var PUSH_EPS_TOTAL = 1e-9;
  var liveScoresPromise = null;

  function fetchLiveScores() {
    if (liveScoresPromise) return liveScoresPromise;
    if (typeof fetch !== "function") {
      liveScoresPromise = Promise.resolve(null);
      return liveScoresPromise;
    }
    liveScoresPromise = fetch("./data/live_scores.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("live_scores");
        return r.json();
      })
      .then(function (data) {
        LIVE_SCORES = data && data.games && typeof data.games === "object" ? data.games : {};
        return LIVE_SCORES;
      })
      .catch(function () {
        LIVE_SCORES = null;
        return null;
      });
    return liveScoresPromise;
  }

  function installLiveScoreHook() {
    var dataApi = global.AutopilotData;
    if (!dataApi || dataApi.__liveScoresHook) return;
    // loadLiveSeason calls its own loadSeasonByYear, not the exported one.
    // Wrap every season loader the board and overview actually call.
    ["loadSeason", "loadSeasonByYear", "loadLiveSeason", "loadRetrospectiveSeason"].forEach(function (name) {
      var orig = dataApi[name];
      if (typeof orig !== "function") return;
      dataApi[name] = function () {
        var args = arguments;
        return orig.apply(dataApi, args).then(function (season) {
          return fetchLiveScores().then(function () { return season; });
        });
      };
    });
    dataApi.__liveScoresHook = true;
  }

  function officialOutcome(pick) {
    if (!pick || pick.outcome == null || pick.outcome === "") return null;
    return pick.outcome;
  }

  function spreadHomeLine(g) {
    var spread = (g && g.lines && g.lines.spread) || {};
    if (spread.close != null && spread.close !== "") return Number(spread.close);
    if (spread.open != null && spread.open !== "") return Number(spread.open);
    return null;
  }

  function totalMarketLine(g, pick) {
    if (pick && pick.marketTotal != null && pick.marketTotal !== "") return Number(pick.marketTotal);
    if (g && g.total != null && g.total !== "") return Number(g.total);
    var total = (g && g.lines && g.lines.total) || {};
    if (total.close != null && total.close !== "") return Number(total.close);
    if (total.open != null && total.open !== "") return Number(total.open);
    return null;
  }

  function provisionalOutcome(g, pick, market) {
    if (!g || !pick || pick.noPick) return null;
    var home = Number(g.homeScore);
    var away = Number(g.awayScore);
    if (!isFinite(home) || !isFinite(away)) return null;
    var side = pick.pickSide || pick.pick;
    if (market === "ml") {
      if (side !== "home" && side !== "away") return null;
      var homeWon = home > away;
      if (side === "home") return homeWon ? "win" : "loss";
      return homeWon ? "loss" : "win";
    }
    if (market === "ats") {
      if (side !== "home" && side !== "away") return null;
      var line = spreadHomeLine(g);
      if (line == null || !isFinite(line)) return null;
      var edge = home - away + line;
      if (Math.abs(edge) < PUSH_EPS_SPREAD) return "push";
      var homeCovers = edge > 0;
      var hit = side === "home" ? homeCovers : !homeCovers;
      return hit ? "win" : "loss";
    }
    if (market === "tot") {
      var lean = side === "over" || side === "under" ? side : String(pick.pick || "").toLowerCase();
      if (lean !== "over" && lean !== "under") return null;
      var marketLine = totalMarketLine(g, pick);
      if (marketLine == null || !isFinite(marketLine)) return null;
      var actual = home + away;
      if (Math.abs(actual - marketLine) < PUSH_EPS_TOTAL) return "push";
      var wentOver = actual > marketLine;
      if (lean === "over") return wentOver ? "win" : "loss";
      return wentOver ? "loss" : "win";
    }
    return null;
  }

  function liveDisplayOutcome(g, pick, market) {
    var official = officialOutcome(pick);
    if (official) return official;
    if (!g || !g._liveScoreDisplay) return null;
    return provisionalOutcome(g, pick, market);
  }

  function recordOutcome(g, pick, market) {
    var official = officialOutcome(pick);
    if (official === "win" || official === "loss" || official === "push") return official;
    if (official) return null;
    if (!g || !g._liveScoreDisplay) return null;
    var provisional = provisionalOutcome(g, pick, market);
    if (provisional === "win" || provisional === "loss" || provisional === "push") return provisional;
    return null;
  }

  function overlayLiveScore(g) {
    if (!g || g.final !== false || !LIVE_SCORES) return g;
    var row = LIVE_SCORES[g.gameId];
    if (!row && g.gameId != null) row = LIVE_SCORES[String(g.gameId)];
    if (!row || row.final !== true) return g;
    var home = row.homeScore;
    var away = row.awayScore;
    if (typeof home !== "number" || typeof away !== "number") return g;
    if (!isFinite(home) || !isFinite(away)) return g;
    var copy = {};
    for (var key in g) {
      if (Object.prototype.hasOwnProperty.call(g, key)) copy[key] = g[key];
    }
    copy.homeScore = home;
    copy.awayScore = away;
    copy.final = true;
    copy._liveScoreDisplay = true;
    return copy;
  }

  function renderBlock(g) {
    g = overlayLiveScore(g);
    var isUpcoming = g.final === false;
    return (
      '<div class="game-block glass">' +
      header(g, isUpcoming) +
      '<div class="gb-grid">' +
      mlColumn(g) +
      atsColumn(g) +
      totColumn(g) +
      "</div>" +
      "</div>"
    );
  }

  /**
   * The shared sorter reads game.tip. Football cards store the clock on kickoff
   * ("Sat 11/7 · 10:30 PM ET"). Copy that onto tip without mutating the game.
   */
  function gamesForBoardSort(games) {
    var list = games || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (!g || g.tip) {
        out.push(g);
        continue;
      }
      var copy = {};
      var keys = Object.keys(g);
      for (var k = 0; k < keys.length; k++) copy[keys[k]] = g[keys[k]];
      copy.tip = g.kickoff || "";
      out.push(copy);
    }
    return out;
  }

  function renderTable(games) {
    if (!games || !games.length) return "";
    // Kickoff order, like the NFL board: date, then clock. No day headings.
    var byDay = {};
    var order = [];
    games.forEach(function (g) {
      var d = g.date || "unknown";
      if (!byDay[d]) {
        byDay[d] = [];
        order.push(d);
      }
      byDay[d].push(g);
    });
    order.sort();
    var flat = [];
    order.forEach(function (d) {
      var dayGames = F.sortBoardGames(gamesForBoardSort(byDay[d]), false);
      for (var i = 0; i < dayGames.length; i++) flat.push(dayGames[i]);
    });
    return flat.map(renderBlock).join("");
  }

  global.AutopilotBoard = {
    renderTable: renderTable,
    gamesForBoardSort: gamesForBoardSort,
    outcomeWord: outcomeWord,
    overlayLiveScore: overlayLiveScore,
    provisionalOutcome: provisionalOutcome,
    recordOutcome: recordOutcome,
    liveDisplayOutcome: liveDisplayOutcome,
  };
  installLiveScoreHook();
})(window);
