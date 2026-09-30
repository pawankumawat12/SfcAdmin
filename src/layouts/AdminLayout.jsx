import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { signOut } from "../context/authSlice";
import { useLogoutMutation } from "../services/authApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Button from "../components/ui/Button";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Users,
  BadgePercent,
  Star,
  MessageSquare,
  Mail,
  FileText,
  Heart,
  Settings,
  UserRound,
  LogOut,
  Menu,
  X,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Boxes,
  UtensilsCrossed,
  Truck,
  History,
  Store,
  MapPin,
  Film,
} from "lucide-react";
import { baseApi } from "../services/baseApi";
import {
  useGetAdminNotificationsQuery,
  useGetAdminUnreadCountQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
} from "../services/notificationApi";
import {
  storeApi,
  useGetMyStoreQuery,
  useToggleStoreStatusMutation,
} from "../services/storeApi";
import { settingsApi } from "../services/settingsApi";
import { getAdminSocket, disconnectAdminSocket } from "../services/socket";
import { toAssetUrl } from "../utils/assetUrl";
import { useShopStatus } from "../utils/useShopStatus";
import WhatsAppModal from "../modals/WhatsAppModal";
import { WhatsAppIcon } from "../utils/whatsappOrder";
import { useGetWhatsAppStatusQuery } from "../services/whatsappApi";

const getNavigationItems = (role) => {
  if (role === "store_owner") {
    return [
      { type: "link", label: "Dashboard", to: "/", icon: LayoutDashboard },
      {
        type: "group",
        id: "catalog",
        label: "Store Catalog",
        icon: Package,
        children: [
          { label: "My Products", to: "/products", icon: Package },
        ],
      },
      // {
      //   type: "group",
      //   id: "inventory",
      //   label: "Raw Materials & BOM",
      //   icon: Boxes,
      //   children: [
      //     { label: "Raw Materials", to: "/inventory/ingredients", icon: Boxes },
      //     { label: "Product Recipes", to: "/inventory/recipes", icon: UtensilsCrossed },
      //     { label: "Suppliers & Vendors", to: "/inventory/suppliers", icon: Truck },
      //     { label: "Stock Movement Logs", to: "/inventory/logs", icon: History },
      //   ],
      // },
      {
        type: "group",
        id: "sales",
        label: "Store Orders",
        icon: ShoppingBag,
        children: [
          { label: "All Orders", to: "/orders", icon: ShoppingBag },
        ],
      },
      {
        type: "group",
        id: "store_mgmt",
        label: "Store Settings",
        icon: Store,
        children: [
          { label: "Store Location & Radius", to: "/store-location", icon: MapPin },
        ],
      },
      {
        type: "group",
        id: "system",
        label: "Account",
        icon: Settings,
        children: [
          { label: "My Profile", to: "/profile", icon: UserRound },
        ],
      },
    ];
  }

  // Administrator navigation
  return [
    { type: "link", label: "Dashboard", to: "/", icon: LayoutDashboard },
    
    {
      type: "group",
      id: "catalog",
      label: "Menu & Catalog",
      icon: Package,
      children: [
        { label: "Products", to: "/products", icon: Package },
        { label: "Categories", to: "/categories", icon: Tags },
      ],
    },
    {
      type: "group",
      id: "sales",
      label: "Orders & Deals",
      icon: ShoppingBag,
      children: [
        { label: "All Orders", to: "/orders", icon: ShoppingBag },
        { label: "Offers & Deals", to: "/offers", icon: BadgePercent },
      ],
    },
    {
      type: "group",
      id: "stores",
      label: "Branches & Owners",
      icon: Store,
      children: [
        { label: "Stores & Partners", to: "/stores", icon: Store },
      ],
    },
    {
      type: "group",
      id: "inventory",
      label: "Raw Materials & BOM",
      icon: Boxes,
      children: [
        { label: "Raw Materials", to: "/inventory/ingredients", icon: Boxes },
        { label: "Product Recipes", to: "/inventory/recipes", icon: UtensilsCrossed },
        { label: "Suppliers & Vendors", to: "/inventory/suppliers", icon: Truck },
        { label: "Stock Movement Logs", to: "/inventory/logs", icon: History },
      ],
    },
    {
      type: "group",
      id: "storefront",
      label: "Storefront & Content",
      icon: SlidersHorizontal,
      children: [
        { label: "Hero Sliders", to: "/hero-sliders", icon: SlidersHorizontal },
        { label: "Why Choose Us", to: "/why-choose-us", icon: Sparkles },
        { label: "Customer Love", to: "/testimonials", icon: Heart },
        { label: "Reels & Videos", to: "/reels", icon: Film },
        { label: "CMS Pages", to: "/cms-pages", icon: FileText },
      ],
    },
    {
      type: "group",
      id: "customers",
      label: "Customers & CRM",
      icon: Users,
      children: [
        { label: "Customer Accounts", to: "/customers", icon: Users },
        { label: "Customer Reviews", to: "/reviews", icon: Star },
        { label: "Contact Messages", to: "/messages", icon: MessageSquare },
      ],
    },
    {
      type: "group",
      id: "email",
      label: "Email Management",
      icon: Mail,
      children: [
        { label: "Email Templates", to: "/email-templates", icon: FileText },
        { label: "Email Logs", to: "/email-logs", icon: Mail },
      ],
    },
    {
      type: "group",
      id: "system",
      label: "System & Settings",
      icon: Settings,
      children: [
        { label: "General Settings", to: "/settings", icon: Settings },
        { label: "Admin Profile", to: "/profile", icon: UserRound },
        { label: "Favourites", to: "/favourites", icon: Heart },
      ],
    },
  ];
};

