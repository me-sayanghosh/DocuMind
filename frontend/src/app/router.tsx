import { Navigate, createBrowserRouter } from "react-router-dom";
import { AdminPage } from "../features/admin/AdminPage";
import { LoginForm } from "../features/auth/LoginForm";
import { RegisterForm } from "../features/auth/RegisterForm";
import { RequireAuth } from "../features/auth/RequireAuth";
import { ChatPage } from "../features/chat/ChatPage";
import { EvalsPage } from "../features/evals/EvalsPage";
import { HomePage } from "../features/home/HomePage";
import { LibraryPage } from "../features/library/LibraryPage";
import { WorkspaceSettings } from "../features/workspace/WorkspaceSettings";
import { AppShell } from "./AppShell";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/home",
    element: <HomePage />,
  },
  {
    path: "/login",
    element: (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light dark:bg-bg-dark">
        <LoginForm />
      </div>
    ),
  },
  {
    path: "/register",
    element: (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light dark:bg-bg-dark">
        <RegisterForm />
      </div>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/library", element: <LibraryPage /> },
          { path: "/chat", element: <ChatPage /> },
          { path: "/chat/:conversationId", element: <ChatPage /> },
          { path: "/evals", element: <EvalsPage /> },
          { path: "/admin", element: <AdminPage /> },
          { path: "/settings", element: <WorkspaceSettings /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
