import type { Metadata } from "next";
import { getRouteMetadata } from "@/config/routes";

export const metadata: Metadata = getRouteMetadata("/alerts");

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
