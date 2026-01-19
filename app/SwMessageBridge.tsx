"use client";

import { useEffect } from "react";

export default function SwMessageBridge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data: any = event.data;
      if (!data || data.type !== "NAVIGATE") return;

      const url = data.url;
      if (typeof url !== "string") return;

      try {
        // 相対でも絶対でも扱えるように base を付ける
        const u = new URL(url, location.origin);
        if (u.origin !== location.origin) return;
        location.assign(u.toString());
      } catch {
        // ignore
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  return null;
}
