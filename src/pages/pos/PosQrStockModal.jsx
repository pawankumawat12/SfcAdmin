import { useState, useEffect, useRef } from "react";
import {
  X,
  QrCode,
  Camera,
  CameraOff,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  Package,
  ShoppingBag,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAdjustProductStockMutation } from "../../services/productApi";
import toAssetUrl from "../../utils/assetUrl";

const SUPPORTED_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "code_93",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
  "data_matrix",
  "pdf417",
];

let detectorPromise = null;
let jsQrPromise = null;

const importRemoteModule = (url) => new Function("u", "return import(u)")(url);

async function getJsQrDecoder() {
  if (!jsQrPromise) {
    jsQrPromise = (async () => {
      const urls = [
        "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm",
        "https://esm.sh/jsqr@1.4.0",
      ];
      for (const url of urls) {
        try {
          const mod = await importRemoteModule(url);
          const fn = mod.default || mod;
          if (typeof fn === "function") return fn;
        } catch {
          // try next CDN
        }
      }
      return null;
    })();
  }
  return jsQrPromise;
}

async function getBarcodeDetectorInstance() {
  if (typeof window === "undefined") return null;

  if ("BarcodeDetector" in window) {
    try {
      const supported =
        typeof window.BarcodeDetector.getSupportedFormats === "function"
          ? await window.BarcodeDetector.getSupportedFormats()
          : [];
      if (Array.isArray(supported) && supported.length > 0) {
        const usableFormats = SUPPORTED_FORMATS.filter((f) => supported.includes(f));
        const nativeDetector = new window.BarcodeDetector(
          usableFormats.length > 0 ? { formats: usableFormats } : undefined
        );
        const testCanvas = document.createElement("canvas");
        testCanvas.width = 8;
        testCanvas.height = 8;
        await nativeDetector.detect(testCanvas);
        return nativeDetector;
      }
    } catch {
      // Fall through to ESM polyfill
    }
  }

  if (!detectorPromise) {
    const loadPolyfill = async () => {
      const urls = [
        "https://esm.sh/barcode-detector@2/ponyfill",
        "https://cdn.jsdelivr.net/npm/barcode-detector@2/+esm",
      ];
      for (const url of urls) {
        try {
          const mod = await importRemoteModule(url);
          const Polyfill =
            mod.BarcodeDetectorPolyfill || mod.BarcodeDetector || mod.default;
          if (Polyfill) {
            return new Polyfill({ formats: SUPPORTED_FORMATS });
          }
        } catch (err) {
          console.warn(`BarcodeDetector polyfill load attempt failed (${url}):`, err);
        }
      }
      return null;
    };
    detectorPromise = loadPolyfill();
  }

  return detectorPromise;
}

async function decodeFromVisualSource(source, width, height) {
  try {
    const detector = await getBarcodeDetectorInstance();
    if (detector) {
      const barcodes = await detector.detect(source);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return String(barcodes[0].rawValue).trim();
      }
    }
  } catch {
    // Fall through to canvas jsQR
  }

  try {
    const jsQR = await getJsQrDecoder();
    if (jsQR && width > 0 && height > 0) {
      const canvas = document.createElement("canvas");
      const targetW = Math.min(width, 640);
      const scale = targetW / width;
      const targetH = Math.max(1, Math.round(height * scale));
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(source, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const qrResult = jsQR(imageData.data, targetW, targetH, {
          inversionAttempts: "attemptBoth",
        });
        if (qrResult && qrResult.data) {
          return String(qrResult.data).trim();
        }
      }
    }
  } catch {
    // Ignore frame decode error
  }

  return null;
}

export function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Strict Scan-Only Live Camera + Hardware Scanner Component (No image upload, no manual typing)
 */
