import type { Metadata } from "next";
import { getRouteMetadata } from "@/config/routes";

export const metadata: Metadata = getRouteMetadata("/devices");

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
