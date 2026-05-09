"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Contact, 
  ChevronDown, 
  ChevronUp,
  Mail,
  Phone,
  Briefcase
} from "lucide-react";
import { useState } from "react";

import { ManualCustomerFormData } from "@/lib/validations/customer";

import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CorporateMembersProps {
  form: UseFormReturn<ManualCustomerFormData>;
}

export function CorporateMembers({ form }: CorporateMembersProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const { fields, append, remove } = useFieldArray({
    control: form.control as any,
    name: "corporate_members",
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Contact className="w-5 h-5 text-primary" />
            Corporate Contacts / Directors
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            List key decision makers or points of contact.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-primary/20 hover:bg-primary/5"
          onClick={() => {
            append({ name: "", designation: "", department: "", email: "", mobile: "", role: "", branch_location: "", notes: "" });
            setExpandedIndex(fields.length);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-primary/10 rounded-xl bg-primary/2">
            <Contact className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">No contacts added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const isExpanded = expandedIndex === index;
              const nameValue = form.watch(`corporate_members.${index}.name` as any);
              const designationValue = form.watch(`corporate_members.${index}.designation` as any);

              return (
                <div 
                  key={field.id} 
                  className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                    isExpanded ? "border-primary/30 ring-1 ring-primary/10 shadow-md" : "border-primary/10 bg-muted/10 text-muted-foreground"
                  }`}
                >
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20"
                    onClick={() => toggleExpand(index)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className={`font-semibold ${isExpanded ? "text-foreground" : ""}`}>
                          {nameValue || "Unnamed Contact"}
                        </p>
                        {designationValue && (
                          <p className="text-xs">{designationValue}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(index);
                          if (expandedIndex === index) setExpandedIndex(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 bg-background/40 space-y-6 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name={`corporate_members.${index}.name` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Contact Person" className="py-6" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`corporate_members.${index}.designation` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input placeholder="e.g. Director" className="py-6 pl-10" {...field} />
                                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name={`corporate_members.${index}.email` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input placeholder="email@corp.com" className="py-6 pl-10" {...field} />
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`corporate_members.${index}.mobile` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input placeholder="Mobile" className="py-6 pl-10" {...field} />
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
