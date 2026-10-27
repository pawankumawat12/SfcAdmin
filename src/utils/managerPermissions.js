// Central definition of all assignable Sidebar Tabs for Managers

export const SIDEBAR_PERMISSION_GROUPS = [
  {
    groupTitle: "Core Operations",
    items: [
      { key: "dashboard", label: "Dashboard", path: "/" },
      { key: "pos", label: "POS Counter", path: "/pos" },
    ],
  },
  {
    groupTitle: "Menu & Catalog",
    items: [
      { key: "products", label: "Products", path: "/products" },
      { key: "categories", label: "Categories", path: "/categories" },
    ],
  },
  {
    groupTitle: "Orders & Deals",
    items: [
      { key: "orders", label: "All Orders", path: "/orders" },
      { key: "offers", label: "Offers & Deals", path: "/offers" },
    ],
  },
  {
    groupTitle: "Branches & Owners",
    items: [
      { key: "stores", label: "Stores & Partners", path: "/stores" },
    ],
  },
  {
    groupTitle: "Raw Materials & BOM",
    items: [
      { key: "inventory_ingredients", label: "Raw Materials", path: "/inventory/ingredients" },
      { key: "inventory_recipes", label: "Product Recipes", path: "/inventory/recipes" },
      { key: "inventory_suppliers", label: "Suppliers & Vendors", path: "/inventory/suppliers" },
      { key: "inventory_logs", label: "Stock Movement Logs", path: "/inventory/logs" },
    ],
  },
  {
    groupTitle: "Storefront & Content",
    items: [
      { key: "hero_sliders", label: "Hero Sliders", path: "/hero-sliders" },
      { key: "why_choose_us", label: "Why Choose Us", path: "/why-choose-us" },
      { key: "testimonials", label: "Customer Love", path: "/testimonials" },
      { key: "reels", label: "Reels & Videos", path: "/reels" },
      { key: "cms_pages", label: "CMS Pages", path: "/cms-pages" },
    ],
  },
  {
    groupTitle: "Customers & CRM",
    items: [
      { key: "customers", label: "Customer Accounts", path: "/customers" },
      { key: "reviews", label: "Customer Reviews", path: "/reviews" },
      { key: "messages", label: "Contact Messages", path: "/messages" },
    ],
  },
  {
    groupTitle: "Email Management",
    items: [
      { key: "email_templates", label: "Email Templates", path: "/email-templates" },
      { key: "email_logs", label: "Email Logs", path: "/email-logs" },
    ],
  },
  {
    groupTitle: "System & Settings",
    items: [
      { key: "settings", label: "General Settings", path: "/settings" },
      { key: "favourites", label: "Favourites", path: "/favourites" },
    ],
  },
];

export const ALL_SIDEBAR_PERMISSION_ITEMS = SIDEBAR_PERMISSION_GROUPS.flatMap(
  (g) => g.items
);

export const PERMISSION_LABEL_MAP = ALL_SIDEBAR_PERMISSION_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = item.label;
    return acc;
  },
  {}
);

export function normalizePermissionsArray(permissions) {
  if (Array.isArray(permissions)) return permissions;
  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Returns the first allowed route path for a Manager based on their assigned permissions
 */
export function getFirstAllowedRouteForManager(permissions) {
  const perms = normalizePermissionsArray(permissions);
  for (const item of ALL_SIDEBAR_PERMISSION_ITEMS) {
    if (perms.includes(item.key)) {
      return item.path;
    }
  }
  return "/profile";
}

/**
 * Checks if a given pathname is allowed for a Manager with the specified permissions
 */
export function isRouteAllowedForManager(pathname, permissions) {
  const perms = normalizePermissionsArray(permissions);
  const cleanPath = (pathname || "/").split("?")[0];

  // Profile is always accessible to any logged-in manager
  if (cleanPath === "/profile" || cleanPath.startsWith("/profile/")) {
    return true;
  }

  // Managers page is strictly Super Admin only
  if (cleanPath === "/managers" || cleanPath.startsWith("/managers/")) {
    return false;
  }

  if (cleanPath === "/") {
    return perms.includes("dashboard");
  }
  if (cleanPath.startsWith("/pos")) return perms.includes("pos");
  if (cleanPath.startsWith("/products")) return perms.includes("products");
  if (cleanPath.startsWith("/categories")) return perms.includes("categories");
  if (cleanPath.startsWith("/orders")) return perms.includes("orders");
  if (cleanPath.startsWith("/offers")) return perms.includes("offers");
  if (cleanPath.startsWith("/stores")) return perms.includes("stores");
  if (cleanPath.startsWith("/inventory/ingredients")) return perms.includes("inventory_ingredients");
  if (cleanPath.startsWith("/inventory/recipes")) return perms.includes("inventory_recipes");
  if (cleanPath.startsWith("/inventory/suppliers")) return perms.includes("inventory_suppliers");
  if (cleanPath.startsWith("/inventory/logs")) return perms.includes("inventory_logs");
  if (cleanPath.startsWith("/hero-sliders")) return perms.includes("hero_sliders");
  if (cleanPath.startsWith("/why-choose-us")) return perms.includes("why_choose_us");
  if (cleanPath.startsWith("/testimonials")) return perms.includes("testimonials");
  if (cleanPath.startsWith("/reels")) return perms.includes("reels");
  if (cleanPath.startsWith("/cms-pages")) return perms.includes("cms_pages");
  if (cleanPath.startsWith("/customers")) return perms.includes("customers");
  if (cleanPath.startsWith("/reviews")) return perms.includes("reviews");
  if (cleanPath.startsWith("/messages")) return perms.includes("messages");
  if (cleanPath.startsWith("/email-templates")) return perms.includes("email_templates");
  if (cleanPath.startsWith("/email-logs")) return perms.includes("email_logs");
  if (cleanPath.startsWith("/settings")) return perms.includes("settings");
  if (cleanPath.startsWith("/favourites")) return perms.includes("favourites");

  return false;
}

