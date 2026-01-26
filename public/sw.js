/* public/sw.js */

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function normalizeRoute(route) {
  if (!route || typeof route !== "string") return "/home";
  let path = route.startsWith("/") ? route : "/" + route;
  if (path === "/timeline") return "/clients";
  if (path === "/home" || path === "/clients") return path;
  if (/^\/clients\/[0-9a-f-]{36}\/timeline$/.test(path)) return path;
  return "/home";
}

function toAbsoluteUrl(rawOrRoute) {
  const origin = self.location.origin;
  if (!rawOrRoute) return origin + "/home";
  try {
    const u = new URL(rawOrRoute, origin);
    return u.href;
  } catch {
    const r = normalizeRoute(rawOrRoute);
    return origin + r;
  }
}

self.addEventListener("install", (event) => {
  console.log("[sw] install", { scope: self.registration.scope, origin: self.location.origin });
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw] activate", { scope: self.registration.scope, origin: self.location.origin });
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[sw] push event fired");

  const rawText = event.data ? event.data.text() : "";
  const parsed = safeJsonParse(rawText);

  console.log("[sw] push payload raw:", rawText || "(no payload)");
  if (parsed) console.log("[sw] push payload parsed:", parsed);

  const title = (parsed && parsed.title) || "CareBridge Hub";
  const bodyBase = (parsed && parsed.body) || "新しいお知らせがあります。";

  const rawUrl = (parsed && (parsed.url || (parsed.data && parsed.data.url))) || null;
  const route = normalizeRoute(rawUrl);
  const absUrl = toAbsoluteUrl(rawUrl || route);

  const debugId =
    (parsed && parsed.debugId) ||
    `push_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const debugSuffix =
    `\n[url=${rawUrl || ""}]` +
    `\n[route=${route}]` +
    `\n[abs=${absUrl}]` +
    `\n[debugId=${debugId}]`;

  const options = {
    body: bodyBase + debugSuffix,

    // クリック時に確実に拾う
    data: { url: absUrl, route, rawUrl, debugId, ts: Date.now() },

    // macOS/Chromeで挙動が変わることがあるので明示（bodyクリックでも動く）
    actions: [{ action: "open", title: "開く" }],

    tag: "carebridgehub-push",
    renotify: false,
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      console.log("[sw] showNotification done", { debugId, rawUrl, route, absUrl });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  // まずログ。これが出ない＝クリックがSWに届いてない
  console.log("[sw] notificationclick fired", {
    action: event.action || "(body)",
    data: event.notification && event.notification.data,
  });

  event.notification?.close?.();

  // ★最重要：openWindow を「最初の await」にする（user-gestureを消さない）
  event.waitUntil(
    (async () => {
      const data = (event.notification && event.notification.data) || {};
      const target = data.url || (self.location.origin + "/home");

      try {
        const win = await self.clients.openWindow(target);
        console.log("[sw] openWindow ok", { target, win: !!win });
        return;
      } catch (e) {
        console.error("[sw] openWindow failed", e, { target });
      }

      // openWindow が環境的にダメな場合の fallback（既存タブへフォーカス）
      try {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of list) {
          if ("focus" in c) {
            await c.focus();
            console.log("[sw] focus fallback ok", { clientUrl: c.url });
            return;
          }
        }
        console.warn("[sw] focus fallback: no clients");
      } catch (e) {
        console.error("[sw] focus fallback failed", e);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose", { data: event.notification && event.notification.data });
});