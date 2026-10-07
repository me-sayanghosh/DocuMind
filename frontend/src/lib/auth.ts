import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Workspace } from "../types/api";

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  setAuth: (token: string, user: User, workspaces: Workspace[]) => void;
  setAccessToken: (token: string) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    // Expired if current time exceeds expiration (with 10s buffer)
    return !payload.exp || payload.exp < now + 10;
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
      setAuth: (token, user, workspaces) =>
        set({
          accessToken: token,
          user,
          workspaces,
          currentWorkspace: workspaces[0] || null,
          isLoading: false,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) =>
        set((state) => ({
          workspaces,
          currentWorkspace:
            state.currentWorkspace && workspaces.some((w) => w.id === state.currentWorkspace?.id)
              ? state.currentWorkspace
              : workspaces[0] || null,
        })),
      setUser: (user) => set({ user }),
      logout: () => {
        try {
          localStorage.removeItem("docmind_auth");
        } catch {}
        set({
          accessToken: null,
          user: null,
          workspaces: [],
          currentWorkspace: null,
          isLoading: false,
        });
      },
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "docmind_auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
