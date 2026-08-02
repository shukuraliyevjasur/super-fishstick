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

// Re-exported so existing client-component imports keep working. The
// implementation lives in lib/i18n/t.ts because a server component cannot call
// a function exported from a "use client" module.
export { t } from "@/lib/i18n/t"
