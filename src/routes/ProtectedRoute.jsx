import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser, signOut } from "../context/authSlice";
import { useGetMeQuery } from "../services/authApi";
import BrandSplashScreen from "../components/common/BrandSplashScreen";
import {
  isRouteAllowedForManager,
  getFirstAllowedRouteForManager,
} from "../utils/managerPermissions";

export default function ProtectedRoute() {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);

  const { data, isLoading, isFetching, isError } = useGetMeQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
    }
  );

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

  useEffect(() => {
    if (isError && user) {
      dispatch(signOut());
    }
  }, [isError, user, dispatch]);

  if ((isLoading || isFetching) && !isError && !user) {
    return <BrandSplashScreen message="Securing your admin workspace..." />;
  }

  // Allow admin, store_owner, and manager into the portal
  const effectiveUser = user || data?.user;
  const isAuthorized = Boolean(
    effectiveUser &&
      (effectiveUser.role === "admin" ||
        effectiveUser.role === "store_owner" ||
        effectiveUser.role === "manager")
  );

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  // Only super admin (role === "admin") can access /managers
  if (effectiveUser.role !== "admin" && location.pathname.startsWith("/managers")) {
    const fallbackRoute =
      effectiveUser.role === "manager"
        ? getFirstAllowedRouteForManager(effectiveUser.permissions)
        : "/";
    return <Navigate to={fallbackRoute} replace />;
  }

  // Enforce route-level permissions for manager role
  if (
    effectiveUser.role === "manager" &&
    !isRouteAllowedForManager(location.pathname, effectiveUser.permissions)
  ) {
    const firstAllowed = getFirstAllowedRouteForManager(effectiveUser.permissions);
    return <Navigate to={firstAllowed} replace />;
  }

  return <Outlet />;
}

