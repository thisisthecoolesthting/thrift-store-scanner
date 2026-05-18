import { cookies, headers } from "next/headers";
import { DEVICE_ID_COOKIE } from "@/lib/device-constants";

export async function readDeviceCookieId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEVICE_ID_COOKIE)?.value ?? null;
}

export async function guessDeviceNameFromHeaders(): Promise<string> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (!ua) return "Browser scanner";

  const chrome = /Chrome\/\d+/i.test(ua);
  const safari = /Safari\/\d+/i.test(ua) && !chrome;
  const firefox = /Firefox\/\d+/i.test(ua);
  const edge = /Edg\/\d+/i.test(ua);
  const browser = edge
    ? "Edge"
    : chrome
      ? "Chrome"
      : firefox
        ? "Firefox"
        : safari
          ? "Safari"
          : "Browser";

  const platform = /Windows/i.test(ua)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(ua)
      ? "Mac"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(ua)
          ? "iOS"
          : "Device";

  return `${platform} ${browser}`.trim();
}

