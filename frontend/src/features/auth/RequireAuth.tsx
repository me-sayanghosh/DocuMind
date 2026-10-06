import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../../components/ui/Spinner";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../lib/auth";
import { MeResponse } from "../../types/api";

export function RequireAuth() {
  const location = useLocation();
  const { accessToken, user, setAuth, logout } = useAuthStore();
  const [checking, setChecking] = useState(!accessToken);

  useEffect(() => {
    let mounted = true;
    const tryInit = async () => {
      if (!accessToken) {
        try {
          // Attempt silent refresh
          const refreshRes = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            useAuthStore.getState().setAccessToken(data.access_token);
            const meRes = await apiClient<MeResponse>("/auth/me");
            if (mounted) {
              setAuth(data.access_token, meRes.user, meRes.workspaces);
            }
          } else {
            if (mounted) logout();
          }
        } catch {
          if (mounted) logout();
        } finally {
          if (mounted) setChecking(false);
        }
      } else {
        setChecking(false);
      }
    };

    tryInit();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

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
