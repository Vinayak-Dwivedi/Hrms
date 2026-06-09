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
  headerAction?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

export default function EmployeeFormSection({
  title,
  description,
  dense = false,
  headerAction,
  bodyClassName,
  children,
}: Props) {
  return (
    <section className={employeeFormSectionClass}>
      <div className={employeeFormSectionHeaderClass}>
        {headerAction ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className={employeeFormSectionTitleClass}>{title}</h3>
              {description ? (
                <p className={employeeFormSectionDescClass}>{description}</p>
              ) : null}
            </div>
            <div className="shrink-0">{headerAction}</div>
          </div>
        ) : (
          <>
            <h3 className={employeeFormSectionTitleClass}>{title}</h3>
            {description ? (
              <p className={employeeFormSectionDescClass}>{description}</p>
            ) : null}
          </>
        )}
      </div>
      <div
        className={cn(
          dense ? employeeFormSectionBodyDenseClass : employeeFormSectionBodyClass,
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
