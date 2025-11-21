"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, X, AlertCircle } from "lucide-react";
import { DatePicker } from "../date-picker";
import { format } from "date-fns";
import { z } from "zod";

const alertSchema = z
  .object({
    deviceId: z.string().min(1, "Device is required"),
    type: z.enum(["temperature", "humidity"]),
    minThreshold: z.number().optional(),
    maxThreshold: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    emails: z
      .array(z.string().email("Invalid email address"))
      .min(1, "At least one email is required"),
    enabled: z.boolean(),
  })
  .refine(
    (data) => {
      // At least one threshold must be provided
      return data.minThreshold !== undefined || data.maxThreshold !== undefined;
    },
    {
      message: "At least one threshold (min or max) is required",
      path: ["minThreshold"],
    }
  )
  .refine(
    (data) => {
      // Min must be less than max when both are provided
      if (data.minThreshold !== undefined && data.maxThreshold !== undefined) {
        return data.minThreshold < data.maxThreshold;
      }
      return true;
    },
    {
      message: "Minimum threshold must be less than maximum threshold",
      path: ["maxThreshold"],
    }
  )
  .refine(
    (data) => {
      // Start date must be before end date
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    {
      message: "Start date must be before end date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      // Validate time format if provided
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (data.startTime && !timeRegex.test(data.startTime)) {
        return false;
      }
      if (data.endTime && !timeRegex.test(data.endTime)) {
        return false;
      }
      return true;
    },
    {
      message: "Time must be in HH:mm format",
      path: ["startTime"],
    }
  );

type Device = {
  id: string;
  name: string;
};

type CreateAlertDto = {
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
};

export function AlertForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateAlertDto>({
    deviceId: "",
    type: "temperature",
    emails: [],
    enabled: true,
    daysOfWeek: [],
  });
  const [emailInput, setEmailInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await api.get<Device[]>("/devices");
      return data;
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (data: CreateAlertDto) => {
      await api.post("/alerts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onSuccess();
    },
    onError: (error: unknown) => {
      // Handle backend validation errors
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string | string[] } };
        };
        const backendMessage = axiosError.response?.data?.message;
        if (Array.isArray(backendMessage)) {
          // Multiple validation errors
          const newErrors: Record<string, string> = {};
          backendMessage.forEach((msg: string) => {
            newErrors.general = (newErrors.general || "") + msg + " ";
          });
          setErrors(newErrors);
        } else if (backendMessage) {
          // Single error message
          setErrors({ general: backendMessage });
        } else {
          setErrors({ general: "Failed to create alert. Please try again." });
        }
      } else {
        setErrors({ general: "Failed to create alert. Please try again." });
      }
    },
  });

  const handleAddEmail = () => {
    const emailSchema = z.string().email("Invalid email address");
    const result = emailSchema.safeParse(emailInput);

    if (!result.success) {
      setErrors({ ...errors, emailInput: result.error.issues[0].message });
      return;
    }

    if (emailInput && !formData.emails.includes(emailInput)) {
      setFormData({ ...formData, emails: [...formData.emails, emailInput] });
      setEmailInput("");
      setErrors({ ...errors, emailInput: "" });
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((e) => e !== email),
    });
  };

  const handleDayToggle = (day: number) => {
    const currentDays = formData.daysOfWeek || [];
    if (currentDays.includes(day)) {
      setFormData({
        ...formData,
        daysOfWeek: currentDays.filter((d) => d !== day),
      });
    } else {
      setFormData({ ...formData, daysOfWeek: [...currentDays, day] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = alertSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((error) => {
        if (error.path[0]) {
          newErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    createAlertMutation.mutate(formData);
  };

  const days = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{errors.general}</span>
        </div>
      )}

      {/* Device Details Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Device Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="device" className="text-sm font-medium">
              Device <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.deviceId}
              onValueChange={(value) =>
                setFormData({ ...formData, deviceId: value })
              }
            >
              <SelectTrigger
                className={errors.deviceId ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deviceId && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.deviceId}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: "temperature" | "humidity") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="humidity">Humidity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Thresholds Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minThreshold" className="text-sm font-medium">
              Minimum Threshold
            </Label>
            <Input
              id="minThreshold"
              type="number"
              step="0.1"
              placeholder="e.g., 18.5"
              className={errors.minThreshold ? "border-destructive" : ""}
              value={formData.minThreshold ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                const parsed = value ? parseFloat(value) : undefined;
                setFormData({
                  ...formData,
                  minThreshold:
                    parsed !== undefined && !isNaN(parsed) ? parsed : undefined,
                });
              }}
            />
            {errors.minThreshold && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.minThreshold}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxThreshold" className="text-sm font-medium">
              Maximum Threshold
            </Label>
            <Input
              id="maxThreshold"
              type="number"
              step="0.1"
              placeholder="e.g., 25.0"
              className={errors.maxThreshold ? "border-destructive" : ""}
              value={formData.maxThreshold ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                const parsed = value ? parseFloat(value) : undefined;
                setFormData({
                  ...formData,
                  maxThreshold:
                    parsed !== undefined && !isNaN(parsed) ? parsed : undefined,
                });
              }}
            />
            {errors.maxThreshold && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.maxThreshold}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          At least one threshold value is required
        </p>
      </div>

      <Separator />

      {/* Schedule Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Optional: Set when the alert should be active
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-medium">
              Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              className={errors.startTime ? "border-destructive" : ""}
              value={formData.startTime || ""}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
            />
            {errors.startTime && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.startTime}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-sm font-medium">
              End Time
            </Label>
            <Input
              id="endTime"
              type="time"
              className={errors.endTime ? "border-destructive" : ""}
              value={formData.endTime || ""}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
            />
            {errors.endTime && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.endTime}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-medium">
              Start Date
            </Label>
            <DatePicker
              id="startDate"
              placeholder="Select start date"
              date={
                formData.startDate ? new Date(formData.startDate) : undefined
              }
              setDate={(date) =>
                setFormData({
                  ...formData,
                  startDate: date ? format(date, "yyyy-MM-dd") : undefined,
                })
              }
            />
            {errors.startDate && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.startDate}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-medium">
              End Date
            </Label>
            <DatePicker
              id="endDate"
              placeholder="Select end date"
              date={formData.endDate ? new Date(formData.endDate) : undefined}
              setDate={(date) =>
                setFormData({
                  ...formData,
                  endDate: date ? format(date, "yyyy-MM-dd") : undefined,
                })
              }
            />
            {errors.endDate && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <p className="text-xs font-medium">{errors.endDate}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Days of the Week</Label>
          <div className="flex flex-wrap gap-3">
            {days.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={formData.daysOfWeek?.includes(day.value)}
                  onCheckedChange={() => handleDayToggle(day.value)}
                />
                <Label
                  htmlFor={`day-${day.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Email Notifications Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Email Notifications <span className="text-destructive">*</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Add email addresses to receive alerts
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                placeholder="Enter email address"
                className={errors.emailInput ? "border-destructive" : ""}
              />
            </div>
            <Button type="button" onClick={handleAddEmail} variant="secondary">
              Add
            </Button>
          </div>

          {errors.emailInput && (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">{errors.emailInput}</p>
            </div>
          )}

          {errors.emails && (
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">{errors.emails}</p>
            </div>
          )}

          {formData.emails.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
              {formData.emails.map((email) => (
                <div
                  key={email}
                  className="bg-background border px-3 py-1.5 rounded-md flex items-center gap-2 text-sm"
                >
                  <span className="text-sm">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createAlertMutation.isPending}>
          {createAlertMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Alert
        </Button>
      </DialogFooter>
    </form>
  );
}
