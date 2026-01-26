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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  // ★検証しやすいように tag は一意（今まで通り）
  const tag = `carebridgehub-push-${debugId}`;

  const debugSuffix =
    `\n[url=${rawUrl || ""}]` +
    `\n[route=${route}]` +
    `\n[abs=${absUrl}]` +
    `\n[debugId=${debugId}]`;

  const options = {
    body: bodyBase + debugSuffix,

    data: { url: absUrl, route, rawUrl, debugId, ts: Date.now() },

    actions: [{ action: "open", title: "開く" }],

    tag,
    renotify: false,

    // ★これが超重要：通知を残してクリック検証を安定させる
    requireInteraction: true,
  };

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, options);
        console.log("[sw] showNotification OK", { debugId, rawUrl, route, absUrl, tag });
      } catch (e) {
        console.error("[sw] showNotification FAILED", e, { debugId, rawUrl, route, absUrl, tag });
        return;
      }

      // ★タイミング問題を潰す：少し待ってから取得
      await sleep(300);

      try {
        const all = await self.registration.getNotifications();
        console.log("[sw] getNotifications ALL", {
          debugId,
          count: all.length,
          tags: all.map((n) => n.tag),
        });
      } catch (e) {
        console.error("[sw] getNotifications ALL failed", e, { debugId });
      }

      try {
        const byTag = await self.registration.getNotifications({ tag });
        console.log("[sw] getNotifications TAG", { debugId, tag, count: byTag.length });
      } catch (e) {
        console.error("[sw] getNotifications TAG failed", e, { debugId, tag });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
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
      const origin = self.location.origin;

      // 1) まず既存タブがあればそれを使う（macOS/Chromeで安定しやすい）
      try {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        console.log("[sw] clients.matchAll", { count: list.length, urls: list.map((c) => c.url) });

        // 同一 origin のタブを優先
        const same = list.find((c) => typeof c.url === "string" && c.url.startsWith(origin));
        if (same) {
          try {
            if ("focus" in same) await same.focus();
            if ("navigate" in same) {
              await same.navigate(target);
              console.log("[sw] navigate ok", { target, clientUrl: same.url });
              return;
            }
            console.log("[sw] focus ok (no navigate available)", { clientUrl: same.url });
            return;
          } catch (e) {
            console.error("[sw] focus/navigate failed", e, { target, clientUrl: same.url });
          }
        }
      } catch (e) {
        console.error("[sw] clients.matchAll failed", e);
      }

      // 2) 既存が無ければ openWindow
      try {
        const win = await self.clients.openWindow(target);
        console.log("[sw] openWindow ok", { target, win: !!win });
        return;
      } catch (e) {
        console.error("[sw] openWindow failed", e, { target });
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