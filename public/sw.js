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
    // ignore
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickUrlFromNotificationData(rawData) {
  // data.url → data.route → "/home"
  const rawUrl =
    (rawData && typeof rawData.url === "string" && rawData.url) ||
    (rawData && typeof rawData.route === "string" && rawData.route) ||
    "/home";

  // full URL
  if (typeof rawUrl === "string" && /^https?:\/\//.test(rawUrl)) {
    try {
      const u = new URL(rawUrl);
      const sameOrigin = u.origin === self.location.origin;
      const rawRoute = sameOrigin ? `${u.pathname}${u.search}${u.hash}` : "/home";
      const route = normalizeRoute(rawRoute);
      const url = sameOrigin ? rawUrl : new URL(route, self.location.origin).toString();
      return { rawUrl, route, url };
    } catch {}
  }

  // route
  const route = normalizeRoute(rawUrl);
  const url = new URL(route, self.location.origin).toString();
  return { rawUrl, route, url };
}

async function focusOrOpen(url) {
  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const sameOriginClient = clientsList.find((c) => {
    try {
      return new URL(c.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  if (sameOriginClient) {
    console.log("[sw] notificationclick found client", sameOriginClient.url);
    try {
      if (sameOriginClient.focus) await sameOriginClient.focus();
    } catch {}

    // ① 可能ならnavigate
    try {
      if (sameOriginClient.navigate) {
        await sameOriginClient.navigate(url);
        console.log("[sw] notificationclick navigated", url);
        return true;
      }
    } catch {
      // ignore
    }

    // ② navigateできない環境用：ページ側に遷移を依頼
    try {
      sameOriginClient.postMessage({ type: "NAVIGATE", url });
      console.log("[sw] notificationclick postMessage sent", url);
      return true;
    } catch {
      console.log("[sw] notificationclick postMessage failed", url);
    }
    return false;
  }

  // ③ タブが無い：新規で開く
  console.log("[sw] notificationclick openWindow", url);
  const win = await self.clients.openWindow(url);
  if (win?.focus) {
    try {
      await win.focus();
    } catch {}
  }
  return !!win;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      void swLog("install", {});
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
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
      } catch {}

      console.log("[sw] push data(text)=", text);
      console.log("[sw] push payload(json)=", parsed);

      const title = (parsed && parsed.title) || "CareBridge Hub";
      const body = (parsed && parsed.body) || "";

      const routeRaw = (parsed && (parsed.route || parsed.url || parsed.path)) || "/home";
      const route = normalizeRoute(routeRaw);
      const url = new URL(route, self.location.origin).toString();

      void swLog("push", { raw, parsed, route, url });

      // ✅クリック遷移の主キー：data.url を必ず入れる
      const debugId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const data = {
        url,
        route, // 互換
        raw,
        parsed,
        debugId,
      };

      console.log("[sw] showNotification start. route=", route, "url=", url, "debugId=", debugId);

      // ★ クリック判定しやすい通知（requireInteraction + data + actions + tag）
      // - 本文クリック/ボタンクリック どちらでも notificationclick を拾えるようにする
      // - tag に debugId を入れて追跡できるようにする
      const options = {
        body: `${body || ""} [debugId:${debugId}]`,
        data, // ★ clickで開く先は data.url
        requireInteraction: true, // ★ 勝手に消えない（判定しやすい）
        actions: [{ action: "open", title: "開く" }], // ★ ボタンでも click を試せる
        tag: `dbg-${debugId}`, // ★ どの通知か追える
      };

      await self.registration.showNotification(title, options);

      console.log("[sw] showNotification done. route=", route, "url=", url, "debugId=", debugId);
    })()
  );
});

// ★ 追加：closeも拾う（「クリックしたつもり」がclose扱いの判定）
self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose fired", {
    debugId: event.notification?.data?.debugId,
    data: event.notification?.data,
    tag: event.notification?.tag,
  });

  void swLog("notificationclose", {
    debugId: event.notification?.data?.debugId,
    data: event.notification?.data,
    tag: event.notification?.tag,
  });
});

// ★ 修正：clickは必ず waitUntil で延命する（寿命切れ対策）
self.addEventListener("notificationclick", (event) => {
  console.log("[sw] notificationclick fired (sync)", {
    debugId: event.notification?.data?.debugId,
    action: event.action,
    data: event.notification?.data,
    tag: event.notification?.tag,
  });

  event.notification?.close();

  event.waitUntil(
    (async () => {
      try {
        const action = event.action || "(body)";
        const rawData = event.notification?.data ?? null;
        const { rawUrl, route, url } = pickUrlFromNotificationData(rawData);

        console.log("[sw] notificationclick fired", {
          action,
          rawUrl,
          route,
          url,
          rawData,
        });

        void swLog("notificationclick", {
          action,
          rawUrl,
          route,
          url,
          rawData,
        });

        await focusOrOpen(url);
      } catch (e) {
        console.error("[sw] notificationclick error", e);
      }
    })()
  );
});