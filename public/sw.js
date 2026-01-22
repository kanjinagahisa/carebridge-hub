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
  const rawData = event.notification?.data ?? null;
  event.notification.close();

  event.waitUntil(
    (async () => {
      try {
        const data = rawData;
        const route = data && typeof data.route === "string" ? data.route : null;
        const dataUrl = data && typeof data.url === "string" ? data.url : null;

        const rawUrl = route ?? dataUrl ?? "/home";
        const normalizedPath = normalizeRoute(rawUrl);
        const targetUrl = new URL(normalizedPath, self.location.origin).toString();

        void swLog("notificationclick", { route, normalizedPath, targetUrl, rawData });

        // 1) 既存タブがあればそれを使う
        const list = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const sameOrigin = (list || []).filter((c) => {
          try {
            return new URL(c.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (sameOrigin.length > 0) {
          // なるべく「今見ているっぽい」タブを優先
          const client =
            sameOrigin.find((c) => c.visibilityState === "visible") ?? sameOrigin[0];

          // focus は待たない（開始だけ）
          try {
            client.focus();
            void swLog("notificationclick.focus_started", { targetUrl });
          } catch {
            void swLog("notificationclick.focus_start_failed", { targetUrl });
          }

          // 可能なら navigate（これも待たない）
          if ("navigate" in client) {
            try {
              client.navigate(targetUrl);
              void swLog("notificationclick.navigate_started", { targetUrl });
              return;
            } catch {
              void swLog("notificationclick.navigate_start_failed", { targetUrl });
            }
          }

          // navigate が無理なら postMessage（ページ側で受けて遷移）
          try {
            client.postMessage({ type: "SW_NAVIGATE", url: targetUrl });
            void swLog("notificationclick.postMessage_sent", { targetUrl });
            return;
          } catch {
            void swLog("notificationclick.postMessage_failed", { targetUrl });
          }
        }

        // 2) タブが無い時だけ openWindow（待たない）
        if (self.clients.openWindow) {
          try {
            self.clients.openWindow(targetUrl);
            void swLog("notificationclick.openWindow_started", { targetUrl });
          } catch {
            void swLog("notificationclick.openWindow_start_failed", { targetUrl });
          }
        }
      } catch (e) {
        void swLog("notificationclick.error", { message: String(e), rawData });
        console.error("[SW-CLICK] failed", e);
      }
    })()
  );
});