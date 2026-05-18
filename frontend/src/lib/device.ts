function readPlatform(): string {
  const uaData = (
    navigator as Navigator & {
      userAgentData?: { platform?: string };
    }
  ).userAgentData;

  if (uaData?.platform) {
    return uaData.platform;
  }
  return navigator.platform || "unknown";
}

export async function buildDeviceInfoString(): Promise<string> {
  const userAgent = navigator.userAgent || "unknown";
  const platform = readPlatform();
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent, platform);
  return `${browser} on ${os}`;
}

export function formatDeviceInfoLabel(value?: string) {
  if (!value) {
    return "Unknown device";
  }
  try {
    const parsed = JSON.parse(value) as {
      platform?: string;
      userAgent?: string;
      browser?: string;
      os?: string;
      deviceId?: string;
    };
    if (parsed.browser && parsed.os) {
      return `${parsed.browser} on ${parsed.os}`;
    }
    if (parsed.platform) {
      return parsed.platform;
    }
    if (parsed.userAgent) {
      return parsed.userAgent;
    }
    if (parsed.deviceId) {
      return parsed.deviceId;
    }
  } catch {
    // ignore malformed legacy payloads
  }
  return value;
}

function detectBrowser(userAgent: string): string {
  const value = userAgent.toLowerCase();
  if (value.includes("firefox")) {
    return "Firefox";
  }
  if (value.includes("edg/")) {
    return "Edge";
  }
  if (value.includes("chrome") && !value.includes("edg/")) {
    return "Chrome";
  }
  if (value.includes("safari") && !value.includes("chrome")) {
    return "Safari";
  }
  if (value.includes("opera") || value.includes("opr/")) {
    return "Opera";
  }
  return "Browser";
}

function detectOS(userAgent: string, platform: string): string {
  const value = `${userAgent} ${platform}`.toLowerCase();
  if (value.includes("windows")) return "Windows";
  if (value.includes("mac")) return "MacOS";
  if (value.includes("linux")) return "Ubuntu";
  if (value.includes("android")) return "Android";
  if (value.includes("iphone") || value.includes("ipad")) return "iOS";
  return platform || "Unknown OS";
}
