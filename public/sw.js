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
  console.log("[sw] install", {
    scope: self.registration.scope,
    origin: self.location.origin,
  });
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw] activate", {
    scope: self.registration.scope,
    origin: self.location.origin,
  });
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      console.log("[sw] push event fired");

      const rawText = event.data ? await event.data.text() : "";
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

        // ★クリック時に確実に使うデータ（absUrl と route を両方保持）
        data: {
          absUrl,          // 完全URL
          url: route,      // ルート（念のため）
          route,
          rawUrl,
          debugId,
          ts: Date.now(),
        },

        // ★macOSで body クリックが来ない/不安定な時の回避策として actions も用意
        actions: [
          { action: "open", title: "開く" },
          { action: "home", title: "ホーム" },
        ],

        tag: "carebridgehub-push",
        renotify: false,
        // requireInteraction: true, // 必要ならON
      };

      await self.registration.showNotification(title, options);
      console.log("[sw] showNotification done", { debugId, rawUrl, route, absUrl });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  // ✅ まず close（OS側で通知が残ると挙動が変なことがある）
  event.notification?.close?.();

  event.waitUntil(
    (async () => {
      const data = event.notification?.data || {};
      console.log("[sw] notificationclick fired", { data, action: event.action });

      // actionごとに遷移先を決める
      let target = data.absUrl || toAbsoluteUrl(data.url || "/home");
      if (event.action === "home") target = self.location.origin + "/home";
      // open / body クリックは target のまま

      // ① まず「既存タブ」を優先して navigate + focus（これが一番確実）
      try {
        const list = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // 同一オリジンのタブを優先
        const sameOriginClient = list.find((c) => {
          try {
            return typeof c.url === "string" && c.url.startsWith(self.location.origin);
          } catch {
            return false;
          }
        });

        if (sameOriginClient) {
          try {
            if ("navigate" in sameOriginClient) {
              await sameOriginClient.navigate(target);
              console.log("[sw] navigate ok", { target });
            }
          } catch (e) {
            console.error("[sw] navigate failed", e);
          }

          try {
            if ("focus" in sameOriginClient) {
              await sameOriginClient.focus();
              console.log("[sw] focus ok");
              return;
            }
          } catch (e) {
            console.error("[sw] focus failed", e);
          }
        }
      } catch (e) {
        console.error("[sw] matchAll failed", e);
      }

      // ② 既存がダメなら openWindow（新規タブ/ウィンドウ）
      try {
        const win = await self.clients.openWindow(target);
        console.log("[sw] openWindow ok", { target, win: !!win });
        return;
      } catch (e) {
        console.error("[sw] openWindow failed", e);
      }

      // ③ 最後の保険：開けないならホームへ
      try {
        const fallback = await self.clients.openWindow(self.location.origin + "/home");
        console.log("[sw] openWindow fallback ok", { fallback: !!fallback });
      } catch (e) {
        console.error("[sw] openWindow fallback failed", e);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose", { data: event.notification && event.notification.data });
});