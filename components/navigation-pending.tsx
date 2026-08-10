"use client";

import { useLinkStatus } from "next/link";

/** Fixed-size status dot: confirms a click without shifting the nav label. */
export default function NavigationPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-current transition-opacity ${
        pending ? "animate-pulse opacity-60" : "opacity-0"
      }`}
    />
  );
}
