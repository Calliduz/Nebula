/**
 * Nebula Global Configuration
 * Centralized environment and domain management to make migrations effortless.
 */

const getApiBase = (): string => {
  // 1. Check for explicit environment variable (best practice)
  let rawApi = import.meta.env.VITE_API_BASE_URL;

  if (!rawApi) {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // 2. Local development fallback
    if (host === "localhost" || host === "127.0.0.1") {
      rawApi = "http://localhost:4000";
    }
    // 3. Known production fallback (Current Domain)
    else if (host === "nebulawatch.tech" || host === "www.nebulawatch.tech") {
      rawApi = "https://api.nebulawatch.tech";
    } else if (host === "nebula.clev.studio") {
      rawApi = "https://nebula-server-qbp6.onrender.com";
    }
    // 4. Dynamic fallback (assumes API is at the same origin /api)
    else {
      rawApi = `${window.location.origin}/api`;
    }
  }

  // Cleanup: ensure it doesn't end with /api or trailing slash
  return rawApi.replace(/\/api\/?$/, "").replace(/\/$/, "");
};

export const API_BASE_URL = getApiBase();

/**
 * Gets the base URL for the frontend.
 * Useful for sharing links or building absolute URLs.
 */
export const FRONTEND_URL = window.location.origin;

/**
 * Environment Flags
 */
export const IS_PROD = import.meta.env.PROD;
export const IS_DEV = import.meta.env.DEV;
