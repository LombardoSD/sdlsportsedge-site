// Shared matchup rendering, used by the home page preview and the full board.
// Each game is its own full-width block (glass panel) so nothing's cramped,
// with ML / ATS / Totals laid out as three clear columns inside it.
// Graded and pending games (season_2025.json / season_2026.json) share
// one shape: ml/ats/tot each carry a real pick + probability; "outcome" is
// win/loss/push/tie once graded, or null while the game hasn't been played yet
// (that game also carries "final": false and no homeScore/awayScore).
(function (global) {
  "use strict";

  function fmtPrice(p) {
    if (p === null || p === undefined) return "—";
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
    return '<span class="gb-line-team">' + team + '</span>';
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

  function confidenceRow(prob) {
    return '<div class="gb-conf"><span class="gb-pick-label">Confidence:</span> ' + pct(prob) + '</div>';
  }

  function resultRow(outcome) {
    return '<div class="gb-conf gb-result"><span class="gb-pick-label">Result:</span> ' + outcomeBadge(outcome) + '</div>';
  }

  function outcomeClass(outcome) {
    if (outcome === "win") return "win";
    if (outcome === "loss") return "loss";
    if (outcome === "push" || outcome === "tie") return "push";
    return "pending";
  }

  function outcomeWord(outcome) {
    if (outcome === "win") return "WINNER";
    if (outcome === "loss") return "LOSS";
    if (outcome === "push") return "PUSH";
    if (outcome === "tie") return "TIE";
    return "PENDING";
  }

  function pct(p) {
    return p === null || p === undefined ? "—" : Math.round(p * 100) + "%";
  }

  function teamLink(abbr) {
    var meta = (global.AutopilotData && global.AutopilotData.TEAMS && global.AutopilotData.TEAMS[abbr]) || {};
    var city = meta.city || abbr;
    return '<a class="gb-team" href="./team.html?team=' + abbr + '">' + city + '</a>';
  }

  // Team wordmark: the nickname in sharp white letters with a team-color outline, a static
  // glow and a light band that sweeps through the letters. An original design, not an
  // official logo or mark.
  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  // A bright, saturated version of the team color for the glow and the sweeping band.
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
  function plate(abbr, side) {
    var meta = (global.AutopilotData && global.AutopilotData.TEAMS && global.AutopilotData.TEAMS[abbr]) || {};
    var color = meta.color || "#3a4150";
    var name = (meta.name || abbr).toUpperCase();
    var edge = luminance(color) < 0.02 ? "#9aa0a6" : "#05070a";
    var style = "--c:" + color + ";--o:" + edge + ";--e:" + electricColor(color);
    return (
      '<span class="gb-wm-wrap ' + side + '">' +
        teamLink(abbr) +
        '<span class="gb-wm ' + side + '" style="' + style + '" aria-hidden="true">' +
          '<span class="gb-wm-text" data-t="' + name + '"><span class="f">' + name + '</span></span>' +
        '</span>' +
      '</span>'
    );
  }

  function header(g, isUpcoming) {
    var matchup;
    if (isUpcoming) {
      matchup = plate(g.away, 'away') + '<span class="gb-matchup-center"><span class="gb-sep">at</span></span>' + plate(g.home, 'home');
    } else {
      var awayWon = g.awayScore > g.homeScore;
      matchup =
        plate(g.away, 'away') +
        '<span class="gb-matchup-center">' +
          '<span class="gb-score' + (awayWon ? " winner" : "") + '">' + g.awayScore + '</span>' +
          '<span class="gb-sep">–</span>' +
          '<span class="gb-score' + (!awayWon ? " winner" : "") + '">' + g.homeScore + '</span>' +
        '</span>' +
        plate(g.home, 'home');
    }
    return (
      '<div class="gb-header">' +
        '<div class="gb-matchup">' + matchup + '</div>' +
        '<div class="gb-date">' + (g.kickoff || "") + '</div>' +
      '</div>'
    );
  }

  function outcomeBadge(outcome) {
    var word = outcomeWord(outcome);
    // WIN gets an inner span so a soft color band can sweep through its letters
    if (outcome === "win") word = '<span class="gb-win-text">' + word + '</span>';
    return '<span class="gb-outcome ' + outcomeClass(outcome) + '">' + word + '</span>';
  }

  var COL_HINT = ' <span class="gb-col-hint">Shifts</span>';

  function mlColumn(g) {
    var lines = g.lines || {};
    var a = lines.mlAway || {}, h = lines.mlHome || {};
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Moneyline' + COL_HINT + '</div>' +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtTeamLine(g.away, a.open, a.close, fmtPrice) + '</span></div>' +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtTeamLine(g.home, h.open, h.close, fmtPrice) + '</span></div>' +
        '<div class="gb-pick">' + PICK_LABEL + ' ' + g.ml.pick + '</div>' +
        confidenceRow(g.ml.prob) +
        resultRow(g.ml.outcome) +
      '</div>'
    );
  }

  function atsColumn(g) {
    var lines = g.lines || {};
    if (!g.ats) {
      return '<div class="gb-col"><div class="gb-col-label">Spread' + COL_HINT + '</div><div class="gb-line"><span class="gb-line-odds">—</span></div></div>';
    }
    var spreadNow = lines.spread && (
      lines.spread.close !== null && lines.spread.close !== undefined ? lines.spread.close : lines.spread.open
    );
    var pickIsHome = g.ats.pick === g.home;
    var pickSpread = spreadNow === null || spreadNow === undefined ? null : (pickIsHome ? spreadNow : -spreadNow);
    var pickLabel = g.ats.pick + " (" + fmtSigned(pickSpread) + ")";
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Spread' + COL_HINT + '</div>' +
        '<div class="gb-line">' + teamTag("Home Team Spread") + '</div>' +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtTeamLine(g.home, lines.spread && lines.spread.open, lines.spread && lines.spread.close, fmtSigned) + '</span></div>' +
        '<div class="gb-pick">' + PICK_LABEL + ' ' + pickLabel + '</div>' +
        confidenceRow(g.ats.prob) +
        resultRow(g.ats.outcome) +
      '</div>'
    );
  }

  function totColumn(g) {
    var lines = g.lines || {};
    if (!g.tot) {
      return '<div class="gb-col"><div class="gb-col-label">Total Point' + COL_HINT + '</div><div class="gb-line"><span class="gb-line-odds">—</span></div></div>';
    }
    var pickLabel = g.tot.pick + (g.total !== null && g.total !== undefined ? " " + g.total : "");
    return (
      '<div class="gb-col">' +
        '<div class="gb-col-label">Total Point' + COL_HINT + '</div>' +
        '<div class="gb-line">' + teamTag("Over/Under") + '</div>' +
        '<div class="gb-line"><span class="gb-line-odds">' + fmtLine(lines.total && lines.total.open, lines.total && lines.total.close, String) + '</span></div>' +
        '<div class="gb-pick">' + PICK_LABEL + ' ' + pickLabel + '</div>' +
        confidenceRow(g.tot.prob) +
        resultRow(g.tot.outcome) +
      '</div>'
    );
  }

  function renderBlock(g) {
    var isUpcoming = g.final === false;
    return (
      '<div class="game-block glass">' +
        header(g, isUpcoming) +
        '<div class="gb-grid">' + mlColumn(g) + atsColumn(g) + totColumn(g) + '</div>' +
      '</div>'
    );
  }

  function renderTable(games) {
    return games.map(renderBlock).join("");
  }

  global.AutopilotBoard = { renderTable: renderTable };
})(window);
