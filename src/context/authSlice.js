import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, accessToken: null },
  reducers: {
    setUser: (state, action) => {
      const payload = action.payload;
      if (payload) {
        state.user = payload.user || payload;
        const token =
          payload.accessToken ||
          payload.token ||
          payload.user?.accessToken ||
          payload.user?.token;
        if (token) {
          state.accessToken = token;
          if (typeof window !== "undefined") {
            localStorage.setItem("accessToken", token);
          }
        }
      }
    },
    
    signOut: (state) => {
      state.user = null;
      state.accessToken = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
      }
    },
  },
});
export const { setUser, signOut } = authSlice.actions;
export default authSlice.reducer;
