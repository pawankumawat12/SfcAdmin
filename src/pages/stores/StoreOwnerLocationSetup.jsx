import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Store,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  ArrowRight,
  Sliders,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import StoreLocationPicker from "../settings/StoreLocationPicker";
import {
  useGetMyStoreQuery,
  useUpdateMyStoreLocationMutation,
} from "../../services/storeApi";
import Button from "../../components/ui/Button";

export default function StoreOwnerLocationSetup() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);

  const { data: storeResponse, isLoading: storeLoading } = useGetMyStoreQuery();
  const [updateLocation, { isLoading: saving }] = useUpdateMyStoreLocationMutation();

  const store = storeResponse?.store;

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Sikar");
  const [pincode, setPincode] = useState("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
  const [conflictError, setConflictError] = useState(null);

  useEffect(() => {
    if (store) {
      if (store.latitude != null) setLatitude(Number(store.latitude));
      if (store.longitude != null) setLongitude(Number(store.longitude));
      if (store.address) setAddress(store.address);
      if (store.city) setCity(store.city);
      if (store.pincode) setPincode(store.pincode);
      if (store.max_delivery_distance != null) {
        setDeliveryRadiusKm(Number(store.max_delivery_distance));
      }
    }
  }, [store]);

  const handleLocationPicked = (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    setConflictError(null);
  };

  const handleSaveLocation = async (e) => {
    if (e) e.preventDefault();
    if (latitude == null || longitude == null) {
      toast.error("Please pinpoint your store location on the map first.");
      return;
    }

    setConflictError(null);
    try {
      const res = await updateLocation({
        latitude,
        longitude,
        address,
        city,
        pincode,
      }).unwrap();

      toast.success(res.message || "Store location saved successfully!");
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to update store location.";
      setConflictError(msg);
      toast.error(msg);
    }
  };

  if (storeLoading) {
    return (
      <div className="p-5 text-center text-muted">
        <Loader2 size={32} className="animate-spin text-danger mx-auto mb-2" />
        <div>Loading your store details...</div>
      </div>
    );
  }

  const isConfigured = store?.latitude != null && store?.longitude != null;

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <Store className="text-danger" size={24} />
            <span>Store Location & Delivery Area</span>
          </h1>
          <p className="text-muted small mb-0">
            Set your bakery shop location on the map and define your delivery radius.
          </p>
        </div>

        {isConfigured && (
          <Button
            variant="outline"
            className="d-flex align-items-center gap-1.5"
            onClick={() => navigate("/products/create")}
          >
            <Package size={16} />
            <span>Add Products</span>
            <ArrowRight size={14} />
          </Button>
        )}
      </div>

      {/* Setup Prompt Banner (if not yet configured) */}
      {!isConfigured ? (
        <div className="alert alert-warning border-warning-subtle shadow-xs rounded-3 d-flex align-items-start gap-2.5 mb-4">
          <AlertTriangle size={20} className="text-warning-emphasis flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-dark d-block">
              Action Required: Set your Store Location
            </strong>
            <span className="small text-secondary">
              Customers in your area will be routed to your store. You cannot create
              or sell products until your bakery location and delivery radius are set.
            </span>
          </div>
        </div>
      ) : (
        <div className="alert alert-success border-success-subtle shadow-xs rounded-3 d-flex align-items-center gap-2 mb-4 py-2">
          <CheckCircle2 size={18} className="text-success flex-shrink-0" />
          <span className="small text-dark fw-medium">
            Your store location is active and ready to fulfill orders within your{" "}
            <strong>{deliveryRadiusKm} km</strong> delivery area!
          </span>
        </div>
      )}

      {/* Territory Conflict Alert */}
      {conflictError && (
        <div className="alert alert-danger shadow-xs rounded-3 d-flex align-items-start gap-2.5 mb-4">
          <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <strong className="d-block">Territory Conflict</strong>
            <span className="small">{conflictError}</span>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="card border shadow-xs rounded-3 p-4 mb-4 bg-white">
        {/* Store Info & Delivery Radius Settings */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-dark">
              Store Name
            </label>
            <input
              type="text"
              className="form-control bg-light"
              value={store?.name || ""}
              disabled
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-dark">
              City / Town
            </label>
            <input
              type="text"
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Sikar, Bajor"
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold small text-dark d-flex align-items-center justify-content-between mb-1">
              <span className="d-flex align-items-center gap-1.5">
                <MapPin size={14} className="text-danger" />
                Delivery Radius:
              </span>
              <span className="badge bg-light text-muted border font-monospace" style={{ fontSize: "10.5px" }}>
                🔒 Admin Controlled
              </span>
            </label>
            <div className="p-2.5 rounded-3 bg-light border d-flex align-items-center justify-content-between">
              <div>
                <strong className="text-danger fs-6 font-monospace">
                  {deliveryRadiusKm} KM
                </strong>
                <div className="text-muted" style={{ fontSize: "11px" }}>
                  Assigned by Admin
                </div>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">
                Active Coverage
              </span>
            </div>
            <span className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
              Only Admin can change how far your store delivers. Contact admin to adjust this radius.
            </span>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="border-top pt-3">
          <div className="mb-2">
            <h3 className="fs-6 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <MapPin size={16} className="text-danger" />
              Pinpoint Exact Shop Location
            </h3>
            <p className="text-muted small mb-0">
              Drag the red pin onto your shop rooftop or entrance. Your {deliveryRadiusKm} km
              delivery boundary is shown live as the translucent circle.
            </p>
          </div>

          <StoreLocationPicker
            latitude={latitude}
            longitude={longitude}
            deliveryRadiusKm={deliveryRadiusKm}
            onLocationChange={handleLocationPicked}
          />
        </div>

        {/* Save Action Bar */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4 pt-3 border-top">
          <div className="small text-muted">
            {latitude != null && longitude != null ? (
              <span>
                Coordinates:{" "}
                <strong className="text-dark font-monospace">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </strong>
              </span>
            ) : (
              <span className="text-danger fw-medium">
                * Please place pin on map before saving
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSaveLocation}
            disabled={saving || latitude == null || longitude == null}
            className="d-flex align-items-center gap-2 px-4 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Location...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Store Location</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

