import { baseApi } from "./baseApi";

export const managerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getManagers: builder.query({
      query: () => "/managers",
      providesTags: ["Managers"],
    }),
    createManager: builder.mutation({
      query: (body) => ({
        url: "/managers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Managers"],
    }),
    updateManager: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/managers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Managers"],
    }),
    resendManagerInvite: builder.mutation({
      query: (id) => ({
        url: `/managers/${id}/resend-invite`,
        method: "POST",
      }),
      invalidatesTags: ["Managers"],
    }),
    deleteManager: builder.mutation({
      query: (id) => ({
        url: `/managers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Managers"],
    }),
  }),
});

export const {
  useGetManagersQuery,
  useCreateManagerMutation,
  useUpdateManagerMutation,
  useResendManagerInviteMutation,
  useDeleteManagerMutation,
} = managerApi;

