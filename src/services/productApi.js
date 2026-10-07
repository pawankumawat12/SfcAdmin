import { baseApi } from "./baseApi";

const createProductFormData = ({ imageFiles = [], status, is_pos_only, isPosOnly, ...product }) => {
  const formData = new FormData();
  const effectiveIsPosOnly = is_pos_only ?? isPosOnly;
  Object.entries({
    ...product,
    isActive: status === "Active",
    ...(effectiveIsPosOnly !== undefined ? { is_pos_only: effectiveIsPosOnly } : {}),
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null)
      formData.append(key, String(value));
  });
  Array.from(imageFiles).forEach((file) => formData.append("images", file));
  return formData;
};

export const productApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query({
      query: (params = {}) => ({
        url: "/products",
        params: { limit: 10, ...params },
      }),
      providesTags: (result) => [
        "Product",
        ...(result?.data || []).map(({ id }) => ({ type: "Product", id })),
      ],
    }),
    getPosProducts: build.query({
      query: (params = {}) => ({
        url: "/products",
        params: { limit: 300, include_pos: true, ...params },
      }),
      providesTags: (result) => [
        "Product",
        ...(result?.data || []).map(({ id }) => ({ type: "Product", id })),
      ],
    }),
    getProduct: build.query({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),
    getProductCategories: build.query({
      query: () => ({
        url: "/categories",
        params: { limit: 50, isActive: true },
      }),
      providesTags: ["Category"],
    }),
    createProduct: build.mutation({
      query: (product) => ({
        url: "/products",
        method: "POST",
        body: createProductFormData(product),
      }),
      invalidatesTags: ["Product"],
    }),
    updateProduct: build.mutation({
      query: (data) => {
        const formData = new FormData();
    
        formData.append("name", data.name);
        formData.append(
          "description",
          data.description || ""
        );
        formData.append(
          "categoryId",
          data.categoryId
        );
        formData.append(
          "price",
          data.price
        );
        formData.append(
          "stock",
          data.stock
        );
        formData.append(
          "availabilityType",
          data.availabilityType || "IN_STOCK"
        );
    
        formData.append(
          "isActive",
          data.status === "Active"
        );

        if (data.is_pos_only !== undefined || data.isPosOnly !== undefined) {
          formData.append("is_pos_only", String(data.is_pos_only ?? data.isPosOnly));
        }
    
        // VERY IMPORTANT
        formData.append(
          "existingImages",
          JSON.stringify(
            data.existingImages || []
          )
        );
    
        // New files
        (data.imageFiles || []).forEach((file) => {
          formData.append("images", file);
        });
    
        return {
          url: `/products/${data.id}`,
          method: "PUT",
          body: formData,
        }},
      invalidatesTags: (_result, _error, { id }) => [
        "Product",
        { type: "Product", id },
      ],
    }),
    deleteProduct: build.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Product"],
    }),
    bulkUpdateProductStatus: build.mutation({
      query: ({ ids, isActive }) => ({
        url: "/products/bulk-status",
        method: "POST",
        body: { ids, isActive },
      }),
      invalidatesTags: ["Product"],
    }),
    bulkDeleteProducts: build.mutation({
      query: ({ ids }) => ({
        url: "/products/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: ["Product"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetPosProductsQuery,
  useGetProductQuery,
  useGetProductCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkUpdateProductStatusMutation,
  useBulkDeleteProductsMutation,
} = productApi;
