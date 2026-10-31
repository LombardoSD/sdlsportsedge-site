// Full matchup board: season tabs + ET date picker (Ridge only, directive 025).
(function () {
  "use strict";

  var F = window.AutopilotFormat;
  var MODEL = "ridge";
  var seasons = {}; // year -> payload
  var meta = null;
  var activeYear = null;
  var currentDate = null;

  function dayRecordFor(data, date, model) {
    var games = data.games.filter(function (g) { return g.date === date; });
    var buckets = { ml: [], ats: [], tot: [] };
    games.forEach(function (g) {
      var arms = (g.arms && g.arms[model]) || {};
      ["ml", "ats", "tot"].forEach(function (key) {
        var pick = arms[key];
        if (pick && (pick.outcome === "win" || pick.outcome === "loss" || pick.outcome === "push")) {
          buckets[key].push(pick.outcome);
        }
      });
    });
    function wl(arr) {
      var w = 0, l = 0, p = 0;
      arr.forEach(function (o) {
        if (o === "win") w += 1;
        else if (o === "loss") l += 1;
        else if (o === "push") p += 1;
      });
      var n = w + l;
      return { wins: w, losses: l, push: p, pct: n ? Math.round((1000 * w) / n) / 10 : null };
    }
    return { date: date, games: games.length, ml: wl(buckets.ml), ats: wl(buckets.ats), tot: wl(buckets.tot) };
  }

  function emptyDayRecord() {
    return {
      date: null,
      games: 0,
      ml: { wins: 0, losses: 0, push: 0, pct: null },
      ats: { wins: 0, losses: 0, push: 0, pct: null },
      tot: { wins: 0, losses: 0, push: 0, pct: null },
    };
  }

  function renderDayStats(dayRecord) {
    var strip = document.getElementById("week-stat-strip");
    if (!strip) return;
    var rec = dayRecord || emptyDayRecord();
    var ml = rec.ml || emptyDayRecord().ml;
    var ats = rec.ats || emptyDayRecord().ats;
    var tot = rec.tot || emptyDayRecord().tot;
    strip.setAttribute("title", "% excludes pushes");
    strip.innerHTML =
      F.weekStatCellHtml("ML", ml) +
      F.weekStatCellHtml("ATS", ats) +
      F.weekStatCellHtml("TOT", tot);
  }

  function emptyLiveMessage(data) {
    var status = (data.season && data.season.status) || "";
    var start = data.liveLedgerStarts || (meta && meta.liveLedgerStarts) || "2026-11-01";
    var today = new Date().toISOString().slice(0, 10);
    if (today < start) return status || "Season starts Nov 1, 2026";
    return "No graded picks yet";
  }

  function renderDay(data, date) {
    currentDate = date;
    var model = MODEL;
    var games = data.games.filter(function (g) { return g.date === date; });
    var grid = document.getElementById("board-grid");
    grid.innerHTML = window.AutopilotBoard.renderTable(games, model);
    renderDayStats(dayRecordFor(data, date, model));
    document.querySelectorAll(".week-tabs button[data-date]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.date === date);
    });
  }

  var CAL_THIN_N = 20;

  function calibrationTable(title, rows) {
    if (!rows || !rows.length) {
      return (
        '<div class="glass calibration-col"><h3>' +
        title +
        '</h3><p class="parlay-empty">Not enough graded picks yet.</p></div>'
      );
    }
    var body = rows
      .map(function (row) {
        var gap = Math.round((row.actualPct - row.predictedAvg) * 10) / 10;
        var gapClass =
          gap > 0 ? "calibration-gap-pos" : gap < 0 ? "calibration-gap-neg" : "";
        var gapStr = (gap > 0 ? "+" : "") + gap.toFixed(1) + "pt";
        var wins = Math.round((row.n * row.actualPct) / 100);
        var thin = Number(row.n) < CAL_THIN_N;
        return (
          "<tr" +
          (thin ? ' class="calibration-thin"' : "") +
          ' title="' +
          (thin ? "Low n: " : "") +
          row.n +
          ' graded picks">' +
          "<td>" +
          row.range +
          "</td>" +
          "<td>" +
          wins +
          "–" +
          (row.n - wins) +
          "</td>" +
          "<td>" +
          row.predictedAvg.toFixed(1) +
          "%</td>" +
          "<td>" +
          row.actualPct.toFixed(1) +
          "%</td>" +
          '<td class="' +
          gapClass +
          '">' +
          gapStr +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
    return (
      '<div class="glass calibration-col">' +
      "<h3>" +
      title +
      "</h3>" +
      '<table class="game-log-table">' +
      "<thead><tr><th>Confidence</th><th>Record</th><th>Predicted</th><th>Actual</th><th>Gap</th></tr></thead>" +
      "<tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  function renderCalibration(data) {
    var container = document.getElementById("calibration-columns");
    var note = document.getElementById("calibration-note");
    if (!container) return;
    var cal = data.calibration || { ml: [], ats: [], tot: [] };
    container.innerHTML =
      calibrationTable("Moneyline", cal.ml) +
      calibrationTable("Against the Spread", cal.ats) +
      calibrationTable("Totals", cal.tot);
    if (note) {
      note.textContent =
        "Every graded Ridge pick in " +
        ((data.season && data.season.year) || "") +
        ", grouped by confidence. “Actual” should roughly match “Predicted” if a range is well-calibrated. Rows with n<20 are faded.";
    }
  }

  function showEmptyLive(data, title) {
    document.getElementById("board-title").textContent = title;
    var linesNote = document.getElementById("lines-note");
    linesNote.textContent =
      "Live sealed ledger starts 2026-11-01. The retrospective replay tab has graded walk-forward games.";
    linesNote.hidden = false;
    document.getElementById("week-tabs").innerHTML = "";
    renderDayStats(emptyDayRecord());
    document.getElementById("board-grid").innerHTML =
      '<div class="glass" style="padding:32px;text-align:center;color:var(--dim);">' +
        emptyLiveMessage(data) +
      "</div>";
    renderCalibration(data);
  }

  function showSeason(data, year, title, linesText) {
    activeYear = year;
    document.getElementById("board-title").textContent = title;
    var linesNote = document.getElementById("lines-note");
    linesNote.textContent = linesText;
    linesNote.hidden = false;
    renderCalibration(data);

    var dates = data.dates && data.dates.length
      ? data.dates.slice()
      : Array.from(new Set((data.games || []).map(function (g) { return g.date; }))).sort();

    if (!dates.length) {
      showEmptyLive(data, title);
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var initial = params.get("date") || dates[dates.length - 1];
    if (dates.indexOf(initial) < 0) initial = dates[dates.length - 1];

    var tabs = document.getElementById("week-tabs");
    var nav = F.mountDateNav(tabs, dates, initial, function (date) {
      renderDay(data, date);
    });
    renderDay(data, (nav && nav.selected) || initial);
  }

  function selectSeason(year) {
    var data = seasons[year];
    if (!data) return;
    var retroYear = window.AutopilotData.retrospectiveYear(meta);
    var liveY = window.AutopilotData.liveYear(meta);
    var retroLabel = meta.retrospectiveLabel || (String(retroYear - 1) + "–" + String(retroYear).slice(2) + " (RETROSPECTIVE REPLAY)");
    var liveLabel = meta.liveLabel || (String(liveY - 1) + "–" + String(liveY).slice(2) + " SEASON");
    var toggle = document.getElementById("season-toggle");
    if (toggle) {
      Array.prototype.forEach.call(toggle.querySelectorAll("button"), function (btn) {
        btn.classList.toggle("active", String(btn.dataset.season) === String(year));
      });
    }
    if (year === liveY) {
      var hasGames = data.games && data.games.length;
      if (!hasGames) {
        showEmptyLive(data, "Matchup Board · " + liveLabel);
        return;
      }
      showSeason(
        data,
        year,
        "Matchup Board · " + liveLabel,
        "Lines are the median across books present at each snapshot; a shift is the move from the consensus line when the pick was made to the last consensus line before tip. Live sealed ledger."
      );
      return;
    }
    showSeason(
      data,
      year,
      "Matchup Board · " + retroLabel,
      "Lines are the median across books present at each snapshot; a shift is the move from the consensus line when the pick was made to the last consensus line before tip. Retrospective walk-forward replay — not live picks. Live sealed ledger starts 2026-11-01."
    );
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ]).then(function (results) {
    meta = results[0];
    var retro = results[1];
    var live = results[2];
    var retroYear = window.AutopilotData.retrospectiveYear(meta);
    var liveY = window.AutopilotData.liveYear(meta);
    seasons[retroYear] = retro;
    seasons[liveY] = live;

    var retroLabel = meta.retrospectiveLabel || (String(retroYear - 1) + "–" + String(retroYear).slice(2) + " (RETROSPECTIVE REPLAY)");
    var liveLabel = meta.liveLabel || (String(liveY - 1) + "–" + String(liveY).slice(2) + " SEASON");
    var toggle = document.getElementById("season-toggle");
    if (toggle) {
      toggle.innerHTML =
        '<button type="button" data-season="' + retroYear + '">' + retroLabel + "</button>" +
        '<button type="button" data-season="' + liveY + '">' + liveLabel + "</button>";
      toggle.onclick = function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        selectSeason(Number(btn.dataset.season));
      };
    }
    function seasonDates(data) {
      if (!data) return [];
      if (data.dates && data.dates.length) return data.dates.slice();
      return Array.from(
        new Set((data.games || []).map(function (g) { return g.date; }))
      ).sort();
    }

    var defaultYear = window.AutopilotData.defaultSeasonYear(meta);
    // Deep link ?date=YYYY-MM-DD selects the season that contains that day
    // (overrides ?season= when the date is present in exactly one season).
    var dateParam = new URLSearchParams(window.location.search).get("date");
    if (dateParam) {
      if (seasonDates(retro).indexOf(dateParam) >= 0) defaultYear = retroYear;
      else if (seasonDates(live).indexOf(dateParam) >= 0) defaultYear = liveY;
    }
    selectSeason(defaultYear);
  }).catch(function (err) { console.error("Failed to load season data", err); });
})();
