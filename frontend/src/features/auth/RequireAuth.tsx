import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../../components/ui/Spinner";
import { apiClient, silentRefreshToken } from "../../lib/apiClient";
import { isTokenExpired, useAuthStore } from "../../lib/auth";
import { MeResponse } from "../../types/api";

export function RequireAuth() {
  const location = useLocation();
  const { accessToken, user, setAuth, logout } = useAuthStore();

  const hasValidSession = Boolean(accessToken && user && !isTokenExpired(accessToken));
  const [checking, setChecking] = useState(!hasValidSession);

  useEffect(() => {
    let mounted = true;

    const verifyOrRefresh = async () => {
      const currentToken = useAuthStore.getState().accessToken;
      const currentUser = useAuthStore.getState().user;

      // 1. If valid session already exists in memory/localStorage, proceed immediately
      if (currentToken && currentUser && !isTokenExpired(currentToken)) {
        if (mounted) setChecking(false);
        return;
      }

      // 2. If token is missing or expired, attempt single-flight silent refresh
      try {
        const newToken = await silentRefreshToken();
        if (newToken) {
          const meRes = await apiClient<MeResponse>("/auth/me");
          if (mounted) {
            setAuth(newToken, meRes.user, meRes.workspaces);
          }
        } else {
          if (mounted) logout();
        }
      } catch {
        if (mounted) logout();
      } finally {
        if (mounted) setChecking(false);
      }
    };

    verifyOrRefresh();

    return () => {
      mounted = false;
    };
  }, [setAuth, logout]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
