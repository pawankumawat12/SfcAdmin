import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../components/ui/Button";
import {
  useGetThemeQuery,
  useUpdateThemeMutation,
  useGetFooterQuery,
  useUpdateFooterMutation,
  useGetLogoQuery,
  useUpdateLogoMutation,
  useGetSettingPricingQuery,
  useUpdateSettingPricingMutation,
  useGetEmailSettingsQuery,
  useSendEmailOtpMutation,
  useUpdateEmailSettingsMutation,
  useTestEmailMutation,
  useGetDeveloperSettingsQuery,
  useUpdateDeveloperSettingsMutation,
} from "../../services/settingsApi";
import toast from "react-hot-toast";
import StoreLocationPicker from "./StoreLocationPicker";
import {
  Palette,
  Sun,
  Moon,
  Check,
  Sparkles,
  RefreshCw,
  Sliders,
  Image,
  Upload,
  Phone,
  Mail,
  MapPin,
  Navigation,
  Clock,
  Percent,
  Truck,
  ShoppingCart,
  Package,
  Banknote,
  CreditCard,
  ShoppingCartIcon,
  Receipt,
  Server,
  ShieldCheck,
  Send,
  Key,
  Lock,
  AlertCircle,
  CheckCircle2,
  X,
  Store,
  Power,
  Code,
} from "lucide-react";
import { FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa";
import { toAssetUrl } from "../../utils/assetUrl";
import { useShopStatus } from "../../utils/useShopStatus";

const DEFAULT_FALLBACK_COLOR_THEMES = [
  {
    id: "matcha",
    name: "Matcha Green",
    color: "#7cb324",
    desc: "Organic matcha & fresh espresso green",
    accent: "#f0f7e6",
  },
  {
    id: "caramel",
    name: "Espresso Caramel",
    color: "#e86b1a",
    desc: "Warm roasted caramel and spiced amber",
    accent: "#fef3eb",
  },
  {
    id: "mocha",
    name: "Golden Mocha",
    color: "#f5a623",
    desc: "Golden honey, cocoa and rich crema",
    accent: "#fef8ed",
  },
  {
    id: "berry",
    name: "Velvet Berry",
    color: "#e11d48",
    desc: "Rich wild berry & velvet roast red",
    accent: "#fef1f2",
  },
];

const generalSettings = [
  {
    id: "se-1",
    setting: "Store status",
    value: "Open for orders",
    status: "Active",
  },
  { id: "se-2", setting: "Delivery radius", value: "8 km", status: "Active" },
  {
    id: "se-3",
    setting: "Ordering mode",
    value: "Dine-in / Delivery",
    status: "Active",
  },
];

/* ─── Reusable inline-style card ─── */
const cardStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #ececf3",
  padding: "24px",
  marginBottom: "28px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
};

const sectionLabel = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#52526c",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #ececf3",
  fontSize: "14px",
  color: "#24243b",
  outline: "none",
  transition: "border 0.2s",
};

function StatusBanner({ text, type }) {
  if (!text) return null;
  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: "10px",
        marginBottom: "18px",
        fontSize: "13px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: type === "success" ? "#ecfdf5" : "#fef2f2",
        color: type === "success" ? "#065f46" : "#991b1b",
        border: type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
      }}
    >
      {type === "success" ? <Check size={16} /> : <Sliders size={16} />}
      {text}
    </div>
  );
}

