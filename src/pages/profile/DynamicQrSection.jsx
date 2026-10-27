import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Button from '../../components/ui/Button';
import {
  useGetDynamicQrQuery,
  useUpdateDynamicQrMutation,
} from "../../services/settingsApi";
import { useThrottledCallback } from "../../utils/throttle";

export default function DynamicQrSection() {
  const user = useSelector((state) => state.auth?.user);
  const isStoreOwner = user?.role === "store_owner";

  const { data: qrResponse, isLoading } = useGetDynamicQrQuery();
  const [updateDynamicQr, { isLoading: isSaving }] =
    useUpdateDynamicQrMutation();

  const qrData = qrResponse?.data || {};

  const [destinationUrl, setDestinationUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urlError, setUrlError] = useState("");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  

  // Sync state when data loads
  useEffect(() => {
    if (qrResponse?.data) {
      setDestinationUrl(qrResponse.data.destination_url || "/");
      setBaseUrl(qrResponse.data.base_url || "");
      setTitle(qrResponse.data.title || "Store Dynamic QR");
      setDescription(qrResponse.data.description || "");
    }
  }, [qrResponse]);

  const computedScanUrl = (() => {
    const dest = (destinationUrl || "").trim();
    if (dest && /^https?:\/\//i.test(dest)) {
      return dest;
    }
    if (dest.startsWith("/")) {
      const base = (baseUrl || "").trim().replace(/\/+$/, "");
      return base ? `${base}${dest}` : dest;
    }
    return qrData.scan_url || dest || (typeof window !== "undefined" ? window.location.origin : "/");
  })();

  // Ensures QR Code always features the official "SFC" center brand badge
  const effectiveQrSvg = useMemo(() => {
    if (!qrData.qr_svg) return "";
    if (
      qrData.qr_svg.includes("sfc-center-badge") ||
      qrData.qr_svg.includes("sfc-brand-badge")
    ) {
      return qrData.qr_svg;
    }
    // Client-side fallback badge if backend SVG doesn't include it yet
    const badge = `
  <g id="sfc-center-badge">
    <rect x="37.5%" y="37.5%" width="25%" height="25%" rx="14%" fill="#ffffff" />
    <rect x="38.5%" y="38.5%" width="23%" height="23%" rx="12%" fill="#15803d" />
    <rect x="39.5%" y="39.5%" width="21%" height="21%" rx="10%" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.35" />
    <text x="50%" y="49.5%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.2">SFC</text>
    <text x="50%" y="56.5%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="5.5" font-weight="700" fill="#bbf7d0" text-anchor="middle" letter-spacing="0.5">BAKERS</text>
  </g></svg>`;
    return qrData.qr_svg.replace(/<\/svg>$/i, badge);
  }, [qrData.qr_svg]);



  const validateUrl = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed) {
      return "Destination URL is required";
    }
    const isRelative = trimmed.startsWith("/");
    const isAbsolute = /^https?:\/\//i.test(trimmed);
    if (!isRelative && !isAbsolute) {
      return "URL must start with http://, https://, or / (e.g. /products or https://sfcbakers.com)";
    }
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
      return "Invalid or unsupported protocol";
    }
    return "";
  };

  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestinationUrl(val);
    if (urlError) setUrlError("");
  };



  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const err = validateUrl(destinationUrl);
    if (err) {
      setUrlError(err);
      return;
    }

    try {
      setStatusMessage({ text: "", type: "" });
      const payload = {
        destination_url: destinationUrl.trim(),
        base_url: baseUrl.trim(),
        title: title.trim(),
        description: description.trim(),
      };

      await updateDynamicQr(payload).unwrap();
      setStatusMessage({
        text: "Store QR destination updated successfully! New QR code is ready.",
        type: "success",
      });
      toast.success("QR destination updated successfully!");
      setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to update QR settings";
      setStatusMessage({ text: msg, type: "error" });
    }
  };

  // Download QR Code as PNG (high resolution 1024x1024)
  const handleDownloadPng = () => {
    if (!effectiveQrSvg) {
      toast.error("QR Code image is not ready yet");
      return;
    }

    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    const svgBlob = new Blob([effectiveQrSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.download = `sfc-qr-${qrData.code || "store"}.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("High-resolution PNG with SFC badge downloaded!");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Failed to generate PNG");
    };

    img.src = url;
  };


  // Printable Standee Window
  const handlePrintStandee = () => {
    if (!effectiveQrSvg) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print standee.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SFC Bakery - Standee Print</title>
          <style>
            @page { size: A5 portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
              padding: 24px;
              color: #1e1e2d;
            }
            .standee-card {
              border: 3px solid #7cb324;
              border-radius: 24px;
              padding: 36px 24px;
              max-width: 420px;
              margin: 0 auto;
              box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            }
            .brand-badge {
              display: inline-block;
              background: #7cb324;
              color: #ffffff;
              padding: 6px 18px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 13px;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 { font-size: 26px; margin: 0 0 6px; color: #1e1e2d; }
            p { font-size: 14px; color: #6b7280; margin: 0 0 24px; }
            .qr-wrap {
              background: #ffffff;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              padding: 16px;
              display: inline-block;
              margin: 0 auto 20px;
            }
            .qr-wrap svg { width: 240px; height: 240px; display: block; }
            .scan-hint {
              font-size: 15px;
              font-weight: 700;
              color: #7cb324;
              margin: 0 0 4px;
            }
            .footer-text {
              font-size: 11px;
              color: #9ca3af;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="brand-badge">SFC Bakers</div>
            <h1>Scan & Browse Menu</h1>
            <p>Point your phone camera to view our live menu, deals & order online</p>
            <div class="qr-wrap">
              ${effectiveQrSvg}
            </div>
            <div class="scan-hint">Open Camera to Scan</div>
            <div class="footer-text">Powered by SFC Bakery</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const throttledSave = useThrottledCallback(handleSave, 1500);
  const throttledDownloadPng = useThrottledCallback(handleDownloadPng, 1500);
  const throttledPrintStandee = useThrottledCallback(handlePrintStandee, 1500);

  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #ececf3",
        padding: "24px",
        marginBottom: "28px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "1px solid #f0f0f5",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#f0fdf4",
              display: "grid",
              placeItems: "center",
              color: "#16a34a",
            }}
          >
            <QrCode size={22} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#24243b",
                }}
              >
                {isStoreOwner ? "Official Store QR Code" : "Store QR Code"}
              </h2>
              {isStoreOwner && (
                <span
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={12} /> Official Bakery QR
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: 0,
              }}
            >
              {isStoreOwner
                ? "Official dynamic QR code configured by Admin. Display or print this standee at your branch counter/tables for customer ordering & payments."
                : "Permanent QR code for your store. Print once for tables or stands."}
            </p>
          </div>
        </div>

       
      </div>

      {/* Status Alert Banner */}
      {statusMessage.text && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13.5px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: statusMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
            color: statusMessage.type === "error" ? "#dc2626" : "#16a34a",
            border: `1px solid ${statusMessage.type === "error" ? "#fecaca" : "#bbf7d0"
              }`,
          }}
        >
          <AlertCircle size={16} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "28px",
        }}
      >
        {/* Left Column: Permanent QR Code Display & Export Actions */}
        <div
          style={{
            background: "#fafafc",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #f0f0f5",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#6b7280",
              marginBottom: "12px",
              alignSelf: "flex-start",
            }}
          >
            QR Code
          </div>

          {/* QR Graphic Container */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
              marginBottom: "16px",
              maxWidth: "240px",
              width: "100%",
              aspectRatio: "1/1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <RefreshCw size={18} className="animate-spin" />
                Generating QR...
              </div>
            ) : effectiveQrSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: effectiveQrSvg }}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            ) : (
              <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                No QR available
              </div>
            )}
          </div>

          {/* SFC Branding label under QR */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              marginTop: "-6px",
              marginBottom: "14px",
            }}
          >
          </div>

        
          {/* Download & Print Buttons */}
          <div
            style={{
              width: "100%",
              display: "grid",
              marginBottom: "12px",
            }}
          >
            <button
              type="button"
              onClick={throttledDownloadPng}
              disabled={!effectiveQrSvg}
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "9px",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#374151",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={14} />
              PNG (Print)
            </button>
            
          </div>

          <button
            type="button"
            onClick={throttledPrintStandee}
            disabled={!effectiveQrSvg}
            style={{
              width: "100%",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "9px",
              padding: "9px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#15803d",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              marginBottom: "16px",
            }}
          >
            <Printer size={15} />
            Print Tabletop Standee (A5)
          </button>
        </div>

        {/* Right Column: Destination Information or Configuration */}
        <div>
          {isStoreOwner ? (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#0369a1",
                    marginBottom: "4px",
                  }}
                >
                  Store Branch QR Standee
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a" }}>
                  Customer Menu &amp; Ordering QR
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                  This official QR code is generated by Bakery Administration. When customers scan this code at your branch, they are instantly redirected to the online store.
                </p>
              </div>

              {/* Destination URL Display */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: "6px",
                  }}
                >
                  Current Scan Destination
                </div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#0284c7",
                    wordBreak: "break-all",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span>{destinationUrl || "/"}</span>
                  <a
                    href={destinationUrl.startsWith("/") ? destinationUrl : destinationUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "12px",
                      color: "#2563eb",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={13} /> Test Link
                  </a>
                </div>
              </div>

              {/* Branch Guidelines */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "12.5px",
                  color: "#334155",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0284c7",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    1
                  </span>
                  <span>
                    <strong>Print Tabletop Standees:</strong> Click the green button to print ready-to-use A5 acrylic standee cards for customer tables.
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0284c7",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    2
                  </span>
                  <span>
                    <strong>Download High-Res PNG:</strong> Download a high-definition image with official branding to use on billing counters or banner prints.
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0284c7",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    3
                  </span>
                  <span>
                    <strong>Order Routing:</strong> Orders placed through the branch QR will appear in your <em>Orders</em> section for live preparation.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={throttledSave}>
              {/* Destination URL */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  <span>Destination URL (Where customers are redirected) *</span>
                  <a
                    href={
                      destinationUrl.startsWith("/")
                        ? destinationUrl
                        : destinationUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "11.5px",
                      textTransform: "none",
                      letterSpacing: "normal",
                      color: "#2563eb",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 600,
                    }}
                  >
                    <Eye size={12} />
                    Test Destination
                  </a>
                </label>

                <input
                  type="text"
                  value={destinationUrl}
                  onChange={handleDestinationChange}
                  placeholder="e.g. /products or https://sfcbakers.com/offers"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${urlError ? "#ef4444" : "#d1d5db"}`,
                    fontSize: "14px",
                    color: "#111827",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                />
                {urlError && (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {urlError}
                  </div>
                )}
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "6px",
                    lineHeight: 1.4,
                  }}
                >
                  Changing this Destination URL will immediately redirect all scans from your permanent QR code.
                </p>
              </div>

              {/* Save Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "15px" }}>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{
                    padding: "10px 24px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
