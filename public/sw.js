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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    await fetch("/api/sw-log", {
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
  } catch (e) {
    // ここで落ちても本筋に影響させない
  } finally {
    clearTimeout(timeoutId);
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

  event.waitUntil((async () => {
    try {
      // 1) 遷移先URLを作る
      const data = rawData;
      const route = data && typeof data.route === "string" ? data.route : null;
      const dataUrl = data && typeof data.url === "string" ? data.url : null;
      const rawUrl = route ?? dataUrl ?? "/home";
      const normalizedPath = normalizeRoute(rawUrl);
      const targetUrl = new URL(normalizedPath, self.location.origin).toString();

      const logPromise = swLog("notificationclick", {
        route,
        normalizedPath,
        targetUrl,
        rawData,
      });

      const navPromise = (async () => {
        // 2) 既存タブがあれば “そのタブ自体を遷移” させる（最重要）
        const list = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // 同一オリジンのタブだけ
        const sameOrigin = (list || []).filter((c) => {
          try { return new URL(c.url).origin === self.location.origin; }
          catch { return false; }
        });

        if (sameOrigin.length > 0) {
          const client = sameOrigin[0];
          let navigated = false;

          try {
            await client.focus();
            await swLog("notificationclick.focus_ok", { targetUrl, rawData });
          } catch (e) {
            await swLog("notificationclick.focus_failed", { targetUrl, rawData });
          }

          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
              navigated = true;
              await swLog("notificationclick.navigate_ok", { targetUrl, rawData });
            } catch (e) {
              await swLog("notificationclick.navigate_failed", { targetUrl, rawData });
            }
          }

          if (!navigated && self.clients.openWindow) {
            try {
              await self.clients.openWindow(targetUrl);
              await swLog("notificationclick.openWindow_fallback", {
                targetUrl,
                rawData,
              });
            } catch (e) {
              await swLog("notificationclick.openWindow_failed", {
                targetUrl,
                rawData,
              });
            }
          }

          return;
        }

        // 3) タブが無ければ新規で開く
        if (self.clients.openWindow) {
          try {
            await self.clients.openWindow(targetUrl);
            await swLog("notificationclick.openWindow_ok", { targetUrl, rawData });
          } catch (e) {
            await swLog("notificationclick.openWindow_failed", { targetUrl, rawData });
          }
        }
      })();

      await Promise.allSettled([navPromise, logPromise]);
    } catch (e) {
      try {
        await swLog("notificationclick.error", {
          message: String(e),
          rawData,
        });
      } catch {}
      console.error("[SW-CLICK] failed", e);
    }
  })());
});