export default function Settings() {
  const { isOpen: isShopOpen, toggleShopStatus } = useShopStatus();

  /* ─── THEME STATE ─── */
  const { data: themeResponse, isLoading, refetch } = useGetThemeQuery();
  const { data: priceSetting, isLoading: priceSettingLoading } =
    useGetSettingPricingQuery();
  const [updateOrderPricingSettings, { isLoading: pricingLoading }] =
    useUpdateSettingPricingMutation();
  const [updateTheme, { isLoading: isSaving }] = useUpdateThemeMutation();
  const [selectedTheme, setSelectedTheme] = useState("light");
  const [selectedColor, setSelectedColor] = useState("matcha");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [pricingStatus, setPricingStatus] = useState({ text: "", type: "" });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      gst_percent: "",
      tax_inclusive: false,
      delivery_charge_type: "fixed",
      delivery_charge_value: "",
      free_delivery_threshold: "",
      max_delivery_distance: "",
      packaging_fee: "",
      cod_fee: "",
      platform_fee: "",
      minimum_order_amount: "",
      store_latitude: "",
      store_longitude: "",
      discount_percent: "",
      store_commission_type: "percent",
      store_commission_value: "",
      store_commission_min_order_amount: "",
      developer_commission_type: "percent",
      developer_commission_value: "",
    },
  });

  const storeLat = watch("store_latitude");
  const storeLng = watch("store_longitude");

  const handleLocationPicked = (lat, lng) => {
    setValue("store_latitude", lat, { shouldDirty: true });
    setValue("store_longitude", lng, { shouldDirty: true });
  };

  const availableColorThemes =
    themeResponse?.data?.availableColorThemes &&
      themeResponse.data.availableColorThemes.length > 0
      ? themeResponse.data.availableColorThemes
      : DEFAULT_FALLBACK_COLOR_THEMES;

  useEffect(() => {
    if (priceSetting?.data) {
      reset({
        gst_percent: priceSetting.data.gst_percent ?? "",
        tax_inclusive: priceSetting.data.tax_inclusive ?? false,
        delivery_charge_type: priceSetting.data.delivery_charge_type ?? "fixed",
        delivery_charge_value: priceSetting.data.delivery_charge_value ?? "",
        free_delivery_threshold:
          priceSetting.data.free_delivery_threshold ?? "",
        max_delivery_distance: priceSetting.data.max_delivery_distance ?? "",
        packaging_fee: priceSetting.data.packaging_fee ?? "",
        cod_fee: priceSetting.data.cod_fee ?? "",
        platform_fee: priceSetting.data.platform_fee ?? "",
        minimum_order_amount: priceSetting.data.minimum_order_amount ?? "",
        store_latitude: priceSetting.data.store_latitude ?? "",
        store_longitude: priceSetting.data.store_longitude ?? "",
        discount_percent: priceSetting.data.discount_percent ?? "",
        store_commission_type: priceSetting.data.store_commission_type ?? "percent",
        store_commission_value: priceSetting.data.store_commission_value ?? "",
        store_commission_min_order_amount: priceSetting.data.store_commission_min_order_amount ?? "",
        developer_commission_type: priceSetting.data.developer_commission_type ?? "percent",
        developer_commission_value: priceSetting.data.developer_commission_value ?? "",
      });
    }
  }, [priceSetting, reset]);

  const onSubmitPricing = async (data) => {
    try {
      setPricingStatus({ text: "", type: "" });
      const payload = {
        gst_percent: Number(data.gst_percent),
        tax_inclusive: Boolean(data.tax_inclusive),

        delivery_charge_type: data.delivery_charge_type,
        delivery_charge_value: Number(data.delivery_charge_value),

        free_delivery_threshold: Number(data.free_delivery_threshold),
        max_delivery_distance: Number(data.max_delivery_distance),

        packaging_fee: Number(data.packaging_fee),
        cod_fee: Number(data.cod_fee),
        platform_fee: Number(data.platform_fee),

        minimum_order_amount: Number(data.minimum_order_amount),

        store_latitude: Number(data.store_latitude),
        store_longitude: Number(data.store_longitude),

        discount_percent: Number(data.discount_percent),

        store_commission_type: data.store_commission_type || "percent",
        store_commission_value: Number(data.store_commission_value) || 0,
        store_commission_min_order_amount: Number(data.store_commission_min_order_amount) || 0,

        developer_commission_type: data.developer_commission_type || "percent",
        developer_commission_value: Number(data.developer_commission_value) || 0,
      };

      const response = await updateOrderPricingSettings(payload).unwrap();
      console.log("Order pricing updated:", response);
      setPricingStatus({
        text: "Order pricing settings saved successfully! Storefront cart and checkout calculations updated.",
        type: "success",
      });
      setTimeout(() => setPricingStatus({ text: "", type: "" }), 4000);
    } catch (error) {
      console.error("Failed to update order pricing:", error);
      setPricingStatus({
        text: error?.data?.message || "Failed to update order pricing settings",
        type: "error",
      });
    }
  };
  useEffect(() => {
    if (themeResponse?.data) {
      setSelectedTheme(themeResponse.data.theme || "light");
      setSelectedColor(themeResponse.data.colorTheme || "matcha");
    }
  }, [themeResponse]);

  const handleSaveTheme = async () => {
    try {
      setStatusMessage({ text: "", type: "" });
      await updateTheme({
        theme: selectedTheme,
        colorTheme: selectedColor,
      }).unwrap();
      setStatusMessage({
        text: "Store theme settings saved successfully! Storefront UI updated.",
        type: "success",
      });
      setTimeout(() => setStatusMessage({ text: "", type: "" }), 4000);
    } catch (err) {
      setStatusMessage({
        text: err?.data?.message || "Failed to update theme settings",
        type: "error",
      });
    }
  };

  const currentColorObj =
    availableColorThemes.find((c) => c.id === selectedColor) ||
    availableColorThemes[0] ||
    DEFAULT_FALLBACK_COLOR_THEMES[0];

  /* ─── LOGO STATE ─── */
  const { data: logoResponse, isLoading: logoLoading } = useGetLogoQuery();

  const [updateLogo, { isLoading: logoSaving }] = useUpdateLogoMutation();
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoStatus, setLogoStatus] = useState({ text: "", type: "" });
  const fileInputRef = useRef(null);

  const currentLogoUrl = logoResponse?.data?.logo_url
    ? toAssetUrl(logoResponse.data.logo_url)
    : null;

  const handleLogoSelect = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setLogoPreview(URL.createObjectURL(file));

      setLogoStatus({ text: "", type: "" });
      const formData = new FormData();
      formData.append("logo", file);
      await updateLogo(formData).unwrap();
      setLogoFile(null);
      setLogoPreview(null);
      setLogoStatus({ text: "Logo updated successfully!", type: "success" });
      setTimeout(() => setLogoStatus({ text: "", type: "" }), 4000);
    } catch (err) {
      setLogoStatus({
        text: err?.data?.message || "Failed to update logo",
        type: "error",
      });
    }
  };

  /* ─── FOOTER STATE ─── */
  const { data: footerResponse, isLoading: footerLoading } =
    useGetFooterQuery();
  const [updateFooter, { isLoading: footerSaving }] = useUpdateFooterMutation();
  const [footerForm, setFooterForm] = useState({
    phone_number: "",
    email: "",
    location: "",
    working_hours: "",
    instagram: "",
    facebook: "",
    twitter: "",
  });

  const [footerStatus, setFooterStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    if (footerResponse?.data) {
      setFooterForm({
        phone_number: footerResponse.data.phone_number || "",
        email: footerResponse.data.email || "",
        location: footerResponse.data.location || "",
        working_hours: footerResponse.data.working_hours || "",
        instagram: footerResponse.data.instagram || "",
        facebook: footerResponse.data.facebook || "",
        twitter: footerResponse.data.twitter || "",
      });
    }
  }, [footerResponse]);

  const handleFooterChange = (field) => (e) =>
    setFooterForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSaveFooter = async () => {
    try {
      setFooterStatus({ text: "", type: "" });
      await updateFooter(footerForm).unwrap();
      setFooterStatus({
        text: "Footer settings saved successfully!",
        type: "success",
      });
      setTimeout(() => setFooterStatus({ text: "", type: "" }), 4000);
    } catch (err) {
      setFooterStatus({
        text: err?.data?.message || "Failed to update footer settings",
        type: "error",
      });
    }
  };

  /* ─── RESEND CONFIGURATION STATE ─── */
  const { data: emailResponse, isLoading: emailLoading } = useGetEmailSettingsQuery();
  const [updateEmailSettings, { isLoading: emailSaving }] = useUpdateEmailSettingsMutation();
  const [sendEmailOtp, { isLoading: otpSending }] = useSendEmailOtpMutation();
  const [testEmail, { isLoading: emailTesting }] = useTestEmailMutation();

  const [emailForm, setEmailForm] = useState({
    api_key: "",
    from_email: "noreply@sfcbakers.com",
    from_name: "SFC Bakers",
    is_enabled: true,
  });
  const [originalEmailSettings, setOriginalEmailSettings] = useState(null);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ text: "", type: "" });
  const [testStatus, setTestStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    if (emailResponse?.data) {
      setEmailForm({
        api_key: emailResponse.data.api_key || "",
        from_email: emailResponse.data.from_email || "noreply@sfcbakers.com",
        from_name: emailResponse.data.from_name || "SFC Bakers",
        is_enabled: emailResponse.data.is_enabled !== false,
      });
      setOriginalEmailSettings(emailResponse.data);
      if (!testEmailRecipient && emailResponse.data.from_email) {
        setTestEmailRecipient(emailResponse.data.from_email);
      }
    }
  }, [emailResponse]);

  useEffect(() => {
    let timer;
    if (otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpTimer]);

  const handleEmailChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setEmailForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEmailSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setEmailStatus({ text: "", type: "" });

      if (!emailForm.from_email?.trim()) {
        setEmailStatus({ text: "From Email Address is required.", type: "error" });
        return;
      }

      const isApiKeyChanged =
        isEditingApiKey &&
        emailForm.api_key &&
        !emailForm.api_key.includes("•") &&
        emailForm.api_key.trim() !== (originalEmailSettings?.api_key || "");

      const isFromEmailChanged =
        emailForm.from_email.trim().toLowerCase() !==
        (originalEmailSettings?.from_email || "").trim().toLowerCase();

      // If sensitive credentials (API key or From Email) changed, request OTP before saving
      if (isApiKeyChanged || isFromEmailChanged) {
        setOtpError("");
        setOtpInput("");
        await sendEmailOtp(emailForm).unwrap();
        setShowOtpModal(true);
        setOtpTimer(60);
        toast.success("Security verification code dispatched to your admin email address.");
        return;
      }

      // If neither API key nor From Email changed, commit directly
      await updateEmailSettings(emailForm).unwrap();
      setIsEditingApiKey(false);
      setEmailStatus({
        text: "Resend email configuration updated and saved successfully!",
        type: "success",
      });
      toast.success("Resend settings updated!");
      setTimeout(() => setEmailStatus({ text: "", type: "" }), 5000);
    } catch (err) {
      setEmailStatus({
        text: err?.data?.message || "Failed to update Resend settings",
        type: "error",
      });
      toast.error(err?.data?.message || "Failed to update Resend settings");
    }
  };

  const handleVerifyOtpAndSave = async (e) => {
    if (e) e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setOtpError("");
      await updateEmailSettings({
        ...emailForm,
        otp: otpInput.trim(),
      }).unwrap();

      setShowOtpModal(false);
      setIsEditingApiKey(false);
      setOtpInput("");
      setEmailStatus({
        text: "Resend credentials verified and saved successfully!",
        type: "success",
      });
      toast.success("Resend credentials successfully verified and updated!");
      setTimeout(() => setEmailStatus({ text: "", type: "" }), 5000);
    } catch (err) {
      setOtpError(err?.data?.message || "Invalid or expired verification code.");
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    try {
      setOtpError("");
      await sendEmailOtp(emailForm).unwrap();
      setOtpTimer(60);
      toast.success("New verification code dispatched to your admin email.");
    } catch (err) {
      setOtpError(err?.data?.message || "Failed to resend verification code.");
    }
  };

  const handleRunTestEmail = async () => {
    try {
      setTestStatus({ text: "", type: "" });
      const recipient = testEmailRecipient.trim();
      if (!recipient) {
        setTestStatus({
          text: "Please enter a valid recipient email address for testing.",
          type: "error",
        });
        return;
      }

      const res = await testEmail({
        to: recipient,
        api_key: isEditingApiKey ? emailForm.api_key : undefined,
        from_email: emailForm.from_email,
        from_name: emailForm.from_name,
      }).unwrap();

      setTestStatus({
        text: res?.message || `Test email successfully dispatched to ${recipient}!`,
        type: "success",
      });
      toast.success(res?.message || "Test email dispatched successfully!");
    } catch (err) {
      setTestStatus({
        text:
          err?.data?.message ||
          "Resend delivery failed. Please verify API key, sender email, and domain status.",
        type: "error",
      });
      toast.error(err?.data?.message || "Test email failed.");
    }
  };

  /* ─── DEVELOPER BRANDING & INQUIRY SETTINGS STATE ─── */
  const { data: devResponse, isLoading: devLoading } = useGetDeveloperSettingsQuery();
  const [updateDeveloperSettings, { isLoading: devSaving }] = useUpdateDeveloperSettingsMutation();

  const [devForm, setDevForm] = useState({
    is_enabled: true,
    developer_name: "Pawan Kumawat",
    developer_email: "pawankumawat9009@gmail.com",
    developer_phone: "7690939596",
    developer_whatsapp: "917690939596",
    developer_tagline: "Custom Food Ordering Websites, Cafe Apps & Enterprise Software",
    custom_inquiry_message: "Hi Pawan, I saw the SFC Bakers website and want to build a similar website/app for my business.",
    show_in_frontend: true,
    show_in_store_dashboard: true,
  });
  const [devStatus, setDevStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    if (devResponse?.data) {
      setDevForm({
        is_enabled: devResponse.data.is_enabled !== false,
        developer_name: devResponse.data.developer_name || "Pawan Kumawat",
        developer_email: devResponse.data.developer_email || "pawankumawat9009@gmail.com",
        developer_phone: devResponse.data.developer_phone || "7690939596",
        developer_whatsapp: devResponse.data.developer_whatsapp || "917690939596",
        developer_tagline: devResponse.data.developer_tagline || "Custom Food Ordering Websites, Cafe Apps & Enterprise Software",
        custom_inquiry_message: devResponse.data.custom_inquiry_message || "Hi Pawan, I saw the SFC Bakers website and want to build a similar website/app for my business.",
        show_in_frontend: devResponse.data.show_in_frontend !== false,
        show_in_store_dashboard: devResponse.data.show_in_store_dashboard !== false,
      });
    }
  }, [devResponse]);

  const handleDevChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDevForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveDeveloper = async (e) => {
    if (e) e.preventDefault();
    try {
      setDevStatus({ text: "", type: "" });
      await updateDeveloperSettings(devForm).unwrap();
      setDevStatus({ text: "Developer settings saved successfully!", type: "success" });
      toast.success("Developer settings updated successfully!");
      setTimeout(() => setDevStatus({ text: "", type: "" }), 4000);
    } catch (err) {
      console.error(err);
      setDevStatus({ text: err?.data?.message || "Failed to update developer settings", type: "error" });
      toast.error(err?.data?.message || "Failed to update developer settings");
    }
  };

  /* ─── Footer form field config ─── */
  const footerFields = [
    {
      key: "phone_number",
      label: "Phone Number",
      icon: Phone,
      placeholder: "+91 98765 43210",
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      placeholder: "hello@sfcbakers.com",
    },
    {
      key: "location",
      label: "Location / Address",
      icon: MapPin,
      placeholder: "123 Main Street, Jaipur",
    },
    {
      key: "working_hours",
      label: "Working Hours",
      icon: Clock,
      placeholder: "Mon-Fri: 10AM-11PM",
    },
    {
      key: "instagram",
      label: "Instagram URL",
      icon: FaInstagram,
      placeholder: "https://instagram.com/sfccafe",
    },
    {
      key: "facebook",
      label: "Facebook URL",
      icon: FaFacebook,
      placeholder: "https://facebook.com/sfccafe",
    },
    {
      key: "twitter",
      label: "Twitter / X URL",
      icon: FaTwitter,
      placeholder: "https://x.com/sfccafe",
    },
  ];

  //order pricing
  const pricingFields = [
    {
      key: "gst_percent",
      label: "GST Percentage",
      icon: Percent,
      type: "number",
    },
    {
      key: "delivery_charge_value",
      label: "Delivery Charge / KM",
      icon: Truck,
      type: "number",
    },
    {
      key: "free_delivery_threshold",
      label: "Free Delivery Threshold",
      icon: ShoppingCart,
      type: "number",
    },
    {
      key: "max_delivery_distance",
      label: "Maximum Delivery Distance (KM)",
      icon: MapPin,
      type: "number",
    },
    {
      key: "packaging_fee",
      label: "Packaging Fee",
      icon: Package,
      type: "number",
    },
    {
      key: "cod_fee",
      label: "COD Fee",
      icon: Banknote,
      type: "number",
    },
    {
      key: "platform_fee",
      label: "Platform Fee",
      icon: CreditCard,
      type: "number",
    },
    {
      key: "minimum_order_amount",
      label: "Minimum Order Amount",
      icon: ShoppingCartIcon,
      type: "number",
    },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Settings</h1>
          <p>
            Configure storefront appearance, logo, footer details, and
            preferences.
          </p>
        </div>
      </div>

      {/* 0. SHOP STATUS & STORE AVAILABILITY SETTING */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: isShopOpen ? "#ecfdf5" : "#fef2f2",
                display: "grid",
                placeItems: "center",
                color: isShopOpen ? "#16a34a" : "#dc2626",
                transition: "all 0.2s ease",
              }}
            >
              <Store size={22} />
            </div>  
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#24243b",
                  }}
                >
                  Shop Status & Store Availability
                </h2>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: isShopOpen ? "#dcfce7" : "#fee2e2",
                    color: isShopOpen ? "#15803d" : "#991b1b",
                    border: isShopOpen ? "1px solid #86efac" : "1px solid #fca5a5",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {isShopOpen ? "Shop Open" : "Shop Closed"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#8b8ba0" }}>
                Switch store availability on or off to control whether customers can place orders.
              </p>
            </div>
          </div>

          {/* Quick Toggle Switch in Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            
            <button
              type="button"
              role="switch"
              aria-checked={isShopOpen}
              onClick={toggleShopStatus}
              title={isShopOpen ? "Click to set Shop Closed" : "Click to set Shop Open"}
              style={{
                position: "relative",
                width: "56px",
                height: "30px",
                borderRadius: "9999px",
                background: isShopOpen ? "#16a34a" : "#dc2626",
                border: "none",
                cursor: "pointer",
                padding: "3px",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.25s ease",
                outline: "none",
                boxShadow: isShopOpen
                  ? "0 2px 8px rgba(22,163,74,0.3)"
                  : "0 2px 8px rgba(220,38,38,0.3)",
              }}
            >
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                  transform: isShopOpen ? "translateX(26px)" : "translateX(0px)",
                  transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }}
              />
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={14} style={{ color: "#f59e0b" }} />
          <span>
            <strong>Instant control:</strong> You can also toggle the shop status anytime directly from the top navigation bar of the Admin Panel.
          </span>
        </div>
      </section>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "#eef2ff",
              display: "grid",
              placeItems: "center",
              color: "#6366f1",
            }}
          >
            <Image size={22} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 700,
                color: "#24243b",
              }}
            >
              Site Logo
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#8b8ba0" }}>
              Upload and manage your storefront logo image.
            </p>
          </div>
        </div>

        <StatusBanner text={logoStatus.text} type={logoStatus.type} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {/* Current / Preview */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "16px",
              border: "2px dashed #dcdbe8",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              background: "#fafafc",
            }}
          >
            {logoPreview || currentLogoUrl ? (
              <img
                src={logoPreview || currentLogoUrl}
                alt="Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "8px",
                }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#8b8ba0" }}>
                <Image size={32} />
                <p style={{ fontSize: "11px", margin: "4px 0 0" }}>No logo</p>
              </div>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoSelect}
              style={{ display: "none" }}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Upload size={16} />
              Choose Logo
            </Button>
            <p style={{ fontSize: "11px", color: "#8b8ba0", margin: 0 }}>
              JPG, PNG or WEBP. Max 10 MB.
            </p>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "#fef3c7",
              display: "grid",
              placeItems: "center",
              color: "#d97706",
            }}
          >
            <MapPin size={22} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 700,
                color: "#24243b",
              }}
            >
              Footer Details
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#8b8ba0" }}>
              Contact info, working hours, and social links displayed in the
              storefront footer.
            </p>
          </div>
        </div>

        <StatusBanner text={footerStatus.text} type={footerStatus.type} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
            marginBottom: "24px",
          }}
        >
          {footerFields.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key}>
              <label style={sectionLabel}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </span>
              </label>
              <input
                type="text"
                value={footerForm[key]}
                onChange={handleFooterChange(key)}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="button"
            onClick={handleSaveFooter}
            disabled={footerSaving || footerLoading}
            style={{
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {footerSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Footer Settings
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ─── DEVELOPER BRANDING & INQUIRY SETTINGS CARD ─── */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "22px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Code size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#24243b",
                }}
              >
                Developer Branding & Client Lead Settings
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#8b8ba0" }}>
                Control developer attribution, WhatsApp inquiries, and portfolio lead generation across Frontend & Store Dashboard.
              </p>
            </div>
          </div>
        </div>

        <StatusBanner text={devStatus.text} type={devStatus.type} />

        {/* DEVELOPER DETAILS GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Developer Name */}
          <div>
            <label style={sectionLabel}>Developer Name</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. Pawan Kumawat"
              value={devForm.developer_name}
              onChange={handleDevChange("developer_name")}
            />
          </div>

          {/* Developer Email */}
          <div>
            <label style={sectionLabel}>Developer Email</label>
            <input
              type="email"
              style={inputStyle}
              placeholder="e.g. pawankumawat9009@gmail.com"
              value={devForm.developer_email}
              onChange={handleDevChange("developer_email")}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label style={sectionLabel}>Phone Number</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. 7690939596"
              value={devForm.developer_phone}
              onChange={handleDevChange("developer_phone")}
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label style={sectionLabel}>WhatsApp Number (With Country Code)</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. 917690939596"
              value={devForm.developer_whatsapp}
              onChange={handleDevChange("developer_whatsapp")}
            />
          </div>
        </div>

        {/* Tagline & Inquiry Message */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={sectionLabel}>Services Tagline (Shown in Footer)</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. Custom Food Ordering Websites, Cafe Apps & Enterprise Software"
              value={devForm.developer_tagline}
              onChange={handleDevChange("developer_tagline")}
            />
          </div>

          <div>
            <label style={sectionLabel}>Pre-Filled WhatsApp Message</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="e.g. Hi Pawan, I saw the SFC Bakers website and want to build a similar website for my business."
              value={devForm.custom_inquiry_message}
              onChange={handleDevChange("custom_inquiry_message")}
            />
            <span style={{ fontSize: "11px", color: "#8b8ba0", marginTop: "4px", display: "block" }}>
              When a visitor or store owner clicks "Build Your Website" or "WhatsApp Developer", this message opens automatically.
            </span>
          </div>
        </div>

        {/* DISPLAY TOGGLE SWITCHES */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={devForm.show_in_frontend}
              onChange={handleDevChange("show_in_frontend")}
              style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              Show on Customer Frontend Footer
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={devForm.show_in_store_dashboard}
              onChange={handleDevChange("show_in_store_dashboard")}
              style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              Show on Store Owner Sidebar
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={devForm.is_enabled}
              onChange={handleDevChange("is_enabled")}
              style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              Enable Developer Branding Globally
            </span>
          </label>
        </div>

        {/* SAVE BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="button"
            onClick={handleSaveDeveloper}
            disabled={devSaving || devLoading}
            style={{
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {devSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Developer Settings
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ─── RESEND EMAIL CONFIGURATION CARD ─── */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "22px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#ede9fe",
                display: "grid",
                placeItems: "center",
                color: "#7c3aed",
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#24243b",
                  }}
                >
                  Resend Email Configuration
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    backgroundColor: emailForm.is_enabled
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: emailForm.is_enabled ? "#166534" : "#991b1b",
                  }}
                >
                  {emailForm.is_enabled ? "Active & Enabled" : "Disabled"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#8b8ba0" }}>
                Cloud email delivery powered by Resend SDK for customer OTP verification, password resets, and notifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #ddd6fe",
              backgroundColor: "#f5f3ff",
              color: "#6d28d9",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Send size={14} />
            Test Resend Connection
          </button>
        </div>

        <StatusBanner text={emailStatus.text} type={emailStatus.type} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            marginBottom: "24px",
          }}
        >
          {/* Resend API Key */}
          <div>
            <label style={sectionLabel}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Key size={14} />
                Resend API Key *
              </span>
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type={isEditingApiKey ? "text" : "password"}
                value={
                  isEditingApiKey
                    ? emailForm.api_key
                    : emailForm.api_key ||
                      (emailResponse?.data?.is_api_key_set
                        ? "re_••••••••••••••••"
                        : "")
                }
                onChange={handleEmailChange("api_key")}
                placeholder={
                  isEditingApiKey
                    ? "Enter API key (e.g. re_123456789...)"
                    : emailResponse?.data?.is_api_key_set
                    ? "re_••••••••••••••••"
                    : "No API key configured"
                }
                disabled={!isEditingApiKey}
                style={{
                  ...inputStyle,
                  backgroundColor: isEditingApiKey ? "#ffffff" : "#f9fafb",
                  cursor: isEditingApiKey ? "text" : "not-allowed",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (isEditingApiKey) {
                    setIsEditingApiKey(false);
                    setEmailForm((prev) => ({
                      ...prev,
                      api_key: originalEmailSettings?.api_key || "",
                    }));
                  } else {
                    setIsEditingApiKey(true);
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: isEditingApiKey ? "#fee2e2" : "#f3f4f6",
                  color: isEditingApiKey ? "#dc2626" : "#374151",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {isEditingApiKey ? "Cancel" : "Change Key"}
              </button>
            </div>
            <p
              style={{ fontSize: "10px", color: "#8b8ba0", margin: "4px 0 0" }}
            >
              Default from env: <code>RESEND_API_KEY</code>. Updating this key requires email OTP verification.
            </p>
          </div>

          {/* From Email */}
          <div>
            <label style={sectionLabel}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Mail size={14} />
                From Email Address *
              </span>
            </label>
            <input
              type="email"
              value={emailForm.from_email}
              onChange={handleEmailChange("from_email")}
              placeholder="e.g. noreply@sfcbakers.com"
              style={inputStyle}
              required
            />
            <p
              style={{ fontSize: "10px", color: "#8b8ba0", margin: "4px 0 0" }}
            >
              Default from env: <code>RESEND_FROM_EMAIL</code>. Must be a verified domain/sender in Resend.
            </p>
          </div>

          {/* From Name */}
          <div>
            <label style={sectionLabel}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} />
                From Sender Name
              </span>
            </label>
            <input
              type="text"
              value={emailForm.from_name}
              onChange={handleEmailChange("from_name")}
              placeholder="e.g. SFC Bakers"
              style={inputStyle}
            />
            <p
              style={{ fontSize: "10px", color: "#8b8ba0", margin: "4px 0 0" }}
            >
              Default from env: <code>RESEND_FROM_NAME</code>. Displayed as the sender name in email clients.
            </p>
          </div>

          {/* Enable / Disable Switch */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <label style={sectionLabel}>Email Service Status</label>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <input
                type="checkbox"
                checked={emailForm.is_enabled}
                onChange={handleEmailChange("is_enabled")}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#7c3aed",
                }}
              />
              <span
                style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}
              >
                Enable Resend Email Delivery
              </span>
            </label>
            <p
              style={{ fontSize: "10px", color: "#8b8ba0", margin: "0" }}
            >
              When disabled or when EMAIL_ACTIVE=false, all outgoing emails are safely bypassed and logged.
            </p>
          </div>
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
        >
          <Button
            type="button"
            onClick={handleSaveEmailSettings}
            disabled={emailSaving || emailLoading || otpSending}
            style={{
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "#7c3aed",
              borderColor: "#7c3aed",
            }}
          >
            {emailSaving || otpSending ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {otpSending ? "Dispatching OTP..." : "Saving..."}
              </>
            ) : (
              <>
                <Check size={16} />
                Save Email Settings
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ─── OTP VERIFICATION MODAL FOR SENSITIVE CREDENTIALS ─── */}
      {showOtpModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => {
            setShowOtpModal(false);
            setOtpError("");
          }}
        >
          <div
            className="admin-dialog"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              maxWidth: "460px",
              width: "100%",
              padding: "26px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "12px",
                    backgroundColor: "#fef3c7",
                    color: "#d97706",
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      margin: 0,
                      color: "#111827",
                    }}
                  >
                    Security Authorization
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Authorize Resend Credential Update
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpError("");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Updating the Resend API Key or From Email requires admin authorization. A 6-digit verification code has been dispatched to your admin email address.
            </p>

            {otpError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  marginBottom: "14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                }}
              >
                {otpError}
              </div>
            )}

            <div style={{ marginBottom: "18px" }}>
              <label style={sectionLabel}>Enter 6-Digit Verification Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                autoFocus
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: "24px",
                  letterSpacing: "8px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  padding: "12px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                Didn't receive code?
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpTimer > 0 || otpSending}
                style={{
                  background: "none",
                  border: "none",
                  color: otpTimer > 0 ? "#9ca3af" : "#7c3aed",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: otpTimer > 0 ? "not-allowed" : "pointer",
                }}
              >
                {otpTimer > 0 ? `Resend code (${otpTimer}s)` : "Resend Code"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpError("");
                }}
                style={{
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={handleVerifyOtpAndSave}
                disabled={emailSaving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#7c3aed",
                  borderColor: "#7c3aed",
                }}
              >
                {emailSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Verify & Apply Credentials
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TEST RESEND MODAL ─── */}
      {showTestModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => {
            setShowTestModal(false);
            setTestStatus({ text: "", type: "" });
          }}
        >
          <div
            className="admin-dialog"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "12px",
                    backgroundColor: "#ede9fe",
                    color: "#7c3aed",
                  }}
                >
                  <Send size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      margin: 0,
                      color: "#111827",
                    }}
                  >
                    Test Resend Connection
                  </h3>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Dispatch a live test email via Resend SDK to verify configuration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestStatus({ text: "", type: "" });
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <StatusBanner text={testStatus.text} type={testStatus.type} />

            <div style={{ marginBottom: "18px" }}>
              <label style={sectionLabel}>Recipient Email Address</label>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="Enter email to receive test message"
                style={inputStyle}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  margin: "6px 0 0 0",
                }}
              >
                Will test sending from{" "}
                <strong>
                  {emailForm.from_name} &lt;{emailForm.from_email}&gt;
                </strong>.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            > 
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestStatus({ text: "", type: "" });
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <Button
                type="button"
                onClick={handleRunTestEmail}
                disabled={emailTesting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#7c3aed",
                  borderColor: "#7c3aed",
                }}
              >
                {emailTesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitPricing)}>
        <section className="card border-0 shadow-sm p-4">
          <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center"
              style={{
                width: "42px",
                height: "42px",
                background: "#dcfce7",
                color: "#16a34a",
              }}
            >
              <Receipt size={22} />
            </div>

            <div>
              <h2 className="mb-0 fs-6 fw-bold text-dark">
                Order Pricing Settings
              </h2>

              <p className="mb-0 small text-secondary">
                Configure GST, delivery charges, fees, order limits, and cafe
                location.
              </p>
            </div>
          </div>

          <StatusBanner text={pricingStatus.text} type={pricingStatus.type} />

          {/* Pricing Fields */}
          <div className="row g-4 mb-4">
            {pricingFields.map(
              ({ key, label, icon: Icon, placeholder, type }) => (
                <div className="col-12 col-md-6" key={key}>
                  <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                    <Icon size={14} />
                    {label}
                  </label>

                  <input
                    type={type}
                    placeholder={placeholder}
                    className="form-control"
                    {...register(key)}
                  />
                </div>
              )
            )}
          </div>

          {/* Delivery & Tax */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                <Truck size={14} />
                Delivery Charge Type
              </label>

              <select
                className="form-select"
                {...register("delivery_charge_type")}
              >
                <option value="fixed">Fixed</option>
                <option value="per_km">Per KM</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                <Receipt size={14} />
                Tax Inclusive
              </label>

              <select
                className="form-select"
                {...register("tax_inclusive", {
                  setValueAs: (value) => value === "true",
                })}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          {/* Store Branch Commission Settings */}
          <div className="border-top pt-4 mb-4">
            <div className="mb-3">
              <h3 className="fs-6 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <Banknote size={16} className="text-primary" />
                Store Branch Commission Settings
              </h3>
              <p className="text-muted small mb-0">
                Configure commission deducted from store branch payouts per order. Store owners receive Product Price, Delivery Fee, and Packaging Fee minus this Admin Commission.
              </p>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <Sliders size={14} />
                  Commission Type
                </label>
                <select
                  className="form-select"
                  {...register("store_commission_type")}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Flat (₹)</option>
                </select>
                <div className="form-text small text-muted">
                  Calculate as % of subtotal or flat fee per order.
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <Percent size={14} />
                  Commission Value ({watch("store_commission_type") === "fixed" ? "₹" : "%"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={watch("store_commission_type") === "fixed" ? "e.g. 50" : "e.g. 10"}
                  className="form-control"
                  {...register("store_commission_value")}
                />
                <div className="form-text small text-muted">
                  Rate to deduct from the order settlement.
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <ShoppingCart size={14} />
                  Min Order Amount for Commission (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 0 (all orders) or 200"
                  className="form-control"
                  {...register("store_commission_min_order_amount")}
                />
                <div className="form-text small text-muted">
                  Commission applies only if order subtotal is at or above this.
                </div>
              </div>
            </div>
          </div>

          {/* Developer Tech Royalty & Maintenance Share (Confidential - Admin Only) */}
          <div className="border-top pt-4 mb-4">
            <div className="mb-2">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h3 className="fs-6 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <Code size={16} className="text-primary" />
                  Developer Tech Royalty & Maintenance Share (Admin Only)
                </h3>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold">
                  Zero-Upfront Tech Model
                </span>
              </div>
             
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <CreditCard size={14} className="text-success" />
                  Customer Platform Fee (100% Developer)
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5"
                    className="form-control"
                    {...register("platform_fee")}
                  />
                </div>
                <div className="form-text small text-muted">
                  Customer pays this on checkout. 100% routes to developer tech fee.
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <Sliders size={14} />
                  Developer Share from Store Commission
                </label>
                <select
                  className="form-select"
                  {...register("developer_commission_type")}
                >
                  <option value="percent">Percentage (% of Branch Store Commission)</option>
                  <option value="fixed">Fixed Flat (₹ per branch order)</option>
                </select>
                <div className="form-text small text-muted">
                  How developer cut is calculated from branch store commission.
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <Percent size={14} />
                  Developer Commission Value ({watch("developer_commission_type") === "fixed" ? "₹" : "%"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={watch("developer_commission_type") === "fixed" ? "e.g. 5" : "e.g. 25"}
                  className="form-control"
                  {...register("developer_commission_value")}
                />
                <div className="form-text small text-muted">
                  {watch("developer_commission_type") === "fixed"
                    ? "Fixed ₹ deducted from collected store commission per branch order."
                    : "% cut from collected store commission (e.g. 25% of ₹20 = ₹5)."}
                </div>
              </div>
            </div>
          </div>

          {/* Bakery Location */}
          <div className="border-top pt-4 mb-4">
            <div className="mb-2">
              <h3 className="fs-6 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <MapPin size={16} className="text-danger" />
                Bakery Store Location
              </h3>
              <p className="text-muted small mb-0">
                Drag the red pin or click anywhere on the map to set the exact shop location.
              </p>
            </div>

            <StoreLocationPicker
              latitude={storeLat}
              longitude={storeLng}
              deliveryRadiusKm={watch("max_delivery_distance") || 10}
              onLocationChange={handleLocationPicked}
            />

            <div className="row g-4 mt-1">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <MapPin size={14} />
                  Store Latitude
                </label>

                <input
                  type="number"
                  step="any"
                  className="form-control font-monospace"
                  placeholder="26.9124"
                  {...register("store_latitude", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small text-dark d-flex align-items-center gap-2">
                  <MapPin size={14} />
                  Store Longitude
                </label>

                <input
                  type="number"
                  step="any"
                  className="form-control font-monospace"
                  placeholder="75.7873"
                  {...register("store_longitude", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="d-flex justify-content-end">
            <Button
              type="submit"
              disabled={pricingLoading}
              className="d-flex align-items-center justify-content-center gap-2 px-4"
            >
              {pricingLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving Pricing...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Pricing Settings
                </>
              )}
            </Button>
          </div>
        </section>
      </form>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid #f0f0f5",
            paddingBottom: "16px",
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: currentColorObj.accent,
                display: "grid",
                placeItems: "center",
                color: currentColorObj.color,
              }}
            >
              <Palette size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#24243b",
                }}
              >
                Storefront Theme & Color Palette
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#8b8ba0" }}>
                Centrally control the visual appearance of the customer
                storefront.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            style={{
              background: "transparent",
              border: "1px solid #ececf3",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "#6b6a80",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Sync
          </button>
        </div>

        <StatusBanner text={statusMessage.text} type={statusMessage.type} />

        {/* MODE SELECTOR */}
        <div style={{ marginBottom: "24px" }}>
          <label style={sectionLabel}>Theme Mode</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedTheme("light")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                borderRadius: "12px",
                border:
                  selectedTheme === "light"
                    ? `2px solid ${currentColorObj.color}`
                    : "1px solid #ececf3",
                background: selectedTheme === "light" ? "#fafafc" : "#ffffff",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#fef3c7",
                  display: "grid",
                  placeItems: "center",
                  color: "#d97706",
                }}
              >
                <Sun size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#24243b",
                  }}
                >
                  Light Mode
                </p>
                <span style={{ fontSize: "11px", color: "#8b8ba0" }}>
                  Clean, bright & airy
                </span>
              </div>
              {selectedTheme === "light" && (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: currentColorObj.color,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedTheme("dark")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                borderRadius: "12px",
                border:
                  selectedTheme === "dark"
                    ? `2px solid ${currentColorObj.color}`
                    : "1px solid #ececf3",
                background: selectedTheme === "dark" ? "#1e1e2d" : "#ffffff",
                color: selectedTheme === "dark" ? "#ffffff" : "#24243b",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#312e81",
                  display: "grid",
                  placeItems: "center",
                  color: "#a5b4fc",
                }}
              >
                <Moon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: selectedTheme === "dark" ? "#ffffff" : "#24243b",
                  }}
                >
                  Dark Mode
                </p>
                <span
                  style={{
                    fontSize: "11px",
                    color: selectedTheme === "dark" ? "#a1a1aa" : "#8b8ba0",
                  }}
                >
                  Sleek & high-contrast
                </span>
              </div>
              {selectedTheme === "dark" && (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: currentColorObj.color,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* COLOR PALETTE SELECTOR */}
        <div style={{ marginBottom: "24px" }}>
          <label style={sectionLabel}>Bakery Color Palette</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {availableColorThemes.map((themeOption) => {
              const isSelected = selectedColor === themeOption.id;
              return (
                <button
                  key={themeOption.id}
                  type="button"
                  onClick={() => setSelectedColor(themeOption.id)}
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border: isSelected
                      ? `2px solid ${themeOption.color}`
                      : "1px solid #ececf3",
                    background: isSelected ? themeOption.accent : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                    position: "relative",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: themeOption.color,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                          display: "inline-block",
                        }}
                      />
                      <strong
                        style={{
                          fontSize: "14px",
                          color: "#24243b",
                        }}
                      >
                        {themeOption.name}
                      </strong>
                    </div>

                    {isSelected && (
                      <span
                        style={{
                          background: themeOption.color,
                          color: "#fff",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      color: "#6b6a80",
                      lineHeight: "1.4",
                    }}
                  >
                    {themeOption.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* LIVE PREVIEW BOX */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "14px",
            background: selectedTheme === "dark" ? "#1e1e2d" : "#fafafc",
            color: selectedTheme === "dark" ? "#ffffff" : "#24243b",
            border: "1px dashed #dcdbe8",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: currentColorObj.color,
                display: "grid",
                placeItems: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={16} />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: selectedTheme === "dark" ? "#ffffff" : "#24243b",
                }}
              >
                Active Preview: {currentColorObj.name} (
                {selectedTheme.toUpperCase()})
              </p>
              <span
                style={{
                  fontSize: "11px",
                  color: selectedTheme === "dark" ? "#a1a1aa" : "#8b8ba0",
                }}
              >
                Storefront primary button & accents will render in{" "}
                {currentColorObj.color}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                background: currentColorObj.color,
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Preview Button
            </span>
          </div>
        </div>

        {/* ACTION BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="button"
            onClick={handleSaveTheme}
            disabled={isSaving || isLoading}
            style={{
              minWidth: "160px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Theme Settings
              </>
            )}
          </Button>
        </div>
      </section>
    </>
  );
}
