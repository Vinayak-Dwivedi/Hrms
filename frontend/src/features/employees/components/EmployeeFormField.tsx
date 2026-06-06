"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  employeeFormFieldClass,
  employeeFormFieldSpan2Class,
  employeeFormFieldSpan3Class,
} from "../employee-theme";

interface Props {
  children: ReactNode;
  span?: 1 | 2 | 3;
}

export default function EmployeeFormField({ children, span = 1 }: Props) {
  return (
    <div
      className={cn(
        employeeFormFieldClass,
        span === 2 && employeeFormFieldSpan2Class,
        span === 3 && [employeeFormFieldSpan2Class, employeeFormFieldSpan3Class],
      )}
    >
      {children}
    </div>
  );
}
