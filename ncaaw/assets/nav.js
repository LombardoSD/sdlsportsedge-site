// Mobile/tablet navigation menu (hamburger toggle) + All Sports disclosure.
(function () {
  "use strict";

  var MOBILE_MQ = "(max-width: 1100px)";
  var btn = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");

  function setNavOpen(open) {
    if (!btn || !nav) return;
    nav.classList.toggle("open", open);
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (btn && nav) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setNavOpen(!nav.classList.contains("open"));
    });
    nav.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (!link) return;
      if (link.id === "all-sports-trigger") return;
      if (link.closest("#all-sports-menu")) {
        setAllSportsOpen(false);
      }
      setNavOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && !btn.contains(e.target)) setNavOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1100) setNavOpen(false);
    });
  }

  var wrap = document.querySelector(".nav-all-sports");
  var trigger = document.getElementById("all-sports-trigger");
  var menu = document.getElementById("all-sports-menu");
  var allSportsButton = null;

  function isMobileNav() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function setAllSportsOpen(open) {
    if (!wrap || !menu || !allSportsButton) return;
    wrap.classList.toggle("open", open);
    menu.hidden = !open;
    allSportsButton.setAttribute("aria-expanded", String(open));
  }

  function upgradeAllSportsControl() {
    if (!wrap || !trigger || !menu) return;
    if (trigger.tagName === "BUTTON") {
      allSportsButton = trigger;
      return;
    }
    var button = document.createElement("button");
    button.type = "button";
    button.id = "all-sports-trigger";
    button.className = trigger.className;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "all-sports-menu");
    button.innerHTML = trigger.innerHTML;
    trigger.replaceWith(button);
    allSportsButton = button;

    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setAllSportsOpen(allSportsButton.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) setAllSportsOpen(false);
    });

    wrap.addEventListener("focusout", function (e) {
      var next = e.relatedTarget;
      if (next && wrap.contains(next)) return;
      setAllSportsOpen(false);
    });

    window.addEventListener("resize", function () {
      // Desktop floating panel vs mobile inline: always close on breakpoint change.
      setAllSportsOpen(false);
    });
  }

  upgradeAllSportsControl();

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (allSportsButton && allSportsButton.getAttribute("aria-expanded") === "true") {
      setAllSportsOpen(false);
      allSportsButton.focus();
      return;
    }
    setNavOpen(false);
  });
})();
