import React from "react";

export default function BrandSplashScreen({
  message = "Verifying secure session...",
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #090d16 0%, #111827 50%, #0f172a 100%)",
        color: "#ffffff",
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        padding: "24px",
        boxSizing: "border-box",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        @keyframes splash-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 16px 36px rgba(225, 29, 72, 0.35), 0 0 0 1px rgba(244, 63, 94, 0.35);
          }
        }
        @keyframes splash-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(25%);
          }
          100% {
            transform: translateX(110%);
          }
        }
      `}</style>

      {/* Brand Card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          textAlign: "center",
          maxWidth: "360px",
          width: "100%",
        }}
      >
        {/* Glowing Logo Container */}
        <div
          style={{
            position: "relative",
            width: "90px",
            height: "90px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ambient Glow */}
          <div
            style={{
              position: "absolute",
              inset: "-6px",
              borderRadius: "28px",
              background: "linear-gradient(135deg, #e11d48, #4f46e5)",
              opacity: 0.45,
              filter: "blur(16px)",
            }}
          />
          {/* Logo Frame */}
          <div
            style={{
              position: "relative",
              width: "82px",
              height: "82px",
              borderRadius: "22px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "splash-pulse 2.6s ease-in-out infinite",
            }}
          >
            <img
              src="/images/logo.png"
              alt="SFC Bakers"
              style={{
                width: "54px",
                height: "54px",
                objectFit: "contain",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Brand Headings */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.4px",
              color: "#ffffff",
            }}
          >
            SFC Bakers
          </h1>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "12px",
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            Admin & Operations Portal
          </p>
        </div>

        {/* Modern Linear Gradient Loader */}
        <div
          style={{
            width: "190px",
            height: "4px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            position: "relative",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "55%",
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #e11d48 0%, #6366f1 50%, #e11d48 100%)",
              animation: "splash-bar 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            }}
          />
        </div>

        {/* Micro Status Text */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "12px",
            fontWeight: 500,
            color: "#64748b",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
              display: "inline-block",
            }}
          />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

