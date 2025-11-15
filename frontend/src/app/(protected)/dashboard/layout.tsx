import type { Metadata } from "next";
import { getRouteMetadata } from "@/config/routes";

export const metadata: Metadata = getRouteMetadata("/dashboard");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
