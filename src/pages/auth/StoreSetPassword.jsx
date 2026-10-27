import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { LockKeyhole, Eye, EyeOff, RefreshCw, AlertCircle } from "lucide-react";
import { useVerifySetupTokenQuery, useSetStorePasswordMutation } from "../../services/storeApi";
import { setUser } from "../../context/authSlice";
import { getFirstAllowedRouteForManager } from "../../utils/managerPermissions";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function StoreSetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    data: tokenData,
    isLoading: verifyingToken,
    isError: tokenError,
  } = useVerifySetupTokenQuery(token, { skip: !token });

  const [setPassword, { isLoading: isSubmitting }] = useSetStorePasswordMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("password");
  const isManagerInvite = tokenData?.role === "manager";
  const portalEyebrow = isManagerInvite
    ? "SFC BAKERS • MANAGER PORTAL"
    : "SFC BAKERS • STORE OWNER PORTAL";

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const res = await setPassword({
        token,
        password: values.password,
      }).unwrap();

      const authToken = res?.accessToken || res?.token || res?.user?.token;
      if (res?.user) {
        dispatch(
          setUser({
            ...res.user,
            accessToken: authToken,
          })
        );
      }

      toast.success(res?.message || "Password set successfully! Welcome to your workspace.");
      const targetRoute =
        res?.user?.role === "manager"
          ? getFirstAllowedRouteForManager(res?.user?.permissions)
          : "/";
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const msg = err?.data?.message || "Failed to set password. Please try again.";
      setApiError(msg);
    }
  };

  // Case 1: Missing token in URL
  if (!token) {
    return (
      <main className="login-page">
        <section className="login-card" style={{ textAlign: "center" }}>
          <p className="eyebrow">SFC BAKERS &bull; ADMIN PORTAL</p>
          <div
            style={{
              display: "inline-flex",
              padding: "16px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              margin: "12px auto 16px",
            }}
          >
            <AlertCircle size={36} />
          </div>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Missing Setup Token</h1>
          <p className="muted" style={{ marginBottom: "24px" }}>
            No setup token was provided in the link. Please check your email or contact the administrator.
          </p>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <Button style={{ width: "100%" }}>Back to Sign In</Button>
          </Link>
        </section>
      </main>
    );
  }

  // Case 2: Loading / Verifying Token
  if (verifyingToken) {
    return (
      <main className="login-page">
        <section className="login-card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <p className="eyebrow">SFC BAKERS &bull; ADMIN PORTAL</p>
          <RefreshCw
            size={32}
            className="spin"
            style={{ margin: "20px auto 12px", color: "#166534" }}
          />
          <h2 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 6px" }}>Verifying Link...</h2>
          <p className="muted" style={{ margin: 0 }}>
            Please wait while we verify your password setup link.
          </p>
        </section>
      </main>
    );
  }

  // Case 3: Expired or Invalid Token
  if (tokenError || (!tokenData?.valid && !tokenData?.success)) {
    return (
      <main className="login-page">
        <section className="login-card" style={{ textAlign: "center" }}>
          <p className="eyebrow">SFC BAKERS &bull; ADMIN PORTAL</p>
          <div
            style={{
              display: "inline-flex",
              padding: "16px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              margin: "12px auto 16px",
            }}
          >
            <AlertCircle size={36} />
          </div>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Link Expired or Invalid</h1>
          <p className="muted" style={{ marginBottom: "24px" }}>
            This password setup link has expired or has already been used. Please contact the administrator or visit the login page.
          </p>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <Button style={{ width: "100%" }}>Go to Sign In</Button>
          </Link>
        </section>
      </main>
    );
  }

  // Case 4: Valid Token - Standard Auth Form Matching Login.jsx UI
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">{portalEyebrow}</p>
        <h1>{isManagerInvite ? "Set Manager Password" : "Set Store Owner Password"}</h1>
        <p className="muted">
          {isManagerInvite ? (
            <>
              Welcome, <strong>{tokenData.ownerName || "Manager"}</strong>! Set your permanent
              password to access your assigned admin workspace.
            </>
          ) : (
            <>
              Welcome, <strong>{tokenData.ownerName || "Partner"}</strong>! Set your permanent
              password for <strong>{tokenData.storeName || "your store"}</strong>.
            </>
          )}
        </p>

        {apiError && <small className="error">{apiError}</small>}

        <form className="login-form" noValidate onSubmit={handleSubmit(onSubmit)}>
          {/* Email (Readonly) */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="store-email">
              {isManagerInvite ? "Manager Email" : "Store Owner Email"}
            </label>
            <Input
              id="store-email"
              type="email"
              value={tokenData.email || ""}
              disabled
              style={{
                background: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
                fontWeight: 600,
              }}
            />
          </div>

          {/* New Password */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="new-password">New Password *</label>
            <div className="password-wrapper">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <small className="error">{errors.password.message}</small>}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="confirm-password">Confirm Password *</label>
            <div className="password-wrapper">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your new password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (val) => val === passwordVal || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="password-toggle"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirm}
                title={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <small className="error">{errors.confirmPassword.message}</small>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", background: "#166534" }}
          >
            <LockKeyhole size={18} />
            {isSubmitting ? "Setting Password..." : "Set Password & Sign In"}
          </Button>

          <div style={{ textAlign: "center", marginTop: "14px" }}>
            <Link
              to="/login"
              className="text-btn text-center d-inline-block text-decoration-none"
              style={{ fontSize: "12px" }}
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
