// Helpdesk widget loader. Embed with:
//   <script src="https://<your-app>/widget.js" data-workspace="acme" async></script>
//
// why an iframe rather than injecting DOM/CSS into the host page: CSS isolation. The widget's own
// Tailwind classes would otherwise collide with (or be overridden by) the host page's stylesheet —
// this is the same approach Intercom, Crisp, and most embedded chat widgets use.
(function () {
  var currentScript = document.currentScript;
  if (!currentScript) return;

  var workspaceSlug = currentScript.getAttribute("data-workspace");
  if (!workspaceSlug) {
    console.error("[helpdesk widget] missing required data-workspace attribute");
    return;
  }

  var origin = new URL(currentScript.src).origin;
  var open = false;

  var iframe = document.createElement("iframe");
  iframe.title = "Support chat";
  iframe.src = origin + "/widget/" + encodeURIComponent(workspaceSlug);
  iframe.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:96px",
      "right:20px",
      "width:376px",
      "height:600px",
      "max-height:75vh",
      "border:none",
      "border-radius:16px",
      "box-shadow:0 12px 40px rgba(0,0,0,0.2)",
      "z-index:2147483000",
      "color-scheme:light",
      "display:none",
    ].join(";"),
  );

  var launcher = document.createElement("button");
  launcher.setAttribute("aria-label", "Open chat");
  launcher.textContent = "💬";
  launcher.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:20px",
      "right:20px",
      "width:56px",
      "height:56px",
      "border-radius:9999px",
      "border:none",
      "background:#111827",
      "color:#fff",
      "font-size:24px",
      "cursor:pointer",
      "box-shadow:0 8px 24px rgba(0,0,0,0.24)",
      "z-index:2147483000",
    ].join(";"),
  );

  function setOpen(next) {
    open = next;
    iframe.style.display = open ? "block" : "none";
    launcher.textContent = open ? "✕" : "💬";
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "helpdesk:close") {
      setOpen(false);
    }
  });

  document.body.appendChild(iframe);
  document.body.appendChild(launcher);
})();
