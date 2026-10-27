import { baseApi } from "./baseApi";
import { setUser, signOut } from "../context/authSlice";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    adminLogin: build.mutation({
      query: (payload) => ({
        url: "/auth/admin-login",
        method: "POST",
        body: payload,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const token = data?.accessToken || data?.token || data?.user?.token;
          if (data?.user && !data?.requiresOtp) {
            dispatch(setUser({ ...data.user, accessToken: token }));
          }
        } catch {}
      },
    }),
    sendOtp: build.mutation({
      query: (payload) => ({
        url: "/auth/send-otp",
        method: "POST",
        body:
          typeof payload === "string"
            ? { email: payload, role: "admin", type: "login" }
            : { role: "admin", type: "login", ...payload },
      }),
    }),
    verifyOtp: build.mutation({
      query: (payload) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body: payload,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const token = data?.accessToken || data?.token || data?.user?.token;
          if (data?.user) {
            dispatch(setUser({ ...data.user, accessToken: token }));
          } else if (token) {
            dispatch(setUser({ accessToken: token }));
          }
        } catch {
          // Handled in component
        }
      },
      invalidatesTags: ["Auth"],
    }),
    getMe: build.query({
      query: () => ({ url: "/auth/me" }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const token = data?.accessToken || data?.token || data?.user?.token;
          if (data?.user) {
            dispatch(setUser({ ...data.user, accessToken: token }));
          } else if (token) {
            dispatch(setUser({ accessToken: token }));
          }
        } catch {
          // Handled in component
        }
      },
      providesTags: ["Auth"],
    }),
    logout: build.mutation({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
        }
        dispatch(signOut());
        dispatch(baseApi.util.resetApiState());
        try {
          await queryFulfilled;
        } catch {}
      },
      invalidatesTags: ["Auth"],
    }),
    forgotPassword: build.mutation({
      query: (email) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: typeof email === "object" ? email : { email, role: "admin" },
      }),
    }),
    resendForgotPasswordOtp: build.mutation({
      query: (email) => ({
        url: "/auth/resend-forgot-password-otp",
        method: "POST",
        body: typeof email === "object" ? email : { email, role: "admin" },
      }),
    }),
    verifyForgotPasswordOtp: build.mutation({
      query: ({ email, otp }) => ({
        url: "/auth/verify-forgot-password-otp",
        method: "POST",
        body: { email, otp },
      }),
    }),
    verifyResetPasswordToken: build.mutation({
      query: (accessToken) => ({
        url: `/auth/reset-password/${encodeURIComponent(accessToken)}`,
        method: "GET",
      }),
    }),
    resetPassword: build.mutation({
      query: (payload) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: payload,
      }),
    }),
    getCustomers: build.query({
      query: (params) => ({
        url: "/auth/customers",
        params,
      }),
      providesTags: ["Customers"],
    }),
    editCustomer: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/auth/customers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Customers"],
    }),
    deleteCustomer: build.mutation({
      query: (id) => ({
        url: `/auth/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),
    toggleCustomerStatus: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/auth/customers/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Customers"],
    }),
    bulkUpdateCustomerStatus: build.mutation({
      query: ({ ids, isBlocked, blockReason }) => ({
        url: "/auth/customers/bulk-status",
        method: "POST",
        body: { ids, isBlocked, blockReason },
      }),
      invalidatesTags: ["Customers"],
    }),
    bulkDeleteCustomers: build.mutation({
      query: ({ ids }) => ({
        url: "/auth/customers/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: ["Customers"],
    }),
    getBlockedSupportRequests: build.query({
      query: (params) => ({
        url: "/auth/blocked-support-requests",
        params,
      }),
      providesTags: ["BlockedRequests"],
    }),
    resolveBlockedSupportRequest: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/auth/blocked-support-requests/${id}/resolve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["BlockedRequests", "Customers"],
    }),
    updateProfile: build.mutation({
      query: (body) => ({
        url: "/auth/profile",
        method: "PUT",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(setUser(data.user));
          }
        } catch {}
      },
      invalidatesTags: ["Auth"],
    }),
    changePassword: build.mutation({
      query: (body) => ({
        url: "/auth/change-password",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    requestEmailChange: build.mutation({
      query: (body) => ({
        url: "/auth/request-email-change",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(setUser(data.user));
          }
        } catch {}
      },
      invalidatesTags: ["Auth"],
    }),
    resendEmailChangeOtp: build.mutation({
      query: () => ({
        url: "/auth/resend-email-change-otp",
        method: "POST",
      }),
    }),
    verifyEmailChange: build.mutation({
      query: (body) => ({
        url: "/auth/verify-email-change",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(setUser(data.user));
          }
        } catch {}
      },
      invalidatesTags: ["Auth"],
    }),
    cancelEmailChange: build.mutation({
      query: () => ({
        url: "/auth/cancel-email-change",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResendForgotPasswordOtpMutation,
  useVerifyForgotPasswordOtpMutation,
  useVerifyResetPasswordTokenMutation,
  useResetPasswordMutation,
  useGetCustomersQuery,
  useEditCustomerMutation,
  useDeleteCustomerMutation,
  useToggleCustomerStatusMutation,
  useBulkUpdateCustomerStatusMutation,
  useBulkDeleteCustomersMutation,
  useGetBlockedSupportRequestsQuery,
  useResolveBlockedSupportRequestMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
  useResendEmailChangeOtpMutation,
  useVerifyEmailChangeMutation,
  useCancelEmailChangeMutation,
} = authApi;
