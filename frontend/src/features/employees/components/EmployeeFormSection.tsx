"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  employeeFormSectionBodyClass,
  employeeFormSectionBodyDenseClass,
  employeeFormSectionClass,
  employeeFormSectionDescClass,
  employeeFormSectionHeaderClass,
  employeeFormSectionIconClass,
  employeeFormSectionIconWrapClass,
  employeeFormSectionTitleClass,
  employeeListFormSectionBodyClass,
  employeeListFormSectionBodyDenseClass,
  employeeListFormSectionDescClass,
  employeeListFormSectionHeaderClass,
  employeeListFormSectionIconClass,
  employeeListFormSectionIconWrapClass,
  employeeListFormSectionTitleClass,
} from "../employee-theme";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  dense?: boolean;
  compact?: boolean;
  headerAction?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

function SectionHeading({
  title,
  description,
  icon: Icon,
  titleClassName,
  descClassName,
  iconWrapClassName,
  iconClassName,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  titleClassName: string;
  descClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
}) {
  const heading = (
    <>
      <h3 className={titleClassName}>{title}</h3>
      {description ? <p className={descClassName}>{description}</p> : null}
    </>
  );

  if (!Icon) return heading;

  return (
    <div
      className={cn(
        "flex gap-2.5 min-w-0",
        description ? "items-start" : "items-center",
      )}
    >
      <span aria-hidden className={iconWrapClassName}>
        <Icon className={iconClassName} />
      </span>
      <div className={cn("min-w-0", description && "pt-0.5")}>{heading}</div>
    </div>
  );
}

export default function EmployeeFormSection({
  title,
  description,
  icon,
  dense = false,
  compact = false,
  headerAction,
  bodyClassName,
  children,
}: Props) {
  const sectionHeaderClass = compact
    ? employeeListFormSectionHeaderClass
    : employeeFormSectionHeaderClass;
  const sectionTitleClass = compact
    ? employeeListFormSectionTitleClass
    : employeeFormSectionTitleClass;
  const sectionDescClass = compact
    ? employeeListFormSectionDescClass
    : employeeFormSectionDescClass;
  const sectionBodyClass = compact
    ? dense
      ? employeeListFormSectionBodyDenseClass
      : employeeListFormSectionBodyClass
    : dense
      ? employeeFormSectionBodyDenseClass
      : employeeFormSectionBodyClass;
  const sectionIconWrapClass = compact
    ? employeeListFormSectionIconWrapClass
    : employeeFormSectionIconWrapClass;
  const sectionIconClass = compact
    ? employeeListFormSectionIconClass
    : employeeFormSectionIconClass;

  const heading = (
    <SectionHeading
      description={description}
      descClassName={sectionDescClass}
      icon={icon}
      iconClassName={sectionIconClass}
      iconWrapClassName={sectionIconWrapClass}
      title={title}
      titleClassName={sectionTitleClass}
    />
  );

  return (
    <section className={employeeFormSectionClass}>
      <div className={sectionHeaderClass}>
        {headerAction ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">{heading}</div>
            <div className="shrink-0">{headerAction}</div>
          </div>
        ) : (
          heading
        )}
      </div>
      <div
        className={cn(
          sectionBodyClass,
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
