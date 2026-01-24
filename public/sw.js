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
      let text = "(no data)";
      console.log("[sw] push event fired");

      try {
        if (event.data) {
          // JSON優先
          try {
            parsed = await event.data.json();
            raw = JSON.stringify(parsed);
          } catch {
            raw = await event.data.text();
            parsed = safeJsonParse(raw);
          }
          try {
            text = await event.data.text();
          } catch {}
        }
      } catch {
        // ignore
      }
      console.log("[sw] push data(text)=", text);
      console.log("[sw] push payload(json)=", parsed);

      const title = (parsed && parsed.title) || "CareBridge Hub";
      const body = (parsed && parsed.body) || "";

      // route/url/path の揺れを吸収
      const routeRaw =
        (parsed && (parsed.route || parsed.url || parsed.path)) || "/home";
      const route = normalizeRoute(routeRaw);

      // fire-and-forget（通知表示を遅らせない）
      void swLog("push", { raw, parsed, route });

      const data = {
        route,
        raw,
        parsed,
      };

      console.log("[sw] showNotification start. route=", route);
      await self.registration.showNotification(title, {
        body,
        data,
        tag: `cbh-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        actions: [
          { action: "open", title: "開く" },
          { action: "dismiss", title: "閉じる" }
        ],
        // 必要ならicon/badgeを追加
        // icon: "/assets/icon/icon-192.png",
        // badge: "/assets/icon/icon-192.png",
      });
      console.log("[sw] showNotification done. route=", route);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification?.close();

  event.waitUntil((async () => {
    try {
      const action = event.action || "(body)";
      const rawData = event.notification?.data ?? null;
      const rawRoute = rawData && typeof rawData.route === "string" ? rawData.route : "/home";
      const route = normalizeRoute(rawRoute);
      const url = new URL(route, self.location.origin).toString();
      console.log("[sw] notificationclick fired", { action, rawRoute, route, url });

      void swLog("notificationclick", { action, rawRoute, route, url, rawData });

      if (action === "dismiss") return;

      const win = await self.clients.openWindow(url);
      if (win?.focus) await win.focus();
    } catch (e) {
      console.error("[sw] notificationclick error", e);
    }
  })());
});