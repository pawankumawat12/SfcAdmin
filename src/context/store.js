import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import catalogReducer from "./catalogSlice";
import managementReducer from "./managementSlice";
import { persistReducer, persistStore } from "redux-persist";
import storage from "../services/persistStorage";
import { baseApi } from "../services/baseApi";

const persistConfig = { key: "deepak-admin", storage, whitelist: ["catalog", "auth"] };
const rootReducer = combineReducers({
  auth: authReducer,
  catalog: catalogReducer,
  management: managementReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);
