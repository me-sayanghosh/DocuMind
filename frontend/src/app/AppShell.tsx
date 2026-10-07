import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  LogOut,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  TestTube2,
} from "lucide-react";
import { WorkspaceSwitcher } from "../features/workspace/WorkspaceSwitcher";
import { useAuthStore } from "../lib/auth";

export function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
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

  return (
    <div className="flex h-screen w-full bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light dark:border-border-dark flex flex-col justify-between p-4 bg-surface-light dark:bg-surface-dark shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
              D
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-text-light dark:text-text-dark">
                DocChat
              </span>
              <span className="text-[10px] block text-primary font-semibold uppercase tracking-wider">
                Verifiable RAG
              </span>
            </div>
          </div>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
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
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
