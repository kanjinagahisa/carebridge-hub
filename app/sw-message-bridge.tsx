"use client";
import { useEffect } from "react";

export default function SwMessageBridge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = (event as MessageEvent)?.data;
      if (data?.type === "NAVIGATE" && typeof data.url === "string") {
        window.location.href = data.url;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  return null;
}
