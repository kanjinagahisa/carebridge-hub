"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SwMessageBridge() {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === "SW_NAVIGATE" && event.data.url) {
        window.location.href = event.data.url;
        return;
      }

      const data: any = event.data;
      if (!data) return;

      const t = data.type;
      if (t === "NAVIGATE") {
        const route = typeof data.route === "string" ? data.route : "";
        if (!route || !route.startsWith("/")) return;
        router.push(route);
        return;
      }
      if (t !== "SW_NAVIGATE") return;

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
        console.log("[SwMessageBridge] navigate:", u.toString(), "payload:", data);
        window.location.assign(u.toString());
      } catch (e) {
        console.warn("[SwMessageBridge] invalid url:", raw, e);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [router]);

  return null;
}
