import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../lib/auth";
import { MeResponse, TokenResponse } from "../../types/api";

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginRes = await apiClient<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Set token and fetch user workspaces
      useAuthStore.getState().setAccessToken(loginRes.access_token);
      const meRes = await apiClient<MeResponse>("/auth/me");

      setAuth(loginRes.access_token, meRes.user, meRes.workspaces);
      navigate("/library");
    } catch (err: any) {
      setError(err.detail || err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-bg-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-light dark:text-muted-dark">
          Sign in to your Documind account to continue
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
        />

        <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-light dark:text-muted-dark">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary hover:underline font-medium">
          Create account
        </Link>
      </div>
    </div>
  );
}
