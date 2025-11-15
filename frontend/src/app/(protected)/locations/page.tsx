"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, FolderPlus } from "lucide-react";
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

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this location? This will also affect any devices assigned to it."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddChild = (parentId: number) => {
    resetForm();
    setFormData((prev) => ({ ...prev, parentId }));
    setEditingLocation(null);
    setIsDialogOpen(true);
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

  // Flatten tree for display
  const flattenTree = (nodes: LocationTreeNode[]): LocationTreeNode[] => {
    const result: LocationTreeNode[] = [];
    const traverse = (nodes: LocationTreeNode[]) => {
      nodes.forEach((node) => {
        result.push(node);
        traverse(node.children);
      });
    };
    traverse(nodes);
    return result;
  };

  const treeData = buildTree(locations);
  const flatLocations = flattenTree(treeData);

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4">
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
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flatLocations.map((location) => (
                  <tr key={location.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div
                        style={{ paddingLeft: `${location.level * 24}px` }}
                        className="flex items-center gap-2"
                      >
                        {location.level > 0 && (
                          <span className="text-muted-foreground">└─</span>
                        )}
                        <span className="font-medium">{location.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                        {location.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {location.description || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddChild(location.id)}
                        >
                          <FolderPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Create Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update the location details."
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
              {!editingLocation && (
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
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name} ({loc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingLocation ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
