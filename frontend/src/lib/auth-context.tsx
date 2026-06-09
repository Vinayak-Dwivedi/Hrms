"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchAuthSession, type LoggedInUser } from "@/lib/hrms-client";
import {
  canAccessRoute,
  defaultHomeForUser,
} from "@/lib/route-access";

type AuthContextValue = {
  user: LoggedInUser;
  permissions: string[];
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  redirectToLogin = true,
}: {
  children: ReactNode;
  redirectToLogin?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession()
      .then((session) => {
        if (cancelled) return;
        if (!session) {
          if (redirectToLogin) router.replace("/login");
          return;
        }
        setUser(session.user);
        setPermissions(session.permissions);
      })
      .catch(() => {
        if (!cancelled && redirectToLogin) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, redirectToLogin]);

  const hasPermissionFn = useCallback(
    (code: string) => {
      if (user?.role === "admin") return true;
      return permissions.includes(code);
    },
    [user, permissions],
  );

  const hasAnyPermissionFn = useCallback(
    (codes: string[]) => {
      if (user?.role === "admin") return true;
      return codes.some((c) => permissions.includes(c));
    },
    [user, permissions],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        hasPermission: hasPermissionFn,
        hasAnyPermission: hasAnyPermissionFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, permissions } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const session = { role: user.role, permissions };
    const ok = canAccessRoute(pathname, session);
    setAllowed(ok);
    if (!ok) {
      router.replace("/unauthorized");
    }
  }, [pathname, user, permissions, router]);

  if (allowed === false) {
    return null;
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return children;
}

export function useDefaultHome(): string {
  const { user, permissions } = useAuth();
  return defaultHomeForUser(user.role, permissions);
}
