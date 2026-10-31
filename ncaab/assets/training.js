// Training: month → day table + day-by-day narrative (directive 027).
(function () {
  "use strict";

  var F = window.AutopilotFormat;
  var seasons = {};
  var meta = null;
  var activeYear = null;
  var allRows = [];
  var selectedDate = null;
  var narrativeNav = null;
  var SMALL_N = 20;

  function fmt(v, d) {
    return v === null || v === undefined ? "—" : Number(v).toFixed(d);
  }

  function arrow(delta, higherIsBetter) {
    if (delta === null || delta === undefined) return '<span class="dim">—</span>';
    var improved = higherIsBetter ? delta > 0.05 : delta < -0.0005;
    var worse = higherIsBetter ? delta < -0.05 : delta > 0.0005;
    if (improved) return '<span class="pill-hit">▲</span>';
    if (worse) return '<span class="pill-miss">▼</span>';
    return '<span class="dim">■</span>';
  }

  function lowNMarker() {
    return '<span class="dim">low n</span>';
  }

  function dailyFor(data) {
    return (data && data.daily) || [];
  }

  function threshold(data) {
    return (data && data.smallSampleN) || SMALL_N;
  }

  function normalizeRow(r, thresh) {
    var n = r.n != null ? r.n : r.games != null ? r.games : 0;
    var graded = r.graded != null ? !!r.graded : n > 0;
    var smallSample = r.smallSample != null ? !!r.smallSample : n < thresh;
    return Object.assign({}, r, { n: n, graded: graded, smallSample: smallSample });
  }

  function withDeltas(rows) {
    var out = [];
    var prev = null;
    rows.forEach(function (r) {
      if (!r.graded) {
        out.push(Object.assign({}, r, { delta: null }));
        return;
      }
      var d = prev
        ? {
            suLogloss:
              r.mlLogloss != null && prev.mlLogloss != null
                ? r.mlLogloss - prev.mlLogloss
                : null,
            atsLogloss:
              r.atsLogloss != null && prev.atsLogloss != null
                ? r.atsLogloss - prev.atsLogloss
                : null,
            totLogloss:
              r.totLogloss != null && prev.totLogloss != null
                ? r.totLogloss - prev.totLogloss
                : null,
            suPct:
              r.ml && prev.ml && r.ml.pct != null && prev.ml.pct != null
                ? r.ml.pct - prev.ml.pct
                : null,
            atsPct:
              r.ats && prev.ats && r.ats.pct != null && prev.ats.pct != null
                ? r.ats.pct - prev.ats.pct
                : null,
            totPct:
              r.tot && prev.tot && r.tot.pct != null && prev.tot.pct != null
                ? r.tot.pct - prev.tot.pct
                : null,
          }
        : null;
      out.push(Object.assign({}, r, { delta: d }));
      prev = r;
    });
    return out;
  }

  function datesFromRows(rows) {
    return rows
      .filter(function (r) {
        return r.graded && r.date;
      })
      .map(function (r) {
        return r.date;
      });
  }

  function readQueryDate() {
    try {
      return new URL(window.location.href).searchParams.get("date") || null;
    } catch (e) {
      return null;
    }
  }

  function writeQueryDate(date) {
    try {
      var url = new URL(window.location.href);
      if (date) url.searchParams.set("date", date);
      else url.searchParams.delete("date");
      window.history.replaceState({}, "", url);
    } catch (e) {
      /* ignore */
    }
  }

  function resolveDate(dates, preferred) {
    if (!dates.length) return null;
    if (preferred && dates.indexOf(preferred) >= 0) return preferred;
    return dates[dates.length - 1];
  }

  function dayLabel(dateStr) {
    return F && F.dayButtonLabel ? F.dayButtonLabel(dateStr) : dateStr;
  }

  function monthKey(dateStr) {
    return F && F.monthKeyFromDate ? F.monthKeyFromDate(dateStr) : String(dateStr).slice(0, 7);
  }

  function monthsList(dates) {
    return F && F.monthsWithGames ? F.monthsWithGames(dates) : [];
  }

  function deltaCell(d, key, higherIsBetter, thin) {
    if (thin) return lowNMarker();
    if (!d) return "—";
    return arrow(d[key], higherIsBetter);
  }

  function renderMonthTabs(dates, activeMonth) {
    var tabs = document.getElementById("training-month-tabs");
    if (!tabs) return;
    var months = monthsList(dates);
    if (!months.length) {
      tabs.innerHTML = "";
      return;
    }
    tabs.innerHTML = months
      .map(function (m) {
        return (
          '<button type="button" data-month="' +
          m.key +
          '"' +
          (m.key === activeMonth ? ' class="active"' : "") +
          ">" +
          m.label +
          "</button>"
        );
      })
      .join("");
    tabs.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn || !btn.dataset.month) return;
      var ym = btn.dataset.month;
      var days = dates.filter(function (d) {
        return monthKey(d) === ym;
      });
      if (!days.length) return;
      var prefer = selectedDate ? selectedDate.slice(8) : null;
      var match =
        prefer &&
        days.filter(function (d) {
          return d.slice(8) === prefer;
        })[0];
      chooseDate(match || days[days.length - 1]);
    };
  }

  function renderTable(monthRows, highlightDate) {
    var body = document.getElementById("training-body");
    if (!monthRows.length) {
      body.innerHTML =
        '<tr><td colspan="14">No graded game days in this month.</td></tr>';
      return;
    }
    body.innerHTML = monthRows
      .map(function (r) {
        var d = r.delta;
        var thin = !!r.smallSample;
        var selected = highlightDate && r.date === highlightDate;
        var styles = [];
        if (thin) styles.push("opacity:0.45");
        if (selected) {
          styles.push("outline:1px solid var(--line)");
          styles.push("background:rgba(47,111,237,0.08)");
        }
        return (
          '<tr data-date="' +
          r.date +
          '"' +
          (thin ? ' class="training-thin"' : "") +
          (styles.length ? ' style="' + styles.join(";") + '"' : "") +
          ">" +
          "<td>" +
          dayLabel(r.date) +
          "</td>" +
          "<td>" +
          (r.n != null ? r.n : "—") +
          "</td>" +
          "<td>" +
          fmt(r.mlLogloss, 3) +
          "</td><td>" +
          deltaCell(d, "suLogloss", false, thin) +
          "</td>" +
          "<td>" +
          fmt(r.atsLogloss, 3) +
          "</td><td>" +
          deltaCell(d, "atsLogloss", false, thin) +
          "</td>" +
          "<td>" +
          fmt(r.totLogloss, 3) +
          "</td><td>" +
          deltaCell(d, "totLogloss", false, thin) +
          "</td>" +
          "<td>" +
          fmt(r.ml && r.ml.pct, 1) +
          (r.ml && r.ml.pct != null ? "%" : "") +
          "</td><td>" +
          deltaCell(d, "suPct", true, thin) +
          "</td>" +
          "<td>" +
          fmt(r.ats && r.ats.pct, 1) +
          (r.ats && r.ats.pct != null ? "%" : "") +
          "</td><td>" +
          deltaCell(d, "atsPct", true, thin) +
          "</td>" +
          "<td>" +
          fmt(r.tot && r.tot.pct, 1) +
          (r.tot && r.tot.pct != null ? "%" : "") +
          "</td><td>" +
          deltaCell(d, "totPct", true, thin) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function showNarrative(date) {
    var box = document.getElementById("narrative-box");
    var r = allRows.find(function (x) {
      return x.date === date && x.graded;
    });
    if (!r) {
      box.innerHTML = "<p>No graded games for this day.</p>";
      return;
    }
    var idx = allRows.indexOf(r);
    var prev = null;
    for (var i = idx - 1; i >= 0; i--) {
      if (allRows[i].graded) {
        prev = allRows[i];
        break;
      }
    }
    var d = r.delta;
    var eitherThin = !!(r.smallSample || (prev && prev.smallSample));
    function line(label, val, unit, higherIsBetter) {
      if (val === null || val === undefined) return "• " + label + ": n/a";
      var dir;
      if (eitherThin) dir = "low n";
      else if (val === 0) dir = "flat";
      else dir = (higherIsBetter ? val > 0 : val < 0) ? "improved" : "worse";
      return (
        "• " +
        label +
        ": " +
        (val > 0 ? "+" : "") +
        val.toFixed(unit === "%" ? 1 : 3) +
        unit +
        " (" +
        dir +
        ")"
      );
    }
    box.innerHTML =
      '<p style="margin:0 0 12px;font-family:var(--font-display);font-size:1.1rem;">' +
      dayLabel(r.date) +
      " · n=" +
      (r.n != null ? r.n : "—") +
      (r.smallSample ? " (low n)" : "") +
      "</p>" +
      '<p style="color:var(--dim);margin:0 0 14px;">SU ' +
      fmt(r.ml && r.ml.pct, 1) +
      "% · ATS " +
      fmt(r.ats && r.ats.pct, 1) +
      "% · Totals " +
      fmt(r.tot && r.tot.pct, 1) +
      "%</p>" +
      '<p style="color:var(--faint);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;margin:0;">' +
      line("SU accuracy Δ", d && d.suPct, "%", true) +
      "<br>" +
      line("ATS accuracy Δ", d && d.atsPct, "%", true) +
      "<br>" +
      line("Totals accuracy Δ", d && d.totPct, "%", true) +
      "</p>";
  }

  function paintForDate(date, dates) {
    selectedDate = date;
    var activeMonth = date ? monthKey(date) : null;
    renderMonthTabs(dates, activeMonth);
    var monthRows = allRows.filter(function (r) {
      return r.graded && monthKey(r.date) === activeMonth;
    });
    renderTable(monthRows, date);
    showNarrative(date);
  }

  function chooseDate(date) {
    var dates = datesFromRows(allRows);
    if (!date || dates.indexOf(date) < 0) return;
    writeQueryDate(date);
    paintForDate(date, dates);
    // Remount narrative chrome so month/day tabs match the table selection.
    mountNarrative(dates, date);
  }

  function mountNarrative(dates, date) {
    var container = document.getElementById("narrative-date-nav");
    if (!container || !F || !F.mountDateNav) return;
    narrativeNav = F.mountDateNav(container, dates, date, function (d) {
      writeQueryDate(d);
      paintForDate(d, dates);
    });
  }

  function renderEmpty(message) {
    document.getElementById("training-month-tabs").innerHTML = "";
    document.getElementById("training-body").innerHTML =
      '<tr><td colspan="14">' + message + "</td></tr>";
    var nav = document.getElementById("narrative-date-nav");
    if (nav) nav.innerHTML = "";
    document.getElementById("narrative-box").innerHTML = "<p>" + message + "</p>";
    narrativeNav = null;
    selectedDate = null;
  }

  function render() {
    var data = seasons[activeYear];
    var thresh = threshold(data);
    var footnote = document.getElementById("training-denominators");
    if (footnote) {
      footnote.textContent =
        "Pushes excluded. Days with fewer than " +
        thresh +
        " graded games are faded.";
    }
    var raw = dailyFor(data)
      .map(function (r) {
        return normalizeRow(r, thresh);
      })
      .filter(function (r) {
        return r.date;
      });
    allRows = withDeltas(raw);
    var dates = datesFromRows(allRows);
    if (!dates.length) {
      renderEmpty("No sealed game days yet for this season.");
      return;
    }
    var preferred = resolveDate(dates, readQueryDate());
    writeQueryDate(preferred);
    paintForDate(preferred, dates);
    mountNarrative(dates, preferred);
  }

  function setSeason(year) {
    activeYear = year;
    document.querySelectorAll("#season-toggle button").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.year) === year);
    });
    var data = seasons[year];
    var note = document.getElementById("training-note");
    if ((data.kind || "").indexOf("live") >= 0 || (data.label || "").indexOf("live") >= 0) {
      note.textContent =
        "Live sealed days only. Each row uses that day's sealed pregame picks — nothing is recomputed with hindsight.";
    } else {
      note.textContent =
        "Retrospective replay: picks were made day by day from earlier games only, then graded against the closing line. Not a live record.";
    }
    render();
  }

  Promise.all([
    window.AutopilotData.loadMeta(),
    window.AutopilotData.loadRetrospectiveSeason(),
    window.AutopilotData.loadLiveSeason(),
  ])
    .then(function (results) {
      meta = results[0];
      seasons[meta.retrospectiveSeason] = results[1];
      seasons[meta.liveSeason] = results[2];
      var toggle = document.getElementById("season-toggle");
      toggle.innerHTML =
        '<button type="button" data-year="' +
        meta.retrospectiveSeason +
        '">' +
        (meta.retrospectiveLabel || "Retrospective") +
        "</button>" +
        '<button type="button" data-year="' +
        meta.liveSeason +
        '">' +
        (meta.liveLabel || "Live") +
        "</button>";
      toggle.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (b) setSeason(Number(b.dataset.year));
      });
      setSeason(window.AutopilotData.defaultSeasonYear(meta));
    })
    .catch(function (err) {
      console.error(err);
    });
})();
