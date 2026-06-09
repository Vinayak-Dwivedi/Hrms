"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultHomeForUser,
  type AuthSession,
} from "@/lib/route-access";
import { fetchAuthSession } from "@/lib/hrms-client";

export default function UnauthorizedPage() {
  const [homeHref, setHomeHref] = useState("/dashboard");

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession()
      .then((session) => {
        if (cancelled || !session) return;
        const auth: AuthSession = {
          role: session.user.role,
          permissions: session.permissions,
        };
        setHomeHref(defaultHomeForUser(auth.role, auth.permissions));
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f6fa] px-4">
      <h1 className="text-2xl font-semibold text-gray-900 m-0">
        Access denied
      </h1>
      <p className="text-sm text-gray-600 m-0 text-center max-w-md">
        You do not have permission to view this page. Contact your administrator
        if you believe this is an error.
      </p>
      <Link
        href={homeHref}
        className="inline-flex items-center rounded-lg bg-[#be185d] px-4 py-2 text-sm font-medium text-white no-underline hover:bg-[#9d174d]"
      >
        Go to home
      </Link>
    </div>
  );
}
