import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Camera,
  Upload,
  Trash2,
  Mail,
  ShieldCheck,
  UserRound,
  Phone,
  Save,
  LoaderCircle,
  CheckCircle2,
  KeyRound,
  Lock,
} from "lucide-react";
import {
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "../../services/authApi";
import { setUser } from "../../context/authSlice";
import { toAssetUrl } from "../../utils/assetUrl";
import { isValidIndianPhone, normalizeIndianPhone, sanitizePhoneInput } from "../../utils/phoneValidation";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ChangeEmailModal from "../../modals/ChangeEmailModal";
import DynamicQrSection from "./DynamicQrSection";

export default function Profile() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [updateProfile] = useUpdateProfileMutation();

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Form states
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Change password states
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      }).unwrap();

      toast.success(res?.message || "Password updated successfully!");
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      const msg = err?.data?.message || "Failed to update password.";
      setPasswordError(msg);
    }
  };

  const initials = user?.name?.slice(0, 2).toUpperCase() || "AD";

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, or WEBP).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validPhone = normalizeIndianPhone(phone || user?.phone);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("name", user?.name || name || "Administrator");
    if (user?.email) formData.append("email", user.email);
    if (validPhone && isValidIndianPhone(validPhone)) {
      formData.append("phone", validPhone);
    }

    try {
      setIsUploadingPhoto(true);
      const res = await updateProfile(formData).unwrap();
      if (res?.user) {
        dispatch(setUser(res.user));
      }
      toast.success(res?.message || "Profile image updated successfully!");
    } catch (err) {
      const msg =
        err?.data?.message ||
        (err?.data?.errors && Object.values(err.data.errors)[0]) ||
        "Failed to upload profile image.";
      toast.error(typeof msg === "string" ? msg : "Failed to upload image.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    const validPhone = normalizeIndianPhone(phone || user?.phone);

    const formData = new FormData();
    formData.append("remove_image", "true");
    formData.append("name", user?.name || name || "Administrator");
    if (user?.email) formData.append("email", user.email);
    if (validPhone && isValidIndianPhone(validPhone)) {
      formData.append("phone", validPhone);
    }

    try {
      setIsRemovingPhoto(true);
      const res = await updateProfile(formData).unwrap();
      if (res?.user) {
        dispatch(setUser(res.user));
      }
      toast.success("Profile photo removed successfully.");
      setShowRemoveConfirm(false);
    } catch (err) {
      const msg = err?.data?.message || "Failed to remove profile photo.";
      toast.error(typeof msg === "string" ? msg : "Failed to remove photo.");
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setNameError("Full name must be at least 3 characters.");
      return;
    }
    setNameError("");

    let normalizedPhone = undefined;
    if (phone.trim()) {
      if (!isValidIndianPhone(phone)) {
        setPhoneError("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
        return;
      }
      normalizedPhone = normalizeIndianPhone(phone);
    }
    setPhoneError("");

    try {
      setIsSavingDetails(true);
      const res = await updateProfile({
        name: name.trim(),
        phone: normalizedPhone,
        email: user?.email,
      }).unwrap();

      if (res?.user) {
        dispatch(setUser(res.user));
      }
      toast.success(res?.message || "Profile details updated successfully!");
    } catch (err) {
      const msg =
        err?.data?.message ||
        (err?.data?.errors && Object.values(err.data.errors)[0]) ||
        "Failed to update profile details.";
      toast.error(typeof msg === "string" ? msg : "Failed to update profile.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>My profile</h1>
          <p>Manage your administrator account details and profile photo.</p>
        </div>
      </div>

      <section
        className="profile-page-card"
        style={{
          maxWidth: "100%",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          overflow: "hidden",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
        }}
      >
        {/* Profile Image & Quick Actions Header */}
        <div
          style={{
            padding: "32px 28px",
            background: "linear-gradient(135deg, #f7f6fe 0%, #ffffff 100%)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Avatar Container with Camera Overlay */}
          <div style={{ position: "relative", width: "96px", height: "96px", flexShrink: 0 }}>
            {user?.image ? (
              <img
                src={toAssetUrl(user.image)}
                alt={user?.name || "Administrator"}
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #ffffff",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8578ff, #5142dc)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "32px",
                  fontWeight: 700,
                  border: "3px solid #ffffff",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                }}
              >
                {initials}
              </div>
            )}

            {/* Camera Overlay Icon Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              title="Change profile picture"
              style={{
                position: "absolute",
                bottom: "0",
                right: "0",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#4e42be",
                color: "#ffffff",
                border: "2px solid #ffffff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                transition: "all 0.15s ease",
              }}
            >
              {isUploadingPhoto ? (
                <LoaderCircle size={15} className="spin animate-spin" />
              ) : (
                <Camera size={15} />
              )}
            </button>
          </div>

          {/* User Summary & Photo Actions */}
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--ink)" }}>
                {user?.name || "Administrator"}
              </h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  borderRadius: "16px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#4e42be",
                  background: "var(--purple-soft)",
                  textTransform: "capitalize",
                }}
              >
                <ShieldCheck size={13} /> {user?.role || "admin"}
              </span>
            </div>
            <p style={{ margin: "4px 0 14px", color: "var(--muted)", fontSize: "13px" }}>
              {user?.email || "admin@example.com"}
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {/* Photo Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                loading={isUploadingPhoto}
                style={{
                  fontSize: "12px",
                  height: "34px",
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Upload size={13} />
                <span>{user?.image ? "Change Photo" : "Upload Photo"}</span>
              </Button>

              {user?.image && (
                <Button
                  variant="danger"
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={isUploadingPhoto}
                  style={{
                    fontSize: "12px",
                    height: "34px",
                    padding: "0 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Trash2 size={13} />
                  <span>Remove Photo</span>
                </Button>
              )}
            </div>
            <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "11px" }}>
              Supported: JPG, PNG, WEBP. Maximum file size: 5MB.
            </p>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveDetails} style={{ padding: "28px" }}>
          <h3
            style={{
              margin: "0 0 20px",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--ink)",
              borderBottom: "1px solid var(--line)",
              paddingBottom: "12px",
            }}
          >
            Account Information
          </h3>

          <div className="profile-form-grid">
            {/* Full Name */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <UserRound size={15} /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: `1px solid ${nameError ? "#ef4444" : "#dedde6"}`,
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
              {nameError && (
                <small style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
                  {nameError}
                </small>
              )}
            </div>

            {/* Email Address */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    margin: 0,
                  }}
                >
                  <Mail size={15} /> Email Address
                </label>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  Change Email
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  readOnly
                  style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    padding: "0 14px",
                    fontSize: "13.5px",
                    color: "#6b7280",
                    background: "#f9fafb",
                    cursor: "not-allowed",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#16a34a",
                  }}
                >
                  <CheckCircle2 size={13} /> Verified
                </span>
              </div>
              <small style={{ color: "#9ca3af", fontSize: "11px", marginTop: "4px", display: "block" }}>
                Click "Change Email" to update your login email.
              </small>
            </div>

            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <Phone size={15} /> Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizePhoneInput(e.target.value));
                  if (phoneError) setPhoneError("");
                }}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: `1px solid ${phoneError ? "#ef4444" : "#dedde6"}`,
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
              {phoneError && (
                <small style={{ color: "#ef4444", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
                  {phoneError}
                </small>
              )}
            </div>

            {/* Role Badge */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <ShieldCheck size={15} /> Assigned Role
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "42px",
                  borderRadius: "8px",
                  padding: "0 14px",
                  background: "#f4f2ff",
                  border: "1px solid #e0dcfe",
                  color: "#4e42be",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  width: "100%",
                }}
              >
                <ShieldCheck size={16} />
                <span>{user?.role || "admin"}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <Button
              type="submit"
              variant="primary"
              disabled={isSavingDetails || isUploadingPhoto}
              loading={isSavingDetails}
              style={{
                height: "40px",
                padding: "0 22px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <Save size={15} />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </section>

      {/* Security & Password Change Section */}
      <section
        style={{
          background: "var(--card-bg, #ffffff)",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginTop: "24px",
          overflow: "hidden",
        }}
      >
        <form onSubmit={handleChangePassword} style={{ padding: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--line)",
              paddingBottom: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <KeyRound size={17} color="#4e42be" />
                <span>Security & Password</span>
              </h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                Update your administrative password to keep your account secure.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div
              style={{
                marginBottom: "18px",
                padding: "10px 14px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                color: "#065f46",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              style={{
                marginBottom: "18px",
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
                fontSize: "13px",
              }}
            >
              {passwordError}
            </div>
          )}

          <div className="profile-form-grid">
            {/* Current Password */}
            <div className="profile-col-full">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <Lock size={14} /> Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #dedde6",
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            {/* New Password */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <KeyRound size={14} /> New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #dedde6",
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                <CheckCircle2 size={14} /> Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #dedde6",
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <Button
              type="submit"
              variant="primary"
              disabled={isChangingPassword}
              loading={isChangingPassword}
              style={{
                height: "40px",
                padding: "0 22px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <Lock size={15} />
              <span>Update Password</span>
            </Button>
          </div>
        </form>
      </section>

      {/* Dynamic QR Code Management Section */}
      <DynamicQrSection />

      {/* Confirmation Dialog for Removing Profile Photo */}
      {showRemoveConfirm && (
        <ConfirmDialog
          title="Remove profile photo?"
          message="Are you sure you want to remove your profile picture? Your account will revert to the default initials avatar."
          confirmLabel="Remove photo"
          danger={true}
          onConfirm={handleRemovePhoto}
          onClose={() => setShowRemoveConfirm(false)}
          isLoading={isRemovingPhoto}
        />
      )}

      {/* Change Admin Email Modal with Current Email OTP Verification */}
      <ChangeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        currentEmail={user?.email || ""}
      />
    </>
  );
}
