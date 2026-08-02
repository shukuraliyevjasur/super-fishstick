/**
 * Template interpolation for dictionary strings.
 *
 * Lives in its own module with no "use client" directive and no `server-only`
 * import, so both server and client components can call it. It used to be
 * exported from components/dictionary-provider.tsx, which is a client module —
 * calling it from a server component threw "Attempted to call t() from the
 * server but t is on the client" at render time.
 */
export function t(
  template: string,
  vars: Record<string, string | number> = {}
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}
