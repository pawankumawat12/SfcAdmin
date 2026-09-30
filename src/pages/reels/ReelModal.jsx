import { useState, useEffect } from "react";
import { X, Video, Play, AlertCircle, Eye } from "lucide-react";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

function detectPlatform(url = "") {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  return "youtube";
}

function extractYouTubeId(url = "") {
  if (!url) return null;
  const match = url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function ReelModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState({
    title: "",
    video_url: "",
    platform: "youtube",
    sort_order: 1,
    is_active: true,
  });

  const [thumbnailMode, setThumbnailMode] = useState("auto"); // "auto" | "file" | "url"
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (initialData) {
      const detected = initialData.platform || detectPlatform(initialData.video_url || "");
      setFormData({
        title: initialData.title || "",
        video_url: initialData.video_url || "",
        platform: detected,
        sort_order: initialData.sort_order ?? 1,
        is_active: initialData.is_active ?? true,
      });

      const initialThumb = initialData.thumbnail_url || "";
      if (initialThumb) {
        if (/^https?:\/\//i.test(initialThumb) && !initialThumb.includes("img.youtube.com")) {
          setThumbnailMode("url");
          setCustomThumbnailUrl(initialThumb);
        } else if (initialThumb.includes("img.youtube.com")) {
          setThumbnailMode("auto");
        } else {
          setThumbnailMode("file");
        }
        setPreviewUrl(initialThumb);
      } else {
        setThumbnailMode("auto");
        if (detected === "youtube") {
          const ytId = extractYouTubeId(initialData.video_url);
          if (ytId) setPreviewUrl(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
          else setPreviewUrl("");
        } else {
          setPreviewUrl("");
        }
      }
      setThumbnailFile(null);
    } else {
      setFormData({
        title: "",
        video_url: "",
        platform: "youtube",
        sort_order: 1,
        is_active: true,
      });
      setThumbnailMode("auto");
      setCustomThumbnailUrl("");
      setThumbnailFile(null);
      setPreviewUrl("");
    }
    setValidationError("");
  }, [initialData, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "video_url") {
        const detected = detectPlatform(value);
        next.platform = detected;
        if (thumbnailMode === "auto" && detected === "youtube") {
          const ytId = extractYouTubeId(value);
          if (ytId) setPreviewUrl(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
        }
      }
      return next;
    });
    setValidationError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setThumbnailFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setValidationError("");
  };

  const handleUrlChange = (val) => {
    setCustomThumbnailUrl(val);
    if (thumbnailMode === "url") {
      setPreviewUrl(val.trim());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!formData.title.trim()) {
      setValidationError("Please enter a reel title");
      return;
    }
    if (!formData.video_url.trim()) {
      setValidationError("Please enter a YouTube Shorts or Instagram Reel URL");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title.trim());
    data.append("video_url", formData.video_url.trim());
    data.append("platform", formData.platform);
    data.append("sort_order", Number(formData.sort_order) || 1);
    data.append("is_active", formData.is_active);

    if (thumbnailMode === "file" && thumbnailFile) {
      data.append("thumbnail", thumbnailFile);
    } else if (thumbnailMode === "url" && customThumbnailUrl.trim()) {
      data.append("thumbnail_url", customThumbnailUrl.trim());
    } else if (thumbnailMode === "auto" && formData.platform === "youtube") {
      const ytId = extractYouTubeId(formData.video_url);
      if (ytId) {
        data.append("thumbnail_url", `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
      }
    }

    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(780px, calc(100vw - 32px))",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              {initialData ? "Edit Reel / Video" : "Add New Reel / Video"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Add YouTube Shorts or Instagram Reels to display on Home and Menu sliders.
            </p>
          </div>
          <Button
            variant="plain"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            style={{ padding: "6px", borderRadius: "8px" }}
          >
            <X size={19} />
          </Button>
        </div>

        {/* Scrollable Form Body using common entity-form */}
        <form
          className="entity-form"
          onSubmit={handleSubmit}
          style={{
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Validation & Server Errors */}
          {(validationError || apiError) && (
            <div
              className="error"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} />
              <span>{validationError || apiError}</span>
            </div>
          )}

          <div className="form-grid">
            <label className="full">
              Reel Title *
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g. Making of Chocolate Truffle Cake"
                required
              />
              <small className="muted">Short catchy title shown on the video card</small>
            </label>

            <label className="full">
              Video / Reel URL *
              <Input
                type="url"
                value={formData.video_url}
                onChange={(e) => handleChange("video_url", e.target.value)}
                placeholder="https://www.youtube.com/shorts/... or https://www.instagram.com/reel/..."
                required
              />
              <small className="muted" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                Platform auto-detected:
                {formData.platform === "instagram" ? (
                  <span style={{ color: "#db2777", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <FaInstagram /> Instagram Reel
                  </span>
                ) : (
                  <span style={{ color: "#dc2626", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <FaYoutube /> YouTube Shorts / Video
                  </span>
                )}
              </small>
            </label>

            <label>
              Platform
              <Select
                value={formData.platform}
                onChange={(e) => handleChange("platform", e.target.value)}
              >
                <option value="youtube">YouTube (Shorts / Video)</option>
                <option value="instagram">Instagram Reel</option>
              </Select>
              <small className="muted">Video source type</small>
            </label>

            <label>
              Display Order
              <Input
                type="number"
                min="1"
                value={formData.sort_order}
                onChange={(e) => handleChange("sort_order", e.target.value)}
                placeholder="1"
              />
              <small className="muted">Lower numbers appear first on slider</small>
            </label>

            <label className="full">
              Status
              <Select
                value={formData.is_active ? "true" : "false"}
                onChange={(e) => handleChange("is_active", e.target.value === "true")}
              >
                <option value="true">Active (Visible on storefront)</option>
                <option value="false">Inactive (Hidden from customers)</option>
              </Select>
              <small className="muted">Control public visibility</small>
            </label>
          </div>

          {/* Cover / Thumbnail Mode Selection */}
          <div
            style={{
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "12px",
              padding: "16px",
              background: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                Cover / Thumbnail Image
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <Button
                  type="button"
                  variant={thumbnailMode === "auto" ? "primary" : "outline"}
                  onClick={() => {
                    setThumbnailMode("auto");
                    if (formData.platform === "youtube") {
                      const ytId = extractYouTubeId(formData.video_url);
                      if (ytId) setPreviewUrl(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
                    }
                  }}
                  style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                >
                  Auto YouTube
                </Button>
                <Button
                  type="button"
                  variant={thumbnailMode === "file" ? "primary" : "outline"}
                  onClick={() => setThumbnailMode("file")}
                  style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                >
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={thumbnailMode === "url" ? "primary" : "outline"}
                  onClick={() => setThumbnailMode("url")}
                  style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                >
                  Image URL
                </Button>
              </div>
            </div>

            {thumbnailMode === "file" && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ fontSize: "0.85rem" }}
                />
                <small className="muted" style={{ display: "block", marginTop: "4px" }}>
                  Upload a high quality vertical cover image (PNG, JPG, WebP)
                </small>
              </div>
            )}

            {thumbnailMode === "url" && (
              <div>
                <Input
                  type="url"
                  value={customThumbnailUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/cover-image.jpg"
                />
                <small className="muted" style={{ display: "block", marginTop: "4px" }}>
                  Paste direct image URL for the card cover
                </small>
              </div>
            )}

            {thumbnailMode === "auto" && (
              <small className="muted">
                {formData.platform === "youtube"
                  ? "✓ Cover thumbnail will be fetched automatically from YouTube."
                  : "ℹ For Instagram, we recommend uploading a cover image or pasting an image URL above."}
              </small>
            )}
          </div>

          {/* Live Card Preview Box */}
          <div
            style={{
              border: "1px dashed var(--border-color, #cbd5e1)",
              borderRadius: "12px",
              padding: "16px",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#64748b",
                marginBottom: "12px",
              }}
            >
              <Eye size={16} /> Live Reel Card Preview (Storefront View)
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "180px",
                  height: "290px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "#18181b",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#71717a",
                    }}
                  >
                    <Video size={36} />
                  </div>
                )}

                {/* Dark bottom gradient */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)",
                  }}
                />

                {/* Platform Badge */}
                <div style={{ position: "absolute", top: "10px", left: "10px" }}>
                  {formData.platform === "instagram" ? (
                    <span
                      style={{
                        background: "linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: "20px",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaInstagram size={10} /> Reel
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: "20px",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaYoutube size={10} /> Shorts
                    </span>
                  )}
                </div>

                {/* Center Play Button */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.3)",
                    backdropFilter: "blur(6px)",
                    display: "grid",
                    placeItems: "center",
                    color: "#ffffff",
                  }}
                >
                  <Play size={18} fill="#ffffff" style={{ marginLeft: "2px" }} />
                </div>

                {/* Title */}
                <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px" }}>
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      lineHeight: "1.2",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {formData.title || "Your Reel Title Here"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
              marginTop: "6px",
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                ? "Save Changes"
                : "Create Reel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

