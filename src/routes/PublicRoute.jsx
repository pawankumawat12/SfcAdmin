import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../context/authSlice";
import { useGetMeQuery } from "../services/authApi";
import BrandSplashScreen from "../components/common/BrandSplashScreen";
import { getFirstAllowedRouteForManager } from "../utils/managerPermissions";

export default function PublicRoute() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const accessToken = useSelector((state) => state.auth.accessToken);

  const hasLocalToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
  const hasAuth = Boolean(user || accessToken || hasLocalToken);

  const { data, isLoading } = useGetMeQuery(undefined, {
    skip: !hasAuth,
    refetchOnMountOrArgChange: false,
  });

  useEffect(() => {
    if (data?.user) {
      dispatch(
        setUser({
          ...data.user,
          accessToken: data.accessToken || data.token || data.user?.token,
        })
      );
    }
  }, [data, dispatch]);

  if (isLoading) {
    return <BrandSplashScreen message="Verifying session..." />;
  }

  const effectiveUser = user || data?.user;
  if (effectiveUser?.role === "admin" || effectiveUser?.role === "store_owner") {
    return <Navigate to="/" replace />;
  }
  if (effectiveUser?.role === "manager") {
    return (
      <Navigate
        to={getFirstAllowedRouteForManager(effectiveUser.permissions)}
        replace
      />
    );
  }

  return <Outlet />;
}

