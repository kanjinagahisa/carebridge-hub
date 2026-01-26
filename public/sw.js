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

  // url は root または data.url のどちらでも拾う
  const rawUrl =
    (parsed && (parsed.url || (parsed.data && parsed.data.url))) || null;

  const route = normalizeRoute(rawUrl);
  const absUrl = toAbsoluteUrl(rawUrl || route);

  const debugId =
    (parsed && parsed.debugId) ||
    `push_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const debugSuffix =
    `\n[url=${rawUrl || ""}]` +
    `\n[route=${route}]` +
    `\n[debugId=${debugId}]`;

  const options = {
    body: bodyBase + debugSuffix,

    // ★ここが重要：クリック時に確実に参照できるよう data に入れる
    data: { url: absUrl, route, rawUrl, debugId, ts: Date.now() },

    // ★macOSの通知UIで click がSWに来ない時の回避：actions を明示
    actions: [
      { action: "open", title: "開く" },
      { action: "home", title: "ホーム" },
    ],

    // あるとデバッグが安定することが多い
    tag: "carebridgehub-push",
    renotify: false,

    // 任意：すぐ消えるのが嫌なら true（好み）
    // requireInteraction: true,
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      console.log("[sw] showNotification done", { debugId, rawUrl, route, absUrl });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  // ★まず最初に必ずログ（ここが出ない＝クリックがSWに来てない）
  console.log("[sw] notificationclick fired", {
    action: event.action || "(body)",
    data: event.notification && event.notification.data,
  });

  event.notification?.close?.();

  event.waitUntil(
    (async () => {
      const data = (event.notification && event.notification.data) || {};
      let target = data.url || (self.location.origin + "/home");

      if (event.action === "home") {
        target = self.location.origin + "/home";
      }
      // action==="open" も body クリックも open 扱い

      // ★まずは「確実に開く」ことを最優先（focus探索は後回し）
      try {
        await self.clients.openWindow(target);
        console.log("[sw] openWindow ok", { target });
        return;
      } catch (e) {
        console.error("[sw] openWindow failed", e);
      }

      // fallback：既存タブがあればそれをフォーカス
      try {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of list) {
          if ("focus" in c) {
            await c.focus();
            console.log("[sw] focus fallback ok");
            return;
          }
        }
      } catch (e) {
        console.error("[sw] focus fallback failed", e);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose", { data: event.notification && event.notification.data });
});