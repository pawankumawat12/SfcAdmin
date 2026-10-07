import { useState, useEffect } from "react";
import { X, Mail, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import {
  useRequestEmailChangeMutation,
  useResendEmailChangeOtpMutation,
  useVerifyEmailChangeMutation,
  useCancelEmailChangeMutation,
} from "../services/authApi";

export default function ChangeEmailModal({ isOpen, onClose, currentEmail = "" }) {
  const [requestEmailChange, { isLoading: isRequesting }] = useRequestEmailChangeMutation();
  const [resendOtp, { isLoading: isResending }] = useResendEmailChangeOtpMutation();
  const [verifyEmailChange, { isLoading: isVerifying }] = useVerifyEmailChangeMutation();
  const [cancelEmailChange] = useCancelEmailChangeMutation();

  const [step, setStep] = useState(1); // 1: Enter New Email, 2: Enter OTP
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setNewEmail("");
      setOtp("");
      setError("");
      setCooldown(0);
    }
  }, [isOpen]);

  // Handle countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const validateEmailFormat = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedNew = newEmail.trim().toLowerCase();
    if (!trimmedNew) {
      setError("Please enter a new email address.");
      return;
    }

    if (!validateEmailFormat(trimmedNew)) {
      setError("Please enter a valid email format (e.g. admin@sfcbakers.com).");
      return;
    }

    if (currentEmail && trimmedNew === currentEmail.trim().toLowerCase()) {
      setError("New email cannot be the same as your current registered email.");
      return;
    }

    try {
      const res = await requestEmailChange({ newEmail: trimmedNew }).unwrap();

      if (res?.requiresOtp) {
        setStep(2);
        setCooldown(res?.retryAfter || 30);
        toast.success(
          res?.message || `Verification code sent to your current email (${currentEmail}).`
        );
      } else {
        toast.success(res?.message || "Email address updated successfully!");
        onClose();
      }
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to initiate email change.";
      setError(msg);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError("");

    try {
      const res = await resendOtp().unwrap();
      setCooldown(res?.retryAfter || 30);
      toast.success(
        res?.message || `Verification code resent to your current email (${currentEmail}).`
      );
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to resend verification code.";
      setError(msg);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      const res = await verifyEmailChange({
        otp: trimmedOtp,
        newEmail: newEmail.trim().toLowerCase(),
      }).unwrap();

      toast.success(res?.message || "Email address updated and verified successfully!");
      onClose();
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Invalid or expired verification code.";
      setError(msg);
    }
  };

  const handleCancelAndBack = async () => {
    try {
      await cancelEmailChange().unwrap();
    } catch {}
    setStep(1);
    setOtp("");
    setError("");
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isRequesting && !isVerifying) {
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRequesting && !isVerifying) {
          onClose();
        }
      }}
    >
      <section
        className="admin-dialog admin-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-email-title"
        style={{ maxWidth: "460px", padding: "28px" }}
      >
        <Button
          variant="plain"
          className="modal-close"
          onClick={onClose}
          disabled={isRequesting || isVerifying}
          aria-label="Close"
        >
          <X size={18} />
        </Button>

        {/* Icon Header */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: step === 1 ? "#eff6ff" : "#f0fdf4",
              color: step === 1 ? "#2563eb" : "#16a34a",
              display: "inline-grid",
              placeItems: "center",
              marginBottom: "12px",
            }}
          >
            {step === 1 ? <Mail size={24} /> : <KeyRound size={24} />}
          </div>
          <h2
            id="change-email-title"
            style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}
          >
            {step === 1 ? "Change Admin Email" : "Verify Current Email"}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
            {step === 1 ? (
              <>
                Current email: <strong>{currentEmail}</strong>
              </>
            ) : (
              <>
                Enter the OTP sent to your current email <strong>{currentEmail}</strong> to confirm your new email.
              </>
            )}
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "12.5px",
              color: "#dc2626",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Request Email Change Form */}
        {step === 1 && (
          <form onSubmit={handleRequestSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                New Email Address *
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. newadmin@sfcbakers.com"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  padding: "0 14px",
                  fontSize: "13.5px",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
              <small style={{ color: "#6b7280", fontSize: "11.5px", marginTop: "6px", display: "block" }}>
                If email verification is enabled, an authorization code will be sent to your current email.
              </small>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isRequesting}
                style={{ fontSize: "13px", height: "38px" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRequesting}
                loading={isRequesting}
                className="btn-primary"
                style={{
                  fontSize: "13px",
                  height: "38px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Enter Verification OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifySubmit}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "18px",
                fontSize: "12.5px",
                color: "#334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#64748b" }}>Current Email (OTP destination):</span>
                <strong>{currentEmail}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>New Email to be set:</span>
                <strong style={{ color: "#16a34a" }}>{newEmail}</strong>
              </div>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: "6px",
                  textAlign: "center",
                }}
              >
                Enter 6-Digit Verification Code *
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setOtp(val);
                  if (error) setError("");
                }}
                placeholder="••••••"
                required
                autoFocus
                style={{
                  width: "100%",
                  height: "46px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  textAlign: "center",
                  fontSize: "24px",
                  fontWeight: 700,
                  letterSpacing: "6px",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                fontSize: "12px",
              }}
            >
              <button
                type="button"
                onClick={handleCancelAndBack}
                disabled={isVerifying}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Change new email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || isResending}
                style={{
                  background: "none",
                  border: "none",
                  color: cooldown > 0 ? "#9ca3af" : "#16a34a",
                  fontWeight: 600,
                  cursor: cooldown > 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: 0,
                }}
              >
                <RefreshCw size={12} className={isResending ? "animate-spin" : ""} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isVerifying}
                style={{ fontSize: "13px", height: "38px" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isVerifying || otp.length < 6}
                loading={isVerifying}
                className="btn-primary"
                style={{
                  fontSize: "13px",
                  height: "38px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={14} />
                <span>Verify & Change Email</span>
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

