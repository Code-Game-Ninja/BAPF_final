"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { holidayService } from "@/lib/services/attendance.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { useHolidays } from "@/lib/hooks/use-attendance";
import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  holidaySchema,
  type HolidayFormData,
} from "@/lib/validations/attendance";
import { Plus, Trash2, CalendarHeart, Loader2 } from "lucide-react";
import { mutate } from "swr";

interface HolidayManagerProps {
  year: number;
}

export function HolidayManager({ year }: HolidayManagerProps) {
  const { user } = useAuth();
  const { data: holidays, isLoading } = useHolidays(year);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
      isRecurring: false,
    },
  });

  const isRecurring = watch("isRecurring");

  const onSubmit = async (data: HolidayFormData) => {
    try {
      setCreating(true);
      await holidayService.createHoliday(data);
      toast.success("Holiday added");
      mutate(`holidays-${year}`);
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "create", "attendance",
          `Added holiday: ${data.name} on ${data.date}`
        ).catch(() => {});
      }
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(
        friendlyError(err, "Failed to add holiday")
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await holidayService.delete(id);
      toast.success("Holiday deleted");
      mutate(`holidays-${year}`);
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "delete", "attendance",
          `Deleted holiday ${id}`
        ).catch(() => {});
      }
    } catch (err) {
      toast.error(
        friendlyError(err, "Failed to delete")
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="bg-card border-border-strong">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <CalendarHeart className="h-5 w-5 text-primary" />
          Holidays ({year})
        </CardTitle>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border-strong">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Add Holiday
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a public holiday to the calendar.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div>
                <Label className="text-foreground">Name</Label>
                <Input
                  {...register("name")}
                  placeholder="Republic Day"
                  className="bg-background border-border-strong text-foreground"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-foreground">Date</Label>
                <Input
                  {...register("date")}
                  type="date"
                  className="bg-background border-border-strong text-foreground"
                />
                {errors.date && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={isRecurring}
                  onCheckedChange={(v) => setValue("isRecurring", v)}
                />
                <Label className="text-foreground">
                  Recurring every year
                </Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Holiday
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !holidays?.length ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No holidays added for {year}
          </p>
        ) : (
          <div className="space-y-2">
            {holidays
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border-strong"
                >
                  <div>
                    <span className="text-foreground font-medium">
                      {h.name}
                    </span>
                    <span className="text-muted-foreground text-sm ml-3">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                        }
                      )}
                    </span>
                    {h.isRecurring && (
                      <span className="text-primary text-xs ml-2">
                        (yearly)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    disabled={deletingId === h.id}
                    onClick={() => handleDelete(h.id)}
                  >
                    {deletingId === h.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
