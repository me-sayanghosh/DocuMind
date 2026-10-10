import { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PageSkeleton } from "../components/ui/Skeleton";
import { RequireAuth } from "../features/auth/RequireAuth";
import { AppShell } from "./AppShell";

const HomePage = lazy(() => import("../features/home/HomePage").then((m) => ({ default: m.HomePage })));
const LoginForm = lazy(() => import("../features/auth/LoginForm").then((m) => ({ default: m.LoginForm })));
const RegisterForm = lazy(() => import("../features/auth/RegisterForm").then((m) => ({ default: m.RegisterForm })));
const LibraryPage = lazy(() => import("../features/library/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const ChatPage = lazy(() => import("../features/chat/ChatPage").then((m) => ({ default: m.ChatPage })));
const EvalsPage = lazy(() => import("../features/evals/EvalsPage").then((m) => ({ default: m.EvalsPage })));
const AdminPage = lazy(() => import("../features/admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const WorkspaceSettings = lazy(() => import("../features/workspace/WorkspaceSettings").then((m) => ({ default: m.WorkspaceSettings })));

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: "/home",
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light dark:bg-bg-dark">
          <LoginForm />
        </div>
      </Suspense>
    ),
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-light dark:bg-bg-dark">
          <RegisterForm />
        </div>
      </Suspense>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/library",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <LibraryPage />
              </Suspense>
            ),
          },
          {
            path: "/chat",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ChatPage />
              </Suspense>
            ),
          },
          {
            path: "/chat/:conversationId",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <ChatPage />
              </Suspense>
            ),
          },
          {
            path: "/evals",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <EvalsPage />
              </Suspense>
            ),
          },
          {
            path: "/admin",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <AdminPage />
              </Suspense>
            ),
          },
          {
            path: "/settings",
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <WorkspaceSettings />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
