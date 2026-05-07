export type DevicePayload = {
  deviceId: string;
  source: "fingerprint" | "fallback";
  userAgent: string;
  platform: string;
  screen: string;
  timezone: string;
  language: string;
};

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fb-${(hash >>> 0).toString(16)}`;
}

async function strongHash(input: string): Promise<string> {
  if (!window.crypto?.subtle) {
    return simpleHash(input);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `fp-${hex.slice(0, 24)}`;
}

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

function readScreen(): string {
  if (!window.screen) {
    return "unknown";
  }
  const ratio = window.devicePixelRatio || 1;
  return `${window.screen.width}x${window.screen.height}@${ratio}`;
}

function readTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function buildDevicePayload(): Promise<DevicePayload> {
  const userAgent = navigator.userAgent || "unknown";
  const platform = readPlatform();
  const screen = readScreen();
  const timezone = readTimezone();
  const language = navigator.language || "unknown";

  const seed = [userAgent, platform, screen, timezone].join("|");

  try {
    const deviceId = await strongHash(seed);
    return {
      deviceId,
      source: "fingerprint",
      userAgent,
      platform,
      screen,
      timezone,
      language,
    };
  } catch {
    return {
      deviceId: simpleHash(seed),
      source: "fallback",
      userAgent,
      platform,
      screen,
      timezone,
      language,
    };
  }
}

export async function buildDeviceInfoString(): Promise<string> {
  const payload = await buildDevicePayload();
  return JSON.stringify(payload);
}
