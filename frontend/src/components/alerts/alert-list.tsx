"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Alert = {
  id: number;
  deviceId: string;
  type: "temperature" | "humidity";
  minThreshold?: number;
  maxThreshold?: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  emails: string[];
  enabled: boolean;
  lastTriggeredAt?: string;
};

export function AlertList() {
  const queryClient = useQueryClient();
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data } = await api.get<Alert[]>("/alerts");
      return data;
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg">
        No alerts configured. Create one to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Thresholds</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Emails</TableHead>
            <TableHead>Last Triggered</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell className="font-medium">{alert.deviceId}</TableCell>
              <TableCell className="capitalize">{alert.type}</TableCell>
              <TableCell>
                {alert.minThreshold !== null && `Min: ${alert.minThreshold}`}
                {alert.minThreshold !== null &&
                  alert.maxThreshold !== null &&
                  ", "}
                {alert.maxThreshold !== null && `Max: ${alert.maxThreshold}`}
              </TableCell>
              <TableCell>
                <div className="text-xs space-y-1">
                  {(alert.startTime || alert.endTime) && (
                    <div>
                      {alert.startTime || "00:00"} - {alert.endTime || "23:59"}
                    </div>
                  )}
                  {(alert.startDate || alert.endDate) && (
                    <div>
                      {alert.startDate
                        ? format(new Date(alert.startDate), "MMM d")
                        : "Any"}{" "}
                      -{" "}
                      {alert.endDate
                        ? format(new Date(alert.endDate), "MMM d")
                        : "Any"}
                    </div>
                  )}
                  {alert.daysOfWeek && alert.daysOfWeek.length > 0 && (
                    <div>
                      Days:{" "}
                      {alert.daysOfWeek
                        .map(
                          (d) =>
                            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
                        )
                        .join(", ")}
                    </div>
                  )}
                  {!alert.startTime &&
                    !alert.endTime &&
                    !alert.startDate &&
                    !alert.endDate &&
                    (!alert.daysOfWeek || alert.daysOfWeek.length === 0) && (
                      <span className="text-muted-foreground">Always</span>
                    )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {alert.emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {alert.lastTriggeredAt
                  ? format(new Date(alert.lastTriggeredAt), "MMM d, HH:mm")
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                  disabled={deleteAlertMutation.isPending}
                >
                  {deleteAlertMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