export function InlineCameraBarcodeScanner({
  onDetected,
  active = true,
  autoStartCamera = true,
}) {
  const videoRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [cameraActive, setCameraActive] = useState(Boolean(autoStartCamera));
  const [cameraError, setCameraError] = useState("");
  const lastDetectedRef = useRef({ code: "", time: 0 });

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!active) {
      setCameraActive(false);
    } else if (autoStartCamera) {
      setCameraActive(true);
    }
  }, [active, autoStartCamera]);

  // Also listen for hardware USB/Bluetooth 2D scanner rapid keystrokes when active
  useEffect(() => {
    if (!active) return;
    let buffer = "";
    let lastKeyTime = 0;

    const handleHardwareScanner = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 100) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          const code = buffer.trim();
          buffer = "";
          playScanBeep();
          if (onDetectedRef.current) {
            onDetectedRef.current(code);
          }
        }
        buffer = "";
        return;
      }

      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleHardwareScanner);
    return () => window.removeEventListener("keydown", handleHardwareScanner);
  }, [active]);

  useEffect(() => {
    if (!cameraActive) return;

    let stream = null;
    let rafId = null;
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError("");
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access is not supported in this browser.");
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        getBarcodeDetectorInstance().catch(() => {});
        getJsQrDecoder().catch(() => {});

        const scanFrame = async () => {
          if (isCancelled) return;
          const videoEl = videoRef.current;
          if (videoEl && videoEl.readyState >= 2 && !videoEl.paused) {
            const vw = videoEl.videoWidth || 640;
            const vh = videoEl.videoHeight || 480;
            const raw = await decodeFromVisualSource(videoEl, vw, vh);
            const now = Date.now();
            if (
              raw &&
              (raw !== lastDetectedRef.current.code ||
                now - lastDetectedRef.current.time > 1800)
            ) {
              lastDetectedRef.current = { code: raw, time: now };
              playScanBeep();
              if (onDetectedRef.current) {
                onDetectedRef.current(raw);
              }
            }
          }
          if (!isCancelled) {
            rafId = window.setTimeout(scanFrame, 200);
          }
        };

        scanFrame();
      } catch (err) {
        console.warn("Camera start error:", err);
        setCameraError(
          err?.message || "Unable to access camera. Please allow camera permission or use USB scanner."
        );
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (rafId) clearTimeout(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraActive]);

  return (
    <div className="border rounded-3 p-3 bg-light">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <div className="d-flex align-items-center gap-2">
          <ScanLine size={16} className="text-success" />
          <span className="fw-semibold small text-dark">
            Live QR / Barcode Scanner
          </span>
        </div>
        <button
          type="button"
          className={`btn btn-sm d-inline-flex align-items-center gap-1.5 ${
            cameraActive ? "btn-danger" : "btn-success"
          }`}
          style={{ fontSize: "12px" }}
          onClick={() => setCameraActive((prev) => !prev)}
        >
          {cameraActive ? (
            <>
              <CameraOff size={14} />
              <span>Stop Scanner</span>
            </>
          ) : (
            <>
              <Camera size={14} />
              <span>Start Scanner</span>
            </>
          )}
        </button>
      </div>

      {cameraError && (
        <div className="alert alert-warning py-2 px-3 mb-2 small d-flex align-items-center gap-2">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {cameraActive ? (
        <div
          className="position-relative rounded-3 overflow-hidden bg-dark mx-auto mt-2"
          style={{ maxWidth: "440px", height: "240px" }}
        >
          <video
            ref={videoRef}
            className="w-100 h-100 object-fit-cover"
            playsInline
            muted
          />
          <div
            className="position-absolute top-50 start-50 translate-middle border border-2 border-success rounded-3 pointer-events-none"
            style={{
              width: "72%",
              height: "62%",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.42)",
            }}
          />
          <div
            className="position-absolute bottom-0 start-0 end-0 text-center text-white py-1.5 small fw-medium"
            style={{ background: "rgba(0,0,0,0.65)", fontSize: "11.5px" }}
          >
            Hold product QR Code or Barcode inside the green frame
          </div>
        </div>
      ) : (
        <div className="text-center py-3 text-muted small">
          Click <strong>Start Scanner</strong> or scan directly using your USB/Wireless scanner.
        </div>
      )}
    </div>
  );
}

/**
 * Main POS Counter Scan & Minus Stock Popup Modal (Strictly Scan-Only)
 */
export function PosQrStockModal({
  isOpen,
  onClose,
  allProducts = [],
  initialScannedProduct = null,
  onStockUpdated,
  onAddToPosBill,
}) {
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [actionMode, setActionMode] = useState("minus"); // "minus" | "add"
  const [adjustProductStock, { isLoading: isAdjusting }] =
    useAdjustProductStockMutation();

  useEffect(() => {
    if (isOpen) {
      if (initialScannedProduct) {
        setMatchedProduct(initialScannedProduct);
        setQuantity(1);
        setActionMode("minus");
      } else {
        setMatchedProduct(null);
        setQuantity(1);
        setActionMode("minus");
      }
    }
  }, [isOpen, initialScannedProduct]);

  // Keep matchedProduct synced with fresh stock from allProducts
  useEffect(() => {
    if (matchedProduct) {
      const updated = (allProducts || []).find((p) => p.id === matchedProduct.id);
      if (updated) {
        setMatchedProduct(updated);
      }
    }
  }, [allProducts]);

  const findAndSelectProductByCode = (rawCode) => {
    const clean = String(rawCode || "").trim();
    if (!clean) return;

    const found = (allProducts || []).find(
      (p) =>
        p.barcode &&
        String(p.barcode).trim().toLowerCase() === clean.toLowerCase()
    );

    if (!found) {
      toast.error(`No product found for scanned QR / Barcode: "${clean}"`);
      return;
    }

    // If same product is scanned again while popup is already open, increment quantity!
    if (matchedProduct && matchedProduct.id === found.id) {
      const maxStock = Number(found.stock) || 0;
      const isMadeToOrder = found.availability_type === "MADE_TO_ORDER";
      setQuantity((prev) => {
        const next = (Number(prev) || 1) + 1;
        if (actionMode === "minus" && !isMadeToOrder && next > maxStock) {
          toast.error(`Only ${maxStock} units available in stock!`);
          return prev;
        }
        toast.success(`Scanned again: Quantity increased to ${next}`);
        return next;
      });
      return;
    }

    setMatchedProduct(found);
    setQuantity(1);
    setActionMode("minus");
    toast.success(`Scanned & Matched: "${found.name}"`);
  };

  if (!isOpen) return null;

  const handleConfirmStockUpdate = async () => {
    if (!matchedProduct) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Please select a valid quantity (minimum 1)");
      return;
    }

    const currentStock = Number(matchedProduct.stock) || 0;
    const isMadeToOrder = matchedProduct.availability_type === "MADE_TO_ORDER";

    if (actionMode === "minus" && !isMadeToOrder && qty > currentStock) {
      toast.error(
        `Cannot minus ${qty} units. Only ${currentStock} units available in stock!`
      );
      return;
    }

    try {
      const res = await adjustProductStock({
        id: matchedProduct.id,
        mode: actionMode,
        quantity: qty,
      }).unwrap();

      toast.success(
        res?.message ||
          `Stock ${actionMode === "minus" ? "deducted" : "added"} successfully!`
      );

      if (res?.data) {
        setMatchedProduct(res.data);
      }
      setQuantity(1);

      if (onStockUpdated) {
        await onStockUpdated();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update stock");
    }
  };

  const handleAddToBillClick = () => {
    if (!matchedProduct || !onAddToPosBill) return;
    const qty = Number(quantity) || 1;
    onAddToPosBill(matchedProduct, qty);
    onClose();
  };

  let productImg = "";
  if (matchedProduct?.images) {
    try {
      const parsed =
        typeof matchedProduct.images === "string"
          ? JSON.parse(matchedProduct.images)
          : matchedProduct.images;
      if (Array.isArray(parsed) && parsed.length > 0) productImg = parsed[0];
    } catch {
      productImg = matchedProduct.images;
    }
  }

  const currentStock = Number(matchedProduct?.stock) || 0;
  const qtyNum = Math.max(1, Number(quantity) || 1);
  const projectedStock =
    actionMode === "minus"
      ? Math.max(0, currentStock - qtyNum)
      : currentStock + qtyNum;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 1065,
        backgroundColor: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAdjusting) onClose();
      }}
    >
      <div
        className="card border shadow-lg rounded-4 overflow-hidden w-100 bg-white"
        style={{
          maxWidth: "560px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center"
              style={{
                width: "38px",
                height: "38px",
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold fs-6 text-dark">
                Scan Product QR / Barcode
              </h5>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Scan packet QR/Barcode to manage quantity &amp; minus stock
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon text-muted p-1 border-0"
            onClick={onClose}
            disabled={isAdjusting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
          {/* Live Camera & Hardware Scanner (Scan-Only) */}
          <div className="mb-3">
            <InlineCameraBarcodeScanner
              active={isOpen}
              autoStartCamera={!matchedProduct}
              onDetected={(code) => findAndSelectProductByCode(code)}
            />
          </div>

          {/* Matched Product Quantity & Stock Control Card */}
          {matchedProduct ? (
            <div
              className="border rounded-4 p-3.5 mt-3"
              style={{
                background: "#f8fafc",
                borderColor: "#cbd5e1",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span
                  className="badge rounded-pill px-2.5 py-1 fw-bold"
                  style={{
                    background: "#dcfce7",
                    color: "#166534",
                    fontSize: "11px",
                  }}
                >
                  ✓ Product Scanned &amp; Matched
                </span>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none p-0 text-secondary"
                  style={{ fontSize: "12px" }}
                  onClick={() => {
                    setMatchedProduct(null);
                    setQuantity(1);
                  }}
                >
                  Scan Another Item
                </button>
              </div>

              {/* Product Details Row */}
              <div className="d-flex align-items-center gap-3 bg-white p-3 rounded-3 border mb-3">
                <div
                  className="rounded-3 border bg-light d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                  style={{ width: "64px", height: "64px" }}
                >
                  {productImg ? (
                    <img
                      src={toAssetUrl(productImg)}
                      alt={matchedProduct.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                  ) : (
                    <Package size={26} className="text-muted opacity-50" />
                  )}
                </div>

                <div className="flex-grow-1 min-w-0">
                  <div className="fw-bold text-dark fs-6 text-truncate">
                    {matchedProduct.name}
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                    <span className="badge bg-light text-dark border">
                      Scanned Code: {matchedProduct.barcode || "N/A"}
                    </span>
                    <span className="fw-bold text-success">
                      ₹{Number(matchedProduct.price || 0).toFixed(2)}
                    </span>
                    {matchedProduct.category_name && (
                      <span className="text-muted small">
                        • {matchedProduct.category_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-end flex-shrink-0">
                  <div className="text-muted" style={{ fontSize: "11px" }}>
                    Current Stock
                  </div>
                  <div
                    className={`fw-bold fs-5 ${
                      currentStock <= 5 ? "text-danger" : "text-dark"
                    }`}
                  >
                    {currentStock}
                  </div>
                </div>
              </div>

              {/* Mode Switcher: Minus Stock vs Add Stock */}
              <div className="d-flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActionMode("minus")}
                  className={`btn btn-sm flex-fill fw-bold py-2 rounded-3 ${
                    actionMode === "minus"
                      ? "btn-danger text-white shadow-xs"
                      : "btn-outline-secondary bg-white"
                  }`}
                >
                  − Minus Stock (Out / Sale)
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode("add")}
                  className={`btn btn-sm flex-fill fw-bold py-2 rounded-3 ${
                    actionMode === "add"
                      ? "btn-success text-white shadow-xs"
                      : "btn-outline-secondary bg-white"
                  }`}
                >
                  + Add Stock (Restock In)
                </button>
              </div>

              {/* Quantity Selector */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="fw-bold text-dark small">
                      {actionMode === "minus"
                        ? "Quantity to Minus from Stock"
                        : "Quantity to Add to Stock"}
                    </div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Scan packet again or use + / − buttons to adjust quantity
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-0"
                      style={{ width: "36px", height: "36px", borderRadius: "10px" }}
                      onClick={() => setQuantity((q) => Math.max(1, (Number(q) || 1) - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={actionMode === "minus" ? Math.max(1, currentStock) : 99999}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setQuantity(Number.isNaN(val) ? "" : Math.max(1, val));
                      }}
                      className="form-control text-center fw-bold"
                      style={{ width: "78px", height: "36px", fontSize: "16px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-0"
                      style={{ width: "36px", height: "36px", borderRadius: "10px" }}
                      onClick={() =>
                        setQuantity((q) => {
                          const next = (Number(q) || 1) + 1;
                          if (
                            actionMode === "minus" &&
                            matchedProduct.availability_type !== "MADE_TO_ORDER" &&
                            next > currentStock
                          ) {
                            toast.error(`Only ${currentStock} units in stock`);
                            return q;
                          }
                          return next;
                        })
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Quick Quantity Pills */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-2 border-top">
                  <div className="d-flex align-items-center gap-1.5">
                    <span className="text-muted small me-1" style={{ fontSize: "11px" }}>
                      Quick Qty:
                    </span>
                    {[1, 2, 5, 10].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`btn btn-xs rounded-2 px-2.5 py-1 fw-semibold ${
                          Number(quantity) === preset
                            ? "btn-dark text-white"
                            : "btn-light border text-secondary"
                        }`}
                        style={{ fontSize: "11px" }}
                        onClick={() => setQuantity(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="small fw-semibold">
                    Stock After Update:{" "}
                    <span
                      className={
                        actionMode === "minus" ? "text-danger fw-bold" : "text-success fw-bold"
                      }
                    >
                      {currentStock} {actionMode === "minus" ? `− ${qtyNum}` : `+ ${qtyNum}`} ={" "}
                      {projectedStock} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isAdjusting || (actionMode === "minus" && currentStock <= 0)}
                  onClick={handleConfirmStockUpdate}
                  className={`btn flex-grow-1 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 ${
                    actionMode === "minus" ? "btn-danger" : "btn-success"
                  }`}
                >
                  {isAdjusting ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Updating Stock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      <span>
                        {actionMode === "minus"
                          ? `Minus ${qtyNum} from Stock Now`
                          : `Add ${qtyNum} to Stock Now`}
                      </span>
                    </>
                  )}
                </button>

                {onAddToPosBill && actionMode === "minus" && (
                  <button
                    type="button"
                    disabled={isAdjusting || currentStock <= 0}
                    onClick={handleAddToBillClick}
                    className="btn btn-outline-primary py-2.5 px-3 fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-3"
                  >
                    <ShoppingBag size={16} />
                    <span>Add to POS Bill ({qtyNum})</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-3 px-3 border rounded-3 bg-white text-muted small">
              Scan any product packet QR Code or Barcode using the camera above (or USB scanner) — the product popup will open automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PosQrStockModal;
