"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SaveStatusContextValue {
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
}

const SaveStatusContext = createContext<SaveStatusContextValue | undefined>(undefined);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  return (
    <SaveStatusContext.Provider value={{ saveStatus, setSaveStatus }}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus() {
  const context = useContext(SaveStatusContext);
  if (context === undefined) {
    throw new Error("useSaveStatus must be used within a SaveStatusProvider");
  }
  return context;
}

