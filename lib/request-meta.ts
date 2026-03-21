function normalizeHeaderValue(value: string | null) {
  return value?.trim() || "";
}

export function getRequestIp(request: Request) {
  const forwardedFor = normalizeHeaderValue(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "";
  }

  return normalizeHeaderValue(request.headers.get("x-real-ip"));
}

export function parseUserAgentDetails(userAgent: string | null | undefined) {
  const value = userAgent?.trim() ?? "";
  const lower = value.toLowerCase();

  const browser =
    lower.includes("edg/")
      ? "Edge"
      : lower.includes("chrome/")
        ? "Chrome"
        : lower.includes("firefox/")
          ? "Firefox"
          : lower.includes("safari/") && !lower.includes("chrome/")
            ? "Safari"
            : lower.includes("opr/")
              ? "Opera"
              : "Unknown";

  const os =
    lower.includes("windows")
      ? "Windows"
      : lower.includes("mac os x") || lower.includes("macintosh")
        ? "macOS"
        : lower.includes("android")
          ? "Android"
          : lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")
            ? "iOS"
            : lower.includes("linux")
              ? "Linux"
              : "Unknown";

  return { browser, os };
}
