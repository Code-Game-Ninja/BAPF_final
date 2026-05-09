"use client";

import { UseFormReturn } from "react-hook-form";
import { 
  User, 
  Mail, 
  Phone, 
  UserCheck, 
  FileSearch, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ManualCustomerFormData } from "@/lib/validations/customer";
import { extractPolicyDataFromFile } from "@/lib/helpers/pdf-extractor";
import { useActiveUsers } from "@/lib/hooks/use-settings";

import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BasicInfoProps {
  form: UseFormReturn<ManualCustomerFormData>;
}

export function BasicInfo({ form }: BasicInfoProps) {
  const { data: users, isLoading: usersLoading } = useActiveUsers();
  const [extracting, setExtracting] = useState(false);

  const type = form.watch("type");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const toastId = toast.loading("Analyzing document for auto-fill...");

    try {
      const extracted = await extractPolicyDataFromFile(file);
      
      // Auto-fill fields if found
      if (extracted.customerName) form.setValue("name", extracted.customerName, { shouldValidate: true });
      if (extracted.customerPhone) form.setValue("phone", extracted.customerPhone, { shouldValidate: true });
      if (extracted.customerEmail) form.setValue("email", extracted.customerEmail, { shouldValidate: true });
      if (extracted.customerAddress) form.setValue("address", extracted.customerAddress, { shouldValidate: true });
      if (extracted.customerCity) form.setValue("city", extracted.customerCity, { shouldValidate: true });
      if (extracted.customerState) form.setValue("state", extracted.customerState, { shouldValidate: true });
      
      // Specific metadata
      if (type === "individual" && extracted.startDate) {
         // Use startDate as potential DOB or just leave it for now
      }

      toast.success("Form pre-filled from document", { id: toastId });
    } catch (error) {
      console.error("OCR failed:", error);
      toast.error("Could not extract data from this file", { id: toastId });
    } finally {
      setExtracting(false);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            1. Core Identity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Basic contact and assignment details.
          </p>
        </div>
        
        {/* OCR Trigger */}
        <div className="relative">
          <input
            type="file"
            id="ocr-upload"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            disabled={extracting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
            onClick={() => document.getElementById("ocr-upload")?.click()}
            disabled={extracting}
          >
            {extracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSearch className="w-4 h-4 text-primary" />
            )}
            Auto-fill from Document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entity Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {type === "individual" ? "Full Name" : "Company Name"}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder={type === "individual" ? "e.g. Rahul Sharma" : "e.g. Acme Corp Pvt Ltd"} 
                      className="pl-10 py-6"
                      {...field} 
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assigned To */}
          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Relationship Manager / Sub Agent
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="py-6 pl-10 relative">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <SelectValue placeholder={usersLoading ? "Loading..." : "Select assignee"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users?.map((u) => (
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="email@example.com" 
                      className="pl-10 py-6"
                      {...field} 
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormDescription>Optional for individuals, required for portal access.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Mobile Number
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="10-digit mobile" 
                      className="pl-10 py-6"
                      {...field} 
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
