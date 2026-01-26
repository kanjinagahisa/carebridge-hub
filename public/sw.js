/* public/sw.js */

/**
 * CareBridge Hub - Production Service Worker (Web Push)
 *
 * 方針:
 * - Push通知は `data.url` を必ず持たせる（macOS/Chrome でもクリック遷移が安定しやすい）
 * - notificationclick は保険として「既存タブfocus or open」を行う
 * - ログは最小限（必要なら DEBUG=true に）
 */

const DEBUG = false;
const APP_ORIGIN = self.location.origin;

function log(...args) {
  if (DEBUG) console.log("[sw]", ...args);
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function toAbsoluteUrl(rawUrl) {
  if (!rawUrl) return null;
  if (typeof rawUrl !== "string") return null;

  // すでに absolute
  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      const u = new URL(rawUrl);
      // 同一Origin以外は拒否（安全）
      if (u.origin !== APP_ORIGIN) return null;
      return u.toString();
    } catch {
      return null;
    }
  }

  // relative -> absolute
  try {
    const u = new URL(rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`, APP_ORIGIN);
    return u.toString();
  } catch {
    return null;
  }
}

function normalizeRouteToUrl(routeOrUrl) {
  // 1) まず URLとして解釈
  const asUrl = toAbsoluteUrl(routeOrUrl);
  if (asUrl) return asUrl;

  // 2) route っぽいものを /home 等に丸めて URL化
  const route = typeof routeOrUrl === "string" ? routeOrUrl : "";
  const p = route.startsWith("/") ? route : `/${route}`;

  // ここはプロダクト側ルールに合わせて最小限
  if (p === "/timeline") return `${APP_ORIGIN}/clients`;
  if (p === "/") return `${APP_ORIGIN}/home`;

  // /home, /clients は許可
  if (p === "/home" || p === "/clients") return `${APP_ORIGIN}${p}`;

  // /clients/{uuid}/timeline は許可
  if (/^\/clients\/[0-9a-f-]{36}\/timeline$/i.test(p)) return `${APP_ORIGIN}${p}`;

  // 想定外はホームへ
  return `${APP_ORIGIN}/home`;
}

async function focusOrOpen(url) {
  const target = url || `${APP_ORIGIN}/home`;
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  // 既存タブが同一URL(完全一致)ならフォーカス
  for (const client of windowClients) {
    try {
      if (client.url === target) {
        await client.focus();
        return;
      }
    } catch {}
  }

  // 同一Originタブがあればフォーカスして遷移
  for (const client of windowClients) {
    try {
      const u = new URL(client.url);
      if (u.origin === APP_ORIGIN) {
        await client.focus();
        try {
          client.navigate(target);
        } catch {}
        return;
      }
    } catch {}
  }

  // 無ければ新規で開く
  await self.clients.openWindow(target);
}

self.addEventListener("install", (event) => {
  log("install");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  log("activate");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const text = event.data ? event.data.text() : "";
        const json = safeJsonParse(text) || {};
        log("push payload", json);

        // payload 期待例:
        // { title, body, url } or { title, body, route } or { notification: { title, body }, data: { url } }
        const title =
          json.title ||
          json?.notification?.title ||
          "CareBridge Hub";

        const body =
          json.body ||
          json?.notification?.body ||
          "";

        // url優先: json.url -> json.data.url -> json.route
        const rawUrl =
          json.url ||
          json?.data?.url ||
          json.route ||
          json?.data?.route;

        const url = normalizeRouteToUrl(rawUrl);

        // 本番は requireInteraction を基本OFF（OS依存挙動を避ける）
        // 必要なら true に変更可
        const options = {
          body,
          data: {
            url,          // ← 重要: クリック遷移の根拠
            rawUrl: rawUrl || null,
            receivedAt: Date.now(),
          },
          // 任意: actions を入れても良いが、macOSで不安定なことがあるため最小構成
          // actions: [{ action: "open", title: "開く" }],
          // requireInteraction: true,
        };

        await self.registration.showNotification(title, options);
      } catch (e) {
        // 失敗してもSWが落ちないように
        console.error("[sw] push error", e);
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // まず閉じる（失敗してもOK）
        try {
          event.notification?.close();
        } catch {}

        const data = event.notification?.data || {};
        const url = normalizeRouteToUrl(data.url || data.rawUrl) || `${APP_ORIGIN}/home`;

        log("notificationclick", { action: event.action || "(body)", url });

        // actionがあっても、結局はURLへ
        await focusOrOpen(url);
      } catch (e) {
        console.error("[sw] notificationclick error", e);
      }
    })()
  );
});

self.addEventListener("notificationclose", (event) => {
  // 何もしない（必要なら分析用にDEBUGでログ）
  log("notificationclose");
});