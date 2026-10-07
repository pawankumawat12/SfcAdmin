import { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Search,
  Plus,
  Settings,
  ShoppingBag,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  Package,
  Layers,
  X,
  User,
  Phone,
  Percent,
  Calculator,
  Store,
  CheckCircle2,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import {
  useGetPosProductsQuery,
  useGetProductCategoriesQuery,
} from "../../services/productApi";
import { useCreatePosSaleMutation } from "../../services/orderApi";
import { useGetMyStoreQuery, useGetStoresQuery } from "../../services/storeApi";
import toAssetUrl from "../../utils/assetUrl";
import useDebouncedValue from "../../utils/useDebouncedValue";
import PosProductModal from "./PosProductModal";
import PosManageProductsModal from "./PosManageProductsModal";
import PosSalesHistoryModal from "./PosSalesHistoryModal";

export default function PosCounter() {
  const user = useSelector((state) => state.auth?.user);
  const isAdmin = user?.role === "admin";
  const isStoreOwner = user?.role === "store_owner";

  // If Store Owner, fetch own store
  const { data: myStoreResponse } = useGetMyStoreQuery(
    undefined,
    { skip: !isStoreOwner }
  );

  // If Admin, fetch stores list to allow switching between Main Bakery and branch stores
  const { data: storesResponse } = useGetStoresQuery(
    { limit: 100 },
    { skip: !isAdmin }
  );

  const myStore = myStoreResponse?.store || myStoreResponse?.data;
  const storesList = storesResponse?.data || [];

  // Admin selected store: "admin" (Main Bakery) or specific branch store id
  const [selectedStoreId, setSelectedStoreId] = useState("admin");

  const activeStoreId = useMemo(() => {
    if (isStoreOwner) {
      return myStore?.id || user?.store_id || null;
    }
    return selectedStoreId; // "admin" or numeric store id
  }, [isStoreOwner, myStore?.id, user?.store_id, selectedStoreId]);

  const activeStoreName = useMemo(() => {
    if (isStoreOwner) {
      return myStore?.name || "Branch Store";
    }
    if (selectedStoreId === "admin") {
      return "Main Bakery (Head Office)";
    }
    const found = storesList.find((s) => String(s.id) === String(selectedStoreId));
    return found ? found.name : "Branch Store";
  }, [isStoreOwner, myStore?.name, selectedStoreId, storesList]);

  // Strict POS query params - includes global bakery products and branch store items
  const posQueryParams = useMemo(() => {
    if (isStoreOwner) {
      return { limit: 300, include_admin: true, store_id: activeStoreId || undefined };
    }
    if (selectedStoreId === "admin") {
      return { limit: 300, admin_only: true };
    }
    return { limit: 300, include_admin: true, store_id: selectedStoreId };
  }, [isStoreOwner, activeStoreId, selectedStoreId]);

  const {
    data: productsResponse,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useGetPosProductsQuery(posQueryParams);

  const { data: categoriesResponse } = useGetProductCategoriesQuery();

  const allProducts = productsResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [productTypeFilter, setProductTypeFilter] = useState("ALL");

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState("FIXED"); 
  const [discountValue, setDiscountValue] = useState("");
  const [taxPercent] = useState(5); 
  const [includeTax, setIncludeTax] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash"); 
  const [cashReceived, setCashReceived] = useState("");
  const [notes, setNotes] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    if (mobileCartOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setMobileCartOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [mobileCartOpen]);

  const handleStoreChange = (newStoreId) => {
    if (newStoreId !== selectedStoreId) {
      if (cartItems.length > 0) {
        if (!window.confirm("Switching store will clear the current POS cart. Continue?")) {
          return;
        }
        setCartItems([]);
      }
      setSelectedStoreId(newStoreId);
    }
  };

  // API mutation
  const [createPosSale, { isLoading: isProcessingSale }] =
    useCreatePosSaleMutation();

  const filteredProducts = useMemo(() => {
    let result = (allProducts || []).filter((p) => {
      if (isStoreOwner) {
        if (activeStoreId) {
          return p.store_id == null || Number(p.store_id) === Number(activeStoreId);
        }
        return true;
      }
      if (isAdmin && selectedStoreId !== "admin") {
        return p.store_id == null || Number(p.store_id) === Number(selectedStoreId);
      }
      return p.store_id == null;
    });

    // Filter by type
    if (productTypeFilter === "POS_ONLY") {
      result = result.filter(
        (p) => p.is_pos_only === true || p.isPosOnly === true
      );
    } else if (productTypeFilter === "REGULAR") {
      result = result.filter((p) => !p.is_pos_only && !p.isPosOnly);
    }

    // Filter by category
    if (selectedCategory !== "ALL") {
      result = result.filter(
        (p) => String(p.category_id) === String(selectedCategory)
      );
    }

    // Filter by search query (debounced)
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q) ||
          String(p.price).includes(q)
      );
    }

    return result;
  }, [allProducts, isStoreOwner, isAdmin, selectedStoreId, activeStoreId, productTypeFilter, selectedCategory, debouncedSearchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === "PERCENT") {
      return (subtotal * Math.min(val, 100)) / 100;
    }
    return Math.min(val, subtotal);
  }, [subtotal, discountValue, discountType]);

  const taxAmount = useMemo(() => {
    if (!includeTax) return 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    return (taxableSubtotal * (Number(taxPercent) || 0)) / 100;
  }, [subtotal, discountAmount, includeTax, taxPercent]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== "Cash") return 0;
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - totalAmount);
  }, [cashReceived, totalAmount, paymentMethod]);

  // Cart Actions with real-time stock validation
  const addToCart = (product) => {
    const isMadeToOrder = product.availability_type === "MADE_TO_ORDER";
    const baseStock = Number(product.stock) || 0;
    const existing = cartItems.find((item) => item.id === product.id);
    const inCartQty = existing ? existing.quantity : 0;

    if (!isMadeToOrder && inCartQty >= baseStock) {
      toast.error(`"${product.name}" has only ${baseStock} units available in stock.`);
      return;
    }

    setCartItems((prev) => {
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          stock: baseStock,
          availability_type: product.availability_type,
          images: product.images,
          category_name: product.category_name,
          is_pos_only: product.is_pos_only,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + delta;
            const isMadeToOrder = item.availability_type === "MADE_TO_ORDER";
            const baseStock = Number(item.stock) || 0;

            if (delta > 0 && !isMadeToOrder && nextQty > baseStock) {
              toast.error(`Cannot add more. Only ${baseStock} units available in stock.`);
              return item;
            }

            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    if (cartItems.length === 0) return;
    if (window.confirm("Clear all items from current bill?")) {
      setCartItems([]);
      setDiscountValue("");
      setCashReceived("");
    }
  };

  // Quick cash buttons
  const setQuickCash = (amount) => {
    setCashReceived(String(amount));
  };

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty. Add products to proceed.");
      return;
    }

    const trimmedPhone = customerPhone.trim();
    if (trimmedPhone) {
      // 10-digit Indian mobile validation (starts with 6, 7, 8, or 9)
      const cleanDigits = trimmedPhone.replace(/\D/g, "");
      const indianPhoneRegex = /^[6-9]\d{9}$/;
      if (!indianPhoneRegex.test(cleanDigits)) {
        toast.error("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
        return;
      }
    }

    if (paymentMethod === "Cash" && cashReceived && Number(cashReceived) < totalAmount) {
      toast.error(
        `Received cash is less than the total bill of ₹${totalAmount.toFixed(2)}`
      );
      return;
    }

    try {
      const cleanPhone = trimmedPhone ? trimmedPhone.replace(/\D/g, "").slice(-10) : "";
      const salePayload = {
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: cleanPhone,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          images: item.images,
        })),
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        totalAmount,
        paymentMethod,
        receivedAmount:
          paymentMethod === "Cash"
            ? Number(cashReceived) || totalAmount
            : totalAmount,
        changeAmount: changeDue,
        notes: notes.trim(),
        storeId:
          isStoreOwner
            ? (activeStoreId || user?.store_id || null)
            : (selectedStoreId === "admin" ? null : Number(selectedStoreId)),
      };

      await createPosSale(salePayload).unwrap();

      toast.success("Sale completed! Stock updated successfully.");

      // Refresh products immediately to update current stock badges
      await refetchProducts();

      // Reset all register fields to empty/default state
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue("");
      setCashReceived("");
      setNotes("");
      setIncludeTax(false);
      setPaymentMethod("Cash");
      setMobileCartOpen(false);
    } catch (err) {
      console.error("Complete POS sale error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to process sale");
    }
  };

  const posItemsCount = useMemo(() => {
    return (allProducts || []).filter((p) => {
      const matchStore = isStoreOwner
        ? (!activeStoreId || p.store_id == null || Number(p.store_id) === Number(activeStoreId))
        : isAdmin && selectedStoreId !== "admin"
        ? p.store_id == null || Number(p.store_id) === Number(selectedStoreId)
        : p.store_id == null;
      return matchStore && (p.is_pos_only === true || p.isPosOnly === true);
    }).length;
  }, [allProducts, isStoreOwner, isAdmin, selectedStoreId, activeStoreId]);

  return (
    <div className="pos-counter-page pb-4">
      {/* Standard Admin Header */}
      <div className="section-head mb-4">
        <div>
          <h1>POS Counter</h1>
          <p>
            Point of Sale counter terminal for <strong>{activeStoreName}</strong>.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Admin Branch Switcher */}
          {isAdmin && (
            <div className="d-flex align-items-center gap-2 bg-white px-3 py-1.5 rounded-3 border shadow-sm">
              <Store size={16} className="text-primary flex-shrink-0" />
              <span className="text-muted small fw-medium text-nowrap">Active Branch:</span>
              <select
                className="form-select form-select-sm border-0 bg-transparent fw-semibold text-dark shadow-none p-0 pe-4"
                style={{ cursor: "pointer", width: "auto" }}
                value={selectedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
              >
                <option value="admin">🏢 Main Bakery (Head Office)</option>
                {storesList.map((st) => (
                  <option key={st.id} value={st.id}>
                    🏪 {st.name} {st.city ? `(${st.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Store Owner Branch Fixed Badge */}
          {isStoreOwner && (
            <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 text-primary px-3 py-1.5 rounded-3 border border-primary border-opacity-25 fw-semibold small">
              <Store size={16} />
              <span>{activeStoreName} (Branch POS)</span>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <History size={16} /> Sales History
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsManageModalOpen(true)}
          >
            <Settings size={16} /> Manage POS Items ({posItemsCount})
          </Button>
          <Button
            onClick={() => {
              setProductToEdit(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus size={16} /> Add POS Item
          </Button>

          {/* Mobile Cart Trigger */}
          <button
            type="button"
            className="btn btn-outline-primary d-lg-none d-inline-flex align-items-center gap-1.5 ms-auto"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
          >
            <ShoppingBag size={16} />
            <span>Cart ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="row g-4 align-items-start">
        {/* Left Side: Admin Products Catalog */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-xs border">
            {/* Filter and Search Bar */}
            <div className="p-3 border-bottom bg-white">
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-6">
                  <SearchInput
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Scope Filter: All vs POS Only vs Master Catalog */}
                <div className="col-12 col-md-6">
                  <div className="d-flex gap-1 p-1 bg-light rounded-3">
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill rounded-2 fw-medium ${
                        productTypeFilter === "ALL"
                          ? "bg-white text-dark shadow-xs"
                          : "text-muted"
                      }`}
                      style={{ fontSize: "12px", border: "none" }}
                      onClick={() => setProductTypeFilter("ALL")}
                    >
                      All Items ({allProducts.length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill rounded-2 fw-medium ${
                        productTypeFilter === "POS_ONLY"
                          ? "bg-white text-dark shadow-xs fw-bold"
                          : "text-muted"
                      }`}
                      style={{ fontSize: "12px", border: "none" }}
                      onClick={() => setProductTypeFilter("POS_ONLY")}
                    >
                      POS Exclusive ({posItemsCount})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill rounded-2 fw-medium ${
                        productTypeFilter === "REGULAR"
                          ? "bg-white text-dark shadow-xs"
                          : "text-muted"
                      }`}
                      style={{ fontSize: "12px", border: "none" }}
                      onClick={() => setProductTypeFilter("REGULAR")}
                    >
                      Standard Catalog
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Pills Bar */}
              <div
                className="d-flex align-items-center gap-1.5 overflow-x-auto pt-3"
                style={{ scrollbarWidth: "none" }}
              >
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill text-nowrap px-3 ${
                    selectedCategory === "ALL"
                      ? "btn-dark text-white fw-semibold"
                      : "btn-light text-secondary border"
                  }`}
                  style={{ fontSize: "12px" }}
                  onClick={() => setSelectedCategory("ALL")}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`btn btn-sm rounded-pill text-nowrap px-3 ${
                      String(selectedCategory) === String(cat.id)
                        ? "btn-dark text-white fw-semibold"
                        : "btn-light text-secondary border"
                    }`}
                    style={{ fontSize: "12px" }}
                    onClick={() => setSelectedCategory(String(cat.id))}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div
              className="p-3 overflow-y-auto"
              style={{ minHeight: "420px", maxHeight: "calc(100vh - 280px)" }}
            >
              {isLoadingProducts ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5">
                  <Package size={40} className="text-muted opacity-40 mb-2" />
                  <h6 className="fw-semibold text-secondary">No products found</h6>
                  <p className="text-muted small mb-3">
                    {debouncedSearchQuery
                      ? "No products matching your search term."
                      : "No products available in this category."}
                  </p>
                  <Button
                    onClick={() => {
                      setProductToEdit(null);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <Plus size={16} /> Create POS Item
                  </Button>
                </div>
              ) : (
                <div className="row g-3">
                  {filteredProducts.map((product) => {
                    const isPosExclusive =
                      product.is_pos_only === true || product.isPosOnly === true;
                    const inCartItem = cartItems.find((i) => i.id === product.id);
                    const inCartQty = inCartItem ? inCartItem.quantity : 0;
                    const isMadeToOrder = product.availability_type === "MADE_TO_ORDER";
                    const baseStock = Number(product.stock) || 0;
                    const currentRemainingStock = Math.max(0, baseStock - inCartQty);
                    const isOutOfStock = !isMadeToOrder && currentRemainingStock <= 0;

                    let imgUrl = "";
                    if (product.images) {
                      try {
                        const parsed =
                          typeof product.images === "string"
                            ? JSON.parse(product.images)
                            : product.images;
                        if (Array.isArray(parsed) && parsed.length > 0)
                          imgUrl = parsed[0];
                      } catch {
                        imgUrl = product.images;
                      }
                    }

                    return (
                      <div
                        key={product.id}
                        className="col-6 col-sm-4 col-md-3 col-xl-3"
                      >
                        <div
                          className={`card h-100 border rounded-3 position-relative overflow-hidden user-select-none transition-all ${
                            isOutOfStock
                              ? "opacity-75 bg-light-subtle"
                              : inCartItem
                              ? "border-primary bg-primary bg-opacity-10 shadow-xs"
                              : "border bg-white"
                          }`}
                          style={{
                            cursor: isOutOfStock ? "not-allowed" : "pointer",
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onClick={() => {
                            if (isOutOfStock) {
                              toast.error(`"${product.name}" is out of stock!`);
                            } else {
                              addToCart(product);
                            }
                          }}
                        >
                          {/* Top Stock Banner Bar (Prominently on top of card) */}
                          <div
                            className="px-2 py-1 border-bottom d-flex align-items-center justify-content-between"
                            style={{
                              backgroundColor: isOutOfStock
                                ? "#fee2e2"
                                : currentRemainingStock <= 5 && !isMadeToOrder
                                ? "#fef3c7"
                                : "#f0fdf4",
                              fontSize: "11px",
                            }}
                          >
                            {isMadeToOrder ? (
                              <span
                                className="badge bg-info-subtle text-info-emphasis rounded-pill px-1.5 py-0.5 fw-semibold"
                                style={{ fontSize: "10px" }}
                              >
                                ★ Made to Order
                              </span>
                            ) : isOutOfStock ? (
                              <span
                                className="fw-bold text-danger d-flex align-items-center gap-1"
                                style={{ fontSize: "11px" }}
                              >
                                ✕ Out of Stock (0 left)
                              </span>
                            ) : currentRemainingStock <= 5 ? (
                              <span
                                className="fw-bold text-warning-emphasis d-flex align-items-center gap-1"
                                style={{ fontSize: "11px" }}
                              >
                                ⚠ Only {currentRemainingStock} left {inCartQty > 0 ? `(-${inCartQty})` : ""}
                              </span>
                            ) : (
                              <span
                                className="fw-bold text-success d-flex align-items-center gap-1"
                                style={{ fontSize: "11px" }}
                              >
                                ● Stock: {currentRemainingStock} left {inCartQty > 0 ? `(-${inCartQty})` : ""}
                              </span>
                            )}

                            {isPosExclusive && (
                              <span
                                className="badge rounded-pill fw-semibold"
                                style={{
                                  backgroundColor: "var(--purple, #6253e8)",
                                  color: "#fff",
                                  fontSize: "9px",
                                }}
                              >
                                POS
                              </span>
                            )}
                          </div>

                          {/* Cart Quantity Badge (floating on image) */}
                          {inCartItem && (
                            <div
                              className="position-absolute end-0 m-1.5 z-2"
                              style={{ top: "32px", pointerEvents: "none" }}
                            >
                              <span
                                className="badge rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-xs"
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  fontSize: "11px",
                                }}
                              >
                                {inCartItem.quantity}
                              </span>
                            </div>
                          )}

                          {/* Image */}
                          <div
                            className="bg-light d-flex align-items-center justify-content-center overflow-hidden position-relative"
                            style={{ height: "105px" }}
                          >
                            {imgUrl ? (
                              <img
                                src={toAssetUrl(imgUrl)}
                                alt={product.name}
                                className="w-100 h-100 object-fit-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Package size={30} className="text-muted opacity-30" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="p-2.5 d-flex flex-column justify-content-between flex-grow-1">
                            <div>
                              <div
                                className="fw-semibold text-dark text-truncate mb-0.5"
                                style={{ fontSize: "13px" }}
                                title={product.name}
                              >
                                {product.name}
                              </div>
                              <div
                                className="text-muted text-truncate"
                                style={{ fontSize: "11px" }}
                              >
                                {product.category_name || "Bakery"}
                              </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between mt-2 pt-1 border-top">
                              <span className="fw-bold text-dark fs-6">
                                ₹{Number(product.price).toFixed(2)}
                              </span>
                              {isOutOfStock ? (
                                <span
                                  className="badge bg-secondary-subtle text-secondary border px-2 py-1"
                                  style={{ fontSize: "10.5px" }}
                                >
                                  Sold Out
                                </span>
                              ) : (
                                <span
                                  className="badge bg-light text-primary border fw-semibold px-2 py-1"
                                  style={{ fontSize: "11px" }}
                                >
                                  + Add {inCartQty > 0 ? `(${inCartQty})` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Register / Billing Cart */}
        <div
          className={
            mobileCartOpen
              ? "d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100 p-2 p-sm-3 bg-dark bg-opacity-75 overflow-y-auto"
              : "col-12 col-lg-4 d-none d-lg-block"
          }
          style={
            mobileCartOpen
              ? { zIndex: 1055, backdropFilter: "blur(4px)" }
              : undefined
          }
          onClick={(e) => {
            if (mobileCartOpen && e.target === e.currentTarget) {
              setMobileCartOpen(false);
            }
          }}
        >
          <div
            className="card shadow-lg border d-flex flex-column bg-white mx-auto rounded-3"
            style={{
              width: "100%",
              maxWidth: mobileCartOpen ? "480px" : "100%",
              maxHeight: mobileCartOpen ? "min(94vh, 780px)" : "calc(100vh - 120px)",
              height: mobileCartOpen ? "auto" : "100%",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0">
              <div className="d-flex align-items-center gap-2">
                <Receipt size={18} className="text-primary" />
                <h6 className="mb-0 fw-bold fs-6">Current Register Bill</h6>
              </div>

              <div className="d-flex align-items-center gap-1">
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-link text-danger btn-sm p-1 text-decoration-none"
                    onClick={clearCart}
                    title="Clear Cart"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {mobileCartOpen && (
                  <button
                    type="button"
                    className="btn btn-sm btn-close ms-2"
                    onClick={() => setMobileCartOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* Customer Details Strip */}
            <div className="px-3 py-2 border-bottom bg-white flex-shrink-0">
              <div className="row g-2">
                <div className="col-7">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <User size={13} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-5">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <Phone size={13} className="text-muted" />
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      className="form-control border-start-0 ps-0"
                      placeholder="10-digit Mobile"
                      value={customerPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setCustomerPhone(digits);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div
              className="p-3 overflow-y-auto flex-grow-1"
              style={{
                minHeight: "60px",
                maxHeight: mobileCartOpen ? "220px" : "320px",
              }}
            >
              {cartItems.length === 0 ? (
                <div className="text-center py-5">
                  <ShoppingBag size={36} className="text-muted opacity-30 mb-2" />
                  <h6 className="fw-semibold text-secondary mb-1">Cart is empty</h6>
                  <p className="text-muted small">
                    Click items on the left to start billing.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="d-flex align-items-center justify-content-between p-2 rounded-2 border bg-light-subtle"
                    >
                      <div className="flex-grow-1 pe-2">
                        <div className="d-flex align-items-center gap-1.5">
                          <span
                            className="fw-semibold text-dark text-truncate"
                            style={{ fontSize: "13px", maxWidth: "160px" }}
                          >
                            {item.name}
                          </span>
                          {item.is_pos_only && (
                            <span
                              className="badge"
                              style={{
                                fontSize: "9px",
                                backgroundColor: "#ede9fe",
                                color: "#6b21a8",
                              }}
                            >
                              POS
                            </span>
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          ₹{item.price.toFixed(2)} each {item.availability_type !== "MADE_TO_ORDER" ? `• Stock: ${item.stock}` : "• Made to Order"}
                        </div>
                      </div>

                      {/* Steppers */}
                      <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center border rounded bg-white">
                          <button
                            type="button"
                            className="btn btn-sm btn-icon py-0 px-2 text-secondary"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span
                            className="px-1.5 fw-semibold"
                            style={{ fontSize: "12px" }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-icon py-0 px-2 text-secondary"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>

                        <div
                          className="text-end fw-bold text-dark"
                          style={{ minWidth: "55px", fontSize: "13px" }}
                        >
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>

                        <button
                          type="button"
                          className="btn btn-link text-danger p-0 ms-1"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations & Checkout */}
            <div
              className="p-2.5 p-sm-3 border-top bg-light flex-shrink-0 overflow-y-auto"
              style={{
                maxHeight: mobileCartOpen ? "calc(100dvh - 220px)" : "none",
              }}
            >
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white">
                      <Percent size={13} className="text-muted" />
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="Discount"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary dropdown-toggle"
                      style={{ fontSize: "11px" }}
                      onClick={() =>
                        setDiscountType(
                          discountType === "FIXED" ? "PERCENT" : "FIXED"
                        )
                      }
                    >
                      {discountType === "PERCENT" ? "%" : "₹"}
                    </button>
                  </div>
                </div>

                <div className="col-5">
                  <button
                    type="button"
                    className={`btn btn-sm w-100 rounded text-nowrap ${
                      includeTax
                        ? "btn-outline-primary"
                        : "btn-outline-secondary"
                    }`}
                    style={{ fontSize: "11px" }}
                    onClick={() => setIncludeTax(!includeTax)}
                  >
                    {includeTax ? `GST (${taxPercent}%) On` : "No Tax"}
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="d-flex justify-content-between text-muted small py-0.5">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="d-flex justify-content-between text-danger small py-0.5">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {includeTax && (
                <div className="d-flex justify-content-between text-muted small py-0.5">
                  <span>Tax ({taxPercent}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Total */}
              <div className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top">
                <span className="fw-bold text-dark fs-6">Payable Total</span>
                <span className="fw-bolder text-dark fs-4">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              {/* Payment Methods */}
              <div className="pt-2">
                <div className="d-flex gap-1.5">
                  {[
                    { id: "Cash", icon: Banknote, label: "Cash" },
                    { id: "UPI", icon: QrCode, label: "UPI" },
                    { id: "Card", icon: CreditCard, label: "Card" },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isActive = paymentMethod === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`btn btn-sm flex-fill rounded d-flex align-items-center justify-content-center gap-1.5 py-1.5 ${
                          isActive
                            ? "btn-primary fw-bold"
                            : "btn-outline-secondary bg-white text-secondary"
                        }`}
                        onClick={() => setPaymentMethod(mode.id)}
                      >
                        <Icon size={14} />
                        <span style={{ fontSize: "12px" }}>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Denominations and Change Calculator */}
              {paymentMethod === "Cash" && (
                <div className="mt-2 pt-2 border-top">
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <span className="small text-muted fw-semibold">
                      Quick Cash:
                    </span>
                    <div className="d-flex gap-1">
                      {[Math.ceil(totalAmount), 100, 200, 500].map(
                        (amt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="btn btn-xs btn-light border py-0.5 px-2 rounded text-dark fw-semibold"
                            style={{ fontSize: "10.5px" }}
                            onClick={() => setQuickCash(amt)}
                          >
                            {idx === 0 ? "Exact" : `₹${amt}`}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="row g-2 align-items-center">
                    <div className="col-6">
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        placeholder="Cash Given"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                      />
                    </div>
                    <div className="col-6 text-end">
                      <span className="text-muted small">Change: </span>
                      <strong
                        className={`fs-6 ${
                          changeDue > 0 ? "text-success" : "text-dark"
                        }`}
                      >
                        ₹{changeDue.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Charge & Complete Sale Button */}
              <button
                type="button"
                className="btn btn-primary btn-lg w-100 rounded-3 mt-2.5 mt-sm-3 py-2.5 fw-bold shadow-xs d-flex align-items-center justify-content-center gap-2"
                disabled={isProcessingSale || cartItems.length === 0}
                onClick={handleCompleteSale}
              >
                {isProcessingSale ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                    />
                    <span>Recording Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Charge ₹{totalAmount.toFixed(2)} & Complete Sale</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POS Product Creation / Edit Modal */}
      <PosProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setProductToEdit(null);
        }}
        storeId={isStoreOwner ? activeStoreId : (selectedStoreId === "admin" ? null : selectedStoreId)}
        storeName={activeStoreName}
        productToEdit={productToEdit}
        onSuccess={async () => {
          try {
            if (refetchProducts) {
              await refetchProducts();
            }
          } catch (e) {
            console.warn("Product refetch notice:", e);
          }
        }}
      />

      {/* Manage POS Items Drawer / Modal */}
      <PosManageProductsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        storeId={isStoreOwner ? activeStoreId : (selectedStoreId === "admin" ? null : selectedStoreId)}
        storeName={activeStoreName}
        allProducts={allProducts}
        onAddNew={() => {
          setIsManageModalOpen(false);
          setProductToEdit(null);
          setIsAddModalOpen(true);
        }}
        onEditProduct={(prod) => {
          setIsManageModalOpen(false);
          setProductToEdit(prod);
          setIsAddModalOpen(true);
        }}
      />

      {/* POS Sales History & Edit Modal */}
      <PosSalesHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        storeId={isStoreOwner ? activeStoreId : (selectedStoreId === "admin" ? "admin" : selectedStoreId)}
        storeName={activeStoreName}
        allProducts={allProducts}
        onSaleUpdated={() => {
          refetchProducts();
        }}
      />
    </div>
  );
}
