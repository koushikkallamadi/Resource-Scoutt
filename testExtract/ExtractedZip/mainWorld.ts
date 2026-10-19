// Main World Script: Injected directly into the DOM page context (world: "MAIN")
(function () {
  const detectedBlockers = new Set<string>();
  let emeDetected = false;

  // Events that Chrome's Permissions-Policy can restrict (e.g. 'unload' is blocked
  // on pages that opt into BFCache). We try/catch these specifically so that when
  // Chrome rejects them, the policy-violation error is NOT attributed to mainWorld.js.
  const POLICY_SENSITIVE_EVENTS = new Set(['unload', 'beforeunload']);

  // Intercept addEventListener on EventTarget prototype
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type: string, listener: any, options?: any) {
    if (['contextmenu', 'copy', 'selectstart', 'dragstart', 'keydown'].includes(type)) {
      detectedBlockers.add(type);
      notifyIsolatedWorld();
    }

    if (POLICY_SENSITIVE_EVENTS.has(type)) {
      // Try to register these events, but if Chrome's Permissions Policy blocks
      // them, swallow the error silently — it's the PAGE's violation, not ours.
      try {
        return originalAddEventListener.call(this, type, listener, options);
      } catch (_policyError) {
        return; // Chrome blocked this event — intentionally ignored.
      }
    }

    return originalAddEventListener.call(this, type, listener, options);
  };



  // Intercept navigator.requestMediaKeySystemAccess for EME/DRM detection
  if (navigator && 'requestMediaKeySystemAccess' in navigator) {
    const originalRequestMediaKeySystemAccess = navigator.requestMediaKeySystemAccess;
    navigator.requestMediaKeySystemAccess = function (...args: any[]) {
      emeDetected = true;
      notifyIsolatedWorld();
      return (originalRequestMediaKeySystemAccess as any).apply(this, args);
    };
  }

  function notifyIsolatedWorld() {
    window.postMessage(
      {
        type: 'RS_MAIN_WORLD_EVENT',
        payload: {
          eventBlockers: Array.from(detectedBlockers),
          emeDetected,
        },
      },
      '*'
    );
  }

  // Periodic check for inline handlers (e.g., oncontextmenu="return false")
  setInterval(() => {
    let changed = false;
    if (document.body && (document.body.oncontextmenu || document.oncontextmenu)) {
      if (!detectedBlockers.has('contextmenu')) {
        detectedBlockers.add('contextmenu');
        changed = true;
      }
    }
    if (document.body && (document.body.onselectstart || document.onselectstart)) {
      if (!detectedBlockers.has('selectstart')) {
        detectedBlockers.add('selectstart');
        changed = true;
      }
    }
    if (document.body && (document.body.oncopy || document.oncopy)) {
      if (!detectedBlockers.has('copy')) {
        detectedBlockers.add('copy');
        changed = true;
      }
    }
    if (changed) notifyIsolatedWorld();
  }, 2000);
})();
