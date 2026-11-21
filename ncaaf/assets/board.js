// NCAAF matchup board: season tabs + week tabs (?week=N) + ET day groups.
(function () {
  "use strict";

  var F = window.AutopilotFormat;
  var seasons = {};
  var meta = null;

  function maxWeek(data) {
    if (data.season && data.season.scheduledWeeks) return data.season.scheduledWeeks;
    var weeks = (data.weekly || []).map(function (w) {
      return w.week;
    });
    return weeks.length ? Math.max.apply(null, weeks) : 15;
  }

  function defaultWeek(data) {
    if (!data.games || !data.games.length) return 1;
    return Math.max.apply(
      null,
      data.games.map(function (g) {
        return g.week;
      })
    );
  }

  function emptyLiveMessage(data) {
    return (
      (data.season && data.season.status) ||
      (meta && meta.status) ||
      "Live sealed picks begin when the first revision is written"
    );
  }

  var LINES_NOTE =
    "Lines are consensus medians. A shift is the move from the week's opening consensus line to the sealed line before kickoff.";

  function statBar(label, rec) {
    rec = rec || { wins: 0, losses: 0, push: 0, pct: null };
    return F.weekStatCellHtml
      ? F.weekStatCellHtml(label, rec)
      : '<div class="wstat"><span class="wstat-label">' + label + "</span></div>";
  }

  function wlFromList(arr) {
    var w = 0,
      l = 0,
      p = 0;
    (arr || []).forEach(function (o) {
      if (o === "win") w += 1;
      else if (o === "loss") l += 1;
      else if (o === "push") p += 1;
    });
    var n = w + l;
    return { wins: w, losses: l, push: p, pct: n ? Math.round((1000 * w) / n) / 10 : null };
  }

  function hasDecisions(rec) {
    if (!rec) return false;
    return (rec.wins || 0) + (rec.losses || 0) + (rec.push || 0) > 0;
  }

  function mergeRec(base, extra) {
    base = base || { wins: 0, losses: 0, push: 0, pct: null };
    if (!hasDecisions(extra)) return base;
    var w = (base.wins || 0) + extra.wins;
    var l = (base.losses || 0) + extra.losses;
    var p = (base.push || 0) + (extra.push || 0);
    var n = w + l;
    return { wins: w, losses: l, push: p, pct: n ? Math.round((1000 * w) / n) / 10 : null };
  }

  // Provisional adds only. Published outcomes stay in the weekly record so a
  // graded game is not counted twice. Same inclusion rule as the NCAAB day strip.
  function provisionalAdds(data, week) {
    var api = window.AutopilotBoard || {};
    if (typeof api.overlayLiveScore !== "function" || typeof api.recordOutcome !== "function") {
      return null;
    }
    var buckets = { ml: [], ats: [], tot: [] };
    (data.games || []).forEach(function (g) {
      if (g.week !== week) return;
      var shown = api.overlayLiveScore(g);
      ["ml", "ats", "tot"].forEach(function (key) {
        var pick = shown[key];
        if (!pick || pick.noPick) return;
        var official = pick.outcome;
        if (official === "win" || official === "loss" || official === "push") return;
        var outcome = api.recordOutcome(shown, pick, key);
        if (outcome === "win" || outcome === "loss" || outcome === "push") buckets[key].push(outcome);
      });
    });
    return {
      ml: wlFromList(buckets.ml),
      ats: wlFromList(buckets.ats),
      tot: wlFromList(buckets.tot),
    };
  }

  function renderWeekStats(weekRecord, hasGames, week, data) {
    var strip = document.getElementById("week-stat-strip");
    if (!strip) return;
    if (!hasGames) {
      strip.innerHTML = "";
      return;
    }
    var adds = provisionalAdds(data, week);
    var ml = mergeRec(weekRecord && weekRecord.ml, adds && adds.ml);
    var ats = mergeRec(weekRecord && weekRecord.ats, adds && adds.ats);
    var totExtra = adds && adds.tot;
    var tot = mergeRec(weekRecord && weekRecord.tot, totExtra);
    var ungraded = !hasDecisions(ml) && !hasDecisions(ats) && !hasDecisions(tot);
    strip.title = "% excludes pushes";
    strip.innerHTML =
      statBar("ML", ungraded ? null : ml) +
      statBar("ATS", ungraded ? null : ats) +
      statBar("TOT", ungraded ? null : tot) +
      (ungraded ? '<span class="wstat-pending">Not yet graded</span>' : "");
  }

  function renderWeek(data, week) {
    var games = (data.games || []).filter(function (g) {
      return g.week === week;
    });
    var grid = document.getElementById("board-grid");
    if (!games.length) {
      grid.innerHTML =
        '<div class="glass" style="padding:32px;text-align:center;color:var(--dim);">' +
        "Week " +
        week +
        " hasn’t been generated yet — check back closer to kickoff.</div>";
    } else {
      grid.innerHTML = window.AutopilotBoard.renderTable(games);
    }
    var weekRec = (data.weekly || []).find(function (w) {
      return w.week === week;
    });
    renderWeekStats(weekRec, games.length > 0, week, data);
    document.querySelectorAll(".week-tabs button[data-week]").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.dataset.week) === week);
    });
  }

  function showEmptyLive(data, title) {
    document.getElementById("board-title").textContent = title;
    var linesNote = document.getElementById("lines-note");
    if (linesNote) {
      linesNote.textContent = emptyLiveMessage(data);
      linesNote.hidden = false;
    }
    document.getElementById("week-tabs").innerHTML = "";
    document.getElementById("week-stat-strip").innerHTML = "";
    document.getElementById("board-grid").innerHTML =
      '<div class="glass" style="padding:32px;text-align:center;color:var(--dim);">' +
      emptyLiveMessage(data) +
      "</div>";
    var cal = document.getElementById("calibration-columns");
    if (cal) cal.innerHTML = "";
  }

  function showSeason(data, year, title) {
    document.getElementById("board-title").textContent = title;
    var linesNote = document.getElementById("lines-note");
    if (linesNote) {
      linesNote.textContent = LINES_NOTE;
      linesNote.hidden = false;
    }

    var available = {};
    (data.weekly || []).forEach(function (w) {
      available[w.week] = true;
    });
    (data.games || []).forEach(function (g) {
      available[g.week] = true;
    });
    var last = maxWeek(data);

    var params = new URLSearchParams(window.location.search);
    var initialWeek = Number(params.get("week")) || defaultWeek(data);
    if (initialWeek < 1 || initialWeek > last) initialWeek = defaultWeek(data);

    var tabs = document.getElementById("week-tabs");
    tabs.style.display = "";
    var html = "";
    for (var w = 1; w <= last; w++) {
      html +=
        '<button type="button" data-week="' +
        w +
        '"' +
        (available[w] ? "" : ' class="unavailable"') +
        ">Week " +
        w +
        "</button>";
    }
    tabs.innerHTML = html;
    tabs.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn || btn.classList.contains("unavailable")) return;
      var week = Number(btn.dataset.week);
      var url = new URL(window.location.href);
      url.searchParams.set("week", String(week));
      window.history.replaceState({}, "", url);
      renderWeek(data, week);
    };

    renderWeek(data, initialWeek);
  }

  function selectSeason(year) {
    var data = seasons[year];
    if (!data) return;
    var retroYear = window.AutopilotData.retrospectiveYear(meta);
    var liveY = window.AutopilotData.liveYear(meta);
    var retroLabel = meta.retrospectiveLabel || String(retroYear);
    var liveLabel = meta.liveLabel || String(liveY);
    var toggle = document.getElementById("season-toggle");
    if (toggle) {
      Array.prototype.forEach.call(toggle.querySelectorAll("button"), function (btn) {
        btn.classList.toggle("active", String(btn.dataset.season) === String(year));
      });
    }
    if (year === liveY) {
      if (!data.games || !data.games.length) {
        showEmptyLive(data, liveY + " Season Matchup Board");
        return;
      }
      showSeason(data, year, liveY + " Season Matchup Board");
      return;
    }
    showSeason(data, year, "Full Matchup Board");
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      var retro = results[1];
      var live = results[2];
      var retroYear = window.AutopilotData.retrospectiveYear(meta);
      var liveY = window.AutopilotData.liveYear(meta);
      seasons[retroYear] = retro;
      seasons[liveY] = live;

      var retroLabel = meta.retrospectiveLabel || String(retroYear);
      var liveLabel = meta.liveLabel || String(liveY);
      var toggle = document.getElementById("season-toggle");
      if (toggle) {
        toggle.innerHTML =
          '<button type="button" data-season="' +
          retroYear +
          '">' +
          retroLabel +
          "</button>" +
          '<button type="button" data-season="' +
          liveY +
          '">' +
          liveLabel +
          "</button>";
        toggle.onclick = function (e) {
          var btn = e.target.closest("button");
          if (!btn) return;
          selectSeason(Number(btn.dataset.season));
        };
      }
      selectSeason(window.AutopilotData.defaultSeasonYear(meta));
    })
    .catch(function (err) {
      console.error("Failed to load season data", err);
    });
})();
