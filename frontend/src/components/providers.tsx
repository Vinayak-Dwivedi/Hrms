"use client";

import type React from "react";
import { QueryProvider } from "./query-provider";
import { TooltipProvider } from "./ui/tooltip";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryProvider>
  );
};

export default Providers;
