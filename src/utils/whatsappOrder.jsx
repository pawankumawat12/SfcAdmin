import React from "react";

export const WhatsAppIcon = ({ size = 13, style = {}, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", ...style }}
  >
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.776.82 2.791.82 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm3.385 8.156c-.144.405-.837.774-1.17.824-.312.045-.694.072-2.146-.53-1.859-.77-3.053-2.673-3.146-2.798-.092-.124-.753-1.002-.753-1.91 0-.909.477-1.355.646-1.536.17-.18.371-.225.495-.225.125 0 .25 0 .36.006.115.006.27-.044.423.323.158.38.54 1.318.587 1.413.047.095.078.207.016.332-.063.125-.094.204-.187.314-.093.11-.196.246-.28.33-.094.095-.192.198-.083.386.11.187.487.804 1.045 1.302.719.64 1.325.838 1.512.932.188.094.298.079.408-.047.11-.125.469-.546.594-.734.125-.187.25-.156.422-.093.172.062 1.094.516 1.282.609.188.094.313.141.359.219.047.078.047.453-.097.858z" />
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306C8.423 21.533 10.154 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.636 0-3.182-.477-4.498-1.3l-.322-.204-2.96.776.79-2.884-.216-.344A8.17 8.17 0 0 1 3.8 12c0-4.521 3.679-8.2 8.2-8.2 4.522 0 8.2 3.679 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z" />
  </svg>
);

export const getStoreWhatsAppNumber = (order) => {
  const raw = order.store_phone || order.store_owner_phone || "";
  let cleaned = String(raw).replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

export const buildWhatsAppOrderMessage = (order) => {
  const orderNum =
    order.orderNumber ||
    order.order_number ||
    (order.id ? `#SFC-${order.id}` : "Order");

  const storeName = order.store_name || "Assigned Branch";

  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-IN");

  const customerName = order.customer_name || order.customer || "Customer";
  const customerPhone = order.customer_phone || "-";

  let addressText = order.deliveryAddress || order.shipping_address || "";
  let lat = null;
  let lng = null;

  if (order.parsedAddress) {
    lat = order.parsedAddress.latitude;
    lng = order.parsedAddress.longitude;
  } else if (order.delivery_address_json) {
    try {
      const parsed =
        typeof order.delivery_address_json === "string"
          ? JSON.parse(order.delivery_address_json)
          : order.delivery_address_json;
      if (parsed) {
        lat = parsed.latitude;
        lng = parsed.longitude;
        if (!addressText) {
          addressText = `${parsed.house_number || ""} ${parsed.building_name || ""}, ${
            parsed.formatted_address || `${parsed.city || ""} ${parsed.pincode || ""}`
          }`.trim();
        }
      }
    } catch {}
  }

  if (!lat && order.shipping_lat) lat = order.shipping_lat;
  if (!lng && order.shipping_lng) lng = order.shipping_lng;

  let mapsLink = "";
  if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
    mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else if (addressText) {
    mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressText)}`;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText =
    items.length > 0
      ? items
          .map((it) => {
            const qty = it.quantity || 1;
            const name = it.product_name || it.name || it.product_title || "Item";
            const price = it.price != null ? ` (₹${Number(it.price) * qty})` : "";
            return `• ${qty}x ${name}${price}`;
          })
          .join("\n")
      : "• View items in dashboard";

  const total = Number(order.total_amount ?? order.total ?? 0).toLocaleString("en-IN");
  const paymentMethod = order.payment_method || "N/A";
  const paymentStatus = order.payment_status || "Pending";

  const origin = window.location.origin;
  const dashboardLink = `${origin}/orders?search=${encodeURIComponent(
    order.order_number || order.id || ""
  )}`;

  let msg = `🔔 *NEW ORDER FORWARDED* \n\n`;
  msg += `*Order:* ${orderNum}\n`;
  msg += `*Store:* ${storeName}\n`;
  msg += `*Date:* ${dateStr}\n\n`;

  msg += `👤 *Customer Details:*\n`;
  msg += `• *Name:* ${customerName}\n`;
  msg += `• *Phone:* ${customerPhone}\n`;
  if (addressText) {
    msg += `• *Address:* ${addressText}\n`;
  }

  if (mapsLink) {
    msg += `\n📍 *Customer Location (Google Maps):*\n${mapsLink}\n`;
  }

  msg += `\n📦 *Order Items:*\n${itemsText}\n\n`;
  msg += `💰 *Total Amount:* ₹${total}\n`;
  msg += `💳 *Payment:* ${paymentMethod} (${paymentStatus})\n`;

  if (order.notes && order.notes.trim()) {
    msg += `\n📝 *Customer Note:* ${order.notes.trim()}\n`;
  }

  msg += `\n🔗 *Open Order in Dashboard:*\n${dashboardLink}`;

  return msg;
};

export const openWhatsAppOrderShare = (order) => {
  const phone = getStoreWhatsAppNumber(order);
  const message = buildWhatsAppOrderMessage(order);
  const encodedText = encodeURIComponent(message);

  let url;
  if (phone) {
    url = `https://wa.me/${phone}?text=${encodedText}`;
  } else {
    url = `https://wa.me/?text=${encodedText}`;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

