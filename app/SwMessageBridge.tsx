"use client";

import { useEffect } from "react";

export default function SwMessageBridge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data: any = event.data;
      if (!data) return;

      const t = data.type;
      if (t !== "NAVIGATE" && t !== "SW_NAVIGATE") return;

      const raw =
        typeof data.url === "string"
          ? data.url
          : typeof data.route === "string"
            ? data.route
            : "";
      if (!raw) return;

      try {
        const u = new URL(raw, window.location.origin);
        if (u.origin !== window.location.origin) return;
        if (process.env.NODE_ENV !== "production") console.log("[SwMessageBridge] navigate:", u.toString(), "payload:", data);
        window.location.href = u.toString();
      } catch (e) {
        console.warn("[SwMessageBridge] invalid url:", raw, e);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  return null;
}
