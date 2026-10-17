// Shared display formatting for NCAAB edition pages (directive 016A).
(function (global) {
  "use strict";

  var MINUS = "\u2212";
  var ENDASH = "\u2013";
  var PCT_MIN_N = 20;

  function isNil(v) {
    return v === null || v === undefined;
  }

  function fmtSigned(v) {
    if (isNil(v) || v === "") return "—";
    var n = Number(v);
    if (!isFinite(n)) return "—";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    var body = Number.isInteger(abs) ? String(abs) : String(abs);
    return (n > 0 ? "+" : MINUS) + body;
  }

  function fmtPrice(p) {
    if (isNil(p)) return "—";
    if (p === "EVEN" || p === "even") return "EVEN";
    var n = Number(p);
    if (!isFinite(n)) return "—";
    if (n > 0) return "+" + Math.round(n);
    if (n < 0) return MINUS + Math.round(Math.abs(n));
    return "0";
  }

  /** ML CLV (probability) → percentage points, 2 decimals. */
  function fmtPp(v) {
    if (isNil(v)) return "—";
    return (Number(v) * 100).toFixed(2);
  }

  /** ATS / totals CLV in points, 2 decimals. */
  function fmtPts(v) {
    if (isNil(v)) return "—";
    return Number(v).toFixed(2);
  }

  function fmtIntN(n) {
    if (isNil(n)) return "—";
    return String(Math.round(Number(n)));
  }

  /** Win rate / interval on 0–1 scale → one decimal percent. */
  function fmtRate1(rate) {
    if (isNil(rate)) return "—";
    return (Number(rate) * 100).toFixed(1) + "%";
  }

  function fmtWLP(rec, opts) {
    opts = opts || {};
    var minN = opts.minN != null ? opts.minN : PCT_MIN_N;
    var w = (rec && rec.wins) || 0;
    var l = (rec && rec.losses) || 0;
    var p = (rec && rec.push) || 0;
    var n = w + l;
    var record = w + ENDASH + l + ENDASH + p;
    var showPct = n >= minN && rec && rec.pct != null;
    var pctText = showPct ? Number(rec.pct).toFixed(1) + "%" : null;
    return { record: record, n: n, showPct: showPct, pctText: pctText, wins: w, losses: l, push: p };
  }

  function outcomeWord(outcome) {
    if (outcome === "win") return "WINNER";
    if (outcome === "loss") return "LOSS";
    if (outcome === "push") return "PUSH";
    if (outcome === "tie") return "TIE";
    if (!outcome) return "PENDING";
    return "PENDING";
  }

  function outcomeClass(outcome) {
    if (outcome === "win") return "win";
    if (outcome === "loss") return "loss";
    if (outcome === "push" || outcome === "tie") return "push";
    return "pending";
  }

  function americanFromProb(p) {
    if (isNil(p)) return null;
    var x = Number(p);
    if (!(x > 0) || !(x < 1)) return null;
    if (x === 0.5) return "EVEN";
    if (x > 0.5) return -Math.round((100 * x) / (1 - x));
    return Math.round((100 * (1 - x)) / x);
  }

  function teamMeta(id) {
    return (global.AutopilotData && global.AutopilotData.TEAMS && global.AutopilotData.TEAMS[id]) || {};
  }

  function locName(g, side) {
    var id = side === "home" ? g.home : g.away;
    var meta = teamMeta(id);
    if (side === "home") return meta.city || meta.location || g.homeName || id;
    return meta.city || meta.location || g.awayName || id;
  }

  function abbrName(g, side) {
    var id = side === "home" ? g.home : g.away;
    var meta = teamMeta(id);
    if (meta.abbr) return meta.abbr;
    var loc = locName(g, side);
    var parts = String(loc).replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.slice(0, 3).map(function (p) { return p[0]; }).join("").toUpperCase();
  }

  function shortBannerName(fullName, shortName, opts) {
    opts = opts || {};
    var full = String(fullName || "").toUpperCase();
    var short = String(shortName || full).toUpperCase();
    var narrow = !!opts.narrow;
    if (typeof opts.narrow !== "boolean" && typeof global.matchMedia === "function") {
      narrow = global.matchMedia("(max-width: 560px)").matches;
    }
    if (narrow || full.length > 14) return short;
    return full;
  }

  function spreadHeader(g) {
    var lines = g.lines || {};
    var sp = lines.spread || {};
    var close = sp.close;
    if (isNil(close)) return "—";
    var away = locName(g, "away");
    var home = locName(g, "home");
    return away + " " + fmtSigned(-Number(close)) + " · " + home + " " + fmtSigned(Number(close));
  }

  function totalHeader(g) {
    var lines = g.lines || {};
    var tot = lines.total || {};
    var open = tot.open;
    var close = tot.close;
    if (isNil(open) && isNil(close)) return "—";
    if (!isNil(open) && !isNil(close) && Number(open) !== Number(close)) {
      return "O/U " + open + " → " + close;
    }
    var v = !isNil(close) ? close : open;
    return "O/U " + v;
  }

  function mlHeader(g) {
    var lines = g.lines || {};
    var homeP = lines.mlHome && lines.mlHome.close;
    var awayP = lines.mlAway && lines.mlAway.close;
    var homeProb = lines.mlHomeProb;
    var awayProb = lines.mlAwayProb;
    if (isNil(homeProb) && !isNil(lines.marketProbHome)) {
      homeProb = lines.marketProbHome;
      awayProb = 1 - Number(homeProb);
    }
    if (isNil(awayP) && !isNil(awayProb)) awayP = americanFromProb(awayProb);
    if (isNil(homeP) && !isNil(homeProb)) homeP = americanFromProb(homeProb);
    function side(abbr, price, prob) {
      var pct = isNil(prob) ? "" : " (" + Math.round(Number(prob) * 100) + "%)";
      return abbr + " " + fmtPrice(price) + pct;
    }
    return (
      side(abbrName(g, "away"), awayP, awayProb) +
      " · " +
      side(abbrName(g, "home"), homeP, homeProb)
    );
  }

  function atsPickLabel(g, pick) {
    if (!pick || !pick.pick) return "—";
    var close = g.lines && g.lines.spread && g.lines.spread.close;
    var side = pick.pick;
    var name = locName(g, side === "home" ? "home" : "away");
    if (isNil(close)) return name;
    var line = side === "home" ? Number(close) : -Number(close);
    return name + " " + fmtSigned(line);
  }

  function totPickLabel(g, pick) {
    if (!pick || !pick.pick) return "—";
    var close = g.lines && g.lines.total && g.lines.total.close;
    var word = pick.pick === "over" ? "Over" : pick.pick === "under" ? "Under" : String(pick.pick);
    if (isNil(close)) return word;
    return word + " " + close;
  }

  function mlPickLabel(g, pick) {
    if (!pick || !pick.pick) return "—";
    var name = locName(g, pick.pick === "home" ? "home" : "away");
    if (isNil(pick.prob)) return name + " · model —";
    return name + " · model " + Math.round(Number(pick.prob) * 100) + "%";
  }

  function pickLabelFor(g, market, pick) {
    if (market === "ats") return atsPickLabel(g, pick);
    if (market === "tot") return totPickLabel(g, pick);
    if (market === "ml") return mlPickLabel(g, pick);
    return (pick && (pick.pickLabel || pick.pick)) || "—";
  }

  /** Nickname = display name with leading location stripped (e.g. Gators). */
  function nicknameFrom(displayName, location) {
    var name = String(displayName || "").trim();
    var loc = String(location || "").trim();
    if (!name) return "";
    if (loc && name.toLowerCase().indexOf(loc.toLowerCase()) === 0) {
      var rest = name.slice(loc.length).trim();
      return rest || name;
    }
    return name;
  }

  var PANEL_BG = "0b0c0f";
  var NEUTRAL_BANNER = "#3a4150";

  function hexDigits(raw) {
    if (isNil(raw) || raw === "") return null;
    var s = String(raw).replace("#", "").trim().toLowerCase();
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-f]{6}$/.test(s)) return null;
    return s;
  }

  function relativeLuminance(hex6) {
    var rgb = [0, 2, 4].map(function (i) {
      var v = parseInt(hex6.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrastRatio(fg, bg) {
    var a = relativeLuminance(hexDigits(fg) || PANEL_BG);
    var b = relativeLuminance(hexDigits(bg) || PANEL_BG);
    var hi = Math.max(a, b);
    var lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** Prefer primary at ≥3:1 vs panel; else alternate; else NFL neutral. */
  function resolveBannerColor(primary, alternate) {
    var p = hexDigits(primary);
    var a = hexDigits(alternate);
    if (p && contrastRatio(p, PANEL_BG) >= 3) return "#" + p;
    if (a && contrastRatio(a, PANEL_BG) >= 3) return "#" + a;
    if (p) return "#" + p;
    if (a) return "#" + a;
    return NEUTRAL_BANNER;
  }

  var PLATE_TEXT_LIGHT = "#ffffff";
  var PLATE_TEXT_DARK = "#0b0d12";
  var CARD_NAME_NEUTRAL = "#c5cad3";
  var CONTRAST_AA = 4.5;

  function mixHex(a, b, t) {
    var aa = hexDigits(a);
    var bb = hexDigits(b);
    if (!aa || !bb) return aa || bb || "000000";
    var out = "";
    for (var i = 0; i < 6; i += 2) {
      var av = parseInt(aa.substr(i, 2), 16);
      var bv = parseInt(bb.substr(i, 2), 16);
      var v = Math.round(av + (bv - av) * t);
      out += (v < 16 ? "0" : "") + v.toString(16);
    }
    return out;
  }

  /**
   * Board plate colours (directive 029): brand-first plate + AA text.
   * Accepts precomputed plateColor/plateTextColor from team_colors.json.
   */
  function resolvePlateColors(meta) {
    meta = meta || {};
    if (meta.plateColor && meta.plateTextColor) {
      return { plate: meta.plateColor, text: meta.plateTextColor };
    }
    var primary = hexDigits(meta.primaryColor || meta.color);
    var alternate = hexDigits(meta.alternateColor);
    var plate = primary || alternate || hexDigits(NEUTRAL_BANNER);
    if (contrastRatio(PLATE_TEXT_LIGHT, plate) >= CONTRAST_AA) {
      return { plate: "#" + plate, text: PLATE_TEXT_LIGHT };
    }
    if (contrastRatio(PLATE_TEXT_DARK, plate) >= CONTRAST_AA) {
      return { plate: "#" + plate, text: PLATE_TEXT_DARK };
    }
    var preferLight =
      contrastRatio(PLATE_TEXT_LIGHT, plate) >= contrastRatio(PLATE_TEXT_DARK, plate);
    var text = preferLight ? PLATE_TEXT_LIGHT : PLATE_TEXT_DARK;
    var toward = preferLight ? "000000" : "ffffff";
    for (var step = 1; step <= 20; step += 1) {
      var cand = mixHex(plate, toward, step / 20);
      if (contrastRatio(text, cand) >= CONTRAST_AA) {
        return { plate: "#" + cand, text: text };
      }
    }
    return { plate: "#" + PLATE_TEXT_DARK.replace("#", ""), text: PLATE_TEXT_LIGHT };
  }

  /** Teams-page name colour vs dark card panel (directive 029). */
  function resolveCardNameColor(meta) {
    meta = meta || {};
    if (meta.cardNameColor) return meta.cardNameColor;
    var primary = hexDigits(meta.primaryColor || meta.color);
    var alternate = hexDigits(meta.alternateColor);
    if (primary && contrastRatio(primary, PANEL_BG) >= CONTRAST_AA) return "#" + primary;
    if (alternate && contrastRatio(alternate, PANEL_BG) >= CONTRAST_AA) return "#" + alternate;
    return CARD_NAME_NEUTRAL;
  }

  /** Daily W–L: omit trailing –0 push; percentages exclude pushes. */
  function fmtRecord(rec) {
    var w = (rec && rec.wins) || 0;
    var l = (rec && rec.losses) || 0;
    var p = (rec && rec.push) || 0;
    var body = w + ENDASH + l;
    if (p) body += ENDASH + p;
    return body;
  }

  function fmtPctOrDash(rec) {
    if (!rec || rec.pct == null) return "—";
    var n = ((rec.wins || 0) + (rec.losses || 0));
    if (!n) return "—";
    return Number(rec.pct).toFixed(1) + "%";
  }

  /** Standard normal CDF (Abramowitz & Stegun 26.2.17). */
  function normCdf(x) {
    var z = Number(x);
    if (!isFinite(z)) return null;
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
    var p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - p : p;
  }

  function sigmaMargin(model, sigmas) {
    sigmas = sigmas || {};
    var block = sigmas[model] || {};
    return block.sigma_margin != null ? Number(block.sigma_margin) : null;
  }

  function sigmaTotal(sigmas) {
    sigmas = sigmas || {};
    var block = sigmas.ridge || {};
    return block.sigma_total != null ? Number(block.sigma_total) : null;
  }

  function confidenceMl(prob) {
    if (isNil(prob)) return null;
    var p = Number(prob);
    return isFinite(p) ? p : null;
  }

  /**
   * ATS confidence: Phi(cover_margin / sigma_margin).
   * cover_margin = model_margin + home_spread; sign-flipped for an away pick.
   */
  function confidenceAts(modelMargin, homeSpread, pickSide, model, sigmas) {
    if (isNil(modelMargin) || isNil(homeSpread)) return null;
    var sigma = sigmaMargin(model, sigmas);
    if (!sigma || !(sigma > 0)) return null;
    var cover = Number(modelMargin) + Number(homeSpread);
    if (pickSide === "away") cover = -cover;
    return normCdf(cover / sigma);
  }

  /**
   * Totals confidence: Phi((model_total − line) / sigma_total) for Over;
   * 1 − that for Under. Ridge only. (Aligned with Python export / 021C.)
   */
  function confidenceTot(modelTotal, marketTotal, pickSide, model, sigmas) {
    if (isNil(modelTotal) || isNil(marketTotal)) return null;
    // Backward-compatible: (tot, line, model, sigmas) — third arg is model name.
    if (pickSide === "ridge") {
      var legacySigma = sigmaTotal(
        model && typeof model === "object" ? model : sigmas
      );
      if (!legacySigma || !(legacySigma > 0)) return null;
      return normCdf(
        Math.abs(Number(modelTotal) - Number(marketTotal)) / legacySigma
      );
    }
    var sigma = sigmaTotal(sigmas);
    if (!sigma || !(sigma > 0)) return null;
    var pOver = normCdf((Number(modelTotal) - Number(marketTotal)) / sigma);
    if (pOver == null) return null;
    if (pickSide === "under") return 1 - pOver;
    if (pickSide === "over") return pOver;
    return pOver;
  }

  function matchupSep(neutral) {
    return neutral ? "vs" : "at";
  }

  var MONTH_NAMES = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /** YYYY-MM from YYYY-MM-DD. */
  function monthKeyFromDate(dateStr) {
    return String(dateStr).slice(0, 7);
  }

  function monthLabelFromKey(ym) {
    var m = parseInt(String(ym).slice(5, 7), 10);
    return MONTH_NAMES[m] || String(ym);
  }

  /** Academic-season month sort: Nov…Oct across the year boundary. */
  function monthSortKey(ym) {
    var y = parseInt(String(ym).slice(0, 4), 10);
    var m = parseInt(String(ym).slice(5, 7), 10);
    if (!isFinite(y) || !isFinite(m)) return 0;
    var idx = m >= 11 ? m - 11 : m + 1;
    return y * 12 + idx;
  }

  /** Months that have games, in season order: [{key, label}, …]. */
  function monthsWithGames(dates) {
    var seen = {};
    (dates || []).forEach(function (d) {
      seen[monthKeyFromDate(d)] = true;
    });
    return Object.keys(seen)
      .sort(function (a, b) {
        return monthSortKey(a) - monthSortKey(b);
      })
      .map(function (key) {
        return { key: key, label: monthLabelFromKey(key) };
      });
  }

  /** "Mon 11/4" from YYYY-MM-DD (UTC calendar day). */
  function dayButtonLabel(dateStr) {
    var parts = String(dateStr).split("-");
    if (parts.length !== 3) return String(dateStr);
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    var utc = new Date(Date.UTC(y, m - 1, d));
    return WEEKDAYS[utc.getUTCDay()] + " " + m + "/" + d;
  }

  /**
   * Month → day button chrome (directive 024).
   * onSelectDate(dateStr) when a day is chosen; keeps ?date= in sync.
   */
  function mountDateNav(container, dates, selectedDate, onSelectDate) {
    if (!container) return null;
    var list = (dates || []).slice().sort();
    if (!list.length) {
      container.innerHTML = "";
      return null;
    }
    var months = monthsWithGames(list);
    var selected =
      selectedDate && list.indexOf(selectedDate) >= 0
        ? selectedDate
        : list[list.length - 1];
    var activeMonth = monthKeyFromDate(selected);
    if (
      !months.some(function (m) {
        return m.key === activeMonth;
      })
    ) {
      activeMonth = months[months.length - 1].key;
      var fallbackDays = list.filter(function (d) {
        return monthKeyFromDate(d) === activeMonth;
      });
      selected = fallbackDays[fallbackDays.length - 1];
    }

    function daysInMonth(ym) {
      return list.filter(function (d) {
        return monthKeyFromDate(d) === ym;
      });
    }

    function paint(selDate) {
      selected = selDate;
      activeMonth = monthKeyFromDate(selected);
      var dayDates = daysInMonth(activeMonth);
      var monthsHtml = months
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
      var daysHtml = dayDates
        .map(function (d) {
          return (
            '<button type="button" data-date="' +
            d +
            '"' +
            (d === selected ? ' class="active"' : "") +
            ">" +
            dayButtonLabel(d) +
            "</button>"
          );
        })
        .join("");
      container.innerHTML =
        '<div class="week-tabs" id="month-tabs" role="tablist" aria-label="Month">' +
        monthsHtml +
        "</div>" +
        '<div class="week-tabs" id="day-tabs" role="tablist" aria-label="Game day">' +
        daysHtml +
        "</div>" +
        '<label class="jump-to-date">' +
        "<span>Jump to date</span>" +
        '<input type="date" id="date-picker" min="' +
        list[0] +
        '" max="' +
        list[list.length - 1] +
        '" value="' +
        selected +
        '" />' +
        "</label>";
    }

    function chooseDate(date) {
      if (list.indexOf(date) < 0) return;
      var url = new URL(window.location.href);
      url.searchParams.set("date", date);
      window.history.replaceState({}, "", url);
      paint(date);
      if (typeof onSelectDate === "function") onSelectDate(date);
    }

    container.classList.add("date-nav");
    container.onclick = function (e) {
      var btn = e.target.closest("button");
      if (!btn || !container.contains(btn)) return;
      if (btn.dataset.month) {
        var ym = btn.dataset.month;
        var days = daysInMonth(ym);
        if (!days.length) return;
        var prefer = selected.slice(8);
        var match = days.filter(function (d) {
          return d.slice(8) === prefer;
        })[0];
        chooseDate(match || days[days.length - 1]);
        return;
      }
      if (btn.dataset.date) chooseDate(btn.dataset.date);
    };
    container.onchange = function (e) {
      var input = e.target;
      if (!input || input.id !== "date-picker") return;
      var date = input.value;
      if (list.indexOf(date) < 0) {
        input.value = selected;
        return;
      }
      chooseDate(date);
    };
    paint(selected);
    return { selected: selected, chooseDate: chooseDate };
  }

  global.AutopilotFormat = {
    MINUS: MINUS,
    ENDASH: ENDASH,
    PCT_MIN_N: PCT_MIN_N,
    PANEL_BG: PANEL_BG,
    NEUTRAL_BANNER: NEUTRAL_BANNER,
    fmtSigned: fmtSigned,
    fmtPrice: fmtPrice,
    fmtPp: fmtPp,
    fmtPts: fmtPts,
    fmtIntN: fmtIntN,
    fmtRate1: fmtRate1,
    fmtWLP: fmtWLP,
    outcomeWord: outcomeWord,
    outcomeClass: outcomeClass,
    americanFromProb: americanFromProb,
    shortBannerName: shortBannerName,
    spreadHeader: spreadHeader,
    totalHeader: totalHeader,
    mlHeader: mlHeader,
    atsPickLabel: atsPickLabel,
    totPickLabel: totPickLabel,
    mlPickLabel: mlPickLabel,
    pickLabelFor: pickLabelFor,
    locName: locName,
    abbrName: abbrName,
    nicknameFrom: nicknameFrom,
    contrastRatio: contrastRatio,
    resolveBannerColor: resolveBannerColor,
    resolvePlateColors: resolvePlateColors,
    resolveCardNameColor: resolveCardNameColor,
    fmtRecord: fmtRecord,
    fmtPctOrDash: fmtPctOrDash,
    CONTRAST_AA: CONTRAST_AA,
    CARD_NAME_NEUTRAL: CARD_NAME_NEUTRAL,
    normCdf: normCdf,
    confidenceMl: confidenceMl,
    confidenceAts: confidenceAts,
    confidenceTot: confidenceTot,
    matchupSep: matchupSep,
    monthKeyFromDate: monthKeyFromDate,
    monthLabelFromKey: monthLabelFromKey,
    monthsWithGames: monthsWithGames,
    dayButtonLabel: dayButtonLabel,
    mountDateNav: mountDateNav,
  };
})(typeof window !== "undefined" ? window : globalThis);
