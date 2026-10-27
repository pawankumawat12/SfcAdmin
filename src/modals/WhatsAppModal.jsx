import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Send,
  Smartphone,
  Info,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Button from "../components/ui/Button";
import { WhatsAppIcon } from "../utils/whatsappOrder";
import {
  useGetWhatsAppStatusQuery,
  useDisconnectWhatsAppMutation,
  useReconnectWhatsAppMutation,
  useSendTestWhatsAppMutation,
} from "../services/whatsappApi";
import { getAdminSocket } from "../services/socket";

export default function WhatsAppModal({ isOpen, onClose }) {
  const { data: statusData, isLoading, refetch } = useGetWhatsAppStatusQuery(undefined, {
    skip: !isOpen,
    pollingInterval: 10000,
  });

  const [disconnectWhatsApp, { isLoading: isDisconnecting }] = useDisconnectWhatsAppMutation();
  const [reconnectWhatsApp, { isLoading: isReconnecting }] = useReconnectWhatsAppMutation();
  const [sendTestWhatsApp, { isLoading: isSendingTest }] = useSendTestWhatsAppMutation();

  const [liveStatus, setLiveStatus] = useState(null);
  const [testPhone, setTestPhone] = useState("");
  const [showTestForm, setShowTestForm] = useState(false);

  // Sync state from query
  useEffect(() => {
    if (statusData?.data) {
      setLiveStatus(statusData.data);
    }
  }, [statusData]);

  // Real-time socket updates for QR and connection
  useEffect(() => {
    if (!isOpen) return;
    const socket = getAdminSocket();
    if (!socket) return;

    const handleSocketStatus = (payload) => {
      setLiveStatus((prev) => ({ ...prev, ...payload }));
      refetch();
    };

    socket.on("whatsapp:status", handleSocketStatus);

    return () => {
      socket.off("whatsapp:status", handleSocketStatus);
    };
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  const status = liveStatus || statusData?.data || {};
  const isConnected = Boolean(status.isConnected);
  const qrCode = status.qrCode;
  const phoneNumber = status.user?.id ? status.user.id.split(":")[0] : null;

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect this WhatsApp account? Automated order messages will stop until re-linked.")) {
      return;
    }
    try {
      await disconnectWhatsApp().unwrap();
      toast.success("WhatsApp account disconnected successfully.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to disconnect WhatsApp.");
    }
  };

  const handleReconnect = async () => {
    try {
      await reconnectWhatsApp().unwrap();
      toast.success("WhatsApp client reconnected. Generating fresh QR...");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to reconnect WhatsApp.");
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    try {
      await sendTestWhatsApp({
        phone: testPhone.trim(),
        message: "🔔 *SFC Bakery WhatsApp Automated Order Alert Test*\n\nYour automated WhatsApp order notification system is active, connected, and operating smoothly! 🎉",
      }).unwrap();
      toast.success(`Test message sent successfully to ${testPhone}!`);
      setShowTestForm(false);
      setTestPhone("");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to send test message. Check WhatsApp connection.");
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target.classList.contains("modal-dialog")) {
          onClose();
        }
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: "560px" }}
      >
        <div
          className="modal-content border-0 rounded-4 shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="modal-header px-4 py-3 border-0 text-white"
            style={{
              background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
            }}
          >
            <div className="d-flex align-items-center gap-2.5">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WhatsAppIcon size={20} />
              </div>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: "16px" }}>
                  WhatsApp Order Alerts
                </h5>
                <p className="mb-0 text-white-50" style={{ fontSize: "11.5px" }}>
                  Automated instant WhatsApp notifications for every new order
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-link text-white text-decoration-none p-1"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ backgroundColor: "#f8fafc" }}>
            {isLoading && !liveStatus ? (
              <div className="py-5 text-center">
                <RefreshCw size={28} className="spinner-border text-success" />
                <p className="mt-3 text-muted small fw-semibold">Checking WhatsApp connection status...</p>
              </div>
            ) : isConnected ? (
              /* CONNECTED STATE */
              <div className="space-y-4">
                <div
                  className="p-4 rounded-3 border bg-white shadow-xs text-center"
                  style={{ borderColor: "#bbf7d0" }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.15)",
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>

                  <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "16px" }}>
                    WhatsApp Connected & Active!
                  </h6>
                  <p className="text-muted small mb-3">
                    Your account is securely linked. All incoming customer orders will be automatically sent to the appropriate Store Owner or Admin WhatsApp number.
                  </p>

                  {phoneNumber && (
                    <div
                      className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3"
                      style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12.5px", fontWeight: 700 }}
                    >
                      <Smartphone size={14} />
                      <span>Linked Phone: +{phoneNumber}</span>
                    </div>
                  )}

                  <div className="d-flex justify-content-center gap-2 flex-wrap mt-2">
                    <button
                      type="button"
                      onClick={() => setShowTestForm(!showTestForm)}
                      className="btn btn-sm btn-outline-success fw-bold px-3 py-2 d-inline-flex align-items-center gap-1.5 rounded-3"
                    >
                      <Send size={14} />
                      <span>{showTestForm ? "Hide Test Box" : "Send Test Alert"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDisconnecting}
                      onClick={handleDisconnect}
                      className="btn btn-sm btn-outline-danger fw-bold px-3 py-2 d-inline-flex align-items-center gap-1.5 rounded-3"
                    >
                      <LogOut size={14} />
                      <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
                    </button>
                  </div>

                  {/* Test Message Form */}
                  {showTestForm && (
                    <form onSubmit={handleSendTest} className="mt-4 pt-3 border-top text-start">
                      <label className="form-label small fw-bold text-dark mb-1">
                        Send a Test WhatsApp Alert:
                      </label>
                      <div className="input-group">
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          disabled={isSendingTest}
                          className="btn btn-sm btn-success fw-bold px-3"
                        >
                          {isSendingTest ? "Sending..." : "Send Test"}
                        </button>
                      </div>
                      <small className="text-muted" style={{ fontSize: "11px" }}>
                        Enter the phone number where you want to receive the sample order notification.
                      </small>
                    </form>
                  )}
                </div>

                {/* Dispatch Routing Info Card */}
                <div
                  className="p-3 rounded-3 border"
                  style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
                >
                  <div className="d-flex gap-2">
                    <Info size={16} className="text-primary shrink-0 mt-0.5" />
                    <div style={{ fontSize: "12px", color: "#1e40af", lineHeight: "1.5" }}>
                      <span className="fw-bold">Automatic Dispatch Routing: </span>
                      If the order's branch has <b>Dispatch Permission enabled</b>, the WhatsApp message goes straight to the <b>Store Owner's phone</b>. Otherwise, it is delivered to the <b>Admin's phone</b>.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* QR CODE SCAN STATE */
              <div className="text-center">
                <div
                  className="p-4 rounded-3 border bg-white shadow-xs mb-3"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <h6 className="fw-bold text-dark mb-1">Link WhatsApp for Instant Alerts</h6>
                  <p className="text-muted small mb-3">
                    Scan this QR code from your WhatsApp mobile app to enable 24x7 automated order messages.
                  </p>

                  <div className="d-flex justify-content-center my-3">
                    {qrCode ? (
                      <div
                        className="p-2 bg-white rounded-3 border shadow-xs"
                        style={{ display: "inline-block" }}
                      >
                        <img
                          src={qrCode}
                          alt="WhatsApp Link QR Code"
                          style={{
                            width: "230px",
                            height: "230px",
                            display: "block",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center rounded-3 border"
                        style={{
                          width: "230px",
                          height: "230px",
                          backgroundColor: "#f8fafc",
                          borderColor: "#e2e8f0",
                        }}
                      >
                        <RefreshCw size={24} className="spinner-border text-success mb-2" />
                        <span className="small text-muted fw-semibold">Generating QR Code...</span>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      disabled={isReconnecting}
                      onClick={handleReconnect}
                      className="btn btn-sm btn-outline-secondary fw-semibold px-3 py-1.5 d-inline-flex align-items-center gap-1.5 rounded-3"
                      style={{ fontSize: "12px" }}
                    >
                      <RefreshCw size={13} className={isReconnecting ? "spinner-border" : ""} />
                      <span>{isReconnecting ? "Refreshing..." : "Refresh QR Code"}</span>
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div
                  className="p-3 rounded-3 border text-start bg-white shadow-xs"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <div className="small fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                    <ShieldCheck size={16} className="text-success" />
                    <span>How to link in 15 seconds:</span>
                  </div>
                  <ol className="small text-muted mb-0 ps-3 space-y-1" style={{ fontSize: "12px", lineHeight: "1.6" }}>
                    <li>Open <b>WhatsApp</b> on your phone.</li>
                    <li>Tap <b>Menu (⋮)</b> on Android or <b>Settings</b> on iPhone.</li>
                    <li>Select <b>Linked Devices</b>, then tap <b>Link a Device</b>.</li>
                    <li>Point your phone camera at the QR code above.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer px-4 py-2.5 bg-white border-top justify-content-between">
            <span className="text-muted" style={{ fontSize: "11px" }}>
              {isConnected ? "🟢 Status: Active & Connected" : "🟡 Status: Waiting for QR Scan"}
            </span>

            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

