import { baseApi } from "./baseApi";

export const whatsappApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWhatsAppStatus: build.query({
      query: () => "/whatsapp/status",
      providesTags: ["WhatsApp"],
    }),
    disconnectWhatsApp: build.mutation({
      query: () => ({
        url: "/whatsapp/disconnect",
        method: "POST",
      }),
      invalidatesTags: ["WhatsApp"],
    }),
    reconnectWhatsApp: build.mutation({
      query: () => ({
        url: "/whatsapp/reconnect",
        method: "POST",
      }),
      invalidatesTags: ["WhatsApp"],
    }),
    sendTestWhatsApp: build.mutation({
      query: (body) => ({
        url: "/whatsapp/test",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetWhatsAppStatusQuery,
  useDisconnectWhatsAppMutation,
  useReconnectWhatsAppMutation,
  useSendTestWhatsAppMutation,
} = whatsappApi;

