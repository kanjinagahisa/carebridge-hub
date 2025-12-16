/* public/sw.js */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Pushイベントで通知を表示
 * payload例:
 * {
 *   "title": "新しい投稿",
 *   "body": "〇〇さんが△△さんのタイムラインに投稿しました",
 *   "route": "/clients/xxx/timeline",
 *   "icon": "/assets/icon/icon-192.png" // optional
 * }
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "通知", body: "新しいお知らせがあります" };
  }

  const title = data.title || "通知";
  const body = data.body || "";
  const route = data.route || "/";
  const icon = data.icon || "/assets/icon/icon-192.png";

  const options = {
    body,
    icon,
    badge: "/assets/icon/icon-192.png",
    data: { route },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * 通知クリックで画面遷移
 * 既に開いているタブがあればフォーカスして遷移
 * なければ新規で開く
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const route = event.notification?.data?.route || "/";
  const url = new URL(route, self.location.origin).toString();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 既存タブがあればそれを使う
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          // client.navigate が使えるブラウザでは遷移
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        }
      }

      // 無ければ新規タブ
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

