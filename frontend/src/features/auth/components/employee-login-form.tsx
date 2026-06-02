"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { TextField } from "@/components/form/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/hrms-client";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export function EmployeeLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" } satisfies z.infer<typeof schema>,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const user = await signIn(value.email, value.password);
        // Manager role goes to the manager dashboard, everyone else to /dashboard.
        const dest = user.role === "manager" ? "/manager/dashboard" : "/dashboard";
        router.push(dest);
        router.refresh();
      } catch (e) {
        setError((e as Error).message ?? "Unable to sign in.");
      }
    },
  });

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
            <TextField
              autoComplete="email"
              field={field}
              label="Email address"
              placeholder="you@ileads.example"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <TextField
              autoComplete="current-password"
              field={field}
              label="Password"
              placeholder="••••••••"
              type="password"
            />
          )}
        </form.Field>
      </FieldGroup>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        className="w-full"
        disabled={isSubmitting}
        size="lg"
        type="submit"
        style={{ background: "#e91e8c", borderColor: "#e91e8c" }}
      >
        {isSubmitting ? <><Spinner /> Signing in…</> : "Login"}
      </Button>
    </form>
  );
}
