import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import Button from "./Button";
import { useThrottledCallback } from "../../utils/throttle";

export default function ConfirmDialog({
  isOpen = true,
  title,
  message,
  confirmLabel = "Delete",
  confirmText,
  onConfirm,
  onClose,
  onCancel,
  danger = true,
  confirmVariant,
  isLoading = false,
  error = "",
}) {
  const throttledConfirm = useThrottledCallback(onConfirm, 1500);
  if (isOpen === false) return null;
  const handleClose = onClose || onCancel;
  const label = confirmText || confirmLabel;
  const isDanger = confirmVariant ? confirmVariant === "danger" : danger;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading && handleClose) handleClose();
      }}
    >
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <Button
          variant="plain"
          className="modal-close"
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Close"
        >
          <X size={18} />
        </Button>
        <span className={isDanger ? "confirm-icon danger" : "confirm-icon"}>
          <AlertTriangle size={22} />
        </span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        {error && <p className="confirm-error">{error}</p>}
        <div className="confirm-actions">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            onClick={throttledConfirm}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? "Processing..." : label}
          </Button>
        </div>
      </section>
    </div>
  );
}
