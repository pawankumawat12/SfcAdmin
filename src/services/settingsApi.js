import { baseApi } from "./baseApi";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTheme: build.query({
      query: () => "/settings/theme",
      providesTags: ["Settings"],
    }),
    updateTheme: build.mutation({
      query: (body) => ({
        url: "/settings/theme",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getFooter: build.query({
      query: () => "/settings/footer",
      providesTags: ["Settings"],
    }),
    updateFooter: build.mutation({
      query: (body) => ({
        url: "/settings/footer",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getLogo: build.query({
      query: () => "/settings/logo",
      providesTags: ["Settings"],
    }),
    updateLogo: build.mutation({
      query: (body) => ({
        url: "/settings/logo",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getSettingPricing: build.query({
      query: () => "/settings/order-pricing",
      providesTags: ["Settings"],
    }),
    updateSettingPricing: build.mutation({
      query: (body) => ({
        url: "/settings/order-pricing",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),

    // SMTP Settings
    getSmtp: build.query({
      query: () => "/settings/smtp",
      providesTags: ["Settings", "Smtp"],
    }),
    updateSmtp: build.mutation({
      query: (body) => ({
        url: "/settings/smtp",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings", "Smtp"],
    }),
    testSmtp: build.mutation({
      query: (body) => ({
        url: "/settings/smtp/test",
        method: "POST",
        body,
      }),
    }),

    getEmailSettings: build.query({
      query: () => "/settings/email",
      providesTags: ["Settings", "EmailSettings"],
    }),
    sendEmailOtp: build.mutation({
      query: (body) => ({
        url: "/settings/email/send-otp",
        method: "POST",
        body,
      }),
    }),
    updateEmailSettings: build.mutation({
      query: (body) => ({
        url: "/settings/email",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings", "EmailSettings"],
    }),
    testEmail: build.mutation({
      query: (body) => ({
        url: "/settings/email/test",
        method: "POST",
        body,
      }),
    }),

    getStoreStatus: build.query({
      query: () => "/settings/store-status",
      providesTags: ["Settings", "StoreStatus"],
    }),
    updateStoreStatus: build.mutation({
      query: (body) => ({
        url: "/settings/store-status",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings", "StoreStatus"],
    }),

    // Payment Gateway Settings (Razorpay)
    getPaymentSettings: build.query({
      query: () => "/settings/payment",
      providesTags: ["Settings", "PaymentSettings"],
    }),
    updatePaymentSettings: build.mutation({
      query: (body) => ({
        url: "/settings/payment",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings", "PaymentSettings"],
    }),
  }),
});

export const {
  useGetThemeQuery,
  useUpdateThemeMutation,
  useGetFooterQuery,
  useUpdateFooterMutation,
  useGetLogoQuery,
  useUpdateLogoMutation,
  useGetSettingPricingQuery,
  useUpdateSettingPricingMutation,
  useGetSmtpQuery,
  useUpdateSmtpMutation,
  useTestSmtpMutation,
  useGetEmailSettingsQuery,
  useSendEmailOtpMutation,
  useUpdateEmailSettingsMutation,
  useTestEmailMutation,
  useGetStoreStatusQuery,
  useUpdateStoreStatusMutation,
  useGetPaymentSettingsQuery,
  useUpdatePaymentSettingsMutation,
} = settingsApi;
