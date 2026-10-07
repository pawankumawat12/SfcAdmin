import { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Save,
  Search,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { useGetPosProductsQuery } from "../../services/productApi";
import {
  useGetIngredientsQuery,
  useGetProductRecipeQuery,
  useSaveProductRecipeMutation,
} from "../../services/inventoryApi";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { useThrottledCallback } from "../../utils/throttle";

export default function RecipeList() {
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const [selectedProductId, setSelectedProductId] = useState(null);

  // STRICT REQUIREMENT: Only Admin products (admin_only: true), including POS-created items (include_pos: true)
  const { data: productsData, isLoading: isLoadingProducts } = useGetPosProductsQuery({
    limit: 200,
    admin_only: true,
    include_pos: true,
    ...(debouncedProductSearch.trim() ? { search: debouncedProductSearch.trim() } : {}),
  });
  const products = (productsData?.data || []).filter((p) => p.store_id == null);

  const { data: ingredientsData } = useGetIngredientsQuery({ limit: 200, admin_only: true });
  const allIngredients = ingredientsData?.data || [];

  const {
    data: recipeData,
    isLoading: isLoadingRecipe,
    refetch: refetchRecipe,
  } = useGetProductRecipeQuery(selectedProductId, {
    skip: !selectedProductId,
  });

  const [saveProductRecipe, { isLoading: isSaving }] = useSaveProductRecipeMutation();

  const [recipeItems, setRecipeItems] = useState([]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (recipeData?.data?.ingredients) {
      setRecipeItems(
        recipeData.data.ingredients.map((item) => ({
          ingredient_id: item.ingredientId,
          quantity: item.requiredQuantity,
          unit: item.recipeUnit,
        }))
      );
    } else {
      setRecipeItems([]);
    }
  }, [recipeData]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleAddIngredient = () => {
    const available = allIngredients.find(
      (ing) => !recipeItems.some((r) => Number(r.ingredient_id) === Number(ing.id))
    );
    if (!available) {
      toast.error("Please add another raw material to use in this recipe.");
      return;
    }
    setRecipeItems((prev) => [
      ...prev,
      {
        ingredient_id: available.id,
        quantity: 1,
        unit: available.base_unit,
      },
    ]);
  };

  const handleRemoveIngredient = (index) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, ingId) => {
    const ing = allIngredients.find((i) => Number(i.id) === Number(ingId));
    setRecipeItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ingredient_id: Number(ingId),
        unit: ing?.base_unit || "piece",
      };
      return updated;
    });
  };

  const handleQuantityChange = (index, qty) => {
    setRecipeItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: qty === "" ? "" : Math.max(0, Number(qty)),
      };
      return updated;
    });
  };

  // Compute total food cost
  let computedCost = 0;
  recipeItems.forEach((r) => {
    const ing = allIngredients.find((i) => Number(i.id) === Number(r.ingredient_id));
    if (ing) {
      computedCost += (Number(r.quantity) || 0) * (Number(ing.purchase_price) || 0);
    }
  });

  const productPrice = Number(selectedProduct?.price || 0);
  const profitMargin = productPrice > 0 ? Number((productPrice - computedCost).toFixed(2)) : 0;
  const marginPct =
    productPrice > 0 ? Number(((profitMargin / productPrice) * 100).toFixed(1)) : 0;

  const handleSaveRecipe = async () => {
    if (!selectedProductId) return;

    for (const r of recipeItems) {
      if (!r.ingredient_id || Number(r.quantity) <= 0) {
        toast.error("Please enter a valid quantity greater than 0 for all ingredients");
        return;
      }
    }

    try {
      await saveProductRecipe({
        productId: selectedProductId,
        ingredients: recipeItems,
      }).unwrap();
      toast.success("Product recipe saved successfully!");
      refetchRecipe();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save recipe");
    }
  };

  const throttledSaveRecipe = useThrottledCallback(handleSaveRecipe, 2000);

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Product Recipes & BOM</h1>
          <p>Map required raw materials per menu item, calculate recipe food cost, and automate inventory deductions.</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: "320px 1fr", gap: "20px" }}>
        {/* Left: Product Selector Card */}
        <div className="card" style={{ padding: "18px", height: "fit-content" }}>
          <div className="card-title" style={{ marginBottom: "14px" }}>
            <h3>Menu Products</h3>
          </div>

          <SearchInput
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: "100%", marginBottom: "12px" }}
          />

          <div style={{ maxHeight: "550px", overflowY: "auto" }}>
            {isLoadingProducts ? (
              <p style={{ color: "var(--muted)", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
                Loading products...
              </p>
            ) : products.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
                No products found.
              </p>
            ) : (
              products.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginBottom: "6px",
                      background: isSelected ? "var(--purple-soft, #f4f3ff)" : "transparent",
                      border: isSelected ? "1px solid #d4ceff" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? "var(--purple, #6253e8)" : "var(--ink, #1f2937)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>{p.name}</span>
                        {p.is_pos_only && (
                          <span
                            className="badge"
                            style={{
                              fontSize: "9.5px",
                              backgroundColor: "#ede9fe",
                              color: "#6b21a8",
                              fontWeight: 600,
                              padding: "1px 5px",
                            }}
                          >
                            POS
                          </span>
                        )}
                      </div>
                      <small style={{ color: "var(--muted, #6d6c80)", fontSize: "11px" }}>
                        {p.category_name || "Food Item"}
                      </small>
                    </div>
                    <strong style={{ fontFamily: "monospace", fontSize: "13px" }}>
                      ₹{p.price}
                    </strong>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recipe Details & Ingredients Table */}
        <div>
          {selectedProduct ? (
            <>
              {/* Stats row for margins */}
              <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "18px" }}>
                <div className="stat-card">
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>Menu Selling Price</span>
                  <strong style={{ fontFamily: "monospace", fontSize: "22px" }}>
                    ₹{productPrice.toFixed(2)}
                  </strong>
                </div>

                <div className="stat-card">
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>Calculated Food Cost</span>
                  <strong style={{ fontFamily: "monospace", fontSize: "22px", color: "var(--purple)" }}>
                    ₹{computedCost.toFixed(2)}
                  </strong>
                </div>

                <div className="stat-card">
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>Gross Profit Margin</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <strong style={{ fontFamily: "monospace", fontSize: "22px", color: "#26945c" }}>
                      ₹{profitMargin}
                    </strong>
                    <em className="active" style={{ fontSize: "11px", fontWeight: "bold" }}>
                      {marginPct}%
                    </em>
                  </div>
                </div>
              </div>

              {/* Recipe card */}
              <div className="card table-card">
                <div className="table-toolbar" style={{ alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600 }}>
                      Recipe Ingredients for "{selectedProduct.name}"
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                      Quantities deducted automatically per 1 item ordered
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleAddIngredient}>
                    <Plus size={16} /> Add Ingredient
                  </Button>
                </div>

                {recipeItems.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <UtensilsCrossed size={36} color="#abaaba" style={{ margin: "0 auto 10px" }} />
                    <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
                      No ingredients mapped yet for this product. Click "Add Ingredient" to create the recipe.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>RAW MATERIAL</th>
                          <th style={{ width: "160px" }}>QTY PER ORDER</th>
                          <th>UNIT COST</th>
                          <th>SUBTOTAL</th>
                          <th>CANCEL RESTOCK?</th>
                          <th style={{ width: "60px", textAlign: "center" }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipeItems.map((item, index) => {
                          const ingObj = allIngredients.find(
                            (i) => Number(i.id) === Number(item.ingredient_id)
                          );
                          const subtotal =
                            (Number(item.quantity) || 0) * (Number(ingObj?.purchase_price) || 0);

                          return (
                            <tr key={index}>
                              <td>
                                <Select
                                  value={item.ingredient_id}
                                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                                  style={{ width: "100%", height: "36px" }}
                                >
                                  {allIngredients.map((ing) => (
                                    <option key={ing.id} value={ing.id}>
                                      {ing.name} ({ing.category})
                                    </option>
                                  ))}
                                </Select>
                              </td>

                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0.0001"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                    placeholder="Qty"
                                    style={{ height: "36px", width: "90px", fontFamily: "monospace" }}
                                  />
                                  <small style={{ color: "var(--muted)", fontWeight: 600 }}>
                                    {ingObj?.base_unit || "pc"}
                                  </small>
                                </div>
                              </td>

                              <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                                ₹{Number(ingObj?.purchase_price || 0).toFixed(2)}
                              </td>

                              <td style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600 }}>
                                ₹{subtotal.toFixed(2)}
                              </td>

                              <td>
                                {ingObj?.restore_stock_on_cancel ? (
                                  <em className="active">Restorable</em>
                                ) : (
                                  <em className="inactive">Consumed in Prep</em>
                                )}
                              </td>

                              <td style={{ textAlign: "center" }}>
                                <Button
                                  variant="delete"
                                  onClick={() => handleRemoveIngredient(index)}
                                  title="Remove Ingredient"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "flex-end",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Button variant="primary" onClick={throttledSaveRecipe} loading={isSaving} disabled={isSaving}>
                    <Save size={16} /> Save Recipe
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: "50px", textAlign: "center" }}>
              <Package size={36} color="#abaaba" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--muted)", margin: 0 }}>Select a menu product from the left to view or edit its recipe.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