const getPageTitle = (pathname) => {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/stores")) return "Store Branches & Owners";
  if (pathname.startsWith("/products/create")) return "Add Product";
  if (pathname.startsWith("/products") && pathname.includes("/edit")) return "Edit Product";
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/categories/create")) return "Add Category";
  if (pathname.startsWith("/categories") && pathname.includes("/edit")) return "Edit Category";
  if (pathname.startsWith("/categories")) return "Categories";
  if (pathname.startsWith("/inventory/ingredients")) return "Raw Materials & Ingredients";
  if (pathname.startsWith("/inventory/recipes")) return "Product Recipes (BOM)";
  if (pathname.startsWith("/inventory/suppliers")) return "Suppliers & Vendors";
  if (pathname.startsWith("/inventory/logs")) return "Stock Movement Logs";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/offers")) return "Offers";
  if (pathname.startsWith("/reviews")) return "Reviews";
  if (pathname.startsWith("/messages")) return "Messages";
  if (pathname.startsWith("/hero-sliders")) return "Hero Sliders";
  if (pathname.startsWith("/why-choose-us")) return "Why Choose Us";
  if (pathname.startsWith("/testimonials")) return "Customer Love (Testimonials)";
  if (pathname.startsWith("/reels")) return "Reels & Video Slider";
  if (pathname.startsWith("/cms-pages/create")) return "Add CMS Page";
  if (pathname.startsWith("/cms-pages") && pathname.includes("/edit")) return "Edit CMS Page";
  if (pathname.startsWith("/cms-pages")) return "CMS Pages";
  if (pathname.startsWith("/email-logs")) return "Email Logs";
  if (pathname.startsWith("/email-templates/create")) return "Create Email Template";
  if (pathname.startsWith("/email-templates") && pathname.includes("/edit")) return "Edit Email Template";
  if (pathname.startsWith("/email-templates")) return "Email Templates";
  if (pathname.startsWith("/favourites")) return "Favourites";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Administration";
};

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const { isOpen: isShopOpen, toggleShopStatus } = useShopStatus();
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === "admin";
  const { data: whatsappStatusData } = useGetWhatsAppStatusQuery(undefined, {
    skip: !isAdmin,
    pollingInterval: 30000,
  });
  const isWhatsAppConnected = Boolean(whatsappStatusData?.data?.isConnected);
  const navigationItems = getNavigationItems(user?.role);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutRequest, { isLoading: isSigningOut }] = useLogoutMutation();
  const location = useLocation();

  const isChildActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  const isGroupActive = (children) => {
    return children.some((child) => isChildActive(child.to));
  };

  const activeParentId = navigationItems.find(
    (item) => item.type === "group" && isGroupActive(item.children)
  )?.id;
  const [openMenuId, setOpenMenuId] = useState(activeParentId || null);

  useEffect(() => {
    setOpenMenuId(activeParentId || null);
  }, [activeParentId, location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenMenuId((currentId) => (currentId === groupId ? null : groupId));
  };

  const title = getPageTitle(location.pathname);

  // Store Owner Branch State & Control
  const isStoreOwner = user?.role === "store_owner";
  const { data: myStoreData } = useGetMyStoreQuery(undefined, { skip: !isStoreOwner });
  const [toggleStoreStatus, { isLoading: isTogglingStore }] = useToggleStoreStatusMutation();
  const myStore = myStoreData?.store;

  const handleToggleMyStore = async () => {
    if (!myStore) return;
    const nextIsOpen = !myStore.is_open;
    try {
      await toggleStoreStatus({
        id: myStore.id,
        is_open: nextIsOpen,
      }).unwrap();
      toast(
        `Branch "${myStore.name}" is now ${nextIsOpen ? "OPEN" : "CLOSED"}.`,
        {
          icon: nextIsOpen ? "🟢" : "🔴",
          id: `branch-status-${myStore.id}`,
          duration: 4000,
        }
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update store status");
    }
  };

  // Notifications API & Mutations
  const { data: notifData, refetch: refetchNotifs } = useGetAdminNotificationsQuery({
    limit: 15,
  });
  const { data: unreadCountData, refetch: refetchUnreadCount } = useGetAdminUnreadCountQuery();

  const [markAsRead] = useMarkAdminNotificationReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAdminNotificationsReadMutation();

  const notifications = notifData?.data?.notifications || [];
  const unreadCount = unreadCountData?.data?.unreadCount ?? (notifData?.data?.unreadCount || 0);

  // Real-Time Socket.IO Notification Listener
  useEffect(() => {
    const socket = getAdminSocket();

    const handleSessionRevoked = (payload) => {
      if (payload?.reason !== "store_deleted") return;

      localStorage.removeItem("accessToken");
      disconnectAdminSocket();
      dispatch(signOut());
      dispatch(baseApi.util.resetApiState());
      toast.error(payload.message || "Your store access has been removed.");
      navigate("/login", { replace: true });
    };

    const handleNewNotification = (notif) => {
      console.log("[Socket.IO Admin] New notification received:", notif);
      refetchNotifs();
      refetchUnreadCount();
      toast.custom(
        (t) => (
          <div
            style={{
              background: "#1e293b",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              maxWidth: "360px",
            }}
            onClick={() => {
              toast.dismiss(t.id);
              if (notif.type === "chat_message" && notif.order_id) {
                navigate("/orders", { state: { openChatOrderId: notif.order_id } });
              } else if (notif.order_id) {
                navigate("/orders");
              } else if (notif.type === "contact_inquiry") {
                navigate("/messages");
              } else if (notif.type === "new_review") {
                navigate("/reviews");
              } else if (notif.type === "customer_unblock_request") {
                navigate("/customers");
              } else if (notif.type === "store_login_request") {
                navigate("/stores");
              }
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#4f7d16",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Bell size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "12px" }}>{notif.title}</div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {notif.message}
              </div>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    };

    const handleUnreadCount = () => {
      refetchUnreadCount();
    };

    const handleNewOrder = () => {
      refetchNotifs();
      refetchUnreadCount();
    };

    const handleBranchStatusChanged = (payload) => {
      console.log("[Socket.IO Admin] Branch status changed:", payload);
      dispatch(storeApi.util.invalidateTags(["Stores"]));
      if (payload?.store_name) {
        toast(
          `Branch "${payload.store_name}" is now ${payload.is_open ? "OPEN" : "CLOSED"}.`,
          {
            icon: payload.is_open ? "🟢" : "🔴",
            id: `branch-status-${payload.storeId || payload.id}`,
            duration: 4000,
          }
        );
      }
    };

    const handleStoreStatusChanged = (payload) => {
      console.log("[Socket.IO Admin] Main shop status changed:", payload);
      dispatch(settingsApi.util.invalidateTags(["Settings"]));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sfc_shop_status_change", {
            detail: { isOpen: Boolean(payload?.is_open) },
          })
        );
      }
      if (payload?.is_open) {
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
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread_count", handleUnreadCount);
    socket.on("new_order", handleNewOrder);
    socket.on("session:revoked", handleSessionRevoked);
    socket.on("branch_status_changed", handleBranchStatusChanged);
    socket.on("store_status_changed", handleStoreStatusChanged);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread_count", handleUnreadCount);
      socket.off("new_order", handleNewOrder);
      socket.off("session:revoked", handleSessionRevoked);
      socket.off("branch_status_changed", handleBranchStatusChanged);
      socket.off("store_status_changed", handleStoreStatusChanged);
    };
  }, [dispatch, navigate, refetchNotifs, refetchUnreadCount]);

  // Click outside to close notification panel & profile dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markAsRead(notif.id).unwrap();
      } catch {}
    }

    setNotificationsOpen(false);

    if (notif.type === "chat_message" && notif.order_id) {
      // Navigate to orders page and auto-open the chat modal for this order
      navigate("/orders", { state: { openChatOrderId: notif.order_id } });
    } else if (notif.order_id || notif.type === "order" || notif.type === "new_order") {
      navigate("/orders");
    } else if (notif.type === "contact_inquiry") {
      navigate("/messages");
    } else if (notif.type === "new_review") {
      navigate("/reviews");
    } else if (notif.type === "customer_unblock_request") {
      navigate("/customers");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const logout = async () => {
    try {
      setSignOutError("");
      await logoutRequest().unwrap();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      dispatch(signOut());
      dispatch(baseApi.util.resetApiState());
      setShowSignOut(false);
      setProfileOpen(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="app-shell">
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <img
              src="/images/logo.png"
              style={{ width: "36px", height: "36px", objectFit: "contain" }}
              alt="SFC Bakers"
            />
            <div className="sidebar-brand-text">
              <span className="brand-title">SFC Bakers</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="brand-badge">
                  {isStoreOwner ? "STORE OWNER" : "ADMIN PANEL"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="plain"
            type="button"
            className="close-nav"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            if (item.type === "link") {
                  const active = isChildActive(item.to);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      end={item.to === "/"}
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`sidebar-nav-link ${active ? "active" : ""}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
              }

              if (item.type === "group") {
                  const isExpanded = openMenuId === item.id;
                  const hasActiveChild = isGroupActive(item.children);
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="sidebar-group">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className={`sidebar-group-btn ${
                          hasActiveChild ? "has-active-child" : ""
                        }`}
                        aria-expanded={isExpanded}
                      >
                        <div className="group-content">
                          <Icon size={18} className="group-icon" />
                          <span>{item.label}</span>
                        </div>
                        <span
                          className={`group-arrow ${
                            isExpanded ? "rotated" : ""
                          }`}
                        >
                          <ChevronDown size={15} />
                        </span>
                      </button>

                      <div
                        className={`sidebar-submenu ${
                          isExpanded ? "expanded" : ""
                        }`}
                      >
                        {item.children.map((child) => {
                          const childActive = isChildActive(child.to);

                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={() => setOpen(false)}
                              className={`sidebar-sublink ${
                                childActive ? "active" : ""
                              }`}
                            >
                              <span className="sublink-dot" />
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
              }

              return null;
          })}
        </nav>

        
      </aside>

      <div className="main-area">
        <header className="topbar">
   
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-title-wrap">
            <p className="eyebrow">{isStoreOwner ? (myStore?.name || "STORE OWNER") : "ADMINISTRATION"}</p>
            <h2>{title}</h2>
          </div>
          <div className="top-actions">
            {/* Quick Shop Status Toggle in Topbar */}
            {isStoreOwner && myStore ? (
              <div
                className="topbar-shop-status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 10px 4px 12px",
                  borderRadius: "10px",
                  background: myStore.is_open ? "#f0fdf4" : "#fef2f2",
                  border: myStore.is_open ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: myStore.is_open ? "#15803d" : "#b91c1c",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: myStore.is_open ? "#22c55e" : "#ef4444",
                      boxShadow: myStore.is_open
                        ? "0 0 0 2px rgba(34,197,94,0.3)"
                        : "0 0 0 2px rgba(239,68,68,0.3)",
                    }}
                  />
                  <span className="shop-status-label">{myStore.is_open ? "Branch Open" : "Branch Closed"}</span>
                </span>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={myStore.is_open}
                  onClick={handleToggleMyStore}
                  disabled={isTogglingStore}
                  title={myStore.is_open ? "Click to set Store Closed" : "Click to set Store Open"}
                  style={{
                    position: "relative",
                    width: "38px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: myStore.is_open ? "#16a34a" : "#dc2626",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    transition: "background-color 0.2s ease",
                    outline: "none",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      transform: myStore.is_open ? "translateX(18px)" : "translateX(0px)",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "block",
                    }}
                  />
                </button>
              </div>
            ) : !isStoreOwner ? (
              <div
                className="topbar-shop-status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 10px 4px 12px",
                  borderRadius: "10px",
                  background: isShopOpen ? "#f0fdf4" : "#fef2f2",
                  border: isShopOpen ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isShopOpen ? "#15803d" : "#b91c1c",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: isShopOpen ? "#22c55e" : "#ef4444",
                      boxShadow: isShopOpen
                        ? "0 0 0 2px rgba(34,197,94,0.3)"
                        : "0 0 0 2px rgba(239,68,68,0.3)",
                    }}
                  />
                  <span className="shop-status-label">{isShopOpen ? "Shop Open" : "Shop Closed"}</span>
                </span>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isShopOpen}
                  onClick={toggleShopStatus}
                  title={isShopOpen ? "Click to set Shop Closed" : "Click to set Shop Open"}
                  style={{
                    position: "relative",
                    width: "38px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: isShopOpen ? "#16a34a" : "#dc2626",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    transition: "background-color 0.2s ease",
                    outline: "none",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      transform: isShopOpen ? "translateX(18px)" : "translateX(0px)",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "block",
                    }}
                  />
                </button>
              </div>
            ) : null}

            {/* WhatsApp Order Alerts Status Button (Admin only) */}
            {isAdmin && (
              <button
                type="button"
                className="topbar-whatsapp-btn"
                onClick={() => setWhatsappModalOpen(true)}
                title={isWhatsAppConnected ? "WhatsApp Alerts Connected & Active" : "Link WhatsApp for Instant Order Alerts"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "10px",
                  border: isWhatsAppConnected ? "1px solid #bbf7d0" : "1px solid #fef08a",
                  background: isWhatsAppConnected ? "#f0fdf4" : "#fffbeb",
                  color: isWhatsAppConnected ? "#15803d" : "#b45309",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
              >
                <WhatsAppIcon size={16} />
                <span className="d-none d-sm-inline">
                  {isWhatsAppConnected ? "WhatsApp Alerts" : "Link WhatsApp"}
                </span>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: isWhatsAppConnected ? "#22c55e" : "#eab308",
                    display: "inline-block",
                  }}
                />
              </button>
            )}

            {/* Notification Bell with Badge & Dropdown */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <Button
                variant="plain"
                type="button"
                className={`notif-btn ${notificationsOpen ? "active" : ""}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                title="Notifications"
                style={{
                  position: "relative",
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: notificationsOpen ? "#f4f8ec" : "#ffffff",
                  color: notificationsOpen ? "#4f7d16" : "#374151",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <>
                  <span
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 800,
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "9999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      border: "2px solid #ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                  </span>
                  
                  <span className="notif-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                  </>
                )}
              </Button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div
                  className="notification-dropdown"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "48px",
                    width: "360px",
                    maxWidth: "calc(100vw - 32px)",
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                    zIndex: 1100,
                    overflow: "hidden",
                  }}
                >
                  {/* Dropdown Header */}
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "9999px",
                          }}
                        >
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <Button
                        variant="text"
                        onClick={handleMarkAllRead}
                        disabled={isMarkingAll}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#4f7d16",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </Button>
                    )}
                  </div>

                  {/* Notification Items List */}
                  <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "36px 16px",
                          textAlign: "center",
                          color: "#9ca3af",
                          fontSize: "12.5px",
                        }}
                      >
                        <Bell size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>No notifications yet</p>
                        <p style={{ margin: "4px 0 0", fontSize: "11px" }}>
                          New orders, customer inquiries, and reviews will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #f8fafc",
                            background: notif.is_read ? "#ffffff" : "#fbfdf8",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                            display: "flex",
                            gap: "10px",
                            alignItems: "flex-start",
                          }}
                        >
                          {!notif.is_read && (
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "#4f7d16",
                                marginTop: "6px",
                                flexShrink: 0,
                              }}
                            />
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: notif.is_read ? 600 : 800,
                                fontSize: "12.5px",
                                color: "#1f2937",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {notif.title}
                            </div>
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "#6b7280",
                                marginTop: "2px",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {notif.message}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "10px",
                                color: "#9ca3af",
                                marginTop: "4px",
                              }}
                            >
                              <Clock size={10} />
                              <span>{new Date(notif.created_at).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="profile-wrap" ref={profileRef}>
              <div
                variant="plain"
                type="button"
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileOpen}
              >
                {user?.image ? (
                  <img
                    src={toAssetUrl(user.image)}
                    alt={user.name || "Admin"}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #e5e7eb",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span>{user?.name?.slice(0, 2).toUpperCase() || "AD"}</span>
                )}
                {/* <div>
                  <strong>{user?.name}</strong>
                  <small>{user?.role}</small>
            
                </div> */}
                <ChevronDown size={16} className="profile-chevron" />
              </div>

              {profileOpen && (
                <div className="profile-menu">
                  <div
                    variant="plain"
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <UserRound size={16} /> My profile
                  </div>
                  <div
                    variant="plain"
                    type="button"
                    onClick={() => {
                      setSignOutError("");
                      setProfileOpen(false);
                      setShowSignOut(true);
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {showSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message="Are you sure you want to sign out of the admin panel?"
          confirmLabel="Sign out"
          onConfirm={logout}
          onClose={() => setShowSignOut(false)}
          isLoading={isSigningOut}
          error={signOutError}
        />
      )}

      {whatsappModalOpen && (
        <WhatsAppModal
          isOpen={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
        />
      )}
    </div>
  );
}
