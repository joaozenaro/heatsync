import {
  IconBuilding,
  IconDashboard,
  IconDevices,
  IconBell,
  type Icon,
} from "@tabler/icons-react";

export type RouteConfig = {
  path: string;
  title: string;
  icon?: Icon;
  navMain?: boolean;
};

export const routes: RouteConfig[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    icon: IconDashboard,
    navMain: true,
  },
  {
    path: "/devices",
    title: "Device Management",
    icon: IconDevices,
    navMain: true,
  },
  {
    path: "/locations",
    title: "Locations",
    icon: IconBuilding,
    navMain: true,
  },
  {
    path: "/alerts",
    title: "Alerts",
    icon: IconBell,
    navMain: true,
  },
];

export function getRouteTitle(path: string): string {
  const route = routes.find((r) => r.path === path);
  return route?.title || "HeatSync";
}

export function getNavMainItems() {
  return routes
    .filter((r) => r.navMain)
    .map(({ path, title, icon }) => ({
      url: path,
      title,
      icon: icon!,
    }));
}

export function getNavSecondaryItems() {
  return routes
    .filter((r) => !r.navMain)
    .map(({ path, title, icon }) => ({
      url: path,
      title,
      icon: icon!,
    }));
}

export function getRouteMetadata(path: string) {
  const title = getRouteTitle(path);
  return {
    title,
  };
}
