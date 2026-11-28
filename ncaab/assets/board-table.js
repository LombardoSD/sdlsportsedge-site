// Matchup cards — NFL board-table anatomy (directive 016B).
// Structure and classes mirror LombardoSD/sdlsportsedge-site assets/board-table.js.
(function (global) {
  "use strict";

  var F = global.AutopilotFormat;
  var SIGMAS = null;

  function fmtPrice(p) {
    if (F && F.fmtPrice) return F.fmtPrice(p);
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

  function pct(p, market) {
    if (F && F.fmtMarketConfidence) return F.fmtMarketConfidence(p, market);
    return p === null || p === undefined ? "—" : Math.round(p * 100) + "%";
  }

  function confidenceRow(prob, market) {
    return '<div class="gb-conf"><span class="gb-pick-label">Confidence:</span> ' + pct(prob, market) + "</div>";
  }

  function resultRow(outcome) {
    return '<div class="gb-conf gb-result"><span class="gb-pick-label">Result:</span> ' + outcomeBadge(outcome) + "</div>";
  }

  function outcomeClass(outcome) {
    if (outcome === "win") return "win";
    if (outcome === "loss") return "loss";
    if (outcome === "push" || outcome === "tie") return "push";
    if (outcome === "ungraded") return "push";
    return "pending";
  }

  // Vocabulary matches NFL board-table.js exactly (directive 017).
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
    return '<a class="gb-team" href="./team.html?team=' + encodeURIComponent(id) + '">' + city + "</a>";
  }

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }

  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function electricColor(hex) {
    var rgb = hexToRgb(hex).map(function (v) { return v / 255; });
    var mx = Math.max(rgb[0], rgb[1], rgb[2]), mn = Math.min(rgb[0], rgb[1], rgb[2]);
    var l = (mx + mn) / 2, d = mx - mn, h = 0, sat = 0;
    if (d > 0) {
      sat = d / (1 - Math.abs(2 * l - 1));
      if (mx === rgb[0]) h = ((rgb[1] - rgb[2]) / d) % 6;
      else if (mx === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
      else h = (rgb[0] - rgb[1]) / d + 4;
      h = Math.round(h * 60 + (h < 0 ? 360 : 0));
    }
    if (sat < 0.12) return "hsl(0,0%,86%)";
    return "hsl(" + h + "," + Math.round(Math.max(sat, 0.72) * 100) + "%," + Math.round(Math.max(l, 0.62) * 100) + "%)";
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
      '<span class="gb-wm-wrap ' + side + '">' +
        teamLink(id) +
        '<span class="gb-wm ' + side + '" style="' + style + '" aria-hidden="true">' +
          '<span class="gb-wm-text" data-t="' + name + '"><span class="f">' + name + "</span></span>" +
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
        '<span class="gb-matchup-center"><span class="gb-sep">' + sep + "</span></span>" +
        plate(g.home, "home");
    } else {
      var awayWon = g.awayScore > g.homeScore;
      matchup =
        plate(g.away, "away") +
        '<span class="gb-matchup-center">' +
          '<span class="gb-score' + (awayWon ? " winner" : "") + '">' + g.awayScore + "</span>" +
          '<span class="gb-sep">–</span>' +
          '<span class="gb-score' + (!awayWon ? " winner" : "") + '">' + g.homeScore + "</span>" +
        "</span>" +
        plate(g.home, "home");
    }
    var neutral = g.neutral ? '<span class="neutral-flag">NEUTRAL</span>' : "";
    return (
      '<div class="gb-header">' +
        '<div class="gb-matchup">' + matchup + "</div>" +
        '<div class="gb-date">' + (g.tip || g.kickoff || g.date || "") + neutral + "</div>" +
      "</div>"
    );
  }

  var COL_HINT = ' <span class="gb-col-hint">Shifts</span>';

  function mlColumn(view) {
    var lines = view.lines || {};
    var a = lines.mlAway || {};
    var h = lines.mlHome || {};
    var awayAbbr = abbrOf(view.away, view.awayName);
    var homeAbbr = abbrOf(view.home, view.homeName);
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Moneyline' + COL_HINT + "</div>" +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtTeamLine(awayAbbr, a.open, a.close, fmtPrice) + "</span></div>" +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtTeamLine(homeAbbr, h.open, h.close, fmtPrice) + "</span></div>" +
        '<div class="gb-pick">' + PICK_LABEL + " " + pickText(view.ml) + "</div>" +
        confidenceRow(view.ml && !view.ml.pendingSeal ? view.ml.prob : null, "ml") +
        resultRow(view.ml && !view.ml.pendingSeal ? view.ml.outcome : null) +
      "</div>"
    );
  }

  function pickText(pick) {
    if (!pick) return "—";
    if (pick.pendingSeal) return "pending seal";
    return pick.pick || "—";
  }

  function atsColumn(view) {
    var lines = view.lines || {};
    if (!view.ats) {
      return (
        '<div class="gb-col"><div class="gb-col-label">Spread' + COL_HINT +
        '</div><div class="gb-line"><span class="gb-line-odds">—</span></div></div>'
      );
    }
    if (view.ats.pendingSeal) {
      return (
        '<div class="gb-col">' +
          '<div class="gb-col-label">Spread' + COL_HINT + "</div>" +
          '<div class="gb-line">' + teamTag("Home Team Spread") + "</div>" +
          '<div class="gb-line"><span class="gb-line-odds">' +
            fmtTeamLine(abbrOf(view.home, view.homeName), lines.spread && lines.spread.open, lines.spread && lines.spread.close, fmtSigned) +
          "</span></div>" +
          '<div class="gb-pick">' + PICK_LABEL + " pending seal</div>" +
          confidenceRow(null, "ats") +
          resultRow(null) +
        "</div>"
      );
    }
    var spreadNow = pickLineNumber(lines.spread);
    var homeAbbr = abbrOf(view.home, view.homeName);
    var pickIsHome = view.ats.pickSide === "home";
    var pickAbbr = pickIsHome ? homeAbbr : abbrOf(view.away, view.awayName);
    var pickSpread = spreadNow === null || spreadNow === undefined ? null : (pickIsHome ? spreadNow : -spreadNow);
    var pickLabel = pickAbbr + " (" + fmtSigned(pickSpread) + ")";
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Spread' + COL_HINT + "</div>" +
        '<div class="gb-line">' + teamTag("Home Team Spread") + "</div>" +
        '<div class="gb-line"><span class="gb-line-odds">' +
          fmtTeamLine(homeAbbr, lines.spread && lines.spread.open, lines.spread && lines.spread.close, fmtSigned) +
        "</span></div>" +
        '<div class="gb-pick">' + PICK_LABEL + " " + pickLabel + "</div>" +
        confidenceRow(view.ats.prob, "ats") +
        resultRow(view.ats.outcome) +
      "</div>"
    );
  }

  function totColumn(view) {
    var lines = view.lines || {};
    if (view.tot && view.tot.pendingSeal) {
      return (
        '<div class="gb-col">' +
          '<div class="gb-col-label">Total Point' + COL_HINT + "</div>" +
          '<div class="gb-line">' + teamTag("Over/Under") + "</div>" +
          '<div class="gb-line"><span class="gb-line-odds">' +
            fmtLine(lines.total && lines.total.open, lines.total && lines.total.close, String) +
          "</span></div>" +
          '<div class="gb-pick">' + PICK_LABEL + " pending seal</div>" +
          confidenceRow(null, "tot") +
          resultRow(null) +
        "</div>"
      );
    }
    if (!view.tot) {
      return (
        '<div class="gb-col"><div class="gb-col-label">Total Point' + COL_HINT +
        '</div><div class="gb-line"><span class="gb-line-odds">—</span></div></div>'
      );
    }
    var totalNow = pickLineNumber(lines.total);
    if (totalNow === null || totalNow === undefined) {
      totalNow = view.total;
    }
    var pickLabel = view.tot.pick + (totalNow != null ? " " + totalNow : "");
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Total Point' + COL_HINT + "</div>" +
        '<div class="gb-line">' + teamTag("Over/Under") + "</div>" +
        '<div class="gb-line"><span class="gb-line-odds">' +
          fmtLine(lines.total && lines.total.open, lines.total && lines.total.close, String) +
        "</span></div>" +
        '<div class="gb-pick">' + PICK_LABEL + " " + pickLabel + "</div>" +
        confidenceRow(view.tot.prob, "tot") +
        resultRow(view.tot.outcome) +
      "</div>"
    );
  }

  function buildView(g, model) {
    model = "ridge"; // public site is Ridge-only (directive 025)
    var arms = (g.arms && g.arms[model]) || {};
    var lines = g.lines || {};
    var homeSpread = lineForConfidence(lines.spread, arms.ats);
    var marketTotal = lineForConfidence(lines.total, arms.tot);
    var sigmas = SIGMAS || (global.AutopilotData && global.AutopilotData.DISPLAY_SIGMAS) || {};

    function mlView(pick) {
      if (!pick) return null;
      if (pick.pendingSeal) return { pendingSeal: true, pick: null, prob: null, outcome: null };
      if (!pick.pick) return null;
      return {
        pick: abbrOf(pick.pick === "home" ? g.home : g.away, pick.pick === "home" ? g.homeName : g.awayName),
        pickSide: pick.pick,
        prob: F.confidenceMl(pick.prob),
        outcome: liveDisplayOutcome(g, pick, "ml"),
      };
    }

    function atsView(pick) {
      if (!pick) return null;
      if (pick.pendingSeal) return { pendingSeal: true, pick: null, pickSide: null, prob: null, outcome: null };
      if (!pick.pick) return null;
      // Prefer export calibrated prob (021C); else raw display-sigma.
      var prob =
        pick.prob != null
          ? F.confidenceMl(pick.prob)
          : F.confidenceAts(pick.modelMargin, homeSpread, pick.pick, model, sigmas);
      return {
        pick: abbrOf(pick.pick === "home" ? g.home : g.away, pick.pick === "home" ? g.homeName : g.awayName),
        pickSide: pick.pick,
        prob: prob,
        outcome: liveDisplayOutcome(g, pick, "ats"),
      };
    }

    function totView(pick) {
      if (!pick) return null;
      if (pick.pendingSeal) return { pendingSeal: true, pick: null, pickSide: null, prob: null, outcome: null };
      if (!pick.pick) return null;
      var word = pick.pick === "over" ? "Over" : pick.pick === "under" ? "Under" : String(pick.pick);
      var prob =
        pick.prob != null
          ? F.confidenceMl(pick.prob)
          : F.confidenceTot(pick.modelTotal, marketTotal, pick.pick, model, sigmas);
      return {
        pick: word,
        pickSide: pick.pick,
        prob: prob,
        outcome: liveDisplayOutcome(g, pick, "tot"),
      };
    }

    return {
      home: g.home,
      away: g.away,
      homeName: g.homeName,
      awayName: g.awayName,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      tip: g.tip,
      date: g.date,
      neutral: !!g.neutral,
      final: g.final,
      lines: lines,
      total: g.total != null ? g.total : marketTotal,
      ml: mlView(arms.ml),
      ats: atsView(arms.ats),
      tot: totView(arms.tot),
    };
  }

  // Same-night scores (directive 045) and provisional results (directive 046).
  // Display only. The season object stays final === false until morning grading.
  var LIVE_SCORES = null;
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

  // Same tolerance as grade.py (abs(margin) < 1e-12 is a push).
  var PUSH_EPS = 1e-12;

  function sealedPickLine(label) {
    if (label == null) return null;
    var matches = String(label).match(/[+-]?\d+(?:\.\d+)?/g);
    if (!matches || !matches.length) return null;
    var value = Number(matches[matches.length - 1]);
    return isFinite(value) ? value : null;
  }

  function officialOutcome(pick) {
    if (!pick || pick.outcome == null || pick.outcome === "") return null;
    return pick.outcome;
  }

  function provisionalOutcome(g, pick, market) {
    if (!g || !pick || !pick.pick) return null;
    var home = Number(g.homeScore);
    var away = Number(g.awayScore);
    if (!isFinite(home) || !isFinite(away)) return null;
    var side = String(pick.pick);
    if (market === "ml") {
      if (home === away) return "push";
      if (side !== "home" && side !== "away") return null;
      var pickedScore = side === "home" ? home : away;
      var otherScore = side === "home" ? away : home;
      return pickedScore > otherScore ? "win" : "loss";
    }
    var line = sealedPickLine(pick.pickLabel);
    if (line == null) return null;
    if (market === "ats") {
      if (side !== "home" && side !== "away") return null;
      var picked = side === "home" ? home : away;
      var other = side === "home" ? away : home;
      var margin = picked - other + line;
      if (Math.abs(margin) < PUSH_EPS) return "push";
      return margin > 0 ? "win" : "loss";
    }
    if (market === "tot") {
      var total = home + away;
      if (Math.abs(total - line) < PUSH_EPS) return "push";
      if (side === "over") return total > line ? "win" : "loss";
      if (side === "under") return total < line ? "win" : "loss";
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

  function renderBlock(g, model) {
    g = overlayLiveScore(g);
    var view = buildView(g, model);
    var isUpcoming = g.final === false;
    return (
      '<div class="game-block glass">' +
        header(view, isUpcoming) +
        '<div class="gb-grid">' + mlColumn(view) + atsColumn(view) + totColumn(view) + "</div>" +
      "</div>"
    );
  }

  function pickLineNumber(lineObj) {
    // Seal-time line. ``open`` is the first captured consensus after directive 050.
    if (!lineObj) return null;
    if (lineObj.sealed !== null && lineObj.sealed !== undefined) return lineObj.sealed;
    if (lineObj.open !== null && lineObj.open !== undefined) return lineObj.open;
    if (lineObj.close !== null && lineObj.close !== undefined) return lineObj.close;
    return null;
  }

  function lineForConfidence(lineObj, pick) {
    // Graded games keep today's close-line input. Ungraded games use the
    // seal-time number, which used to be copied into both open and close.
    if (!lineObj) return null;
    var graded = pick && (pick.outcome === "win" || pick.outcome === "loss" || pick.outcome === "push");
    if (graded && lineObj.close !== null && lineObj.close !== undefined) return lineObj.close;
    if (lineObj.sealed !== null && lineObj.sealed !== undefined) return lineObj.sealed;
    if (lineObj.close !== null && lineObj.close !== undefined) return lineObj.close;
    if (lineObj.open !== null && lineObj.open !== undefined) return lineObj.open;
    return null;
  }

  function renderTable(games, model) {
    if (!games || !games.length) {
      return '<div class="glass" style="padding:32px;text-align:center;color:var(--dim);">No games for this date.</div>';
    }
    model = "ridge";
    return games.map(function (g) { return renderBlock(g, model); }).join("");
  }

  function setSigmas(s) { SIGMAS = s; }

  global.AutopilotBoard = {
    renderTable: renderTable,
    buildView: buildView,
    setSigmas: setSigmas,
    outcomeWord: outcomeWord,
    overlayLiveScore: overlayLiveScore,
    sealedPickLine: sealedPickLine,
    provisionalOutcome: provisionalOutcome,
    recordOutcome: recordOutcome,
  };
  installLiveScoreHook();
})(window);
