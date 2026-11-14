// NCAAF research page — static content from research.json (frozen verification numbers).
(function () {
  "use strict";

  function statRow(s) {
    var val =
      s.value == null
        ? "—"
        : typeof s.value === "number"
          ? s.unit === "%"
            ? s.value.toFixed(1) + "%"
            : String(s.value)
          : String(s.value);
    var n = s.n != null ? " · n = " + s.n.toLocaleString("en-US") : "";
    var note = s.note ? '<div class="caveat">' + s.note + "</div>" : "";
    return (
      '<div class="stat-line glass" style="padding:0.75rem 1rem;margin:0.4rem 0;">' +
      "<strong>" +
      s.label +
      "</strong>: " +
      val +
      n +
      note +
      "</div>"
    );
  }

  function sectionHtml(sec) {
    var body = "<h3>" + sec.heading + "</h3>";
    if (sec.period) {
      body += '<p class="caveat">Period: ' + sec.period + "</p>";
    }
    if (sec.summary) body += "<p>" + sec.summary + "</p>";
    if (sec.blend) {
      body +=
        '<p>Published blend weight <strong>w = ' +
        sec.blend.w +
        "</strong> (fitted ≈ " +
        sec.blend.wFitted +
        "). " +
        (sec.blend.note || "") +
        "</p>";
    }
    (sec.stats || []).forEach(function (s) {
      body += statRow(s);
    });
    if (sec.holm) {
      body +=
        '<p class="caveat">' +
        sec.holm.label +
        ": " +
        sec.holm.p.join(", ") +
        ". " +
        (sec.holm.note || "") +
        "</p>";
    }
    if (sec.modelsAlone) body += "<p>" + sec.modelsAlone + "</p>";
    return '<section class="research-section">' + body + "</section>";
  }

  fetch("./data/research.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("research.json " + r.status);
      return r.json();
    })
    .then(function (data) {
      var root = document.getElementById("research-root");
      if (!root) return;
      var html = "";
      if (data.timeBound) {
        html += '<p class="caveat">' + data.timeBound + "</p>";
      }
      (data.sections || []).forEach(function (sec) {
        html += sectionHtml(sec);
      });
      if (data.footer) {
        html += '<p class="disclaimer">' + data.footer + "</p>";
      }
      root.innerHTML = html;
    })
    .catch(function (err) {
      console.error(err);
      var root = document.getElementById("research-root");
      if (root) root.textContent = "Failed to load research summary.";
    });
})();
