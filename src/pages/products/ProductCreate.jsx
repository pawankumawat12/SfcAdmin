import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import toast from "react-hot-toast";
import ProductForm from "../../components/forms/ProductForm";
import Button from "../../components/ui/Button";
import {
  useCreateProductMutation,
  useGetProductCategoriesQuery,
} from "../../services/productApi";
import { useGetMyStoreQuery, useGetStoresQuery } from "../../services/storeApi";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryStoreId = searchParams.get("storeId");

  const user = useSelector((state) => state.auth?.user);
  const isStoreOwner = user?.role === "store_owner";

  const { data: storeResponse, isLoading: storeLoading } = useGetMyStoreQuery(
    undefined,
    { skip: !isStoreOwner }
  );

  const { data: storesResponse } = useGetStoresQuery(
    {},
    { skip: isStoreOwner }
  );
  const stores = storesResponse?.stores || [];
  const selectedStore = queryStoreId ? stores.find((s) => String(s.id) === String(queryStoreId)) : null;

  const { data: categoryResponse, isLoading: categoriesLoading } =
    useGetProductCategoriesQuery();
  const [createProduct, { isLoading, error }] = useCreateProductMutation();
  const categories = categoryResponse?.data || [];

  // Store Owner Location Guard: Must set store location before adding products
  useEffect(() => {
    if (!storeLoading && isStoreOwner && storeResponse?.store) {
      const store = storeResponse.store;
      if (store.latitude == null || store.longitude == null) {
        toast.error(
          "⚠️ Please set your Bakery Store Location on the map first before adding products."
        );
        navigate("/store-location");
      }
    }
  }, [storeLoading, isStoreOwner, storeResponse, navigate]);
  
  const save = async (data) => {
    try {
      const effectiveStoreId = isStoreOwner ? user?.store_id : (data.storeId || queryStoreId || "");
      await createProduct({
        ...data,
        storeId: effectiveStoreId,
      }).unwrap();
      toast.success("Product created successfully!");
      if (queryStoreId) {
        navigate(`/stores/${queryStoreId}/products`);
      } else {
        navigate("/products");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Unable to create product");
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Add product</h1>
          <p>
            {selectedStore
              ? `Creating new product for store "${selectedStore.name}"`
              : "Create a new menu item for the storefront."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (queryStoreId) {
              navigate(`/stores/${queryStoreId}/products`);
            } else {
              navigate("/products");
            }
          }}
        >
          <ArrowLeft size={17} /> {queryStoreId ? "Back to store products" : "Back to products"}
        </Button>
      </div>

      {selectedStore && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            color: "#166534",
            fontSize: "13.5px",
            fontWeight: 600,
          }}
        >
          <Store size={18} />
          <span>
            Assigning to Store: <strong>{selectedStore.name}</strong>
            {selectedStore.city ? ` (${selectedStore.city})` : ""}
            {selectedStore.owner_name ? ` — Owner: ${selectedStore.owner_name}` : ""}
          </span>
        </div>
      )}

      {categoriesLoading ? (
        <p>Loading categories...</p>
      ) : (
        <>
          <ProductForm
            categories={categories}
            stores={stores}
            isAdmin={!isStoreOwner}
            initialValues={{
              name: "",
              description: "",
              categoryId: "",
              storeId: queryStoreId || "",
              price: "",
              availability_type: "IN_STOCK",
              stock: 0,
              status: "Active",
            }}
            onSubmit={save}
            submitLabel="Create product"
            isSubmitting={isLoading}
          />
          {error && error.status !== 401 && (
            <p className="error">
              {error.data?.errors
                ? Object.entries(error.data.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join(" | ")
                : error.data?.message || "Unable to create product"}
            </p>
          )}
        </>
      )}
    </>
  );
}
