import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

type Location = {
  id: number;
  name: string;
  type: string;
  description?: string;
  parentId: number | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

type LocationTreeNode = Location & {
  children: LocationTreeNode[];
};

export function useLocations() {
  const queryClient = useQueryClient();

  // Fetch all locations
  const {
    data: locations = [],
    isLoading,
    error,
  } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get("/locations");
      return data;
    },
  });

  // Move devices to a new location
  const moveDevicesMutation = useMutation({
    mutationFn: async ({
      deviceIds,
      targetLocationId,
    }: {
      deviceIds: string[];
      targetLocationId: number | null;
    }) => {
      await api.post("/locations/devices/move", {
        deviceIds,
        targetLocationId,
      });
    },
    onSuccess: () => {
      // Invalidate devices query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  // Convert flat locations array to tree structure
  const buildTree = useCallback((locations: Location[]): LocationTreeNode[] => {
    const map = new Map<number, LocationTreeNode>();
    const roots: LocationTreeNode[] = [];

    // First pass: create a map of all nodes
    locations.forEach((location) => {
      map.set(location.id, { ...location, children: [] });
    });

    // Second pass: build the tree
    locations.forEach((location) => {
      const node = map.get(location.id);
      if (!node) return;

      if (location.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(location.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Sort children by name
    const sortChildren = (nodes: LocationTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
      return nodes;
    };

    return sortChildren(roots);
  }, []);

  // Build tree data from locations using useMemo
  const treeData = useMemo(() => {
    if (locations.length > 0) {
      return buildTree(locations);
    }
    return [];
  }, [locations, buildTree]);

  // Get all descendant location IDs for a given location
  const getDescendantLocationIds = useCallback(
    (locationId: number | null): number[] => {
      if (locationId === null) return [];

      const result: number[] = [];

      const findDescendants = (node: LocationTreeNode) => {
        result.push(node.id);
        node.children.forEach(findDescendants);
      };

      const findNode = (nodes: LocationTreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === locationId) {
            findDescendants(node);
            return true;
          }
          if (node.children.length > 0 && findNode(node.children)) {
            return true;
          }
        }
        return false;
      };

      findNode(treeData);
      return result;
    },
    [treeData]
  );

  return {
    locations,
    treeData,
    isLoading,
    error,
    moveDevices: moveDevicesMutation.mutateAsync,
    getDescendantLocationIds,
  };
}
