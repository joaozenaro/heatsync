"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

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
  level: number;
};

export default function LocationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(
    null
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    type: "room",
    description: "",
    parentId: null as number | null,
  });

  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get("/locations");
      return data;
    },
  });

  // Fetch device count for a location
  const fetchDeviceCount = async (locationId: number): Promise<number> => {
    try {
      const { data } = await api.get<{ count: number }>(
        `/locations/${locationId}/device-count`
      );
      return data.count;
    } catch {
      return 0;
    }
  };

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: async (
      data: Omit<Location, "id" | "ownerId" | "createdAt" | "updatedAt">
    ) => {
      const response = await api.post("/locations", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  // Update location mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Location> & { id: number }) => {
      const response = await api.put(`/locations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsDialogOpen(false);
      resetForm();
      setEditingLocation(null);
    },
  });

  // Delete location mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setDeletingLocation(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "room",
      description: "",
      parentId: null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      description: location.description || "",
      parentId: location.parentId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (location: Location) => {
    const deviceCount = await fetchDeviceCount(location.id);
    if (deviceCount > 0) {
      setDeletingLocation(location);
    } else {
      if (
        confirm(
          `Are you sure you want to delete "${location.name}"? This action cannot be undone.`
        )
      ) {
        deleteMutation.mutate(location.id);
      }
    }
  };

  const handleConfirmDelete = () => {
    if (deletingLocation) {
      deleteMutation.mutate(deletingLocation.id);
    }
  };

  const handleAddChild = (parentId: number) => {
    resetForm();
    setFormData((prev) => ({ ...prev, parentId }));
    setEditingLocation(null);
    setIsDialogOpen(true);
  };

  const toggleNode = (nodeId: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Build tree structure with levels
  const buildTree = (locations: Location[]): LocationTreeNode[] => {
    const map = new Map<number, LocationTreeNode>();
    const roots: LocationTreeNode[] = [];

    // First pass: create nodes
    locations.forEach((location) => {
      map.set(location.id, { ...location, children: [], level: 0 });
    });

    // Second pass: build tree and calculate levels
    locations.forEach((location) => {
      const node = map.get(location.id)!;
      if (location.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(location.parentId);
        if (parent) {
          node.level = parent.level + 1;
          parent.children.push(node);
        }
      }
    });

    // Sort by name
    const sortTree = (nodes: LocationTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => sortTree(node.children));
    };
    sortTree(roots);

    return roots;
  };

  // Flatten tree for parent selection (excluding the location being edited and its descendants)
  const getAvailableParents = (excludeId?: number): Location[] => {
    const allLocations = locations.filter((loc) => loc.id !== excludeId);

    // If editing, also exclude descendants
    if (excludeId) {
      const excludeIds = new Set<number>([excludeId]);
      const findDescendants = (parentId: number) => {
        locations.forEach((loc) => {
          if (loc.parentId === parentId && !excludeIds.has(loc.id)) {
            excludeIds.add(loc.id);
            findDescendants(loc.id);
          }
        });
      };
      findDescendants(excludeId);
      return allLocations.filter((loc) => !excludeIds.has(loc.id));
    }

    return allLocations;
  };

  const treeData = buildTree(locations);

  const renderLocationNode = (node: LocationTreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className="flex items-center py-2 px-3 rounded-md hover:bg-accent/50 transition-colors group"
          style={{ paddingLeft: `${node.level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 mr-2"
              onClick={() => toggleNode(node.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 mr-2" />
          )}
          <div className="flex items-center flex-1 min-w-0">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{node.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {node.type} {node.description ? `• ${node.description}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddChild(node.id)}
                title="Add child location"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(node)}
                title="Edit location"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(node)}
                title="Delete location"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderLocationNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
        <div className="flex justify-end items-center">
          <Button
            onClick={() => {
              resetForm();
              setEditingLocation(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Root Location
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-card">
            {treeData.length > 0 ? (
              <div>{treeData.map((node) => renderLocationNode(node))}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <p>No locations found</p>
                <p className="text-sm">
                  Create your first location to get started
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Location Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Create Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update the location details and adjust its position in the hierarchy."
                : "Add a new location to your hierarchy."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="sector">Sector</SelectItem>
                    <SelectItem value="floor">Floor</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="zone">Zone</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Location (Optional)</Label>
                <Select
                  value={
                    formData.parentId !== null
                      ? String(formData.parentId)
                      : "none"
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentId: value === "none" ? null : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Level)</SelectItem>
                    {getAvailableParents(editingLocation?.id).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name} ({loc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingLocation ? "Updating..." : "Creating..."}
                  </>
                ) : editingLocation ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingLocation}
        onOpenChange={(open) => !open && setDeletingLocation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingLocation && (
                <>
                  Are you sure you want to delete &quot;{deletingLocation.name}
                  &quot;?
                  <br />
                  <br />
                  This location has devices assigned to it. These devices will
                  be unassigned (not deleted) when you remove this location.
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
