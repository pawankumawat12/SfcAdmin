import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Search,
  Loader2,
  Navigation,
  Layers,
  Compass,
  X,
  Crosshair,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Laptop,
} from "lucide-react";
import toast from "react-hot-toast";

// Crisp SVG Bakery Location Pin
const createBakeryPinIcon = () =>
  L.divIcon({
    className: "store-location-pin",
    html: `
      <div style="
        position: relative;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e11d48;
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 16px rgba(225, 29, 72, 0.55), 0 2px 6px rgba(0,0,0,0.35);
        cursor: grab;
      ">
        <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42],
  });

// Tile Layer URLs
const TILE_LAYERS = {
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    options: {
      attribution: "&copy; Google Maps Hybrid",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  },
};

// Helper: check if query string is raw coordinates (e.g. "26.9124, 75.7873")
const parseCoordinates = (input) => {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(
    /^([-+]?\d{1,2}(?:\.\d+)?)[,\s/]+([-+]?\d{1,3}(?:\.\d+)?)$/
  );
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
      };
    }
  }
  return null;
};

// Popular quick preset search chips
const PRESET_LOCATIONS = [
  { label: "Bajor (Sikar)", query: "Bajor Sikar Rajasthan" },
  { label: "Sikar City", query: "Sikar Rajasthan" },
  { label: "Kalyan Circle", query: "Kalyan Circle Sikar" },
  { label: "Jaipur", query: "Jaipur Rajasthan" },
];

export default function StoreLocationPicker({
  latitude,
  longitude,
  deliveryRadiusKm = 10,
  onLocationChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const activeTileLayerRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const initialLat = Number(latitude) || 26.9124; // Default Jaipur / Rajasthan
  const initialLng = Number(longitude) || 75.7873;

  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [mapType, setMapType] = useState("satellite"); // 'satellite' | 'streets'
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Detect whether the device has a physical GPS chip (Mobile/Tablet vs Laptop/Desktop)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isClientMobile = Boolean(navigator.userAgentData?.mobile);
    const isSmallTouchDevice = Boolean(navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

    setIsMobileDevice(Boolean(isMobileUa || isClientMobile || isSmallTouchDevice));
  }, []);

  // Check if current search query looks like direct coordinates
  const detectedCoords = parseCoordinates(searchQuery);

  // Robust reverse geocoding with Photon -> BigDataCloud -> Nominatim fallback
  const fetchAddressName = useCallback(async (lat, lng) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    try {
      setGeocoding(true);

      // 1. Try Photon reverse geocoding (fast and accurate for Indian villages & towns)
      try {
        const photonRes = await fetch(
          `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
        );
        if (photonRes.ok) {
          const data = await photonRes.json();
          const props = data?.features?.[0]?.properties;
          if (props) {
            const parts = [];
            if (props.name) parts.push(props.name);
            if (props.street && props.street !== props.name) parts.push(props.street);
            if (props.district && props.district !== props.name) parts.push(props.district);
            if (props.city && props.city !== props.name && props.city !== props.district) parts.push(props.city);
            if (props.county && !parts.includes(props.county)) parts.push(props.county);
            if (props.state && !parts.includes(props.state)) parts.push(props.state);
            if (props.postcode) parts.push(props.postcode);

            const formatted = parts.filter(Boolean).join(", ");
            if (formatted) {
              setResolvedAddress(formatted);
              if (markerRef.current) {
                markerRef.current.bindPopup(
                  `<b>Bakery Location</b><br/>${formatted}`
                );
              }
              setGeocoding(false);
              return;
            }
          }
        }
      } catch {
        // Fallback to next provider
      }

      // 2. Try BigDataCloud reverse geocoding (CORS friendly free client API)
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (bdcRes.ok) {
          const bdcData = await bdcRes.json();
          const parts = [];
          if (bdcData.locality && bdcData.locality !== bdcData.city) parts.push(bdcData.locality);
          if (bdcData.city) parts.push(bdcData.city);
          if (bdcData.principalSubdivision) parts.push(bdcData.principalSubdivision);
          if (bdcData.postcode) parts.push(bdcData.postcode);
          if (bdcData.countryName) parts.push(bdcData.countryName);

          const formatted = parts.filter(Boolean).join(", ");
          if (formatted) {
            setResolvedAddress(formatted);
            if (markerRef.current) {
              markerRef.current.bindPopup(
                `<b>Bakery Location</b><br/>${formatted}`
              );
            }
            setGeocoding(false);
            return;
          }
        }
      } catch {
        // Fallback to next provider
      }

      // 3. Fallback to OpenStreetMap Nominatim with deduplication
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { Accept: "application/json" } }
        );
        if (nomRes.ok) {
          const data = await nomRes.json();
          if (data?.display_name) {
            const segments = data.display_name.split(",").map((s) => s.trim());
            const seen = new Set();
            const cleaned = segments.filter((s) => {
              const lower = s.toLowerCase();
              if (seen.has(lower)) return false;
              seen.add(lower);
              return true;
            });
            const formatted = cleaned.slice(0, 5).join(", ");
            setResolvedAddress(formatted);
            if (markerRef.current) {
              markerRef.current.bindPopup(
                `<b>Bakery Location</b><br/>${formatted}`
              );
            }
          }
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Sync internal state if external props change (e.g. database pricing settings load)
  useEffect(() => {
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0) {
      if (
        Math.abs(latNum - currentLat) > 0.00001 ||
        Math.abs(lngNum - currentLng) > 0.00001
      ) {
        setCurrentLat(latNum);
        setCurrentLng(lngNum);
        if (markerRef.current) {
          markerRef.current.setLatLng([latNum, lngNum]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([latNum, lngNum]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([latNum, lngNum]);
        }
        // Fetch accurate address for updated props coordinates
        fetchAddressName(latNum, lngNum);
      }
    }
  }, [latitude, longitude, currentLat, currentLng, fetchAddressName]);

  // Dynamically update circle radius on the map when deliveryRadiusKm changes
  useEffect(() => {
    if (circleRef.current && deliveryRadiusKm != null) {
      const radiusMeters = Math.max(500, (Number(deliveryRadiusKm) || 10) * 1000);
      circleRef.current.setRadius(radiusMeters);
    }
  }, [deliveryRadiusKm]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live suggestions (Photon + Nominatim fallback)
  const fetchLiveSuggestions = async (queryText) => {
    const q = queryText.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchAttempted(false);
      return;
    }

    setSearching(true);
    setSearchAttempted(true);
    setSelectedIndex(-1);

    try {
      let items = [];
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          q
        )}&limit=8&lat=${currentLat}&lon=${currentLng}`;
        const photonRes = await fetch(photonUrl);
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (photonData?.features && photonData.features.length > 0) {
            items = photonData.features.map((f) => {
              const props = f.properties || {};
              const title =
                props.name || props.street || props.district || props.city || q;
              const subtitleParts = [
                props.street && props.name !== props.street ? props.street : null,
                props.city || props.district || props.county,
                props.state,
                props.postcode,
                props.country,
              ].filter(Boolean);
              const subtitle = subtitleParts.join(", ");
              return {
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                title,
                subtitle,
                display_name: [title, subtitle].filter(Boolean).join(", "),
              };
            });
          }
        }
      } catch {
        // Fallback to nominatim
      }

      // Fallback to OpenStreetMap Nominatim
      if (items.length === 0) {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=in&limit=8&addressdetails=1`;
        const nomRes = await fetch(nomUrl, {
          headers: { Accept: "application/json" },
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (nomData && nomData.length > 0) {
            items = nomData.map((item) => {
              const parts = (item.display_name || "").split(",");
              const title = parts[0]?.trim() || item.name || q;
              const subtitle = parts.slice(1, 5).join(", ").trim();
              return {
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                title,
                subtitle,
                display_name: item.display_name,
              };
            });
          }
        }
      }

      setSearchResults(items);
      setShowResultsDropdown(true);
    } catch {
      // ignore network errors
    } finally {
      setSearching(false);
    }
  };

  // Live debounced search as admin types (if not pure coordinates)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2 || parseCoordinates(q)) {
      setSearchResults([]);
      setSearchAttempted(false);
      if (!parseCoordinates(q)) {
        setShowResultsDropdown(false);
      } else {
        setShowResultsDropdown(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      fetchLiveSuggestions(q);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Switch Tile Layer (Satellite vs Street)
  const setTileLayer = useCallback((type) => {
    if (!mapInstanceRef.current) return;
    if (activeTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(activeTileLayerRef.current);
    }

    const config = TILE_LAYERS[type] || TILE_LAYERS.satellite;
    const newLayer = L.tileLayer(config.url, config.options);
    newLayer.addTo(mapInstanceRef.current);
    activeTileLayerRef.current = newLayer;
    setMapType(type);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialMapLat = Number(latitude) || 26.9124;
    const initialMapLng = Number(longitude) || 75.7873;

    const map = L.map(mapContainerRef.current, {
      center: [initialMapLat, initialMapLng],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const initialConfig = TILE_LAYERS.satellite;
    const tileLayer = L.tileLayer(
      initialConfig.url,
      initialConfig.options
    ).addTo(map);
    activeTileLayerRef.current = tileLayer;

    const marker = L.marker([initialMapLat, initialMapLng], {
      icon: createBakeryPinIcon(),
      draggable: true,
    }).addTo(map);

    const initialRadiusMeters = Math.max(500, (Number(deliveryRadiusKm) || 10) * 1000);
    const circle = L.circle([initialMapLat, initialMapLng], {
      radius: initialRadiusMeters,
      color: "#e11d48",
      fillColor: "#f43f5e",
      fillOpacity: 0.12,
      weight: 2,
      dashArray: "6, 6",
    }).addTo(map);

    circleRef.current = circle;

    marker
      .bindPopup(
        "<b>Bakery Location</b><br/>Drag this pin to your exact shop rooftop/entrance"
      )
      .openPopup();

    // On Marker Drag End
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      const newLat = Math.round(position.lat * 1000000) / 1000000;
      const newLng = Math.round(position.lng * 1000000) / 1000000;
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      circleRef.current?.setLatLng([newLat, newLng]);
      onLocationChange?.(newLat, newLng);
      fetchAddressName(newLat, newLng);
    });

    // On Map Click - move marker to click point
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const newLat = Math.round(lat * 1000000) / 1000000;
      const newLng = Math.round(lng * 1000000) / 1000000;
      marker.setLatLng([newLat, newLng]);
      circleRef.current?.setLatLng([newLat, newLng]);
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      onLocationChange?.(newLat, newLng);
      fetchAddressName(newLat, newLng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    fetchAddressName(initialMapLat, initialMapLng);

    return () => {
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      activeTileLayerRef.current = null;
    };
  }, []);

  // Move map & pin to a selected spot
  const selectLocationSpot = (lat, lng, displayName, title) => {
    const cleanLat = Math.round(lat * 1000000) / 1000000;
    const cleanLng = Math.round(lng * 1000000) / 1000000;

    setCurrentLat(cleanLat);
    setCurrentLng(cleanLng);
    setSearchQuery(title || displayName);
    setResolvedAddress(displayName);
    setShowResultsDropdown(false);
    setSelectedIndex(-1);

    if (markerRef.current) {
      markerRef.current.setLatLng([cleanLat, cleanLng]);
      markerRef.current
        .bindPopup(`<b>Bakery Location</b><br/>${title || displayName}`)
        .openPopup();
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([cleanLat, cleanLng]);
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([cleanLat, cleanLng], 17, {
        duration: 1.2,
      });
    }

    onLocationChange?.(cleanLat, cleanLng);
    toast.success("Location updated on map!");
    fetchAddressName(cleanLat, cleanLng);
  };

  // Trigger manual search
  const handleManualSearch = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (detectedCoords) {
      selectLocationSpot(
        detectedCoords.lat,
        detectedCoords.lng,
        `Coordinates: ${detectedCoords.lat}, ${detectedCoords.lng}`,
        `Custom Coordinates (${detectedCoords.lat}, ${detectedCoords.lng})`
      );
      return;
    }

    const q = searchQuery.trim();
    if (q.length >= 2) {
      fetchLiveSuggestions(q);
      setShowResultsDropdown(true);
    } else {
      toast.error("Please type at least 2 characters to search");
    }
  };

  // Locate Me using browser GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        selectLocationSpot(
          lat,
          lng,
          "Current Device Location (GPS)",
          "My Current Location"
        );
        toast.success("Centered on your current GPS location!");
      },
      (err) => {
        setLocating(false);
        toast.error(
          "Could not fetch device location: " + (err.message || "Permission denied")
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Keyboard navigation inside search results
  const handleKeyDown = (e) => {
    if (!showResultsDropdown) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleManualSearch(e);
      }
      return;
    }

    const totalItems =
      searchResults.length + (detectedCoords ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (detectedCoords && selectedIndex === 0) {
        selectLocationSpot(
          detectedCoords.lat,
          detectedCoords.lng,
          `Coordinates: ${detectedCoords.lat}, ${detectedCoords.lng}`,
          `Custom Coordinates`
        );
        return;
      }

      const effectiveIndex = detectedCoords ? selectedIndex - 1 : selectedIndex;
      if (effectiveIndex >= 0 && searchResults[effectiveIndex]) {
        const item = searchResults[effectiveIndex];
        selectLocationSpot(
          parseFloat(item.lat),
          parseFloat(item.lon),
          item.display_name,
          item.title
        );
      } else {
        handleManualSearch(e);
      }
    } else if (e.key === "Escape") {
      setShowResultsDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Recenter map on existing pin
  const handleRecenter = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([currentLat, currentLng], 17, {
        duration: 0.8,
      });
      markerRef.current.openPopup();
    }
  };

  // Copy Coordinates to clipboard
  const handleCopyCoords = () => {
    const coordsStr = `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr);
    setCopied(true);
    toast.success("Coordinates copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Click on a preset chip
  const handlePresetClick = (query) => {
    setSearchQuery(query);
    fetchLiveSuggestions(query);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="store-location-picker mt-3 position-relative w-100">
      {/* Notice for Laptop / Desktop Users (No GPS Hardware) */}
      {!isMobileDevice && (
        <div
          className="mb-3 p-3 rounded-3"
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1.5px solid #fde68a",
            boxShadow: "0 2px 6px rgba(217, 119, 6, 0.08)",
          }}
        >
          <div className="d-flex align-items-start gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0 mt-0.5"
              style={{
                width: "30px",
                height: "30px",
                background: "#f59e0b",
                color: "#ffffff",
              }}
            >
              <Laptop size={17} />
            </div>
            <div className="flex-grow-1" style={{ fontSize: "12.5px", color: "#78350f" }}>
              <div className="fw-bold text-dark mb-1" style={{ fontSize: "13.5px" }}>
                Setting Location on Laptop / Desktop:
              </div>
              <p className="mb-2 text-dark" style={{ lineHeight: "1.5" }}>
                Laptops and desktop computers <strong>do not have built-in hardware GPS chips</strong>. Browsers estimate position using your Wi-Fi or ISP network, which can place you kilometers away from your actual physical store. For pinpoint accuracy, automatic GPS detection is disabled on desktop devices.
              </p>
              <div className="fw-semibold text-dark mb-1">
                2 Easy Ways to Pinpoint Your Store:
              </div>
              <ul className="mb-0 ps-3 text-secondary" style={{ lineHeight: "1.5" }}>
                <li>
                  <strong>Method 1 (Search):</strong> Type your area, street, landmark, or pincode in the search box below and select your location from the suggestions.
                </li>
                <li>
                  <strong>Method 2 (Drag & Drop Pin):</strong> Click and drag the red marker on the satellite map directly to your shop's exact rooftop or storefront.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 1. Main Search Bar & GPS Locate Bar (Fully Responsive) */}
      <div ref={searchWrapperRef} className="position-relative mb-2 w-100">
        <div
          className="d-flex align-items-center bg-white rounded-3 shadow-sm transition-all w-100"
          style={{
            border: "1.5px solid #cbd5e1",
            padding: "4px 6px 4px 10px",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
          }}
        >
          {/* Search Icon or Live Loader */}
          <div
            className="d-flex align-items-center justify-content-center me-2 text-danger flex-shrink-0"
            style={{ width: "20px" }}
          >
            {searching ? (
              <Loader2 size={17} className="animate-spin text-danger" />
            ) : (
              <Search size={17} />
            )}
          </div>

          {/* Search Input Field */}
          <input
            ref={searchInputRef}
            type="text"
            className="form-control border-0 shadow-none p-0 text-dark flex-grow-1"
            style={{
              fontSize: "13.5px",
              fontWeight: "500",
              height: "38px",
              minWidth: "80px",
              background: "transparent",
            }}
            placeholder="Search area, landmark, PIN, or paste coords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0 || detectedCoords || searchAttempted) {
                setShowResultsDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear Input Button */}
          {searchQuery && (
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-1 me-1 text-decoration-none flex-shrink-0"
              style={{ lineHeight: 1 }}
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSearchAttempted(false);
                setShowResultsDropdown(false);
                setSelectedIndex(-1);
                searchInputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}

          {/* Actions: Locate Me (GPS) & Search Buttons */}
          <div className="d-flex align-items-center gap-1 ms-1 flex-shrink-0">
            {/* GPS Device Location Button (Visible ONLY on Mobile devices with hardware GPS) */}
            {isMobileDevice && (
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="btn btn-sm btn-light border d-flex align-items-center gap-1 text-secondary px-2 py-1.5"
                style={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "#f8fafc",
                  whiteSpace: "nowrap",
                }}
                title="Locate my shop using device GPS"
              >
                {locating ? (
                  <Loader2 size={13} className="animate-spin text-danger" />
                ) : (
                  <Crosshair size={13} className="text-danger" />
                )}
                <span className="d-none d-sm-inline">
                  {locating ? "Locating..." : "Locate Me"}
                </span>
              </button>
            )}

            {/* Primary Search Button */}
            <button
              type="button"
              onClick={handleManualSearch}
              disabled={searching}
              className="btn btn-sm btn-danger d-flex align-items-center gap-1 px-2.5 py-1.5 shadow-sm"
              style={{
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: "600",
                background: "#e11d48",
                borderColor: "#e11d48",
                whiteSpace: "nowrap",
              }}
            >
              {searching ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span className="d-none d-md-inline">Searching</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Live Suggestions & Results Dropdown Popover */}
        {showResultsDropdown && (
          <div
            className="position-absolute w-100 bg-white shadow-lg border mt-1.5"
            style={{
              zIndex: 2050,
              borderRadius: "14px",
              boxShadow:
                "0 14px 34px -4px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0,0,0,0.06)",
              maxHeight: "320px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* Header with status */}
            <div
              className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom text-muted"
              style={{ fontSize: "11px", fontWeight: "600" }}
            >
              <div className="d-flex align-items-center gap-1.5 text-uppercase tracking-wider">
                <Sparkles size={13} className="text-danger" />
                <span>
                  {searching
                    ? "Searching locations..."
                    : detectedCoords
                    ? "Coordinates Detected"
                    : searchResults.length > 0
                    ? `Found ${searchResults.length} places`
                    : "Search results"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-link btn-sm text-secondary p-0 text-decoration-none"
                style={{ fontSize: "11px", fontWeight: "600" }}
                onClick={() => setShowResultsDropdown(false)}
              >
                Close [Esc]
              </button>
            </div>

            {/* A. If coordinates parsed from query string */}
            {detectedCoords && (
              <div
                className={`p-2.5 border-bottom d-flex align-items-center justify-content-between cursor-pointer transition-colors ${
                  selectedIndex === 0 ? "bg-danger-subtle" : "bg-light hover-bg-light"
                }`}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  selectLocationSpot(
                    detectedCoords.lat,
                    detectedCoords.lng,
                    `Coordinates: ${detectedCoords.lat}, ${detectedCoords.lng}`,
                    `Custom Coordinates (${detectedCoords.lat}, ${detectedCoords.lng})`
                  )
                }
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="p-1.5 rounded-circle bg-danger text-white d-flex align-items-center justify-content-center shrink-0"
                    style={{ width: "26px", height: "26px" }}
                  >
                    <Navigation size={13} />
                  </div>
                  <div>
                    <div className="fw-bold text-dark small d-flex align-items-center gap-1.5 flex-wrap">
                      <span>Jump to Exact Coordinates</span>
                      <span className="badge bg-danger text-white">Direct GPS</span>
                    </div>
                    <div className="text-muted font-monospace" style={{ fontSize: "11.5px" }}>
                      {detectedCoords.lat}, {detectedCoords.lng}
                    </div>
                  </div>
                </div>
                <div className="text-danger d-flex align-items-center gap-1 small fw-semibold flex-shrink-0">
                  <span className="d-none d-sm-inline">Pin</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            )}

            {/* B. Searching Loader Skeleton */}
            {searching && searchResults.length === 0 && (
              <div className="p-4 text-center text-muted">
                <Loader2 size={24} className="animate-spin text-danger mx-auto mb-2" />
                <div className="fw-semibold text-dark small">
                  Searching locations across India...
                </div>
                <div className="text-muted small" style={{ fontSize: "12px" }}>
                  Looking for places matching "{searchQuery}"
                </div>
              </div>
            )}

            {/* C. List of Results */}
            {searchResults.length > 0 &&
              searchResults.map((item, idx) => {
                const isSelected =
                  selectedIndex === (detectedCoords ? idx + 1 : idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`w-100 text-start py-2.5 px-3 border-0 border-bottom d-flex align-items-start gap-2.5 transition-colors ${
                      isSelected
                        ? "bg-rose-50 text-dark"
                        : "bg-white text-dark"
                    }`}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#fff1f2" : "#ffffff",
                    }}
                    onMouseEnter={() =>
                      setSelectedIndex(detectedCoords ? idx + 1 : idx)
                    }
                    onClick={() =>
                      selectLocationSpot(
                        parseFloat(item.lat),
                        parseFloat(item.lon),
                        item.display_name,
                        item.title
                      )
                    }
                  >
                    <div
                      className="p-1.5 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center shrink-0 mt-0.5"
                      style={{ width: "26px", height: "26px" }}
                    >
                      <MapPin size={14} />
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="fw-bold small text-truncate text-dark d-flex align-items-center justify-content-between">
                        <span>{item.title}</span>
                        {isSelected && (
                          <span
                            className="badge bg-danger text-white py-0.5 px-1.5 d-none d-sm-inline-flex align-items-center gap-0.5"
                            style={{ fontSize: "10px" }}
                          >
                            <span>Select</span>
                            <CornerDownLeft size={10} />
                          </span>
                        )}
                      </div>
                      <div
                        className="text-muted text-truncate"
                        style={{ fontSize: "11.5px", marginTop: "1px" }}
                      >
                        {item.subtitle || item.display_name}
                      </div>
                    </div>
                  </button>
                );
              })}

            {/* D. Empty state (No Results Found) */}
            {!searching &&
              searchAttempted &&
              searchResults.length === 0 &&
              !detectedCoords && (
                <div className="p-4 text-center">
                  <div
                    className="p-2 bg-light rounded-circle text-muted d-inline-flex align-items-center justify-content-center mb-2"
                    style={{ width: "38px", height: "38px" }}
                  >
                    <MapPin size={18} className="text-secondary" />
                  </div>
                  <div className="fw-bold text-dark small mb-1">
                    No matching places found for "{searchQuery}"
                  </div>
                  <div
                    className="text-muted small mx-auto"
                    style={{ maxWidth: "300px", fontSize: "11.5px" }}
                  >
                    Try searching by city name (e.g. Sikar, Jaipur), market name,
                    or paste exact coordinates (e.g. 27.5591, 75.2369).
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* 3. Quick Chips & Map Controls Header (Fully Responsive Flow) */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 mb-2 w-100">
        {/* Quick Suggestion Chips (Swipeable / Wrapped) */}
        <div
          className="d-flex align-items-center gap-1.5 flex-wrap w-100 w-md-auto"
          style={{ overflowX: "auto" }}
        >
          <span
            className="text-muted small fw-semibold me-1 d-none d-sm-inline flex-shrink-0"
            style={{ fontSize: "11.5px" }}
          >
            Quick:
          </span>
          {PRESET_LOCATIONS.map((preset, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-sm btn-light border py-0 px-2 text-secondary d-flex align-items-center gap-1 flex-shrink-0"
              style={{
                fontSize: "11.5px",
                borderRadius: "14px",
                background: "#f8fafc",
                borderColor: "#e2e8f0",
                height: "24px",
              }}
              onClick={() => handlePresetClick(preset.query)}
            >
              <MapPin size={10} className="text-danger" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* View Toggle & Center Controls */}
        <div className="d-flex align-items-center justify-content-between justify-content-md-end gap-1.5 w-100 w-md-auto ms-md-auto">
          {/* Map Layer Switcher */}
          <div
            className="btn-group btn-group-sm p-0.5 bg-light border rounded-2"
            role="group"
          >
            <button
              type="button"
              className={`btn btn-sm py-1 px-2.5 d-inline-flex align-items-center gap-1 ${
                mapType === "satellite"
                  ? "btn-dark text-white fw-semibold shadow-xs"
                  : "btn-light border-0 text-secondary"
              }`}
              style={{ fontSize: "11.5px", borderRadius: "6px" }}
              onClick={() => setTileLayer("satellite")}
              title="Satellite view with real aerial imagery"
            >
              <Compass size={12} />
              <span>Satellite</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm py-1 px-2.5 d-inline-flex align-items-center gap-1 ${
                mapType === "streets"
                  ? "btn-dark text-white fw-semibold shadow-xs"
                  : "btn-light border-0 text-secondary"
              }`}
              style={{ fontSize: "11.5px", borderRadius: "6px" }}
              onClick={() => setTileLayer("streets")}
              title="Street road map"
            >
              <Layers size={12} />
              <span>Street</span>
            </button>
          </div>

          {/* Re-center Pin Button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 py-1 px-2.5"
            style={{ fontSize: "11.5px", borderRadius: "6px", whiteSpace: "nowrap" }}
            title="Focus map on the current bakery pin"
          >
            <Navigation size={12} className="text-danger" />
            <span>Center Pin</span>
          </button>
        </div>
      </div>

      {/* 4. Interactive Map Container (Fluid Responsive Height) */}
      <div
        style={{
          height: "380px",
          width: "100%",
          borderRadius: "14px",
          overflow: "hidden",
          border: "2px solid #cbd5e1",
          boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />

        {/* Delivery Radius Floating Badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 1000,
            background: "rgba(225, 29, 72, 0.92)",
            backdropFilter: "blur(6px)",
            color: "#ffffff",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 2px 8px rgba(225, 29, 72, 0.4)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#ffffff",
            }}
          />
          <span>{deliveryRadiusKm || 10} km Delivery Radius</span>
        </div>

        {/* View Mode Floating Pill */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            color: "#ffffff",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "600",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: mapType === "satellite" ? "#4ade80" : "#60a5fa",
            }}
          />
          <span className="d-none d-sm-inline">
            {mapType === "satellite" ? "Satellite (Hybrid)" : "Street Road Map"}
          </span>
          <span className="d-inline d-sm-none">
            {mapType === "satellite" ? "Satellite" : "Street"}
          </span>
        </div>
      </div>

      {/* 5. Clean, Two-Tier Responsive Pin Address & Coordinates Card */}
      <div
        className="mt-2.5 p-3 bg-white rounded-3 border shadow-xs d-flex flex-column gap-2.5 w-100"
        style={{
          borderColor: "#e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {/* Tier 1: Real-time Resolved Pin Address */}
        <div className="d-flex align-items-start gap-2.5">
          <div
            className="p-1.5 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0 mt-0.5"
            style={{ width: "28px", height: "28px" }}
          >
            <MapPin size={15} />
          </div>
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-0.5">
              <span className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                Pinned Shop Address:
              </span>
              {geocoding && (
                <span
                  className="badge bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center gap-1 py-0.5 px-2"
                  style={{ fontSize: "11px" }}
                >
                  <Loader2 size={11} className="animate-spin" /> Detecting location...
                </span>
              )}
            </div>
            <div
              className="text-dark fw-medium text-break"
              style={{ fontSize: "13px", lineHeight: "1.45" }}
            >
              {resolvedAddress ? (
                resolvedAddress
              ) : geocoding ? (
                <span className="text-muted">Resolving exact location address...</span>
              ) : (
                <span className="text-muted fst-italic">
                  Drag the red pin or click on the map to pinpoint exact address.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tier 2: Coordinates Badge & Copy Action + Drag Hint */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
          <div className="d-flex align-items-center flex-wrap gap-1.5">
            <span
              className="badge bg-light text-dark border font-monospace px-2.5 py-1.5 d-inline-flex align-items-center gap-1.5"
              style={{ fontSize: "12px", borderColor: "#e2e8f0" }}
            >
              <span className="text-muted fw-normal">Coordinates:</span>
              <strong className="text-danger fw-bold">
                {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              </strong>
            </span>

            <button
              type="button"
              onClick={handleCopyCoords}
              className="btn btn-sm btn-outline-secondary py-1 px-2.5 d-inline-flex align-items-center gap-1"
              style={{ fontSize: "11.5px", borderRadius: "6px" }}
              title="Copy coordinates"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-success" />
                  <span className="text-success fw-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <span
            className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 text-wrap text-start"
            style={{ fontSize: "11px", fontWeight: "500" }}
          >
            Drag red pin onto your shop rooftop or entrance
          </span>
        </div>
      </div>
    </div>
  );
}
