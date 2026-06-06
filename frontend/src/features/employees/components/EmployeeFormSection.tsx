"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  employeeFormSectionBodyClass,
  employeeFormSectionBodyDenseClass,
  employeeFormSectionClass,
  employeeFormSectionDescClass,
  employeeFormSectionHeaderClass,
  employeeFormSectionTitleClass,
} from "../employee-theme";

interface Props {
  title: string;
  description?: string;
  dense?: boolean;
  children: ReactNode;
}

export default function EmployeeFormSection({
  title,
  description,
  dense = false,
  children,
}: Props) {
  return (
    <section className={employeeFormSectionClass}>
      <div className={employeeFormSectionHeaderClass}>
        <h3 className={employeeFormSectionTitleClass}>{title}</h3>
        {description ? (
          <p className={employeeFormSectionDescClass}>{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          dense ? employeeFormSectionBodyDenseClass : employeeFormSectionBodyClass,
        )}
      >
        {children}
      </div>
    </section>
  );
}
