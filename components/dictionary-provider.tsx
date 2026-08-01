"use client"

import { createContext, useContext } from "react"
import type { Dict } from "@/lib/i18n/types"

const DictionaryContext = createContext<Dict | null>(null)

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dict
  children: React.ReactNode
}) {
  return (
    <DictionaryContext.Provider value={dict}>
      {children}
    </DictionaryContext.Provider>
  )
}

export function useDict(): Dict {
  const ctx = useContext(DictionaryContext)
  if (!ctx) throw new Error("useDict must be used inside DictionaryProvider")
  return ctx
}

/** Replace {{var}} placeholders in a template string. */
export function t(
  template: string,
  vars: Record<string, string | number> = {}
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""))
}
