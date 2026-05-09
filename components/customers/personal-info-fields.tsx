"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CustomerFormData } from "@/lib/validations/customer";

interface PersonalInfoFieldsProps {
  onPhoneBlur: () => void;
  onEmailBlur: () => void;
}

export function PersonalInfoFields({
  onPhoneBlur,
  onEmailBlur,
}: PersonalInfoFieldsProps) {
  const { control } = useFormContext<CustomerFormData>();

  return (
    <>
      {/* Name */}
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
              Full Name <span className="text-red-400">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g. Rajesh Kumar" {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Phone & Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
                Phone <span className="text-red-400">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="9876543210"
                  maxLength={10}
                  {...field}
                  onBlur={() => {
                    field.onBlur();
                    onPhoneBlur();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-quicksand uppercase tracking-wider text-xs">
                Email <span className="text-red-400">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  {...field}
                  onBlur={() => {
                    field.onBlur();
                    onEmailBlur();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
