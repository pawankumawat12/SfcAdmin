import { useState, useEffect } from "react";
import { ArrowLeft, Mail, ShieldCheck, LockKeyhole, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useForgotPasswordMutation,
  useResendForgotPasswordOtpMutation,
  useVerifyForgotPasswordOtpMutation,
  useResetPasswordMutation,
} from "../../services/authApi";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Step 1: "email" -> Step 2: "otp" -> Step 3: "newPassword"
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formError, setFormError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [forgotPassword, { isLoading: isSendingEmail }] = useForgotPasswordMutation();
  const [resendOtp, { isLoading: isResending }] = useResendForgotPasswordOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyForgotPasswordOtpMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setFormError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setFormError("Email address is required.");
      return;
    }

    try {
      const res = await forgotPassword(trimmed).unwrap();
      toast.success(res?.message || "Verification code sent to your email.");
      setStep("otp");
      setResendTimer(30);
    } catch (err) {
      setFormError(err?.data?.message || "Email does not exist.");
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setFormError("");
    try {
      const res = await resendOtp(email.trim().toLowerCase()).unwrap();
      toast.success(res?.message || "A new verification code has been sent.");
      setResendTimer(30);
    } catch (err) {
      setFormError(err?.data?.message || "Failed to resend verification code.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFormError("");
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setFormError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      const res = await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: trimmedOtp,
      }).unwrap();

      setResetToken(res?.resetToken || "");
      toast.success("Code verified! Please enter your new password.");
      setStep("newPassword");
    } catch (err) {
      setFormError(err?.data?.message || "Invalid or expired verification code.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!password) {
      setFormError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        resetToken,
        password,
      }).unwrap();

      toast.success(res?.message || "Password reset successfully! Please log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setFormError(err?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">SFC BAKERS</p>

        {step === "email" && (
          <>
            <h1>Forgot password?</h1>
            <p className="muted">Enter your email and we’ll send a 6-digit verification code.</p>
            <form className="login-form" onSubmit={handleSendEmail}>
              <label>
                Email Address
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sfcbakers.com"
                  autoFocus
                  required
                />
              </label>

              {formError && <small className="error">{formError}</small>}

              <Button type="submit" disabled={isSendingEmail}>
                <Mail size={18} /> {isSendingEmail ? "Sending Code..." : "Send Verification Code"}
              </Button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h1>Verify Code</h1>
            <p className="muted">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <form className="login-form" onSubmit={handleVerifyOtp}>
              <label>
                6-Digit Verification Code
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  style={{
                    textAlign: "center",
                    letterSpacing: "6px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                  required
                />
              </label>

              {formError && <small className="error">{formError}</small>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 12px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isResending}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendTimer > 0 ? "#9ca3af" : "#7c3aed",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend Code"}
                </button>
              </div>

              <Button type="submit" disabled={isVerifying}>
                <ShieldCheck size={18} /> {isVerifying ? "Verifying..." : "Verify Code"}
              </Button>

              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setStep("email");
                  setFormError("");
                }}
                style={{ marginTop: "8px" }}
              >
                Change Email Address
              </button>
            </form>
          </>
        )}

        {step === "newPassword" && (
          <>
            <h1>Set New Password</h1>
            <p className="muted">Choose a secure new password for your account.</p>
            <form className="login-form" onSubmit={handleResetPassword}>
              <label>
                New Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  required
                />
              </label>

              <label>
                Confirm New Password
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </label>

              {formError && <small className="error">{formError}</small>}

              <Button type="submit" disabled={isResetting}>
                <LockKeyhole size={18} /> {isResetting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
          <Link
            to="/login"
            className="text-btn text-decoration-none"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#4f46e5",
              fontSize: "13.5px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
