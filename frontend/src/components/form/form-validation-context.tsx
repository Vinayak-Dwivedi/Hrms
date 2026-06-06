"use client";

import * as React from "react";

const FormValidationRevealContext = React.createContext(false);

export function FormValidationRevealProvider({
  reveal,
  children,
}: {
  reveal: boolean;
  children: React.ReactNode;
}) {
  return (
    <FormValidationRevealContext.Provider value={reveal}>
      {children}
    </FormValidationRevealContext.Provider>
  );
}

export function useFormValidationReveal() {
  return React.useContext(FormValidationRevealContext);
}

export const LOGIN_CREDENTIAL_HINT =
  "This field is used for login credentials.";
