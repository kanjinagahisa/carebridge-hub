/* public/sw.js */

const SW_FILE = "public/sw.js";

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function swLog(at, payload) {
  try {
    await fetch("/api/sw-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        at,
        ts: Date.now(),
        sw: SW_FILE,
        origin: self.location.origin,
        ...payload,
      }),
    });
  } catch (e) {
    // ここで落ちても本筋に影響させない
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    self.skipWaiting();
    await swLog("install", {});
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await swLog("activate", {});
  })());
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
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
    } catch {}

    const title = (parsed && parsed.title) || "CareBridge Hub";
    const body = (parsed && parsed.body) || "";

    // ここが重要：route/urlの不一致を吸収する
    const routeRaw =
      (parsed && (parsed.route || parsed.url || parsed.path)) || "/";
    const route = String(routeRaw).startsWith("/")
      ? String(routeRaw)
      : "/" + String(routeRaw);

    await swLog("push", { raw, parsed, route });

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
  })());
});

self.addEventListener("notificationclick", (event) => {
  const rawData = event.notification?.data ?? null;
  console.log("[SW-CLICK]", rawData);
  event.waitUntil((async () => {
    try {
      await fetch("/api/sw-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          at: "notificationclick",
          ts: new Date().toISOString(),
          route: rawData?.route ?? null,
          rawData,
        }),
      });
    } catch (e) {
      console.warn("[SW-CLICK] log failed", e);
    }
  })());
  event.notification.close();

  event.waitUntil((async () => {
    try {
      const data = event.notification?.data ?? null;
      const route =
        data && typeof data.route === "string" ? data.route : null;
      const dataUrl =
        data && typeof data.url === "string" ? data.url : null;
      const rawUrl = route ?? dataUrl ?? "/home";
      const url = new URL(rawUrl, self.location.origin).toString();

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
        try {
          await sameOrigin[0].focus();
        } catch {}

        for (const client of sameOrigin) {
          try {
            client.postMessage({
              type: "SW_NAVIGATE",
              url,
            });
          } catch {}
        }
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    } catch (e) {
      console.error("[SW-CLICK] failed", e);
    }
  })());
});