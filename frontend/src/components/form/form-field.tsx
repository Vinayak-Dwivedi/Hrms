"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  LOGIN_CREDENTIAL_HINT,
  useFormValidationReveal,
} from "./form-validation-context";

type BaseFieldProps = {
  field: AnyFieldApi;
  label: React.ReactNode;
  description?: React.ReactNode;
  controlClassName?: string;
  loginCredential?: boolean;
};

function useFieldErrors(field: AnyFieldApi) {
  const revealErrors = useFormValidationReveal();
  const meta = useStore(field.store, (state) => state.meta);

  const errors = React.useMemo(() => {
    if (!revealErrors && !meta.isTouched && !meta.isBlurred) return [];
    return meta.errors
      .filter((error): error is { message: string } | string => Boolean(error))
      .map((error) => (typeof error === "string" ? { message: error } : error));
  }, [meta.errors, meta.isBlurred, meta.isTouched, revealErrors]);

  return errors;
}

const fieldErrorClassName = "text-[10px] leading-tight";

function FormFieldLabel({
  htmlFor,
  label,
  loginCredential = false,
}: {
  htmlFor: string;
  label: React.ReactNode;
  loginCredential?: boolean;
}) {
  if (!loginCredential) {
    return <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>;
  }

  return (
    <FieldLabel
      className="inline-flex flex-wrap items-baseline gap-x-1"
      htmlFor={htmlFor}
    >
      <span>{label}</span>
      <span className="text-[10px] font-normal leading-tight normal-case tracking-normal text-destructive">
        ({LOGIN_CREDENTIAL_HINT})
      </span>
    </FieldLabel>
  );
}

type TextFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Input>,
    "name" | "value" | "onChange" | "onBlur" | "id"
  > & {
    normalizeValue?: (value: string) => string;
  };

export function TextField({
  field,
  label,
  description,
  controlClassName,
  loginCredential = false,
  normalizeValue,
  type = "text",
  required,
  ...inputProps
}: TextFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;

  return (
    <Field data-invalid={invalid || undefined}>
      <FormFieldLabel
        htmlFor={field.name}
        label={label}
        loginCredential={loginCredential}
      />
      <Input
        {...inputProps}
        aria-invalid={invalid || undefined}
        className={cn("!rounded-sm !min-h-0", controlClassName)}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          const next = event.target.value;
          field.handleChange(normalizeValue ? normalizeValue(next) : next);
        }}
        required={required}
        type={type}
        value={value ?? ""}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError className={fieldErrorClassName} errors={errors} />
    </Field>
  );
}

type TextareaFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Textarea>,
    "name" | "value" | "onChange" | "onBlur" | "id"
  >;

export function TextareaField({
  field,
  label,
  description,
  ...textareaProps
}: TextareaFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        {...textareaProps}
        aria-invalid={invalid || undefined}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        value={value ?? ""}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError className={fieldErrorClassName} errors={errors} />
    </Field>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = BaseFieldProps & {
  options: SelectOption[];
  placeholder?: string;
  emptyOptionLabel?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

const SELECT_EMPTY_SENTINEL = "__empty__";

/** Native HTML select — matches list/filter dropdown styling across HRMS. */
export function NativeSelectField({
  description,
  disabled,
  emptyOptionLabel,
  field,
  label,
  loginCredential = false,
  onValueChange,
  options,
  placeholder,
  controlClassName,
}: SelectFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;
  const hasValue = value !== undefined && value !== "";
  const placeholderLabel = emptyOptionLabel ?? placeholder;

  return (
    <Field data-invalid={invalid || undefined}>
      <FormFieldLabel
        htmlFor={field.name}
        label={label}
        loginCredential={loginCredential}
      />
      <div className="relative">
        <select
          aria-invalid={invalid || undefined}
          className={cn(
            controlClassName,
            "w-full appearance-none pr-10",
            !hasValue && placeholderLabel ? "text-gray-400" : "text-gray-800",
            disabled && "cursor-not-allowed opacity-60",
          )}
          style={{ WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
          disabled={disabled}
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => {
            const next = event.target.value;
            field.handleChange(next);
            onValueChange?.(next);
          }}
          value={value ?? ""}
        >
          {placeholderLabel ? (
            <option className="text-gray-800" value="">
              {placeholderLabel}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              className="text-gray-800"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500",
            disabled && "opacity-50",
          )}
        />
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError className={fieldErrorClassName} errors={errors} />
    </Field>
  );
}

export function SelectField({
  description,
  disabled,
  emptyOptionLabel,
  field,
  label,
  loginCredential = false,
  onValueChange,
  options,
  placeholder,
  controlClassName,
}: SelectFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;
  const hasValue = value !== undefined && value !== "";
  const optionValues = React.useMemo(
    () => new Set(options.map((option) => option.value)),
    [options],
  );
  const valueInOptions = hasValue && optionValues.has(value);
  const selectValue =
    emptyOptionLabel && (!hasValue || !valueInOptions)
      ? SELECT_EMPTY_SENTINEL
      : valueInOptions
        ? value
        : undefined;

  return (
    <Field data-invalid={invalid || undefined}>
      <FormFieldLabel
        htmlFor={field.name}
        label={label}
        loginCredential={loginCredential}
      />
      <Select
        disabled={disabled}
        onOpenChange={(open) => {
          if (!open) field.handleBlur();
        }}
        onValueChange={(next) => {
          const value = next === SELECT_EMPTY_SENTINEL ? "" : next;
          field.handleChange(value);
          field.handleBlur();
          onValueChange?.(value);
        }}
        value={selectValue}
      >
        <SelectTrigger
          aria-invalid={invalid || undefined}
          className={cn("w-full", controlClassName)}
          id={field.name}
        >
          <SelectValue placeholder={placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {emptyOptionLabel ? (
              <SelectItem value={SELECT_EMPTY_SENTINEL}>
                {emptyOptionLabel}
              </SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError className={fieldErrorClassName} errors={errors} />
    </Field>
  );
}

function parseDateString(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function toDateString(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DateFieldProps = BaseFieldProps & {
  placeholder?: string;
  disabled?: (date: Date) => boolean;
};

export function DateField({
  description,
  disabled,
  field,
  label,
  loginCredential = false,
  placeholder = "Pick a date",
  controlClassName,
}: DateFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const dateValue = parseDateString(value ?? "");
  const invalid = errors.length > 0;
  const [open, setOpen] = React.useState(false);

  return (
    <Field data-invalid={invalid || undefined}>
      <FormFieldLabel
        htmlFor={field.name}
        label={label}
        loginCredential={loginCredential}
      />
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-invalid={invalid || undefined}
            className={cn(
              "w-full justify-start bg-white font-normal !rounded-sm !min-h-0",
              controlClassName,
            )}
            id={field.name}
            onBlur={field.handleBlur}
            type="button"
            variant="outline"
          >
            {dateValue ? format(dateValue, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            defaultMonth={dateValue}
            disabled={disabled}
            mode="single"
            onSelect={(date) => {
              field.handleChange(date ? toDateString(date) : "");
              setOpen(false);
            }}
            selected={dateValue}
          />
        </PopoverContent>
      </Popover>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError className={fieldErrorClassName} errors={errors} />
    </Field>
  );
}
