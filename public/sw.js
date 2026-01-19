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
  event.notification.close();

  event.waitUntil((async () => {
    const route =
      (event.notification &&
        event.notification.data &&
        event.notification.data.route) ||
      "/";

    // クリックが発火した証拠を必ず残す（ここが原因究明の核心）
    await swLog("click", {
      route,
      notificationData: event.notification && event.notification.data,
    });

    const targetUrl = new URL(route, self.location.origin).toString();

    // 既存タブがあれば、そこにpostMessage（ページ側で遷移）
    const list = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    if (list && list.length > 0) {
      // まずフォーカス（ユーザー体感が良い）
      try {
        await list[0].focus();
      } catch {}

      // 全タブに指示（どれかが受け取ればOK）
      for (const client of list) {
        try {
          client.postMessage({
            type: "SW_NAVIGATE",
            route,
            url: targetUrl,
            ts: Date.now(),
          });
        } catch {}
      }

      await swLog("click_postmessage_sent", {
        route,
        clients: list.map((c) => c.url),
      });
      return;
    }

    // タブが無いなら新規で開く（最終手段）
    if (self.clients.openWindow) {
      await swLog("click_openWindow", { route, url: targetUrl });
      await self.clients.openWindow(targetUrl);
    } else {
      await swLog("click_openWindow_unavailable", { route, url: targetUrl });
    }
  })());
});