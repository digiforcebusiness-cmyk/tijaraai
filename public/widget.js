(function () {
  "use strict";

  var script = document.currentScript ||
    document.querySelector("script[data-widget-id]");
  if (!script) return;

  var widgetId = script.getAttribute("data-widget-id");
  if (!widgetId) return;

  // Derive origin from script src
  var scriptSrc = script.src || "";
  var origin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;

  var WHATSAPP_GREEN = "#25D366";
  var isOpen = false;
  var widget = null;
  var btn = null;
  var popup = null;

  function fetchWidget() {
    return fetch(origin + "/api/widget/" + widgetId)
      .then(function (r) { return r.json(); })
      .then(function (json) { return json.data; });
  }

  function injectStyles(color, position) {
    var isRight = position !== "bottom-left";
    var side = isRight ? "right" : "left";
    var css = [
      "#wa-widget-btn{position:fixed;bottom:24px;" + side + ":24px;z-index:99999;display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;background:" + color + ";border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;}",
      "#wa-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3);}",
      "#wa-widget-btn svg{width:32px;height:32px;fill:#fff;}",
      "#wa-widget-popup{position:fixed;bottom:96px;" + side + ":24px;z-index:99998;width:320px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);overflow:hidden;display:none;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      "#wa-widget-popup.open{display:flex;}",
      "#wa-widget-header{background:" + color + ";padding:16px 18px;display:flex;align-items:center;gap:12px;}",
      "#wa-widget-header-avatar{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;}",
      "#wa-widget-header-avatar svg{width:26px;height:26px;fill:#fff;}",
      "#wa-widget-header-text h4{margin:0;color:#fff;font-size:15px;font-weight:600;}",
      "#wa-widget-header-text p{margin:2px 0 0;color:rgba(255,255,255,.8);font-size:12px;}",
      "#wa-widget-close{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.8);font-size:22px;line-height:1;padding:0 4px;}",
      "#wa-widget-body{padding:18px;background:#f0f0f0;}",
      "#wa-widget-bubble{background:#fff;border-radius:12px 12px 12px 0;padding:12px 14px;font-size:13px;color:#333;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.08);}",
      "#wa-widget-footer{padding:14px 18px;background:#fff;}",
      "#wa-widget-cta{display:block;width:100%;padding:12px;background:" + color + ";color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;box-sizing:border-box;transition:opacity .15s;}",
      "#wa-widget-cta:hover{opacity:.88;}",
    ].join("");

    var styleEl = document.createElement("style");
    styleEl.id = "wa-widget-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  var WA_ICON = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 .5C7.44.5.5 7.44.5 16c0 2.7.7 5.32 2.04 7.64L.5 31.5l8.08-2.12A15.44 15.44 0 0016 31.5C24.56 31.5 31.5 24.56 31.5 16S24.56.5 16 .5zm0 28.22a13.66 13.66 0 01-6.96-1.9l-.5-.3-5.14 1.35 1.37-5-.33-.52A13.7 13.7 0 012.28 16C2.28 8.43 8.43 2.28 16 2.28S29.72 8.43 29.72 16 23.57 28.72 16 28.72zm7.5-10.24c-.41-.2-2.42-1.2-2.8-1.33-.37-.14-.64-.2-.91.2-.27.41-1.05 1.33-1.29 1.6-.23.27-.47.3-.88.1-.41-.2-1.73-.64-3.3-2.04-1.22-1.08-2.04-2.42-2.28-2.83-.23-.41-.02-.63.18-.83.18-.18.41-.47.61-.7.2-.23.27-.4.41-.67.14-.27.07-.5-.03-.7-.1-.2-.91-2.2-1.25-3.01-.33-.79-.66-.68-.91-.7l-.77-.01c-.27 0-.7.1-1.07.5-.37.4-1.4 1.37-1.4 3.34s1.44 3.88 1.64 4.15c.2.27 2.83 4.32 6.86 6.06.96.41 1.71.66 2.3.84.97.3 1.85.26 2.55.16.78-.12 2.42-.99 2.76-1.94.34-.96.34-1.78.23-1.95-.1-.17-.37-.27-.78-.47z"/></svg>';

  function buildPopup(data) {
    var wa = "https://wa.me/" + data.phoneNumber.replace(/\D/g, "") + "?text=" +
      encodeURIComponent("Hi, I'd like to know more about your services.");

    var div = document.createElement("div");
    div.id = "wa-widget-popup";
    div.innerHTML = [
      '<div id="wa-widget-header">',
      '  <div id="wa-widget-header-avatar">' + WA_ICON + "</div>",
      '  <div id="wa-widget-header-text"><h4>WhatsApp Chat</h4><p>Typically replies within minutes</p></div>",',
      '  <button id="wa-widget-close" aria-label="Close">&times;</button>',
      "</div>",
      '<div id="wa-widget-body">',
      '  <div id="wa-widget-bubble">' + escapeHtml(data.welcomeMessage) + "</div>",
      "</div>",
      '<div id="wa-widget-footer">',
      '  <a id="wa-widget-cta" href="' + wa + '" target="_blank" rel="noopener">Start Chat &rarr;</a>',
      "</div>",
    ].join("");

    return div;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toggleOpen() {
    isOpen = !isOpen;
    if (isOpen) {
      popup.classList.add("open");
    } else {
      popup.classList.remove("open");
    }
  }

  function init(data) {
    var color = data.buttonColor || WHATSAPP_GREEN;
    injectStyles(color, data.position);

    // Button
    btn = document.createElement("button");
    btn.id = "wa-widget-btn";
    btn.setAttribute("aria-label", "Open WhatsApp chat");
    btn.innerHTML = WA_ICON;
    btn.addEventListener("click", toggleOpen);

    // Popup
    popup = buildPopup(data);
    popup.querySelector("#wa-widget-close").addEventListener("click", function (e) {
      e.stopPropagation();
      isOpen = true;
      toggleOpen();
    });

    document.body.appendChild(popup);
    document.body.appendChild(btn);
  }

  // Bootstrap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      fetchWidget().then(init).catch(function (e) { console.warn("[wa-widget]", e); });
    });
  } else {
    fetchWidget().then(init).catch(function (e) { console.warn("[wa-widget]", e); });
  }
})();
