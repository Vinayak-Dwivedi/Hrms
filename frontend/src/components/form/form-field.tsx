"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";

type BaseFieldProps = {
  field: AnyFieldApi;
  label: React.ReactNode;
  description?: React.ReactNode;
};

function useFieldErrors(field: AnyFieldApi) {
  const meta = useStore(field.store, (state) => state.meta);

  const errors = React.useMemo(() => {
    if (!meta.isTouched && !meta.isBlurred) return [];
    return meta.errors
      .filter((error): error is { message: string } | string => Boolean(error))
      .map((error) => (typeof error === "string" ? { message: error } : error));
  }, [meta.errors, meta.isBlurred, meta.isTouched]);

  return errors;
}

type TextFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Input>,
    "name" | "value" | "onChange" | "onBlur" | "id"
  >;

export function TextField({
  field,
  label,
  description,
  type = "text",
  ...inputProps
}: TextFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        {...inputProps}
        aria-invalid={invalid || undefined}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={errors} />
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
      <FieldError errors={errors} />
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
};

const SELECT_EMPTY_SENTINEL = "__empty__";

export function SelectField({
  description,
  disabled,
  emptyOptionLabel,
  field,
  label,
  options,
  placeholder,
}: SelectFieldProps) {
  const errors = useFieldErrors(field);
  const value = useStore(field.store, (state) => state.value) as
    | string
    | undefined;
  const invalid = errors.length > 0;
  const selectValue =
    emptyOptionLabel && (value === undefined || value === "")
      ? SELECT_EMPTY_SENTINEL
      : (value ?? "");

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        onValueChange={(next) =>
          field.handleChange(next === SELECT_EMPTY_SENTINEL ? "" : next)
        }
        value={selectValue}
      >
        <SelectTrigger
          aria-invalid={invalid || undefined}
          className="w-full"
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
      <FieldError errors={errors} />
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
  placeholder = "Pick a date",
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
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-invalid={invalid || undefined}
            className="w-full justify-start bg-white font-normal"
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
      <FieldError errors={errors} />
    </Field>
  );
}
