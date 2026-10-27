import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import toast, { Toaster, ToastBar } from "react-hot-toast";
import { X } from "lucide-react";

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          zIndex: 999999999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 999999999,
            borderRadius: "10px",
            background: "#222232",
            color: "#fff",
            fontSize: "13.5px",
            padding: "10px 14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                <div style={{ flex: 1, padding: "0 4px" }}>{message}</div>
                {t.type !== "loading" && (
                  <button
                    type="button"
                    className="toast-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    aria-label="Dismiss toast"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
      <AppRoutes />
    </>
  );
}

export default App;
