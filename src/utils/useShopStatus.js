import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  useGetStoreStatusQuery,
  useUpdateStoreStatusMutation,
} from "../services/settingsApi";
import { getAdminSocket } from "../services/socket";

const STORAGE_KEY = "sfc_admin_shop_status";
const EVENT_KEY = "sfc_shop_status_change";

export function getInitialShopStatus() {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return true;
    }
    return saved === "open";
  } catch {
    return true;
  }
}

export function useShopStatus() {
  const { data: statusResponse, isLoading, refetch } = useGetStoreStatusQuery();
  const [updateStoreStatusApi, { isLoading: isUpdating }] =
    useUpdateStoreStatusMutation();

  const [localOpen, setLocalOpen] = useState(getInitialShopStatus);

  // Derived state: Use backend value when loaded, otherwise use local state
  const isOpen =
    statusResponse?.data && statusResponse.data.is_open !== undefined
      ? Boolean(statusResponse.data.is_open)
      : localOpen;

  // Listen for real-time socket updates from backend
  useEffect(() => {
    let socket;
    try {
      socket = getAdminSocket();
    } catch {
      void 0;
      // Socket not ready yet
    }

    if (!socket) return;

    const handleSocketStatusChanged = (data) => {
      if (data && data.is_open !== undefined) {
        const nextVal = Boolean(data.is_open);
        setLocalOpen(nextVal);
        try {
          localStorage.setItem(STORAGE_KEY, nextVal ? "open" : "closed");
        } catch {
          void 0;
          // ignore storage error
        }
        refetch();
      }
    };

    const handleConnect = () => {
      refetch();
    };

    socket.on("store_status_changed", handleSocketStatusChanged);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("store_status_changed", handleSocketStatusChanged);
      socket.off("connect", handleConnect);
    };
  }, [refetch]);

  // Listen to custom event for same-tab updates & storage event for cross-tab updates
  useEffect(() => {
    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.isOpen === "boolean") {
        setLocalOpen(e.detail.isOpen);
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === STORAGE_KEY) {
        setLocalOpen(e.newValue === "open");
      }
    };

    window.addEventListener(EVENT_KEY, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_KEY, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setShopStatus = useCallback(
    async (nextState, showNotification = true) => {
      const nextValue =
        typeof nextState === "function" ? nextState(isOpen) : nextState;

      // Optimistic update
      setLocalOpen(nextValue);
      try {
        localStorage.setItem(STORAGE_KEY, nextValue ? "open" : "closed");
      } catch {
        void 0;
        // ignore storage error
      }

      window.dispatchEvent(
        new CustomEvent(EVENT_KEY, { detail: { isOpen: nextValue } })
      );

      if (showNotification) {
        if (nextValue) {
          toast.success("Main Bakery Shop is now OPEN.", {
            id: "main-shop-status-toast",
            duration: 3500,
          });
        } else {
          toast.error("Main Bakery Shop is now CLOSED.", {
            id: "main-shop-status-toast",
            duration: 3500,
          });
        }
      }

  
      try {
        await updateStoreStatusApi({ is_open: nextValue }).unwrap();
      } catch (err) {
        console.error("Failed to persist store status to backend:", err);
        toast.error("Failed to sync shop status with server database", {
          id: "shop-status-error",
        });
      }
    },
    [isOpen, updateStoreStatusApi]
  );

  const toggleShopStatus = useCallback(() => {
    setShopStatus((prev) => !prev, true);
  }, [setShopStatus]);

  return {
    isOpen,
    isLoading: isLoading || isUpdating,
    statusText: isOpen ? "Shop Open" : "Shop Closed",
    statusBadge: isOpen ? "Shop Open" : "Shop Closed",
    closedMessage: statusResponse?.data?.closed_message || "",
    setShopStatus,
    toggleShopStatus,
    refetch,
  };
}

export default useShopStatus;
