"use client";

import { useFormContext } from "react-hook-form";
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
import { CustomerFormData, INDIAN_STATES } from "@/lib/validations/customer";

export function AddressFields() {
  const { control } = useFormContext<CustomerFormData>();

  return (
    <>
      {/* Address */}
      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
              Address
            </FormLabel>
            <FormControl>
              <Textarea placeholder="Street address..." rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* City, State, Pincode row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
                City
              </FormLabel>
              <FormControl>
                <Input placeholder="Mumbai" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
                State
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[200px]">
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="pincode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
                Pincode
              </FormLabel>
              <FormControl>
                <Input placeholder="400001" maxLength={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
