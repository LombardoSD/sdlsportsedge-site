// Team page: team results rings/log for the current season, past seasons, then model accuracy.
(function () {
  "use strict";

  var TEAMS = window.AutopilotData.TEAMS;
  // Later replay years (2021-2024) and a future live year slot in here.
  var SEASONS = [
    { year: 2025, kind: "replay", loader: function () { return window.AutopilotData.loadSeason(); } },
    { year: 2026, kind: "live", loader: function () { return window.AutopilotData.loadSeason2026(); } },
  ];
  var RESULT_KINDS = [
    { key: "ml", short: "Win %", color: "var(--win)", resultKey: "ml" },
    { key: "ats", short: "Cover %", color: "var(--accent)", resultKey: "ats" },
    { key: "tot", short: "Over %", color: "var(--push)", resultKey: "totals" },
  ];
  var CIRC = 2 * Math.PI * 64;
  var reduceMotion = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // One decimal, ties to even, matching the Metrics rings and published pct fields.
  function fmt1(v) {
    var x = v * 10;
    var f = Math.floor(x);
    if (x - f === 0.5) x = f % 2 === 0 ? f : f + 1;
    else x = Math.round(x);
    return (x / 10).toFixed(1);
  }

  function fmtMarket(v) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    var text = String(v);
    if (/^-?\d+$/.test(text)) text += ".0";
    else if (!/^-?\d+\.\d$/.test(text)) text = fmt1(v);
    return text + "%";
  }

  function gamesLabel(n) {
    return n + (n === 1 ? " game graded" : " games graded");
  }

  function recordLine(wins, losses, ties) {
    var text = wins + "\u2013" + losses;
    if (ties) text += "\u2013" + ties;
    return text;
  }

  function teamRecordText(team) {
    var rec = (team && team.record) || {};
    var r = resultsOf(team);
    var wins = typeof rec.wins === "number" ? rec.wins : (r && r.ml ? r.ml.wins : 0);
    var losses = typeof rec.losses === "number" ? rec.losses : (r && r.ml ? r.ml.losses : 0);
    var ties = typeof rec.ties === "number" ? rec.ties : (r && r.ml ? r.ml.ties : 0);
    return recordLine(wins, losses, ties);
  }

  function replayIcon() {
    return (
      '<svg class="replay-icon" viewBox="0 0 24 24" role="img" aria-label="Retrospective replay year">' +
        '<title>Retrospective replay year</title>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 2.6-6.3"/>' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 4v5h5"/>' +
      '</svg>'
    );
  }

  function fmtSpread(v) {
    if (typeof v !== "number" || !isFinite(v)) return "";
    if (Math.abs(v) < 1e-9) return "PICK";
    var abs = Math.abs(v);
    var body = (abs % 1 === 0) ? abs.toFixed(1) : abs.toFixed(1);
    return (v > 0 ? "+" : "-") + body;
  }

  function fmtTotal(v) {
    if (typeof v !== "number" || !isFinite(v)) return "";
    return (v % 1 === 0) ? v.toFixed(1) : String(v);
  }

  function scoreHtml(game) {
    var result = game.result;
    if (!result && game.won === true) result = "win";
    if (!result && game.won === false) {
      result = (game.teamScore != null && game.oppScore != null && game.teamScore === game.oppScore) ? "tie" : "loss";
    }
    if (!result || game.teamScore == null || game.oppScore == null) return "—";
    var mark = result === "win" ? "W" : (result === "tie" ? "T" : "L");
    return mark + " " + game.teamScore + "\u2013" + game.oppScore;
  }

  function atsCell(game) {
    var res = game.atsResult;
    if (!res) return '<span class="out-none">—</span>';
    var line = fmtSpread(game.spreadForTeam);
    var label = res === "cover" ? "Cover" : (res === "push" ? "Push" : "No cover");
    var cls = res === "cover" ? "out-win" : (res === "push" ? "out-push" : "out-loss");
    return (
      '<span class="ats-cell ' + cls + '">' +
        '<span class="ats-result">' + label + "</span>" +
        (line ? '<span class="ats-line">' + line + "</span>" : "") +
      "</span>"
    );
  }

  function ouCell(game) {
    var res = game.ouResult;
    if (!res) return '<span class="out-none">—</span>';
    var tot = fmtTotal(game.closingTotal);
    if (res === "push") {
      return '<span class="out-push">Push' + (tot ? " " + tot : "") + "</span>";
    }
    var letter = res === "over" ? "O" : "U";
    return (
      '<span class="ou-cell out-ou">' +
        '<span class="ou-letter">' + letter + "</span>" +
        (tot ? '<span class="ou-total">' + tot + "</span>" : "") +
      "</span>"
    );
  }

  function publishedResultAgg(team, kind) {
    var r = resultsOf(team);
    if (!r) return { pct: null, record: "", graded: 0 };
    if (kind.resultKey === "ml") {
      var ml = r.ml || {};
      var graded = ml.gamesGraded || 0;
      return {
        pct: graded && typeof ml.pct === "number" ? ml.pct : null,
        record: recordLine(ml.wins || 0, ml.losses || 0, ml.ties || 0),
        graded: graded,
      };
    }
    if (kind.resultKey === "ats") {
      var ats = r.ats || {};
      var g = ats.gamesGraded || 0;
      return {
        pct: g && typeof ats.pct === "number" ? ats.pct : null,
        record: (ats.wins || 0) + "\u2013" + (ats.losses || 0) + "\u2013" + (ats.pushes || 0),
        graded: g,
      };
    }
    var tot = r.totals || {};
    var tg = tot.gamesGraded || 0;
    return {
      pct: tg && typeof tot.overPct === "number" ? tot.overPct : null,
      record: (tot.overs || 0) + "\u2013" + (tot.unders || 0) + "\u2013" + (tot.pushes || 0),
      graded: tg,
    };
  }

  function poolReplay(rows, abbr, kind) {
    var wins = 0, losses = 0, ties = 0, covers = 0, atsL = 0, overs = 0, unders = 0;
    rows.forEach(function (row) {
      if (row.spec.kind !== "replay" || !row.data || !row.data.teams) return;
      var team = row.data.teams[abbr];
      var r = resultsOf(team);
      if (!r) return;
      if (kind.resultKey === "ml") {
        wins += (r.ml && r.ml.wins) || 0;
        losses += (r.ml && r.ml.losses) || 0;
        ties += (r.ml && r.ml.ties) || 0;
      } else if (kind.resultKey === "ats") {
        covers += (r.ats && r.ats.wins) || 0;
        atsL += (r.ats && r.ats.losses) || 0;
      } else {
        overs += (r.totals && r.totals.overs) || 0;
        unders += (r.totals && r.totals.unders) || 0;
      }
    });
    if (kind.resultKey === "ml") {
      var n = wins + losses;
      return { pct: n ? (100 * wins) / n : null, record: recordLine(wins, losses, ties), graded: wins + losses + ties };
    }
    if (kind.resultKey === "ats") {
      var an = covers + atsL;
      return { pct: an ? (100 * covers) / an : null, record: covers + "\u2013" + atsL, graded: an };
    }
    var on = overs + unders;
    return { pct: on ? (100 * overs) / on : null, record: overs + "\u2013" + unders, graded: on };
  }

  function ringHtml(kind, agg, sizeClass) {
    var empty = agg.pct === null || agg.pct === undefined;
    var pct = empty ? 0 : agg.pct;
    var shown = empty ? "" : fmt1(pct);
    var num = empty
      ? '<span class="ring-dash">—</span>'
      : '<span data-count="' + shown + '">' + (reduceMotion ? shown : "0.0") + '</span><span class="unit">%</span>';
    var metaRecord = empty ? "" : '<div class="ring-record">' + agg.record + "</div>";
    return (
      '<div class="ring-card glass" style="--c:' + kind.color + '">' +
        '<div class="ring ' + sizeClass + '">' +
          '<svg viewBox="0 0 160 160" aria-hidden="true">' +
            '<circle class="ring-track" cx="80" cy="80" r="64"></circle>' +
            '<circle class="ring-fill" cx="80" cy="80" r="64" data-pct="' + (empty ? "0" : pct.toFixed(2)) + '" ' +
              'stroke-dasharray="' + CIRC.toFixed(2) + '" stroke-dashoffset="' + CIRC.toFixed(2) + '"></circle>' +
          '</svg>' +
          '<div class="ring-center">' +
            '<div class="ring-num">' + num + '</div>' +
          "</div>" +
        "</div>" +
        '<div class="ring-meta">' +
          '<div class="ring-label">' + kind.short + "</div>" +
          metaRecord +
        "</div>" +
      "</div>"
    );
  }

  function ringsHtml(sizeClass, aggFor) {
    return RESULT_KINDS.map(function (kind) {
      return ringHtml(kind, aggFor(kind), sizeClass);
    }).join("");
  }

  function animate(root) {
    if (!root || !root.querySelectorAll) return;
    var rings = root.querySelectorAll(".ring-fill");
    function apply() {
      Array.prototype.forEach.call(rings, function (c) {
        var pct = parseFloat(c.getAttribute("data-pct")) || 0;
        c.style.strokeDashoffset = (CIRC * (1 - pct / 100)).toFixed(2);
      });
    }
    if (reduceMotion || !window.requestAnimationFrame) {
      apply();
      return;
    }
    window.requestAnimationFrame(function () { window.requestAnimationFrame(apply); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / 1100, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(1);
        if (t < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  function notFound() {
    document.getElementById("team-hero").innerHTML =
      '<h1>Team not found</h1><p style="color:var(--dim)">Try the <a href="./teams.html" style="color:var(--accent)">team list</a>.</p>';
    var current = document.getElementById("current-season");
    var past = document.getElementById("past-seasons");
    if (current) current.hidden = true;
    if (past) past.hidden = true;
    var log = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    if (log) log.innerHTML = "";
    if (empty) { empty.hidden = true; empty.textContent = ""; }
    var model = document.getElementById("model-secondary");
    if (model) model.hidden = true;
  }

  function renderLog(team, year) {
    var table = document.getElementById("game-log");
    var body = document.getElementById("game-log-body");
    var empty = document.getElementById("game-log-empty");
    var games = (team.games || []).slice().sort(function (a, b) {
      return a.week - b.week || String(a.opponent).localeCompare(String(b.opponent));
    });
    if (!games.length) {
      if (body) body.innerHTML = "";
      if (table) table.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = "No graded games yet for " + year + ".";
      }
      return;
    }
    if (table) table.hidden = false;
    if (empty) { empty.hidden = true; empty.textContent = ""; }
    body.innerHTML = games.map(function (game) {
      var place = game.isHome ? "vs" : "at";
      return (
        "<tr>" +
          "<td>" + game.week + "</td>" +
          "<td>" + place + ' <a class="team-link" href="./team.html?team=' + game.opponent + '">' + game.opponent + "</a></td>" +
          "<td>" + scoreHtml(game) + "</td>" +
          "<td>" + atsCell(game) + "</td>" +
          "<td>" + ouCell(game) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderModelSecondary(team) {
    var box = document.getElementById("model-secondary");
    if (!box) return;
    var acc = (team && team.modelAccuracy) || {};
    var has = typeof acc.ml === "number" || typeof acc.ats === "number" || typeof acc.tot === "number";
    if (!has) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML =
      '<p class="model-secondary-title">How the model did in this team\u2019s games</p>' +
      '<p class="model-secondary-explain">Share of this team\u2019s games where the model\u2019s moneyline, ATS, or totals pick was correct (not the team\u2019s own record).</p>' +
      '<div class="model-secondary-stats">' +
        "<span>Model ML " + fmtMarket(acc.ml) + "</span>" +
        "<span>Model ATS " + fmtMarket(acc.ats) + "</span>" +
        "<span>Model Totals " + fmtMarket(acc.tot) + "</span>" +
      "</div>";
  }

  function renderPast(past, abbr) {
    var section = document.getElementById("past-seasons");
    if (!past.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    var rings = document.getElementById("past-rings");
    rings.innerHTML = ringsHtml("ring-sm", function (kind) {
      return poolReplay(past, abbr, kind);
    });
    animate(rings);
    var rows = past.map(function (row) {
      var team = row.data.teams[abbr];
      var icon = row.spec.kind === "replay" ? replayIcon() : "";
      var ml = publishedResultAgg(team, RESULT_KINDS[0]);
      var ats = publishedResultAgg(team, RESULT_KINDS[1]);
      var tot = publishedResultAgg(team, RESULT_KINDS[2]);
      var cell = function (agg) { return agg.pct === null ? "—" : fmtMarket(agg.pct); };
      return (
        '<tr class="past-year" data-kind="' + row.spec.kind + '">' +
          '<td><span class="past-year-label">' + icon + '<span class="past-year-num">' + row.spec.year + "</span></span></td>" +
          "<td>" + cell(ml) + "</td>" +
          "<td>" + cell(ats) + "</td>" +
          "<td>" + cell(tot) + "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("past-years").innerHTML =
      '<table class="game-log-table past-year-table">' +
        "<thead><tr><th>Year</th><th>Win %</th><th>Cover %</th><th>Over %</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>";
    document.getElementById("replay-key").innerHTML =
      replayIcon() +
      '<span>Retrospective replay year: picks made week by week from earlier games only, then graded. Not a live record.</span>';
  }

  function captionFor(team) {
    var r = resultsOf(team) || {};
    var ml = (r.ml && r.ml.gamesGraded) || 0;
    var ats = (r.ats && r.ats.gamesGraded) || 0;
    var tot = (r.totals && r.totals.gamesGraded) || 0;
    if (!ml && !ats && !tot) return "0 games graded";
    return "ML " + gamesLabel(ml) + " · ATS " + gamesLabel(ats) + " · Totals " + gamesLabel(tot);
  }

  function render(current, past, abbr) {
    var team = current.data.teams[abbr];
    if (!team) {
      notFound();
      return;
    }
    var meta = TEAMS[abbr] || { name: team.name, color: "#333" };
    var year = current.spec.year;
    document.getElementById("page-title").textContent = meta.name + " — SDL Sports EDGE NFL";
    document.getElementById("team-hero").innerHTML =
      '<div class="crest glass" style="background:' + meta.color + "22; color:" + meta.color + "; border:1px solid " + meta.color + '55;">' + abbr + "</div>" +
      "<div>" +
        "<h1>" + meta.name + "</h1>" +
        '<div class="record-line">' + year + " season: " + teamRecordText(team) + "</div>" +
      "</div>";

    document.getElementById("current-season").hidden = false;
    document.getElementById("current-heading").innerHTML =
      year + ' season <span class="season-kind">' + current.spec.kind + "</span>";
    var rings = document.getElementById("current-rings");
    rings.innerHTML = ringsHtml("ring-lg", function (kind) {
      return publishedResultAgg(team, kind);
    });
    animate(rings);
    document.getElementById("current-caption").textContent = captionFor(team);
    renderLog(team, year);
    renderModelSecondary(team);
    renderPast(past, abbr);
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
    var params = new URLSearchParams(window.location.search);
    var abbr = (params.get("team") || "").toUpperCase();
    var current = pickCurrent(loaded);
    if (!current || !current.data.teams[abbr]) {
      notFound();
      return;
    }
    var past = loaded.filter(function (row) {
      return row.data && row.data.teams && row.spec.year < current.spec.year;
    }).sort(function (a, b) { return b.spec.year - a.spec.year; });
    render(current, past, abbr);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
