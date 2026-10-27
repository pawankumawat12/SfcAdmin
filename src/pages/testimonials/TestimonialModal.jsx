import { useState, useEffect } from "react";
import { X, Star, Quote, Eye } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { toAssetUrl } from "../../utils/assetUrl";

export default function TestimonialModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState({
    name: "",
    location: "Jaipur",
    rating: 5,
    review: "",
    date_text: "Recently",
    display_order: 1,
    is_active: true,
  });

  const [avatarMode, setAvatarMode] = useState("initials"); // "initials" | "file" | "url"
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: initialData.name || "",
        location: initialData.location || "Jaipur",
        rating: initialData.rating ?? 5,
        review: initialData.review || "",
        date_text: initialData.date_text || "Recently",
        display_order: initialData.display_order ?? 1,
        is_active: initialData.is_active ?? true,
      });

      const initialAv = initialData.avatar || "";
      if (initialAv) {
        if (/^https?:\/\//i.test(initialAv)) {
          setAvatarMode("url");
          setAvatarUrl(initialAv);
          setPreviewUrl(initialAv);
        } else if (initialAv.includes("/") || initialAv.includes(".")) {
          setAvatarMode("file");
          setPreviewUrl(toAssetUrl(initialAv));
        } else {
          setAvatarMode("initials");
          setPreviewUrl("");
        }
      } else {
        setAvatarMode("initials");
        setPreviewUrl("");
      }
      setAvatarFile(null);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: "",
        location: "Jaipur",
        rating: 5,
        review: "",
        date_text: "Recently",
        display_order: 1,
        is_active: true,
      });
      setAvatarMode("initials");
      setAvatarUrl("");
      setAvatarFile(null);
      setPreviewUrl("");
    }
    setValidationError("");
  }, [initialData, isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setValidationError("");
    e.target.value = "";
  };

  const handleUrlChange = (val) => {
    setAvatarUrl(val);
    if (avatarMode === "url") {
      setPreviewUrl(val.trim());
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setValidationError("Customer name is required");
      return;
    }
    if (!formData.review.trim()) {
      setValidationError("Review text is required");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("location", formData.location.trim());
    data.append("rating", Number(formData.rating) || 5);
    data.append("review", formData.review.trim());
    data.append("date_text", formData.date_text.trim());
    data.append("display_order", Number(formData.display_order) || 1);
    data.append("is_active", formData.is_active);

    if (avatarMode === "file" && avatarFile) {
      data.append("avatar", avatarFile);
    } else if (avatarMode === "url" && avatarUrl.trim()) {
      data.append("avatarUrl", avatarUrl.trim());
    } else if (avatarMode === "initials") {
      data.append("avatarUrl", ""); // clear custom avatar
    } else if (initialData?.avatar) {
      data.append("avatarUrl", initialData.avatar);
    }

    onSubmit(data);
  };

  if (!isOpen) return null;

  const initials = (formData.name || "C")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(680px, calc(100vw - 32px))",
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
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              {initialData ? "Edit Customer Review" : "Add Customer Review"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Manage featured testimonial card, star rating, reviewer name, and feedback text.
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

        {/* Form Body using common entity-form */}
        <form
          className="entity-form"
          onSubmit={handleSubmit}
          style={{
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
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
              }}
            >
              {validationError || apiError}
            </div>
          )}

          <div className="form-grid">
            <label>
              Customer Name *
              <Input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
              <small className="muted">Reviewer&apos;s display name</small>
            </label>

            <label>
              Location / Tag
              <Input
                type="text"
                placeholder="e.g. Jaipur or Verified Buyer"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
              <small className="muted">City or customer badge</small>
            </label>

            <label>
              Star Rating *
              <Select
                value={String(formData.rating)}
                onChange={(e) => handleChange("rating", Number(e.target.value))}
              >
                <option value="5">5 Stars (★★★★★ Excellent)</option>
                <option value="4">4 Stars (★★★★☆ Great)</option>
                <option value="3">3 Stars (★★★☆☆ Good)</option>
                <option value="2">2 Stars (★★☆☆☆ Fair)</option>
                <option value="1">1 Star (★☆☆☆☆ Poor)</option>
              </Select>
              <small className="muted">Displayed star count</small>
            </label>

            <label>
              Date / Time Label
              <Input
                type="text"
                placeholder="e.g. 2 days ago or Today"
                value={formData.date_text}
                onChange={(e) => handleChange("date_text", e.target.value)}
              />
              <small className="muted">Relative or display date</small>
            </label>

            <label>
              Display Order
              <Input
                type="number"
                min="1"
                value={formData.display_order}
                onChange={(e) => handleChange("display_order", e.target.value)}
              />
              <small className="muted">Order index on slider</small>
            </label>

            <label>
              Status
              <Select
                value={formData.is_active ? "true" : "false"}
                onChange={(e) => handleChange("is_active", e.target.value === "true")}
              >
                <option value="true">Active (Visible)</option>
                <option value="false">Inactive (Hidden)</option>
              </Select>
              <small className="muted">Visibility on storefront</small>
            </label>

            <label className="full">
              Avatar Image Source
              <Select
                value={avatarMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setAvatarMode(mode);
                  if (mode === "url" && avatarUrl) setPreviewUrl(avatarUrl.trim());
                  if (mode === "file" && avatarFile) setPreviewUrl(URL.createObjectURL(avatarFile));
                  if (mode === "initials") setPreviewUrl("");
                }}
              >
                <option value="initials">Automatic Initials Badge (Recommended)</option>
                <option value="file">Upload Photo File</option>
                <option value="url">Direct Photo URL</option>
              </Select>
            </label>

            {avatarMode === "file" && (
              <label className="full">
                Customer Photo File
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                />
                <small className="muted">Square photo recommended (Max 5 MB)</small>
              </label>
            )}

            {avatarMode === "url" && (
              <label className="full">
                Customer Photo URL
                <Input
                  type="url"
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                <small className="muted">Direct web link to image asset</small>
              </label>
            )}

            <label className="full">
              Review / Feedback *
              <textarea
                rows={4}
                value={formData.review}
                onChange={(e) => handleChange("review", e.target.value)}
                placeholder="Write what the customer loved about their food or delivery..."
                required
              />
              <small className="muted">Actual feedback quote</small>
            </label>
          </div>

          {/* Live Storefront Review Card Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
              <Eye size={15} /> Storefront Review Card Preview
            </div>

            <div
              style={{
                position: "relative",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: "20px",
                maxWidth: "360px",
                margin: "0 auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
              }}
            >
              {/* Quote Icon */}
              <div
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "16px",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(79, 125, 22, 0.1)",
                  color: "#4f7d16",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Quote size={15} fill="currentColor" />
              </div>

              {/* Stars */}
              <div style={{ display: "flex", gap: "2px", color: "#f59e0b", marginBottom: "12px" }}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    size={14}
                    fill={idx < formData.rating ? "currentColor" : "none"}
                    color={idx < formData.rating ? "#f59e0b" : "#cbd5e1"}
                  />
                ))}
              </div>

              {/* Review Text */}
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "0.85rem",
                  color: "#475569",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{formData.review || "Review text will appear here..."}&rdquo;
              </p>

              {/* Divider */}
              <div style={{ height: "1px", background: "#f1f5f9", margin: "12px 0" }} />

              {/* Reviewer Details */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {avatarMode !== "initials" && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Avatar"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#4f7d16",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "11px",
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  <div>
                    <h5 style={{ margin: 0, fontSize: "0.86rem", fontWeight: 700, color: "#1e293b" }}>
                      {formData.name || "Customer Name"}
                    </h5>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {formData.location || "Jaipur"}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  {formData.date_text || "Recently"}
                </span>
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
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                ? "Save Changes"
                : "Create Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
