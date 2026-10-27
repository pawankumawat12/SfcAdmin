import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  X,
  Send,
  CheckCheck,
  Check,
  LoaderCircle,
  Phone,
  Video,
  Smile,
  Paperclip,
  Mic,
  Lock,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  useGetAdminOrderMessagesQuery,
  usePostAdminOrderMessageMutation,
  useMarkAdminOrderMessagesReadMutation,
} from "../../services/chatApi";
import { getAdminSocket } from "../../services/socket";
import { toAssetUrl } from "../../utils/assetUrl";
import { useThrottledCallback } from "../../utils/throttle";

// Full categorized WhatsApp Emojis
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋",
      "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
      "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
      "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐",
      "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧",
      "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓",
      "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "💀", "☠️", "💩",
    ],
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: [
      "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "❤️", "🧡", "💛", "💚", "💙",
      "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗",
      "💖", "💘", "💝", "🔥", "✨", "🎉", "🎊", "💯", "⭐", "🌟",
    ],
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      "🍕", "🍔", "🍟", "🌭", "🍿", "🧈", "🥞", "🧇", "🥓", "🥩",
      "🍗", "🍖", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘",
      "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪",
      "🍤", "🍙", "🍚", "🍘", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂",
      "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛",
      "☕️", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂",
    ],
  },
  {
    name: "Objects",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🪄", "🪅", "🏷", "🛎", "🔑",
      "🚪", "🛋", "🛏", "🛒", "🛍", "💳", "💵", "💸", "💰", "💎",
      "💡", "🔦", "⏰", "⏱", "💻", "📱", "📲", "☎️", "📦", "✉️",
      "📝", "✏️", "📎", "📌", "📍", "🔒", "🔓", "🛡", "🩺", "💊",
    ],
  },
];

