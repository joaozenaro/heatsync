import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";

type Location = {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  children?: Location[];
};

interface LocationTreeProps {
  locations: Location[];
  selectedLocationId: number | null;
  onSelectLocation: (locationId: number | null) => void;
  onMoveDevices?: (
    deviceIds: string[],
    targetLocationId: number | null
  ) => Promise<void>;
  selectedDeviceIds?: string[];
}

export function LocationTree({
  locations,
  selectedLocationId,
  onSelectLocation,
  onMoveDevices,
  selectedDeviceIds = [],
}: LocationTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [isDraggingOver, setIsDraggingOver] = useState<number | null>(null);

  // Expand all parent nodes of the selected location
  useEffect(() => {
    if (!selectedLocationId) return;

    const expandParents = (node: Location, targetId: number): boolean => {
      if (node.id === targetId) return true;

      if (node.children) {
        for (const child of node.children) {
          const found = expandParents(child, targetId);
          if (found) {
            setExpandedNodes((prev) => new Set(prev).add(node.id));
            return true;
          }
        }
      }
      return false;
    };

    locations.forEach((rootNode) => {
      expandParents(rootNode, selectedLocationId);
    });
  }, [selectedLocationId, locations]);

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

  const handleDragOver = (e: React.DragEvent, locationId: number) => {
    e.preventDefault();
    if (selectedDeviceIds.length > 0) {
      setIsDraggingOver(locationId);
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetLocationId: number | null
  ) => {
    e.preventDefault();
    setIsDraggingOver(null);

    if (selectedDeviceIds.length > 0 && onMoveDevices) {
      try {
        await onMoveDevices(selectedDeviceIds, targetLocationId);
      } catch (error) {
        console.error("Failed to move devices:", error);
        // You might want to show an error toast here
      }
    }
  };

  const renderTree = (nodes: Location[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedLocationId === node.id;
      const isDraggingOverThis = isDraggingOver === node.id;

      return (
        <div key={node.id} className="select-none">
          <div
            className={`flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-accent ${
              isSelected ? "bg-accent" : ""
            } ${isDraggingOverThis ? "ring-2 ring-primary" : ""}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => onSelectLocation(node.id)}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.id)}
            draggable={false}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6 mr-1" />
            )}
            <div className="flex items-center flex-1 min-w-0">
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 mr-2 text-primary" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-primary" />
              )}
              <span className="truncate">{node.name}</span>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-4">{renderTree(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div
        className={`p-2 mb-2 rounded-md ${
          selectedLocationId === null ? "bg-accent" : ""
        } ${isDraggingOver === -1 ? "ring-2 ring-primary" : ""}`}
        onClick={() => onSelectLocation(null)}
        onDragOver={(e) => handleDragOver(e, -1)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="flex items-center">
          <Folder className="h-4 w-4 mr-2 text-foreground/70" />
          <span>All Locations</span>
        </div>
      </div>
      {renderTree(locations)}
    </div>
  );
}
