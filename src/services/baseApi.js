import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { signOut, setUser } from "../context/authSlice";
import { updateAdminSocketToken, disconnectAdminSocket } from "./socket";

let activeRefreshPromise = null;
let lastRefreshFailedAt = 0;
const NO_STORE_LINKED_MESSAGE = "No store linked to your account.";

function logoutStoreOwnerWithoutStore(api) {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }

  disconnectAdminSocket();
  api.dispatch(signOut());
  api.dispatch(baseApi.util.resetApiState());

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

const getNormalizedBaseUrl = () => {
  const envUrl = (
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
  ).trim();
  if (!envUrl) return "/api/v1";
  const clean = envUrl.replace(/\/+$/, "");
  return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getNormalizedBaseUrl(),
  credentials: "include",
  prepareHeaders: (headers, { getState, arg }) => {
    const url = typeof arg === "string" ? arg : arg?.url;
    const isRefresh =
      url === "/auth/refresh-token" || url?.includes("refresh-token");
    const accessToken =
      getState()?.auth?.accessToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null);

    // Never attach Authorization header on refresh token requests
    // to prevent backend fallback from verifying expired access token as refresh token
    if (accessToken && !isRefresh) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  },
});

const executeRefreshToken = async (api, extraOptions) => {
  // If refresh failed within the last 5 seconds, do not retry
  if (Date.now() - lastRefreshFailedAt < 5000) {
    return {
      success: false,
      error: { status: 401, data: { message: "Session expired" } },
    };
  }

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshResult = await rawBaseQuery(
        {
          url: "/auth/refresh-token",
          method: "POST",
        },
        api,
        extraOptions
      );

      const newAccessToken =
        refreshResult.data?.accessToken || refreshResult.data?.token;

      if (!refreshResult.error && newAccessToken) {
        lastRefreshFailedAt = 0;
        updateAdminSocketToken(newAccessToken);

        api.dispatch(
          setUser({
            ...(refreshResult.data?.user || {}),
            accessToken: newAccessToken,
          })
        );

        return { success: true, accessToken: newAccessToken };
      }

      // Refresh failed: Refresh token is missing, expired, or invalid
      lastRefreshFailedAt = Date.now();
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      disconnectAdminSocket();
      api.dispatch(signOut());

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return { success: false, error: refreshResult.error };
    } catch (err) {
      lastRefreshFailedAt = Date.now();
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
      disconnectAdminSocket();
      api.dispatch(signOut());

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return { success: false, error: err };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  // If a refresh is already in-flight, await it so new requests use the fresh token
  if (activeRefreshPromise) {
    await activeRefreshPromise;
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  const currentUser = api.getState()?.auth?.user;
  const isStoreOwnerWithoutStore =
    currentUser?.role === "store_owner" &&
    result.error?.data?.message === NO_STORE_LINKED_MESSAGE;

  // A Store Owner can no longer use the portal once the linked store has
  // disappeared. End the local session immediately instead of leaving the
  // user on a broken dashboard.
  if (isStoreOwnerWithoutStore) {
    logoutStoreOwnerWithoutStore(api);
    return result;
  }

  const url = typeof args === "string" ? args : args?.url;
  const isRefreshRequest =
    url === "/auth/refresh-token" || url?.includes("refresh-token");
  const isAuthEndpoint =
    isRefreshRequest ||
    url === "/auth/logout" ||
    url === "/auth/login" ||
    url === "/auth/admin-login" ||
    url === "/auth/verify-otp";

  const isOnAuthPage =
    typeof window !== "undefined" &&
    (window.location.pathname === "/login" ||
      window.location.pathname === "/forgot-password" ||
      window.location.pathname === "/reset-password");

  const hasToken = Boolean(
    api.getState()?.auth?.accessToken ||
      (typeof window !== "undefined" && localStorage.getItem("accessToken"))
  );

  // If on auth/login page or endpoint, or has no token, never attempt refresh on 401
  if (
    result.error?.status === 401 &&
    !isAuthEndpoint &&
    !isOnAuthPage &&
    hasToken
  ) {
    const refreshOutcome = await executeRefreshToken(api, extraOptions);

    if (refreshOutcome?.success) {
      // Retry the original query with the new access token
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // Refresh failed and redirecting to login; sanitize error message so no toast/span shows "Access token not found"
      if (result.error?.data && typeof result.error.data === "object") {
        result.error.data.message = "Session expired. Redirecting to login...";
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Product",
    "Category",
    "Settings",
    "Order",
    "Chat",
    "Offers",
    "Contact",
    "Notification",
    "Dashboard",
    "EmailLogs",
    "EmailTemplates",
    "HeroSliders",
    "WhyChooseUs",
    "Testimonials",
    "Favourites",
    "CmsPages",
    "Suppliers",
    "Ingredients",
    "Recipes",
    "InventoryLogs",
    "Stores",
    "StoreRequests",
    "WhatsApp",
    "Reels",
  ],
  endpoints: () => ({}),
});
