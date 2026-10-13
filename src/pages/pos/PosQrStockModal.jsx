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
  Trash2,
  Receipt,
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
          style={{ maxWidth: "440px", height: "195px" }}
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
              height: "64%",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.42)",
            }}
          />
          <div
            className="position-absolute bottom-0 start-0 end-0 text-center text-white py-1 small fw-medium"
            style={{ background: "rgba(0,0,0,0.65)", fontSize: "11px" }}
          >
            Hold product QR Code or Barcode inside the green frame (Multi-Scan Ready)
          </div>
        </div>
      ) : (
        <div className="text-center py-2.5 text-muted small">
          Click <strong>Start Scanner</strong> or scan directly using your USB/Wireless scanner.
        </div>
      )}
    </div>
  );
}

/**
 * Main POS Counter Multi-Product Scan, Bill Generator & Stock Popup Modal (Strictly Scan-Only)
 */
export function PosQrStockModal({
  isOpen,
  onClose,
  allProducts = [],
  initialScannedProduct = null,
  onStockUpdated,
  onAddToPosBill,
  onAddMultipleToPosBill,
  onGenerateBillFromScan,
  isGeneratingBill = false,
}) {
  // List of scanned items: [{ product, quantity }]
  const [scannedItems, setScannedItems] = useState([]);
  const [actionMode, setActionMode] = useState("minus"); // "minus" | "add"
  const [paymentMode, setPaymentMode] = useState("Cash"); // "Cash" | "UPI" | "Card"
  const [isUpdatingBatchStock, setIsUpdatingBatchStock] = useState(false);
  const [adjustProductStock, { isLoading: isAdjustingSingle }] =
    useAdjustProductStockMutation();

  const isBusy = isAdjustingSingle || isUpdatingBatchStock || isGeneratingBill;
  const allProductsRef = useRef(allProducts);
  const actionModeRef = useRef(actionMode);
  const listScrollRef = useRef(null);

  useEffect(() => {
    allProductsRef.current = allProducts;
  }, [allProducts]);

  useEffect(() => {
    actionModeRef.current = actionMode;
  }, [actionMode]);

  useEffect(() => {
    if (isOpen) {
      if (initialScannedProduct) {
        setScannedItems([{ product: initialScannedProduct, quantity: 1 }]);
      } else {
        setScannedItems([]);
      }
      setActionMode("minus");
      setPaymentMode("Cash");
    }
  }, [isOpen, initialScannedProduct]);

  // Keep scannedItems product references synced with fresh stock from allProducts
  useEffect(() => {
    if (!allProducts || allProducts.length === 0) return;
    setScannedItems((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((entry) => {
        const fresh = allProducts.find((p) => p.id === entry.product.id);
        return fresh ? { ...entry, product: fresh } : entry;
      });
    });
  }, [allProducts]);

  const handleCodeScanned = (rawCode) => {
    const clean = String(rawCode || "").trim();
    if (!clean) return;

    const productsList = allProductsRef.current || [];
    const found = productsList.find(
      (p) =>
        p.barcode &&
        String(p.barcode).trim().toLowerCase() === clean.toLowerCase()
    );

    if (!found) {
      toast.error(`No product found for scanned QR / Barcode: "${clean}"`);
      return;
    }

    const mode = actionModeRef.current;
    const maxStock = Number(found.stock) || 0;
    const isMadeToOrder = found.availability_type === "MADE_TO_ORDER";

    setScannedItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === found.id);

      if (existingIdx !== -1) {
        const currentQty = Number(prev[existingIdx].quantity) || 1;
        const nextQty = currentQty + 1;

        if (mode === "minus" && !isMadeToOrder && nextQty > maxStock) {
          toast.error(`"${found.name}" has only ${maxStock} units available in stock!`);
          return prev;
        }

        toast.success(`Scanned "${found.name}" — Qty: ${nextQty}`);
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          product: found,
          quantity: nextQty,
        };
        return updated;
      }

      if (mode === "minus" && !isMadeToOrder && maxStock <= 0) {
        toast.error(`"${found.name}" is out of stock (0 available)!`);
        return prev;
      }

      toast.success(`Added "${found.name}" (₹${Number(found.price || 0).toFixed(2)})`);
      return [...prev, { product: found, quantity: 1 }];
    });

    // Auto-scroll the scanned products list to show the newly scanned item
    window.setTimeout(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTo({
          top: listScrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 60);
  };

  const updateItemQuantity = (productId, nextQtyRaw) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const maxStock = Number(item.product.stock) || 0;
        const isMadeToOrder = item.product.availability_type === "MADE_TO_ORDER";

        if (nextQtyRaw === "") {
          return { ...item, quantity: "" };
        }

        let nextQty = Math.max(1, parseInt(nextQtyRaw, 10) || 1);
        if (actionMode === "minus" && !isMadeToOrder && nextQty > maxStock) {
          toast.error(`Only ${maxStock} units of "${item.product.name}" in stock!`);
          nextQty = Math.max(1, maxStock);
        }
        return { ...item, quantity: nextQty };
      })
    );
  };

  const stepItemQuantity = (productId, delta) => {
    setScannedItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const currentQty = Number(item.quantity) || 1;
          const nextQty = currentQty + delta;

          if (nextQty <= 0) {
            return null;
          }

          const maxStock = Number(item.product.stock) || 0;
          const isMadeToOrder = item.product.availability_type === "MADE_TO_ORDER";
          if (delta > 0 && actionMode === "minus" && !isMadeToOrder && nextQty > maxStock) {
            toast.error(`Only ${maxStock} units of "${item.product.name}" in stock!`);
            return item;
          }

          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
  };

  const removeScannedItem = (productId) => {
    setScannedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  if (!isOpen) return null;

  const totalUnits = scannedItems.reduce(
    (sum, item) => sum + (Math.max(1, Number(item.quantity) || 1)),
    0
  );
  const grandTotal = scannedItems.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price || 0) * Math.max(1, Number(item.quantity) || 1),
    0
  );

  // 1) Directly Generate POS Bill & Minus Stock for all scanned products
  const handleDirectGenerateBill = async () => {
    if (scannedItems.length === 0) {
      toast.error("Please scan at least one product first");
      return;
    }

    const normalized = scannedItems.map((item) => ({
      product: item.product,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    for (const entry of normalized) {
      const stock = Number(entry.product.stock) || 0;
      const isMadeToOrder = entry.product.availability_type === "MADE_TO_ORDER";
      if (!isMadeToOrder && entry.quantity > stock) {
        toast.error(
          `"${entry.product.name}" has only ${stock} units available in stock!`
        );
        return;
      }
    }

    if (onGenerateBillFromScan) {
      const ok = await onGenerateBillFromScan(normalized, paymentMode);
      if (ok !== false) {
        setScannedItems([]);
        onClose();
      }
      return;
    }

    // Fallback: add to POS bill if onGenerateBillFromScan not provided
    handleMoveAllToPosBill();
  };

  // 2) Add all scanned products into the POS Counter Register Cart
  const handleMoveAllToPosBill = () => {
    if (scannedItems.length === 0) return;

    const normalized = scannedItems.map((item) => ({
      product: item.product,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    if (onAddMultipleToPosBill) {
      onAddMultipleToPosBill(normalized);
    } else if (onAddToPosBill) {
      normalized.forEach((entry) => onAddToPosBill(entry.product, entry.quantity));
    }

    setScannedItems([]);
    onClose();
  };

  // 3) Direct Stock Minus / Add for all scanned products (without bill)
  const handleBatchStockAdjustment = async () => {
    if (scannedItems.length === 0) return;

    const normalized = scannedItems.map((item) => ({
      product: item.product,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    for (const entry of normalized) {
      const stock = Number(entry.product.stock) || 0;
      const isMadeToOrder = entry.product.availability_type === "MADE_TO_ORDER";
      if (actionMode === "minus" && !isMadeToOrder && entry.quantity > stock) {
        toast.error(
          `Cannot minus ${entry.quantity} of "${entry.product.name}". Only ${stock} in stock!`
        );
        return;
      }
    }

    setIsUpdatingBatchStock(true);
    try {
      for (const entry of normalized) {
        await adjustProductStock({
          id: entry.product.id,
          mode: actionMode,
          quantity: entry.quantity,
        }).unwrap();
      }

      toast.success(
        `Stock ${
          actionMode === "minus" ? "deducted" : "added"
        } for ${normalized.length} product(s) (${totalUnits} units)!`
      );

      if (onStockUpdated) {
        await onStockUpdated();
      }
      setScannedItems([]);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update stock for scanned items");
    } finally {
      setIsUpdatingBatchStock(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 1065,
        backgroundColor: "rgba(15, 23, 42, 0.68)",
        backdropFilter: "blur(4px)",
        padding: "12px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        className="card border shadow-lg rounded-4 overflow-hidden w-100 bg-white"
        style={{
          maxWidth: "620px",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-2.5 border-bottom bg-light flex-shrink-0">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center"
              style={{
                width: "36px",
                height: "36px",
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              <QrCode size={19} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold fs-6 text-dark">
                Multi-Product QR / Barcode Scanner
              </h5>
              <span className="text-muted" style={{ fontSize: "11.5px" }}>
                Scan multiple products continuously to generate bill &amp; minus stock
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon text-muted p-1 border-0"
            onClick={onClose}
            disabled={isBusy}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className="p-3 overflow-y-auto"
          style={{ flex: 1, minHeight: 0 }}
        >
          {/* Live Camera & Hardware Scanner (Continuously Active for Multi-Scan) */}
          <div className="mb-3">
            <InlineCameraBarcodeScanner
              active={isOpen}
              autoStartCamera={true}
              onDetected={handleCodeScanned}
            />
          </div>

          {/* Scanned Products Header & Mode Toggle */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge rounded-pill px-2.5 py-1 fw-bold"
                style={{
                  background: scannedItems.length > 0 ? "#dcfce7" : "#f1f5f9",
                  color: scannedItems.length > 0 ? "#166534" : "#64748b",
                  fontSize: "11.5px",
                }}
              >
                {scannedItems.length > 0
                  ? `✓ ${scannedItems.length} Product(s) Scanned (${totalUnits} Qty)`
                  : "0 Products Scanned"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-1.5">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  onClick={() => setActionMode("minus")}
                  className={`btn btn-sm fw-semibold py-0.5 px-2 ${
                    actionMode === "minus"
                      ? "btn-danger text-white"
                      : "btn-outline-secondary bg-white"
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  Bill / Minus Stock
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode("add")}
                  className={`btn btn-sm fw-semibold py-0.5 px-2 ${
                    actionMode === "add"
                      ? "btn-success text-white"
                      : "btn-outline-secondary bg-white"
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  + Restock In
                </button>
              </div>

              {scannedItems.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger py-0.5 px-2 d-inline-flex align-items-center gap-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => setScannedItems([])}
                  disabled={isBusy}
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Scanned Products List */}
          {scannedItems.length > 0 ? (
            <div
              ref={listScrollRef}
              className="border rounded-3 p-2 bg-light"
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                overflowX: "hidden",
                scrollBehavior: "smooth",
              }}
            >
              <div className="d-flex flex-column gap-2">
                {scannedItems.map(({ product, quantity }, idx) => {
                  let productImg = "";
                  if (product?.images) {
                    try {
                      const parsed =
                        typeof product.images === "string"
                          ? JSON.parse(product.images)
                          : product.images;
                      if (Array.isArray(parsed) && parsed.length > 0)
                        productImg = parsed[0];
                    } catch {
                      productImg = product.images;
                    }
                  }

                  const currentStock = Number(product.stock) || 0;
                  const qtyNum = Math.max(1, Number(quantity) || 1);
                  const unitPrice = Number(product.price || 0);
                  const lineTotal = unitPrice * qtyNum;
                  const afterStock =
                    actionMode === "minus"
                      ? Math.max(0, currentStock - qtyNum)
                      : currentStock + qtyNum;

                  return (
                    <div
                      key={product.id}
                      className="d-flex align-items-center justify-content-between gap-2 bg-white p-2.5 rounded-3 border shadow-2xs"
                    >
                      {/* Left: Index + Thumbnail + Product Info */}
                      <div className="d-flex align-items-center gap-2.5 min-w-0 flex-grow-1">
                        <span
                          className="badge bg-light text-secondary border rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: "22px", height: "22px", fontSize: "10.5px" }}
                        >
                          {idx + 1}
                        </span>
                        <div
                          className="rounded-2 border bg-light d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                          style={{ width: "44px", height: "44px" }}
                        >
                          {productImg ? (
                            <img
                              src={toAssetUrl(productImg)}
                              alt={product.name}
                              className="w-100 h-100 object-fit-cover"
                            />
                          ) : (
                            <Package size={20} className="text-muted opacity-50" />
                          )}
                        </div>

                        <div className="min-w-0 flex-grow-1">
                          <div
                            className="fw-bold text-dark text-truncate"
                            style={{ fontSize: "13px" }}
                            title={product.name}
                          >
                            {product.name}
                          </div>
                          <div className="d-flex align-items-center gap-1.5 flex-wrap mt-0.5">
                            <span
                              className="fw-semibold text-success"
                              style={{ fontSize: "11.5px" }}
                            >
                              ₹{unitPrice.toFixed(2)}
                            </span>
                            <span
                              className="text-muted"
                              style={{ fontSize: "10.5px" }}
                            >
                              • Stock: {currentStock} →{" "}
                              <strong
                                className={
                                  actionMode === "minus"
                                    ? "text-danger"
                                    : "text-success"
                                }
                              >
                                {afterStock}
                              </strong>
                            </span>
                            {product.barcode && (
                              <span
                                className="badge bg-light text-secondary border"
                                style={{ fontSize: "9.5px" }}
                              >
                                {product.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Steppers + Line Total + Remove */}
                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <div className="d-flex align-items-center border rounded-2 bg-light">
                          <button
                            type="button"
                            className="btn btn-sm btn-icon py-0 px-2 text-secondary border-0"
                            onClick={() => stepItemQuantity(product.id, -1)}
                            disabled={isBusy}
                            title="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={
                              actionMode === "minus"
                                ? Math.max(1, currentStock)
                                : 99999
                            }
                            value={quantity}
                            onChange={(e) =>
                              updateItemQuantity(product.id, e.target.value)
                            }
                            disabled={isBusy}
                            className="form-control form-control-sm text-center fw-bold border-0 bg-white px-1"
                            style={{
                              width: "44px",
                              height: "28px",
                              fontSize: "12.5px",
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-icon py-0 px-2 text-secondary border-0"
                            onClick={() => stepItemQuantity(product.id, 1)}
                            disabled={isBusy}
                            title="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div
                          className="text-end fw-bold text-dark"
                          style={{ minWidth: "62px", fontSize: "13px" }}
                        >
                          ₹{lineTotal.toFixed(2)}
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-1"
                          onClick={() => removeScannedItem(product.id)}
                          disabled={isBusy}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 px-3 border rounded-3 bg-white text-muted small">
              Scan one or multiple product packet QR Codes / Barcodes using the camera above (or USB scanner). All scanned products will appear here in a scrollable list for instant billing!
            </div>
          )}
        </div>

        {/* Sticky Footer: Direct Charge & Complete Sale */}
        {scannedItems.length > 0 && (
          <div className="px-4 py-3 border-top bg-light flex-shrink-0">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2.5">
              <div>
                <span className="text-muted small">
                  Total Scanned:{" "}
                  <strong className="text-dark">
                    {scannedItems.length} item(s) ({totalUnits} units)
                  </strong>
                </span>
              </div>

              {actionMode === "minus" && (
                <div className="d-flex align-items-center gap-1.5">
                  <span className="text-muted small me-1" style={{ fontSize: "11.5px" }}>
                    Payment:
                  </span>
                  {["Cash", "UPI", "Card"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`btn btn-xs rounded-2 px-2.5 py-1 fw-semibold ${
                        paymentMode === mode
                          ? "btn-primary text-white"
                          : "btn-white border text-secondary bg-white"
                      }`}
                      style={{ fontSize: "11.5px" }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-end">
                <span className="text-muted small me-1.5">Payable Total:</span>
                <span className="fw-bolder text-dark fs-5">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {actionMode === "minus" ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleDirectGenerateBill}
                className="btn btn-primary btn-lg w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-xs"
              >
                {isGeneratingBill ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Recording Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      Charge ₹{grandTotal.toFixed(2)} &amp; Complete Sale
                    </span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleBatchStockAdjustment}
                className="btn btn-success btn-lg w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-xs"
              >
                {isUpdatingBatchStock ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Adding Stock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      + Add Stock for All {scannedItems.length} Product(s) ({totalUnits} units)
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PosQrStockModal;
