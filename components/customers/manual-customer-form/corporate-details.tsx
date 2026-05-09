"use client";

import { UseFormReturn } from "react-hook-form";
import { 
  Building2, 
  Calendar, 
  MapPin, 
  TrendingUp,
  FileDigit,
  Globe,
  FileText
} from "lucide-react";

import { ManualCustomerFormData, INDIAN_STATES } from "@/lib/validations/customer";

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
import { Textarea } from "@/components/ui/textarea";

interface CorporateDetailsProps {
  form: UseFormReturn<ManualCustomerFormData>;
}

export function CorporateDetails({ form }: CorporateDetailsProps) {
  const formControl = form.control as any;

  return (
    <div className="space-y-8">
      {/* Registration Details */}
      <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            2. Corporate Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={formControl}
              name="incorporation_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Incorporation</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="date" className="py-6 pl-10" {...field} />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formControl}
              name="turnover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Turnover</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="e.g. 10 Cr" className="py-6 pl-10" {...field} />
                      <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={formControl}
              name="pan_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company PAN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="ABCDE1234F" className="py-6 pl-10 uppercase" {...field} />
                      <FileDigit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formControl}
              name="gst_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="24AAAAA0000A1Z5" className="py-6 pl-10 uppercase" {...field} />
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={formControl}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Corporate Profile Note</FormLabel>
                <FormControl>
                  <Textarea placeholder="Industry type, business nature, etc." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* HQ Address */}
      <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            3. Registered Office
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={formControl}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Full office address..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={formControl}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mumbai" className="py-6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formControl}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="py-6">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
