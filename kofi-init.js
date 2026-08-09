"use strict";
/* Click-to-load "Tip Me" Ko-fi button, matching the one on meherbejaoui.com
   and the edu sub-site. Nothing from Ko-fi loads until this placeholder is
   clicked -- it is ours, costs nothing, and sets no cookie. On click it
   injects Ko-fi's real overlay-widget.js and calls kofiWidgetOverlay.draw(),
   which renders Ko-fi's own floating button in roughly the same spot; this
   placeholder then removes itself. */
(function () {
  // Reserves room in normal document flow so the fixed, viewport-pinned
  // button never sits on top of content underneath it.
  var SPACER_HEIGHT = 76;

  function init() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "kofi-float-trigger";
    btn.setAttribute("aria-label", "Support me on Ko-fi");
    btn.style.position = "fixed";
    btn.style.left = "16px";
    btn.style.bottom = "24px";
    btn.style.zIndex = "40";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
    btn.style.borderRadius = "999px";
    btn.style.border = "none";
    btn.style.padding = "12px 16px";
    btn.style.fontFamily = "var(--sans)";
    btn.style.fontSize = "14px";
    btn.style.fontWeight = "500";
    // Dark navy on the #00b9fe brand blue: ~6.7:1 contrast, passes WCAG AA.
    // (The reference implementations use white text here, which only
    // measures ~2.24:1 against this background and fails AA -- don't copy
    // that.) Ko-fi's own widget colors after it loads are outside our
    // control.
    btn.style.color = "#0a2a33";
    btn.style.background = "#00b9fe";
    btn.style.boxShadow = "0 8px 20px rgba(0,0,0,.25)";
    btn.style.cursor = "pointer";
    btn.style.transition = "transform 150ms ease, box-shadow 150ms ease";

    var icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "☕";
    var label = document.createElement("span");
    label.textContent = "Tip Me";
    btn.appendChild(icon);
    btn.appendChild(label);

    var spacer = document.createElement("div");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.height = SPACER_HEIGHT + "px";

    var loading = false;
    btn.addEventListener("click", function () {
      if (loading) return;
      loading = true;
      btn.disabled = true;
      btn.style.cursor = "wait";

      var script = document.createElement("script");
      script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.onload = function () {
        if (window.kofiWidgetOverlay) {
          window.kofiWidgetOverlay.draw("meherbejaoui", {
            type: "floating-chat",
            "floating-chat.donateButton.text": "Tip Me",
            "floating-chat.donateButton.background-color": "#00b9fe",
            "floating-chat.donateButton.text-color": "#fff"
          });
        }
        btn.remove();
      };
      script.onerror = function () {
        loading = false;
        btn.disabled = false;
        btn.style.cursor = "pointer";
      };
      document.body.appendChild(script);
    });

    document.body.appendChild(btn);
    document.body.appendChild(spacer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
