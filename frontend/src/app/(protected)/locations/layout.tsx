import type { Metadata } from "next";
import { getRouteMetadata } from "@/config/routes";

export const metadata: Metadata = getRouteMetadata("/locations");

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
