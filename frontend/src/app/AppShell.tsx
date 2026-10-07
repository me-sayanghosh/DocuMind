import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  TestTube2,
  X,
} from "lucide-react";
import { WorkspaceSwitcher } from "../features/workspace/WorkspaceSwitcher";
import { useAuthStore } from "../lib/auth";

export function AppShell() {
  const location = useLocation();
  const { user, logout, currentWorkspace } = useAuthStore();
  const [darkMode, setDarkMode] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { label: "Home", path: "/", icon: Home, exact: true },
    { label: "Library", path: "/library", icon: BookOpen },
    { label: "Chat", path: "/chat", icon: MessageSquare },
    { label: "Evals", path: "/evals", icon: TestTube2 },
    { label: "Settings", path: "/settings", icon: Settings },
    ...(user?.is_admin ? [{ label: "Admin", path: "/admin", icon: Shield }] : []),
  ];

  const bottomNavItems = [
    { label: "Home", path: "/", icon: Home, exact: true },
    { label: "Library", path: "/library", icon: BookOpen },
    { label: "Chat", path: "/chat", icon: MessageSquare },
    { label: "Evals", path: "/evals", icon: TestTube2 },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors during sign out
    }
    logout();
  };

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark font-sans overflow-hidden">
      {/* 1. Mobile Top Header (< md) */}
      <header className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1 rounded-lg text-text-light dark:text-text-dark hover:bg-border-light/40 dark:hover:bg-border-dark/40 active:scale-95 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm">
              D
            </div>
            <span className="font-bold text-sm tracking-tight text-text-light dark:text-text-dark">
              DocuMind
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {currentWorkspace && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-text-light dark:text-text-dark max-w-[120px] truncate">
              {currentWorkspace.name}
            </span>
          )}

          <button
            onClick={toggleDark}
            className="p-1.5 rounded-lg text-muted-light dark:text-muted-dark hover:bg-border-light/50 dark:hover:bg-border-dark"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. Mobile Slide-Over Navigation Drawer Backdrop & Panel */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-surface-light dark:bg-surface-dark h-full flex flex-col justify-between p-4 shadow-2xl z-10 border-r border-border-light dark:border-border-dark">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark">
                <Link
                  to="/"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-base shadow-sm">
                    D
                  </div>
                  <div>
                    <span className="font-bold text-base tracking-tight text-text-light dark:text-text-dark">
                      DocuMind
                    </span>
                    <span className="text-[10px] block text-muted-light dark:text-muted-dark font-medium uppercase tracking-wider">
                      Verifiable RAG
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-muted-light dark:text-muted-dark hover:bg-border-light/50 dark:hover:bg-border-dark"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workspace Switcher */}
              <div>
                <p className="text-[11px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider px-1 mb-1.5">
                  Workspace
                </p>
                <WorkspaceSwitcher />
              </div>

              {/* Nav Links */}
              <div>
                <p className="text-[11px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider px-1 mb-1.5">
                  Navigation
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.path, item.exact);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm font-semibold"
                            : "text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-border-light/40 dark:hover:bg-border-dark/40"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Drawer User Footer */}
            <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="truncate pr-2">
                  <p className="text-xs font-semibold text-text-light dark:text-text-dark truncate">
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-muted-light dark:text-muted-dark capitalize">
                    {user?.is_admin ? "Administrator" : "Member"}
                  </p>
                </div>

                <button
                  onClick={toggleDark}
                  className="p-1.5 rounded-md hover:bg-border-light/50 dark:hover:bg-border-dark text-muted-light dark:text-muted-dark"
                  title="Toggle theme"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Fixed Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 border-r border-border-light dark:border-border-dark flex-col justify-between p-4 bg-surface-light dark:bg-surface-dark shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 px-2 group">
            <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              D
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-text-light dark:text-text-dark">
                DocuMind
              </span>
              <span className="text-[10px] block text-muted-light dark:text-muted-dark font-medium uppercase tracking-wider">
                Verifiable RAG
              </span>
            </div>
          </Link>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-sm font-semibold"
                      : "text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-border-light/40 dark:hover:bg-border-dark/40"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-text-light dark:text-text-dark truncate">
                {user?.email}
              </p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark capitalize">
                {user?.is_admin ? "Administrator" : "Member"}
              </p>
            </div>

            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md hover:bg-border-light/50 dark:hover:bg-border-dark text-muted-light dark:text-muted-dark"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* 4. Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* 5. Mobile Bottom Navigation Bar (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-border-light dark:border-border-dark flex items-center justify-around py-1.5 px-2 shadow-lg">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-black dark:text-white font-bold"
                  : "text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark"
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  isActive ? "bg-black/10 dark:bg-white/10" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5 leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
