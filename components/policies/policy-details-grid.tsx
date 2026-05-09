"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Calendar, IndianRupee, Megaphone, UserCheck, MapPin, Car, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  POLICY_TYPES,
  PAYMENT_FREQUENCIES,
  SUPPORTED_INSURERS,
  parsePolicyTypes,
  type PolicyFormData,
} from "@/lib/validations/policy";
import { getPolicySpecificFields } from "@/lib/validations/policy-fields-config";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { Separator } from "@/components/ui/separator";
import type { Campaign, User } from "@/lib/types";

interface PolicyDetailsGridProps {
  isEdit: boolean;
  campaigns?: Campaign[];
  users?: User[];
  showAssignTo?: boolean;
}

export function PolicyDetailsGrid({ isEdit, campaigns, users, showAssignTo }: PolicyDetailsGridProps) {
  const { control, setValue } = useFormContext<PolicyFormData>();
  const { settings } = useAppSettings();
  const policyTypes = parsePolicyTypes(settings.policy_types);

  // Watch the policy_type to dynamically render specific fields
  const selectedPolicyType = useWatch({ control, name: "policy_type" });
  const specificFields = getPolicySpecificFields(selectedPolicyType);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Policy Number */}
        <FormField
          control={control}
          name="policy_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Auto-generated if blank"
                  disabled={isEdit}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Policy Type */}
        <FormField
          control={control}
          name="policy_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="max-h-60">
                  {policyTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
        <FormField
          control={control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Start Date *
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date */}
        <FormField
          control={control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> End Date *
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Premium Amount */}
        <FormField
          control={control}
          name="premium_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Premium *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sum Insured */}
        <FormField
          control={control}
          name="sum_insured"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sum Insured</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Insurer */}
        <FormField
          control={control}
          name="insurer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurer</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="max-h-60">
                  {SUPPORTED_INSURERS.map((ins) => (
                    <SelectItem key={ins} value={ins}>
                      {ins}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Frequency */}
        <FormField
          control={control}
          name="payment_frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="max-h-60">
                  {PAYMENT_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campaign (optional) */}
        {campaigns && campaigns.length > 0 && (
          <FormField
            control={control}
            name="campaign_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" /> Campaign
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  value={field.value || "__none__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to campaign" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="max-h-60">
                    <SelectItem value="__none__">No Campaign</SelectItem>
                    {campaigns
                      .filter((c) => c.status === "active" || c.status === "draft")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.channel})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Assign To (Admin/Manager only) */}
        {showAssignTo && users && users.length > 0 && (
          <FormField
            control={control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Assign To *
                </FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    const u = users.find((usr) => usr.id === v);
                    if (u) {
                      setValue("assigned_to_name", u.name);
                    }
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="max-h-60">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Policy-type-specific fields — rendered dynamically */}
      {specificFields.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1">
            <h4 className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {selectedPolicyType === "motor" ? "Motor Details" :
               selectedPolicyType === "health" ? "Health Details" :
               selectedPolicyType === "life" ? "Life Insurance Details" :
               selectedPolicyType === "fire" ? "Fire Insurance Details" :
               selectedPolicyType === "marine" ? "Marine Details" :
               selectedPolicyType === "burglary" ? "Burglary Insurance Details" :
               selectedPolicyType === "liability" ? "Liability Details" :
               selectedPolicyType === "workmen_compensation" ? "Workmen Compensation Details" :
               selectedPolicyType === "car_ear" ? "CAR / EAR Details" :
               selectedPolicyType === "surety_bond" ? "Surety Bond Details" :
               "Additional Details"}
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {specificFields.map((fieldDef) => (
              <FormField
                key={fieldDef.name}
                control={control}
                name={fieldDef.name as keyof PolicyFormData}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldDef.label}</FormLabel>
                    {fieldDef.type === "select" && fieldDef.options ? (
                      <Select
                        onValueChange={field.onChange}
                        value={(field.value as string) || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={fieldDef.placeholder || "Select..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" className="max-h-60">
                          {fieldDef.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          {...field}
                          value={(field.value as string) || ""}
                          placeholder={fieldDef.placeholder || ""}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Remark */}
      <FormField
        control={control}
        name="remark"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Remark</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Optional notes about this policy..."
                rows={2}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
