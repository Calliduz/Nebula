export interface UserRegionInfo {
  code: string;
  name: string;
}

/**
 * Returns the standard English country name for a 2-letter ISO country code.
 */
export function getCountryName(code: string): string {
  if (!code) return "Philippines";
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const name = regionNames.of(code.toUpperCase());
    if (name) return name;
  } catch {
    // fallback if Intl.DisplayNames is unsupported
  }
  return code;
}

/**
 * Detects the user's country code and country name via IP geolocation APIs,
 * falling back to browser language/timezone, and defaulting to PH ("Philippines").
 * Results are cached in localStorage for 12 hours.
 */
export async function getUserRegionInfo(): Promise<UserRegionInfo> {
  const CACHE_KEY = "nebula_user_region_info";
  const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        parsed.code &&
        parsed.name &&
        parsed.timestamp &&
        Date.now() - parsed.timestamp < CACHE_TTL
      ) {
        return { code: parsed.code, name: parsed.name };
      }
    }
  } catch {
    // ignore localStorage errors
  }

  let code = "";
  let name = "";

  // 1. Try ipwho.is (fast, CORS-enabled, no key needed)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.country_code) {
        code = data.country_code.toUpperCase();
        name = data.country || getCountryName(code);
      }
    }
  } catch {
    // fallback
  }

  // 2. Try ipapi.co
  if (!code) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.country_code) {
          code = data.country_code.toUpperCase();
          name = data.country_name || getCountryName(code);
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Try ip-api.com
  if (!code) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        "http://ip-api.com/json/?fields=status,country,countryCode",
        {
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.countryCode) {
          code = data.countryCode.toUpperCase();
          name = data.country || getCountryName(code);
        }
      }
    } catch {
      // fallback
    }
  }

  // 4. Try browser language/locale tag
  if (!code) {
    const navLang =
      typeof navigator !== "undefined" ? navigator.language || "" : "";
    if (navLang.includes("-")) {
      const parts = navLang.split("-");
      if (parts[1] && parts[1].length === 2) {
        code = parts[1].toUpperCase();
      }
    }
  }

  // Default fallback to Philippines
  if (!code) {
    code = "PH";
  }

  name = getCountryName(code) || name || "Philippines";

  const result: UserRegionInfo = { code, name };

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...result, timestamp: Date.now() }),
    );
  } catch {
    // ignore
  }

  return result;
}
