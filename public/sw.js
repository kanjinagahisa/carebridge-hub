/* public/sw.js */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {};
  }

  const title = payload.title || "CareBridge Hub";
  const body = payload.body || "";
  const route =
    payload.route ||
    payload.url ||
    payload.link ||
    payload.href ||
    "/";

  const options = {
    body,
    // ★ここが重要：click時に取り出すデータを必ず data に入れる
    data: {
      route,
      // 予備で入れておく（将来payloadが変わっても壊れにくい）
      url: route,
    },
    // actions は既に入れているなら維持でOK（無くても click は動きます）
    actions: [
      { action: "open", title: "開く" },
      { action: "settings", title: "設定" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const data = event.notification && event.notification.data ? event.notification.data : {};
      const rawRoute =
        data.route ||
        data.url ||
        data.link ||
        data.href ||
        "/";

      // ★必ず absolute URL にする（これで遷移失敗が激減します）
      const targetUrl = new URL(rawRoute, self.location.origin).href;

      // 既存タブがあればそれを使う（同一originのみ）
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        const sameOrigin = new URL(client.url).origin === self.location.origin;
        if (!sameOrigin) continue;

        try {
          // ★ navigate → focus の順（環境差でこっちが安定）
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          if ("focus" in client) {
            await client.focus();
          }
          return;
        } catch (_) {
          // 次のclientへ
        }
      }

      // 既存タブが無い/失敗したら新規で開く（最終手段）
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});