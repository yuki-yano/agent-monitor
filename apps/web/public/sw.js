self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const resolveSafeTargetUrl = (rawUrl) => {
  const fallbackUrl = new URL("/", self.location.origin);
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return fallbackUrl.toString();
  }
  try {
    const candidate = new URL(rawUrl, self.location.origin);
    if (candidate.origin !== self.location.origin) {
      return fallbackUrl.toString();
    }
    return candidate.toString();
  } catch {
    return fallbackUrl.toString();
  }
};

self.addEventListener("push", (event) => {
  const payload = (() => {
    if (!event.data) {
      return null;
    }
    try {
      return event.data.json();
    } catch {
      return null;
    }
  })();

  const title = typeof payload?.title === "string" ? payload.title : "VDE Monitor";
  const body = typeof payload?.body === "string" ? payload.body : "Session update";
  const tag = typeof payload?.tag === "string" ? payload.tag : "session-update";
  const url = typeof payload?.url === "string" ? payload.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveSafeTargetUrl(event.notification?.data?.url);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (!client.url.startsWith(self.location.origin)) {
          continue;
        }
        try {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        } catch {
          break;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
