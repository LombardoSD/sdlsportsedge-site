// Public site shows Ridge only (directive 025). The Ridge|Elo switch is gone;
// this shim keeps the AutopilotModel API so existing callers keep working.
// Any ?model= in the URL is ignored and cleaned (other params are kept).
(function (global) {
  "use strict";

  var DEFAULT = "ridge";
  var listeners = [];

  function normalize() {
    return DEFAULT;
  }

  function current() {
    return DEFAULT;
  }

  function cleanUrl() {
    try {
      var url = new URL(global.location.href);
      if (!url.searchParams.has("model")) return;
      url.searchParams.delete("model");
      global.history.replaceState({}, "", url);
    } catch (err) {
      /* ignore */
    }
  }

  function set() {
    // No-op: Ridge is the only published model.
    return DEFAULT;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function renderToggle(root) {
    if (!root) return;
    root.innerHTML = "";
    root.hidden = true;
    root.style.display = "none";
    root.removeAttribute("role");
    root.removeAttribute("aria-label");
    root.onclick = null;
  }

  cleanUrl();

  global.AutopilotModel = {
    DEFAULT: DEFAULT,
    current: current,
    set: set,
    onChange: onChange,
    renderToggle: renderToggle,
    normalize: normalize,
  };
})(typeof window !== "undefined" ? window : globalThis);
