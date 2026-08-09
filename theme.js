"use strict";
/* Manual light/dark toggle, consistent with the theme switcher on meherbejaoui.com. */
(function () {
  const KEY = "institutions-theme";
  const root = document.documentElement;

  function apply(mode) {
    if (mode === "light" || mode === "dark") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function current() {
    return localStorage.getItem(KEY) || "system";
  }

  apply(current());

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const label = () => {
      const m = current();
      btn.textContent = m === "system" ? "Theme: Auto" : m === "dark" ? "Theme: Dark" : "Theme: Light";
    };
    label();
    btn.addEventListener("click", () => {
      const order = ["system", "light", "dark"];
      const next = order[(order.indexOf(current()) + 1) % order.length];
      localStorage.setItem(KEY, next);
      apply(next);
      label();
    });
  });
})();
