/* public/sw.js */

self.addEventListener("install", () => {
  // 新しいSWをすぐ有効化（更新反映を早める）
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 既存タブも新SWの管理下に（環境差で効くことがある）
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {};
  }

  // よくある形: payload.data.url / payload.data.route も拾う
  const payloadData = payload && typeof payload === "object" ? payload.data : null;

  const title = payload.title || "CareBridge Hub";
  const body = payload.body || "";

  const route =
    payload.route ||
    payload.url ||
    payload.link ||
    payload.href ||
    (payloadData && (payloadData.route || payloadData.url || payloadData.link || payloadData.href)) ||
    "/";

  const options = {
    body,
    data: {
      route,
      url: route, // 予備
      // デバッグ用に payload も入れておく（後で消してOK）
      __debug: {
        receivedAt: new Date().toISOString(),
        route,
      },
    },
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
      // ★ action ボタンを押した場合は event.action に入る
      const action = event.action || "";

      const data =
        event.notification && event.notification.data ? event.notification.data : {};

      const rawRoute =
        data.route ||
        data.url ||
        data.link ||
        data.href ||
        "/";

      // settings アクションは（必要なら）固定遷移にする
      // ※あなたのアプリに設定ページが無ければ、ここは "/" のままでOK
      const finalRawRoute =
        action === "settings" ? "/settings" : rawRoute;

      const targetUrl = new URL(finalRawRoute, self.location.origin).href;

      // ---- デバッグログ（まずはこれで「発火してるか」を確定させる）----
      // ※このログは “受信側のSWのinspectコンソール” に出ます
      console.log("[SW] notificationclick fired", {
        action,
        rawRoute,
        finalRawRoute,
        targetUrl,
        data,
      });

      // 既存タブがあればそれを使う（同一originのみ）
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      console.log("[SW] matched clients:", clientList.map((c) => c.url));

      for (const client of clientList) {
        const sameOrigin = new URL(client.url).origin === self.location.origin;
        if (!sameOrigin) continue;

        try {
          // navigate → focus の順（比較的安定）
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          if ("focus" in client) {
            await client.focus();
          }
          console.log("[SW] navigated existing client:", client.url);
          return;
        } catch (e) {
          console.log("[SW] navigate failed for client:", client.url, e);
        }
      }

      // 既存タブが無い/失敗したら新規で開く（最終手段）
      if (self.clients.openWindow) {
        console.log("[SW] opening new window:", targetUrl);
        await self.clients.openWindow(targetUrl);
      } else {
        console.log("[SW] clients.openWindow is not available");
      }
    })()
  );
});