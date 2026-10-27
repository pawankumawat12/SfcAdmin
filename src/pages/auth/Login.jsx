import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, otpSchema } from "../../schema/auth.schema";
import { useDispatch } from "react-redux";
import { setUser } from "../../context/authSlice";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useSendOtpMutation,
  useAdminLoginMutation,
  useVerifyOtpMutation,
  useLazyGetMeQuery,
} from "../../services/authApi";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { getFirstAllowedRouteForManager } from "../../utils/managerPermissions";

export default function Login() {
  const RESEND_COOLDOWN_SECONDS = 30;
  const RESEND_LIMIT = 4;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [otpSent, setOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [adminLogin, { isLoading: sendingOtp }] = useAdminLoginMutation();
  const [sendOtp, { isLoading: resendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: verifyingOtp }] = useVerifyOtpMutation();
  const [getMe] = useLazyGetMeQuery();

  const [apiError, setApiError] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendCount, setResendCount] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(() => {
      setResendTimer((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendTimer]);

  const handleRequestOtp = async (data) => {
    try {
      setApiError("");
      const res = await adminLogin({ email: data.email, password: data.password }).unwrap();

      // Direct login completed without OTP (when IS_EMAIL_VERIFY=false)
      if (res?.accessToken || res?.token || (res?.user && !res?.requiresOtp)) {
        const token = res?.accessToken || res?.token || res?.user?.token;
        if (res?.user) {
          dispatch(setUser({ ...res.user, accessToken: token }));
        }
        toast.success(res?.message || "Welcome back! Logged in successfully.");
        const targetRoute =
          res?.user?.role === "manager"
            ? getFirstAllowedRouteForManager(res?.user?.permissions)
            : "/";
        navigate(targetRoute, { replace: true });
        return;
      }

      // Otherwise OTP is required (when IS_EMAIL_VERIFY=true)
      setPendingEmail(data.email);
      setOtpSent(true);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      toast.success(res?.message || "Credentials verified! Verification OTP sent to your email.");
    } catch (error) {
      const errorMsg =
        error?.data?.message || "Unable to sign in. Please try again.";
      setApiError(errorMsg);
    }
  };

  const handleSignIn = async (data) => {
    try {
      setApiError("");
      const res = await verifyOtp({ email: pendingEmail, otp: data.otp }).unwrap();
      const token = res?.accessToken || res?.token || res?.user?.token;
      
      // Token held in Redux memory (no localStorage)
      if (res?.user) {
        dispatch(setUser({ ...res.user, accessToken: token }));
      }

      toast.success("Welcome back! Logged in successfully.");
      const targetRoute =
        res?.user?.role === "manager"
          ? getFirstAllowedRouteForManager(res?.user?.permissions)
          : "/";
      navigate(targetRoute, { replace: true });
    } catch (error) {
      const errorMsg = error?.data?.message || "Invalid or expired OTP.";
      setApiError(errorMsg);
    }
  };

  const updateOtp = (index, value) => {
    const next = [...otpDigits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setOtpDigits(next);
    otpForm.setValue("otp", next.join(""), { shouldValidate: true });
    if (next[index] && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const pasteOtp = (event) => {
    event.preventDefault();
    const value = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = ["", "", "", "", "", ""];
    value.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpForm.setValue("otp", next.join(""), { shouldValidate: true });
  };
  const useAnotherEmail = () => {
    otpForm.reset({ otp: "" });
    setResendTimer(0);
    setResendCount(0);
    setPendingEmail("");
    setOtpSent(false);
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">SFC BAKERS</p>
        <h1>{otpSent ? "Verify your login" : "Welcome back"}</h1>

        <p className="muted">
          {otpSent
            ? `We sent a one-time code to ${pendingEmail}`
            : "Sign in to manage your storefront."}
        </p>
        {apiError && <small className="error">{apiError}</small>}

        {!otpSent ? (
          <form
            onSubmit={emailForm.handleSubmit(handleRequestOtp)}
            className="login-form"
          >
            {/* EMAIL */}
            <div>
              <label htmlFor="email">Email</label>

              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@deepakfoods.com"
                {...emailForm.register("email")}
                className="input-wrapper"
              />

              {emailForm.formState.errors.email && (
                <small className="error">
                  {emailForm.formState.errors.email.message}
                </small>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label htmlFor="password">Password</label>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="System@123"
                {...emailForm.register("password")}
                style={{width: "100%"}}
              />

              {emailForm.formState.errors.password && (
                <small className="error">
                  {emailForm.formState.errors.password.message}
                </small>
              )}
            </div>

            {/* REMEMBER ME */}
            <div className="remember-row">
              <label className="remember-label">
                <Input type="checkbox" />

                <span>Remember me</span>
              </label>
            </div>

            <Button type="submit" disabled={sendingOtp}>
              <LockKeyhole size={18} />
              {sendingOtp ? "Signing in..." : "Sign In"}
            </Button>
            <Link
              to="/forgot-password"
              className="text-btn text-center mt-2 d-inline-block text-decoration-none"
            >
              Forgot password?
            </Link>
          </form> 
        ) : (
          <form
            onSubmit={otpForm.handleSubmit(handleSignIn)}
            className="login-form"
          >
            {/* OTP */}
            <div>
              <label htmlFor="otp">One-time password</label>

              <Input type="hidden" {...otpForm.register("otp")} />
              <div className="otp-inputs">
                {otpDigits.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    autoFocus={index === 0}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    aria-label={`OTP digit ${index + 1}`}
                    onChange={(event) => updateOtp(index, event.target.value)}
                    onPaste={pasteOtp}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !digit && index > 0)
                        otpRefs.current[index - 1]?.focus();
                    }}
                  />
                ))}
              </div>

              {otpForm.formState.errors.otp && (
                <small className="error">
                  {otpForm.formState.errors.otp.message}
                </small>
              )}
            </div>

            <Button type="submit">
              {verifyingOtp ? "Verifying..." : "Verify & sign in"}
            </Button>
            <small className="muted mt-2">
              {resendCount >= RESEND_LIMIT
                ? "All 4 resend attempts used. Please try again in 10 minutes."
                : `${RESEND_LIMIT - resendCount} resend attempt${RESEND_LIMIT - resendCount === 1 ? "" : "s"} remaining`}
            </small>
            <Button
              type="button"
              variant="text"
              disabled={resendingOtp || resendTimer > 0 || resendCount >= RESEND_LIMIT}
              onClick={async () => {
                try {
                  setApiError("");
                  const response = await sendOtp(pendingEmail).unwrap();
                  setResendCount(response.data?.resendCount ?? resendCount + 1);
                  setResendTimer(response.data?.retryAfter ?? RESEND_COOLDOWN_SECONDS);
                  toast.success("A fresh OTP has been sent to your email.");
                } catch (error) {
                  if (error?.data?.retryAfter) setResendTimer(error.data.retryAfter);
                  const errorMsg = error?.data?.message || "Unable to resend OTP.";
                  setApiError(errorMsg);
                }
              }}
            >
              {resendingOtp ? "Resending..." : resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
            </Button>

            <Button
              type="button"
              variant="text"
              onClick={useAnotherEmail}
            >
              <ArrowLeft size={16} />
              Use another email
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
