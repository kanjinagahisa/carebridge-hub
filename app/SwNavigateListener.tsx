"use client"

import { useEffect } from "react"

export default function SwNavigateListener() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const handler = (event: MessageEvent) => {
      try {
        const data = event.data || {}
        if (data.type !== "NAVIGATE") return

        const rawUrl = typeof data.url === "string" ? data.url : ""
        if (!rawUrl) return

        const target = new URL(rawUrl, window.location.origin)
        if (target.origin !== window.location.origin) return

        window.location.assign(target.toString())
      } catch {
        // ignore navigation errors
      }
    }

    navigator.serviceWorker.addEventListener("message", handler)
    return () => navigator.serviceWorker.removeEventListener("message", handler)
  }, [])

  return null
}
