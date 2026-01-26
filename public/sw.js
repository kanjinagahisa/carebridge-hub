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

// ★検証用フラグ：まずは actions を切る（macOS/Chromeでクリック配送が変になる疑い潰し）
const ENABLE_ACTIONS = false;

// ★検証用：通知を残す（これで getNotifications で掴める/通知センターに残る想定）
const REQUIRE_INTERACTION = true;

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

  const rawUrl = (parsed && (parsed.url || (parsed.data && parsed.data.url))) || null;
  const route = normalizeRoute(rawUrl);
  const absUrl = toAbsoluteUrl(rawUrl || route);

  const debugId =
    (parsed && parsed.debugId) ||
    `push_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const tag = `carebridgehub-push-${debugId}`;

  const debugSuffix =
    `\n[url=${rawUrl || ""}]` +
    `\n[route=${route}]` +
    `\n[abs=${absUrl}]` +
    `\n[debugId=${debugId}]`;

  /** @type {NotificationOptions} */
  const options = {
    body: bodyBase + debugSuffix,

    // クリック時に拾うためのデータ
    data: { url: absUrl, route, rawUrl, debugId, ts: Date.now() },

    // ★通知を残して挙動を見る（macOSのバナー即消え対策）
    requireInteraction: REQUIRE_INTERACTION,

    // 同一タグで上書きしたくないのでユニークに
    tag,

    renotify: false,
    silent: false,
  };

  if (ENABLE_ACTIONS) {
    options.actions = [{ action: "open", title: "開く" }];
  }

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, options);
        console.log("[sw] showNotification OK", { debugId, rawUrl, route, absUrl, tag });

        // ★重要：通知がSW視点で存在するか確認（tag指定なし/あり両方）
        try {
          const all = await self.registration.getNotifications();
          const tagged = await self.registration.getNotifications({ tag });
          console.log("[sw] getNotifications ALL", { debugId, count: all.length });
          console.log("[sw] getNotifications TAG", { debugId, tag, count: tagged.length });
        } catch (e) {
          console.error("[sw] getNotifications failed", e, { debugId, tag });
        }
      } catch (e) {
        console.error("[sw] showNotification FAILED", e, { debugId, rawUrl, route, absUrl, tag });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  // これが出ない＝クリックがSWに届いてない
  console.log("[sw] notificationclick fired", {
    action: event.action || "(body)",
    data: event.notification && event.notification.data,
    tag: event.notification && event.notification.tag,
  });

  event.notification?.close?.();

  event.waitUntil(
    (async () => {
      const data = (event.notification && event.notification.data) || {};
      const target = data.url || (self.location.origin + "/home");

      // 現在のクライアント一覧をまずログ（診断用）
      try {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        console.log("[sw] clients.matchAll", {
          count: list.length,
          urls: list.map((c) => c.url),
        });
      } catch (e) {
        console.error("[sw] clients.matchAll failed", e);
      }

      // まず openWindow（これが通れば勝ち）
      try {
        const win = await self.clients.openWindow(target);
        console.log("[sw] openWindow ok", { target, win: !!win });
        return;
      } catch (e) {
        console.error("[sw] openWindow failed", e, { target });
      }

      // fallback：既存タブへフォーカス
      try {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of list) {
          if ("focus" in c) {
            await c.focus();
            console.log("[sw] focus fallback ok", { clientUrl: c.url });
            return;
          }
        }
        console.warn("[sw] focus fallback: no clients");
      } catch (e) {
        console.error("[sw] focus fallback failed", e);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose", {
    tag: event.notification && event.notification.tag,
    data: event.notification && event.notification.data,
  });
});