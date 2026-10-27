import { baseApi } from "./baseApi";

export const reelApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminReels: build.query({
      query: () => ({
        url: "/reels/admin",
      }),
      providesTags: (result) => [
        { type: "Reels", id: "LIST" },
        ...(result?.data || []).map(({ id }) => ({
          type: "Reels",
          id,
        })),
      ],
    }),

    getReel: build.query({
      query: (id) => `/reels/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Reels", id }],
    }),

    createReel: build.mutation({
      query: (formData) => ({
        url: "/reels",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Reels", id: "LIST" }],
    }),

    updateReel: build.mutation({
      query: ({ id, formData }) => ({
        url: `/reels/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Reels", id: "LIST" },
        { type: "Reels", id },
      ],
    }),

    toggleReelStatus: build.mutation({
      query: ({ id, is_active }) => ({
        url: `/reels/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Reels", id: "LIST" },
        { type: "Reels", id },
      ],
    }),

    reorderReels: build.mutation({
      query: (orderedIds) => ({
        url: "/reels/reorder",
        method: "PATCH",
        body: { orderedIds },
      }),
      invalidatesTags: [{ type: "Reels", id: "LIST" }],
    }),

    deleteReel: build.mutation({
      query: (id) => ({
        url: `/reels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Reels", id: "LIST" },
        { type: "Reels", id },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminReelsQuery,
  useGetReelQuery,
  useCreateReelMutation,
  useUpdateReelMutation,
  useToggleReelStatusMutation,
  useReorderReelsMutation,
  useDeleteReelMutation,
} = reelApi;

