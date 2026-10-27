import { baseApi } from "./baseApi";

export const storeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStores: builder.query({
      query: (params = {}) => ({
        url: "/stores",
        method: "GET",
        params,
      }),
      providesTags: ["Stores"],
    }),

    getStoreById: builder.query({
      query: (id) => ({
        url: `/stores/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    createStore: builder.mutation({
      query: (body) => ({
        url: "/stores",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Stores"],
    }),

    updateStore: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/stores/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Stores"],
    }),

    toggleStoreStatus: builder.mutation({
      query: ({ id, is_open }) => ({
        url: `/stores/${id}/status`,
        method: "PATCH",
        body: { is_open },
      }),
      invalidatesTags: ["Stores"],
    }),

    toggleStoreAutoForward: builder.mutation({
      query: ({ id, auto_forward_orders }) => ({
        url: `/stores/${id}/auto-forward`,
        method: "PATCH",
        body: { auto_forward_orders },
      }),
      invalidatesTags: ["Stores"],
    }),

    deleteStore: builder.mutation({
      query: (id) => ({
        url: `/stores/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stores"],
    }),

    getStoreRequests: builder.query({
      query: (params = {}) => ({
        url: "/stores/requests",
        method: "GET",
        params,
      }),
      providesTags: ["StoreRequests"],
    }),

    approveStoreRequest: builder.mutation({
      query: (arg) => {
        const id = typeof arg === "object" ? arg.id : arg;
        const body = typeof arg === "object" ? { permissions: arg.permissions, categoryIds: arg.categoryIds } : undefined;
        return {
          url: `/stores/requests/${id}/approve`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["StoreRequests", "Stores"],
    }),

    rejectStoreRequest: builder.mutation({
      query: (arg) => {
        const id = typeof arg === "object" ? arg.id : arg;
        const body = typeof arg === "object" && arg.reason ? { reason: arg.reason } : undefined;
        return {
          url: `/stores/requests/${id}/reject`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["StoreRequests"],
    }),

    requestStoreAccess: builder.mutation({
      query: (body) => ({
        url: "/stores/request-access",
        method: "POST",
        body,
      }),
    }),

    verifySetupToken: builder.query({
      query: (token) => ({
        url: "/stores/verify-setup-token",
        method: "GET",
        params: { token },
      }),
    }),

    setStorePassword: builder.mutation({
      query: (body) => ({
        url: "/stores/set-password",
        method: "POST",
        body,
      }),
    }),

    getMyStore: builder.query({
      query: () => ({
        url: "/stores/my-store",
        method: "GET",
      }),
      providesTags: ["Stores"],
    }),

    updateMyStoreLocation: builder.mutation({
      query: (body) => ({
        url: "/stores/my-store/location",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Stores"],
    }),

    getStoreSettlementSummary: builder.query({
      query: (id) => ({
        url: `/stores/${id}/settlement-summary`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "StoreSettlement", id }],
    }),

    getStorePayouts: builder.query({
      query: (id) => ({
        url: `/stores/${id}/payouts`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "StorePayouts", id }],
    }),

    recordStorePayout: builder.mutation({
      query: ({ storeId, ...body }) => ({
        url: `/stores/${storeId}/payouts`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { storeId }) => [
        { type: "StoreSettlement", id: storeId },
        { type: "StorePayouts", id: storeId },
        "Orders",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStoresQuery,
  useGetStoreByIdQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useToggleStoreStatusMutation,
  useToggleStoreAutoForwardMutation,
  useDeleteStoreMutation,
  useGetStoreRequestsQuery,
  useApproveStoreRequestMutation,
  useRejectStoreRequestMutation,
  useRequestStoreAccessMutation,
  useVerifySetupTokenQuery,
  useSetStorePasswordMutation,
  useGetMyStoreQuery,
  useUpdateMyStoreLocationMutation,
  useGetStoreSettlementSummaryQuery,
  useGetStorePayoutsQuery,
  useRecordStorePayoutMutation,
} = storeApi;