export default function AdminOrderChatModal({ order, onClose }) {
  if (!order) return null;

  const user = useSelector((state) => state.auth.user);
  const currentUserId = user?.id ?? user?._id;

  const orderId = order.id;
  const orderNumber = order.order_number || `#SFC-${order.id}`;
  const customerName = order.customer_name || "Customer";

  const [inputText, setInputText] = useState("");
  const [liveMessages, setLiveMessages] = useState([]);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [previewLightboxImg, setPreviewLightboxImg] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const inputFieldRef = useRef(null);
  const isSendingRef = useRef(false);

  const {
    data: historyData,
    isLoading: isHistoryLoading,
  } = useGetAdminOrderMessagesQuery(orderId, {
    skip: !orderId,
  });

  const chatStatus =
    historyData?.chatStatus || order?.chatStatus || order?.chat_status;
  const isDelivered = order?.order_status === "delivered";
  const isExpired =
    chatStatus?.isExpired ||
    (isDelivered &&
      order?.delivered_at &&
      Date.now() > new Date(order.delivered_at).getTime() + 20 * 60 * 1000);

  const [postMessageMutation, { isLoading: isSending }] =
    usePostAdminOrderMessageMutation();
  const [markReadMutation] = useMarkAdminOrderMessagesReadMutation();

  useEffect(() => {
    if (historyData?.data) {
      setLiveMessages(historyData.data);
    }
  }, [historyData]);

  // Socket.IO live connection
  useEffect(() => {
    if (!orderId) return;

    const socket = getAdminSocket();

    socket.emit("join_order_room", { orderId });
    markReadMutation(orderId);

    const handleNewMessage = (payload) => {
      if (String(payload.orderId) === String(orderId)) {
        setLiveMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(payload.message.id))) return prev;
          return [...prev, payload.message];
        });

        if (payload.message.sender_role === "customer") {
          markReadMutation(orderId);
        }
      }
    };

    const handleMessagesRead = (payload) => {
      if (
        String(payload.orderId) === String(orderId) &&
        payload.readerRole === "customer"
      ) {
        setLiveMessages((prev) =>
          prev.map((m) =>
            m.sender_role === "admin" ? { ...m, is_read: true } : m
          )
        );
      }
    };

    const handleUserTyping = (payload) => {
      if (
        String(payload.orderId) === String(orderId) &&
        payload.senderRole === "customer"
      ) {
        setIsCustomerTyping(payload.isTyping);
      }
    };

    socket.on("new_chat_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.emit("leave_order_room", { orderId });
      socket.off("new_chat_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("user_typing", handleUserTyping);
    };
  }, [orderId, markReadMutation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, isCustomerTyping, filePreview]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    const socket = getAdminSocket();
    socket.emit("typing_start", {
      orderId,
      senderRole: "admin",
      senderName: "SFC Bakers",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        orderId,
        senderRole: "admin",
      });
    }, 1500);
  };

  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => prev + emoji);
    inputFieldRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size >10 * 1024 * 1024) {
      alert("File size cannot exceed 10 MB");
      return;
    }

    setSelectedFile(file);
    setShowAttachMenu(false);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    if (isExpired) return;
    const trimmed = inputText.trim();
    if (!trimmed && !selectedFile) return;
    if (isSending || isSendingRef.current) return;
    isSendingRef.current = true;

    const socket = getAdminSocket();
    socket.emit("typing_stop", {
      orderId,
      senderRole: "admin",
    });

    const fileToSend = selectedFile;
    const textToSend = trimmed;

    setInputText("");
    clearSelectedFile();
    setShowEmojiPicker(false);

    try {
      if (fileToSend) {
        const formData = new FormData();
        formData.append("orderId", String(orderId));
        formData.append("message", textToSend);
        formData.append("senderRole", "admin");
        formData.append("file", fileToSend);

        const res = await postMessageMutation(formData).unwrap();
        if (res.data) {
          setLiveMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(res.data.id))) return prev;
            return [...prev, res.data];
          });
        }
      } else {
        const res = await postMessageMutation({
          orderId,
          message: textToSend,
          senderRole: "admin",
        }).unwrap();

        if (res.data) {
          setLiveMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(res.data.id))) return prev;
            return [...prev, res.data];
          });
        }
      }
    } catch (err) {
      console.error("Failed to send admin chat message:", err);
      // Restore input text on error
      setInputText(textToSend);
      if (fileToSend) setSelectedFile(fileToSend);
      alert(err?.data?.message || "Failed to send message. Please try again.");
    } finally {
      isSendingRef.current = false;
    }
  };

  const throttledSendMessage = useThrottledCallback(handleSendMessage, 1000);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      throttledSendMessage();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "min(16px, 2vw)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "min(680px, calc(100dvh - 20px))",
          maxHeight: "calc(100dvh - 16px)",
          backgroundColor: "#efeae2",
          borderRadius: "24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #d1d7db",
          position: "relative",
          backgroundImage: `radial-gradient(#d1d7db 0.85px, transparent 0.85px), radial-gradient(#d1d7db 0.85px, #efeae2 0.85px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      >
        {/* WHATSAPP TOP APP BAR (HEADER) */}
        <div
          style={{
            backgroundColor: "#008069",
            padding: "10px 14px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            userSelect: "none",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* Customer Avatar */}
            <div
              style={{
                position: "relative",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#128c7e",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "14px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                flexShrink: 0,
              }}
            >
              <span>{customerName.substring(0, 2).toUpperCase()}</span>
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "10px",
                  height: "10px",
                  backgroundColor: "#25d366",
                  borderRadius: "50%",
                  border: "2px solid #008069",
                }}
              />
            </div>

            {/* Info */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "bold", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {customerName}
              </div>
              <div style={{ fontSize: "11.5px", color: "#c1eedb", lineHeight: 1.2, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isCustomerTyping ? (
                  <span style={{ fontWeight: 600, color: "#ffffff" }}>typing...</span>
                ) : (
                  <span>Order {orderNumber} • ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              style={{ background: "transparent", border: "none", color: "#ffffff", padding: "8px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Customer Phone"
              onClick={() => alert(`Customer Phone: ${order.customer_phone || "Not provided"}`)}
            >
              <Phone size={17} />
            </button>
            <button
              type="button"
              style={{ background: "transparent", border: "none", color: "#ffffff", padding: "8px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center" }}
              onClick={onClose}
              title="Close chat"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* ORDER INFO BAR */}
        <div
          style={{
            backgroundColor: "#f0f2f5",
            borderBottom: "1px solid rgba(209, 215, 219, 0.8)",
            padding: "6px 14px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          <div style={{ color: "#54656f" }}>
            Status: <b style={{ color: "#111b21" }}>{order.status}</b> • Payment:{" "}
            <b style={{ color: "#008069" }}>{order.payment_method}</b>
          </div>
          <span
            style={{
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "10px",
              fontWeight: 700,
              backgroundColor: order.payment_status === "Paid" ? "#d9fdd3" : "#fef3c7",
              color: order.payment_status === "Paid" ? "#008069" : "#92400e",
              border: order.payment_status === "Paid" ? "1px solid #c1f5b8" : "1px solid #fde68a",
            }}
          >
            {order.payment_status || "Pending"}
          </span>
        </div>

        {/* WHATSAPP MESSAGE STREAM */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
          onClick={() => {
            setShowEmojiPicker(false);
            setShowAttachMenu(false);
          }}
        >
          {/* Encryption Notice */}
          <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
            <div
              style={{
                backgroundColor: "#ffeecd",
                borderRadius: "7.5px",
                padding: "4px 12px",
                fontSize: "10px",
                color: "#54656f",
                boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
                maxWidth: "320px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Lock size={11} color="#856404" style={{ flexShrink: 0 }} />
              <span>Direct kitchen chat for #{orderNumber}. Messages are saved automatically.</span>
            </div>
          </div>

          {/* Chat Expired Notice */}
          {isExpired && (
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "11px",
                  color: "#991b1b",
                  maxWidth: "420px",
                  textAlign: "center",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(220, 38, 38, 0.1)",
                }}
              >
                <span>⚠️ Chat support for this order closed 20 minutes after delivery. New messages cannot be sent.</span>
              </div>
            </div>
          )}

          {/* Date pill */}
          <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
            <span
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "7.5px",
                padding: "3px 12px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#54656f",
                textTransform: "uppercase",
                boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
              }}
            >
              Today
            </span>
          </div>

          {isHistoryLoading ? (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", gap: "8px", color: "#6b7280", fontSize: "12px" }}>
              <LoaderCircle size={18} className="animate-spin" color="#008069" />
              <span>Loading messages...</span>
            </div>
          ) : liveMessages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center" }}>
              <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "16px", marginBottom: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                💬
              </div>
              <p style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: "#111827" }}>No messages yet</p>
              <p style={{ fontSize: "11px", margin: "4px 0 0 0" }}>Start a WhatsApp conversation with {customerName}.</p>
            </div>
          ) : (
            liveMessages.map((item) => {
              const currentUserId = user?.id ?? user?._id;
              const isAdminMsg =
                item.sender_role === "admin" ||
                (currentUserId != null &&
                  item.sender_id != null &&
                  String(item.sender_id) === String(currentUserId) &&
                  item.sender_role !== "customer");

              const isMe = isAdminMsg;
              const hasAttachment = Boolean(item.attachment_url);

              const timeStr = new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    margin: "2px 0",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      width: "fit-content",
                      marginLeft: isMe ? "auto" : "2px",
                      marginRight: isMe ? "2px" : "auto",
                      backgroundColor: isMe ? "#d9fdd3" : "#ffffff",
                      borderRadius: isMe
                        ? "7.5px 7.5px 0px 7.5px"
                        : "7.5px 7.5px 7.5px 0px",
                      boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
                      padding: hasAttachment
                        ? "4px 4px 4px 4px"
                        : "6px 8px 4px 9px",
                      position: "relative",
                    }}
                  >
                    {!isMe && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          color: "#7c3aed",
                          lineHeight: "1",
                          marginBottom: "3px",
                          paddingLeft: hasAttachment ? "4px" : "0",
                          paddingTop: hasAttachment ? "2px" : "0",
                          userSelect: "none",
                        }}
                      >
                        {item.sender_name || customerName}
                      </div>
                    )}

                    {/* ATTACHMENT RENDERING */}
                    {hasAttachment && (
                      <div style={{ marginBottom: "4px" }}>
                        {item.attachment_type === "image" ? (
                          /* Fixed-size Image Attachment */
                          <div
                            style={{
                              width: "240px",
                              maxHeight: "200px",
                              borderRadius: "6px",
                              overflow: "hidden",
                              backgroundColor: "#f5f5f4",
                              cursor: "pointer",
                              position: "relative",
                            }}
                            onClick={() =>
                              setPreviewLightboxImg(toAssetUrl(item.attachment_url))
                            }
                          >
                            <img
                              src={toAssetUrl(item.attachment_url)}
                              alt={item.attachment_name || "Image attachment"}
                              style={{ width: "100%", height: "100%", maxHeight: "200px", objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          /* Fixed-size Document Attachment Card */
                          <a
                            href={toAssetUrl(item.attachment_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={item.attachment_name || "document"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              backgroundColor: "rgba(249, 250, 251, 0.9)",
                              padding: "10px",
                              width: "240px",
                              textDecoration: "none",
                            }}
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {item.attachment_name || "Document"}
                              </p>
                              <p style={{ margin: 0, fontSize: "10px", color: "#6b7280" }}>
                                {item.attachment_size || "Document"}
                              </p>
                            </div>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: "#ffffff",
                                color: "#4b5563",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Download size={13} />
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Message Text & Inline Ticks */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        flexWrap: "wrap",
                        gap: "6px",
                        justifyContent: "space-between",
                        padding: hasAttachment ? "2px 4px 1px 4px" : "0",
                      }}
                    >
                      {item.message &&
                        (!hasAttachment ||
                          (item.message !== "Photo" &&
                            item.message !== "Document")) && (
                          <span
                            style={{
                              fontSize: "13.5px",
                              lineHeight: "19px",
                              color: "#111b21",
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              flex: "1 1 auto",
                              marginRight: "4px",
                            }}
                          >
                            {item.message}
                          </span>
                        )}

                      {/* WhatsApp inline bottom-right timestamp & ticks */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10.5px",
                          color: "#667781",
                          userSelect: "none",
                          marginLeft: "auto",
                          paddingBottom: "1px",
                        }}
                      >
                        <span>{timeStr}</span>
                        {isMe && (
                          <span
                            style={{ display: "inline-flex", alignItems: "center" }}
                            title={
                              item.is_read
                                ? "Read / Seen by customer"
                                : "Delivered / Sent"
                            }
                          >
                            {item.is_read ? (
                              <CheckCheck
                                size={15}
                                color="#53bdeb"
                              />
                            ) : (
                              <CheckCheck
                                size={15}
                                color="#8696a0"
                              />
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Customer Typing indicator */}
          {isCustomerTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start", margin: "2px 0" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "7.5px 7.5px 7.5px 0px",
                  padding: "7px 12px",
                  boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#54656f",
                }}
              >
                <span>{customerName} is typing</span>
                <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#7c3aed" }} className="animate-bounce" />
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#7c3aed", animationDelay: "0.2s" }} className="animate-bounce" />
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#7c3aed", animationDelay: "0.4s" }} className="animate-bounce" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* SELECTED FILE PREVIEW TRAY */}
        {selectedFile && (
          <div
            style={{
              backgroundColor: "#e9edef",
              padding: "8px 12px",
              borderTop: "1px solid #d1d7db",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", border: "1px solid #d1d7db" }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d7db",
                    color: "#4b5563",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={22} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold", color: "#111b21", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>
                  {selectedFile.name}
                </p>
                <p style={{ margin: 0, fontSize: "10px", color: "#54656f" }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to send
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#d1d5db",
                color: "#4b5563",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ATTACHMENT POPUP MENU (PHOTOS & DOCUMENTS) */}
        {showAttachMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "64px",
              left: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              zIndex: 50,
              width: "190px",
            }}
          >
            {/* Image / Photos option */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px",
                borderRadius: "12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#374151",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3e8ff")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f3e8ff",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={17} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#111827", fontWeight: "bold" }}>Photos & Media</p>
                <p style={{ margin: 0, fontSize: "9px", color: "#9ca3af" }}>JPG, PNG, WEBP</p>
              </div>
            </button>

            {/* Document option */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px",
                borderRadius: "12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#374151",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={17} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#111827", fontWeight: "bold" }}>Document</p>
                <p style={{ margin: 0, fontSize: "9px", color: "#9ca3af" }}>PDF, DOC, TXT</p>
              </div>
            </button>
          </div>
        )}

        {/* WHATSAPP EMOJI PICKER POPUP */}
        {showEmojiPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "64px",
              left: "12px",
              right: "12px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              zIndex: 50,
              maxHeight: "260px",
            }}
          >
            {/* Emoji Category Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f0f2f5",
                padding: "6px 8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setActiveEmojiCategory(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      fontSize: "16px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: activeEmojiCategory === idx ? "#ffffff" : "transparent",
                      boxShadow: activeEmojiCategory === idx ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    }}
                    title={cat.name}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#e5e7eb",
                  color: "#6b7280",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Emojis Grid */}
            <div
              style={{
                padding: "10px",
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "4px",
                maxHeight: "200px",
              }}
            >
              {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  style={{
                    height: "36px",
                    width: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    fontSize: "20px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HIDDEN FILE INPUTS */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg,image/gif"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* WHATSAPP INPUT BAR (BOTTOM) */}
        <div
          style={{
            backgroundColor: "#f0f2f5",
            padding: "8px 10px",
            borderTop: "1px solid #d1d7db",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Input Box Capsule */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "24px",
                backgroundColor: "#ffffff",
                padding: "8px 14px",
                border: "1px solid #e9edef",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <button
                type="button"
                disabled={isExpired}
                style={{
                  background: "transparent",
                  border: "none",
                  color: showEmojiPicker ? "#008069" : "#54656f",
                  cursor: "pointer",
                  cursor: isExpired ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  opacity: isExpired ? 0.4 : 1,
                }}
                onClick={() => {
                  if (!isExpired) {
                    setShowEmojiPicker((prev) => !prev);
                    setShowAttachMenu(false);
                  }
                }}
                title={isExpired ? "Chat closed" : "Choose Emoji"}
              >
                <Smile size={21} />
              </button>

              <input
                ref={inputFieldRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isExpired
                    ? "Chat closed (20m after delivery)"
                    : selectedFile
                    ? `Add caption for ${selectedFile.name}...`
                    : "Type a message"
                }
                disabled={isSending || isExpired}
                style={{
                  flex: 1,
                  backgroundColor: "transparent",
                  fontSize: "14px",
                  color: isExpired ? "#9ca3af" : "#111b21",
                  border: "none",
                  outline: "none",
                  cursor: isExpired ? "not-allowed" : "text",
                }}
              />

              <button
                type="button"
                disabled={isExpired}
                onClick={() => {
                  if (!isExpired) {
                    setShowAttachMenu((prev) => !prev);
                    setShowEmojiPicker(false);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: showAttachMenu ? "#008069" : "#54656f",
                  cursor: isExpired ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  opacity: isExpired ? 0.4 : 1,
                }}
                title={isExpired ? "Chat closed" : "Attach photo or document"}
              >
                <Paperclip size={19} />
              </button>
            </div>

            {/* WhatsApp Send / Mic Circular Button */}
            <button
              type="button"
              onClick={throttledSendMessage}
              disabled={isSending || isExpired}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: isExpired ? "#9ca3af" : "#008069",
                color: "#ffffff",
                border: "none",
                cursor: isExpired ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                flexShrink: 0,
                opacity: isSending || isExpired ? 0.6 : 1,
              }}
              title={isExpired ? "Chat closed 20 minutes after delivery" : "Send message"}
              aria-label={
                isExpired
                  ? "Chat expired"
                  : inputText.trim() || selectedFile
                  ? "Send message"
                  : "Voice message"
              }
            >
              {isSending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : inputText.trim() || selectedFile ? (
                <Send size={16} style={{ transform: "translateX(1px)" }} />
              ) : isExpired ? (
                <Send size={16} style={{ transform: "translateX(1px)" }} />
              ) : (
                <Mic size={18} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX PREVIEW */}
      {previewLightboxImg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setPreviewLightboxImg(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "800px",
              maxHeight: "85vh",
              overflow: "hidden",
              borderRadius: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewLightboxImg}
              alt="Full Preview"
              style={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain", borderRadius: "16px" }}
            />
            <button
              type="button"
              onClick={() => setPreviewLightboxImg(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
