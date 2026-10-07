"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <main className="grid h-full place-items-center p-6 text-center text-sm">
        Set NEXT_PUBLIC_CONVEX_URL in apps/web/.env.local (see README).
      </main>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
