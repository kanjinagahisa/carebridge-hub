/* public/sw.js */

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

  // 既存仕様に合わせる（必要なら調整）
  if (path === "/timeline") return "/clients";
  if (path === "/home" || path === "/clients") return path;
  if (/^\/clients\/[0-9a-f-]{36}\/timeline$/.test(path)) return path;

  return "/home";
}

function toAbsoluteUrl(u) {
  if (!u) return null;
  try {
    // すでに絶対URLならそのまま
    const parsed = new URL(u);
    return parsed.toString();
  } catch {
    // 相対なら origin 付与
    try {
      return new URL(u, self.location.origin).toString();
    } catch {
      return null;
    }
  }
}

async function focusOrOpen(targetUrl) {
  const abs = toAbsoluteUrl(targetUrl) || toAbsoluteUrl("/home");

  // 既存クライアントを探して、あれば navigate を優先
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });

  // 同一originのクライアント優先
  const sameOriginClient = clientList.find((c) => {
    try {
      return new URL(c.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  if (sameOriginClient) {
    try {
      await sameOriginClient.focus();
    } catch {}

    // navigate は「同一タブで確実に遷移」させるための本命
    try {
      await sameOriginClient.navigate(abs);
      return;
    } catch {}

    // navigate が失敗したら openWindow へ
    try {
      await clients.openWindow(abs);
      return;
    } catch {}
  }

  // クライアントが無い/見つからない場合は新規タブ
  await clients.openWindow(abs);
}

self.addEventListener("install", (event) => {
  // すぐ有効化
  self.skipWaiting();
  console.log("[sw] install", { file: SW_FILE, at: Date.now() });
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    console.log("[sw] activate", { file: SW_FILE, at: Date.now() });
    await clients.claim();
  })());
});

/**
 * Push: payload から title/body/url を解釈して通知を出す
 * 重要: url は data.url / url / route などから拾う
 */
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    console.log("[sw] push event fired");

    const rawText = event.data ? event.data.text() : null;
    console.log("[sw] push payload raw:", rawText);

    const parsed = rawText ? safeJsonParse(rawText) : null;
    console.log("[sw] push payload parsed:", parsed);

    // payload 取り出し（いろんな形を許容）
    const title =
      (parsed && (parsed.title || parsed.notification?.title)) ||
      "CareBridge Hub";

    const bodyBase =
      (parsed && (parsed.body || parsed.notification?.body)) ||
      "新しいお知らせがあります。";

    const rawUrl =
      (parsed && (parsed.url || parsed.data?.url || parsed.notification?.data?.url)) ||
      null;

    const route = normalizeRoute(rawUrl);
    const absUrl = toAbsoluteUrl(rawUrl || route);

    const debugId =
      (parsed && (parsed.debugId || parsed.data?.debugId)) ||
      `push_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    // 通知本文に“見える形”で埋め込む（ここが一番効く）
    const debugSuffix = `\n[url=${rawUrl || ""}]\n[route=${route}]\n[debugId=${debugId}]`;

    const options = {
      body: bodyBase + debugSuffix,
      data: {
        url: absUrl,      // 絶対URL
        route,            // 正規化済みルート
        rawUrl,           // payload 生値
        debugId,
        from: "push",
      },
      requireInteraction: true,
      actions: [
        { action: "open", title: "開く" },
      ],
    };

    try {
      await self.registration.showNotification(title, options);
      console.log("[sw] showNotification done", { debugId, rawUrl, route, absUrl });
    } catch (e) {
      console.error("[sw] showNotification error", e);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil((async () => {
    try {
      const data = event.notification?.data || {};
      console.log("[sw] notificationclick fired", {
        action: event.action || "(body)",
        data,
      });

      event.notification?.close?.();

      // action があっても、基本は data.url を開く
      const target = data.url || data.route || "/home";
      await focusOrOpen(target);
      console.log("[sw] notificationclick navigated", { target });
    } catch (e) {
      console.error("[sw] notificationclick error", e);
      try {
        await focusOrOpen("/home");
      } catch {}
    }
  })());
});

self.addEventListener("notificationclose", (event) => {
  console.log("[sw] notificationclose", { data: event.notification?.data || null });
});