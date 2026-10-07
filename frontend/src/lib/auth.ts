import { create } from "zustand";
import { User, Workspace } from "../types/api";

interface AuthState {
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

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  workspaces: [],
  currentWorkspace: null,
  isLoading: true,
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
  logout: () =>
    set({
      accessToken: null,
      user: null,
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
