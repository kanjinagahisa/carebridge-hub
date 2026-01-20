/* public/sw.js */

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
  event.notification.close();
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

    try {
      const data = rawData ?? null;
      const route = data && typeof data.route === "string" ? data.route : "";
      const safeRoute = normalizeRoute(route);

      const list = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      if (list && list.length > 0) {
        const client = list[0];
        try {
          await client.focus();
        } catch {}
        try {
          client.postMessage({ type: "NAVIGATE", route: safeRoute });
        } catch {}
        return;
      }

      if (self.clients.openWindow) {
        const homeUrl = new URL("/home", self.location.origin).toString();
        const opened = await self.clients.openWindow(homeUrl);
        if (opened) {
          try {
            opened.postMessage({ type: "NAVIGATE", route: safeRoute });
          } catch {}
        }
      }
    } catch (e) {
      console.error("[SW-CLICK] failed", e);
    }
  })());
});