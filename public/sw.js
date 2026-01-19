/* public/sw.js */

/**
 * CareBridge Hub Service Worker
 * - Push通知を受けて表示
 * - 通知クリック時は「SWが直接navigateしない」
 *   → 既存タブへ postMessage({type:"NAVIGATE", url}) → focus
 *   → タブが無ければ openWindow
 * - Chromeクラッシュ等が起きても落ちにくいように try/catch を厚めに
 * - 任意で /api/sw-log にログを送れる（Vercel Logsで確認可能）
 */

/** ====== 設定（必要なら変えてOK） ====== */
const ENABLE_SW_LOG = true; // ログをサーバに送るなら true（/api/sw-log が必要）
const SW_LOG_ENDPOINT = "/api/sw-log";

/** ====== ユーティリティ ====== */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildTargetUrl(route) {
  // route が "/clients/xxx/timeline" のような相対パスで来る想定
  // もし "https://..." が来ても同一origin以外は弾く
  try {
    const u = new URL(route, self.location.origin);
    if (u.origin !== self.location.origin) {
      return self.location.origin + "/";
    }
    return u.toString();
  } catch {
    return self.location.origin + "/";
  }
}

async function swLog(payload) {
  if (!ENABLE_SW_LOG) return;
  try {
    await fetch(SW_LOG_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ts: Date.now(),
        sw: "public/sw.js",
        origin: self.location.origin,
      }),
      // Chromeが落ちても飛ぶ確率を上げる
      keepalive: true,
    });
  } catch {
    // ログ送信失敗は無視
  }
}

/** ====== インストール/アクティベート ====== */
self.addEventListener("install", (event) => {
  // 即時有効化（必要に応じて）
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
      } catch {
        // ignore
      }
    })()
  );
});

/** ====== PUSH受信 → 通知表示 ======
 * 期待する payload 例（DevTools pushでもOK）
 * { "title":"🔔 click test", "body":"go timeline", "route":"/clients/xxx/timeline" }
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const raw = event.data ? event.data.text() : "";
        const data = safeJsonParse(raw) || {};

        const title =
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : "お知らせ";

        const body =
          typeof data.body === "string" && data.body.trim()
            ? data.body
            : "";

        const route =
          typeof data.route === "string" && data.route.trim()
            ? data.route
            : "/";

        const notificationOptions = {
          body,
          // ここが重要：クリック時に参照する
          data: { route },
          // 通知がまとめられて消えないようにしたいなら tag を固定にする等も可能
          // tag: "carebridge",
        };

        await swLog({
          at: "push",
          raw,
          parsed: data,
          route,
        });

        await self.registration.showNotification(title, notificationOptions);
      } catch (e) {
        await swLog({
          at: "push_error",
          error: String(e),
        });
      }
    })()
  );
});

/** ====== 通知クリック ======
 * SWが client.navigate() を使わずに、
 * 既存タブへ postMessage で「遷移して」と依頼する（クラッシュ対策）
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      try {
        const data = event.notification?.data || {};
        const route = typeof data.route === "string" ? data.route : "/";
        const targetUrl = buildTargetUrl(route);

        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        await swLog({
          at: "notificationclick",
          route,
          targetUrl,
          clients: clientList.map((c) => c.url),
        });

        // 同一originのクライアントを優先
        const sameOriginClients = clientList.filter((c) => {
          try {
            return new URL(c.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        const client = sameOriginClients[0];

        if (client) {
          // 重要：SWが直接navigateしない
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          await client.focus();
          return;
        }

        // タブが無いときだけ openWindow
        if (self.clients.openWindow) {
          await self.clients.openWindow(targetUrl);
        }
      } catch (e) {
        await swLog({
          at: "notificationclick_error",
          error: String(e),
        });
        // 例外は握りつぶす（ここでSWが死ぬのが一番まずい）
      }
    })()
  );
});