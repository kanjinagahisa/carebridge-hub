/* public/sw.js */

// NOTE:
// - swLog は “失敗しても本筋に影響させない” ため、基本は fire-and-forget（awaitしない）にしています。
// - install/activate/push/click などの waitUntil では、必要な処理（showNotification / openWindow 等）だけを待ちます。

const SW_FILE = "public/sw.js";

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

async function swLog(at, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    // ✅ SWでは相対パスより絶対URLの方が事故りにくい
    const endpoint = new URL("/api/sw-log", self.location.origin).toString();

    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        at,
        ts: Date.now(),
        sw: SW_FILE,
        origin: self.location.origin,
        ...payload,
      }),
    });
  } catch {
    // ここで落ちても本筋に影響させない
  } finally {
    clearTimeout(timeoutId);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      // fire-and-forget
      void swLog("install", {});
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // fire-and-forget
      void swLog("activate", {});
    })()
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let raw = "";
      let parsed = null;

      try {
        if (event.data) {
          // JSON優先
          try {
            parsed = event.data.json();
            raw = JSON.stringify(parsed);
          } catch {
            raw = event.data.text();
            parsed = safeJsonParse(raw);
          }
        }
      } catch {
        // ignore
      }

      const title = (parsed && parsed.title) || "CareBridge Hub";
      const body = (parsed && parsed.body) || "";

      // route/url/path の揺れを吸収
      const routeRaw =
        (parsed && (parsed.route || parsed.url || parsed.path)) || "/";
      const route = String(routeRaw).startsWith("/")
        ? String(routeRaw)
        : "/" + String(routeRaw);

      // fire-and-forget（通知表示を遅らせない）
      void swLog("push", { raw, parsed, route });

      const data = {
        route,
        raw,
        parsed,
      };

      await self.registration.showNotification(title, {
        body,
        data,
        // 必要ならicon/badgeを追加
        // icon: "/assets/icon/icon-192.png",
        // badge: "/assets/icon/icon-192.png",
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification?.close();

  event.waitUntil((async () => {
    const url = new URL("/clients?from=notif", self.location.origin).href;
    await self.clients.openWindow(url);
  })());
});