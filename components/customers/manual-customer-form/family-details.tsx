"use client";

import { UseFormReturn, useFieldArray, FieldPath } from "react-hook-form";
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Calendar,
  ChevronDown,
  ChevronUp
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface FamilyDetailsProps {
  form: UseFormReturn<ManualCustomerFormData>;
}

const RELATIONSHIPS = [
  "Spouse", "Son", "Daughter", "Father", "Mother", 
  "Brother", "Sister", "Grandfather", "Grandmother",
  "Father-in-law", "Mother-in-law", "Relative", "Other"
];

export function FamilyDetails({ form }: FamilyDetailsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "family_members",
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Family Members / Dependents
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add family members to link them under a single Family ID.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-primary/20 hover:bg-primary/5"
          onClick={() => {
            append({ 
              name: "", 
              relationship: "", 
              dob: "", 
              gender: "male", 
              mobile: "", 
              notes: "", 
              create_profile: false 
            });
            setExpandedIndex(fields.length);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-primary/10 rounded-xl bg-primary/2">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No family members added yet.</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 text-primary hover:text-primary/80"
              onClick={() => {
                append({ 
                  name: "", 
                  relationship: "", 
                  dob: "", 
                  gender: "male", 
                  mobile: "", 
                  notes: "", 
                  create_profile: false 
                });
                setExpandedIndex(0);
              }}
            >
              Click to add first member
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const isExpanded = expandedIndex === index;
              const nameValue = form.watch(`family_members.${index}.name` as FieldPath<ManualCustomerFormData>);
              const relationshipValue = form.watch(`family_members.${index}.relationship` as FieldPath<ManualCustomerFormData>);

              return (
                <div 
                  key={field.id} 
                  className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                    isExpanded ? "border-primary/30 ring-1 ring-primary/10 shadow-lg" : "border-primary/10 bg-muted/20"
                  }`}
                >
                  {/* Collapsed Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(index)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{String(nameValue || "Unnamed Member")}</p>
                        {relationshipValue && (
                          <p className="text-xs text-muted-foreground capitalize">{String(relationshipValue)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
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

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-6 bg-background/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name={`family_members.${index}.name` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Member Name" className="py-6" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`family_members.${index}.relationship` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger className="py-6">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {RELATIONSHIPS.map(rel => (
                                    <SelectItem key={rel} value={rel.toLowerCase()}>{rel}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name={`family_members.${index}.dob` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
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
                          control={form.control}
                          name={`family_members.${index}.gender` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger className="py-6">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`family_members.${index}.mobile` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="10-digit number" className="py-6" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator className="bg-primary/10" />

                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" />
                            <p className="font-semibold text-sm">Create Independent Profile</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            When enabled, this member will get their own Customer UID and portal access.
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name={`family_members.${index}.create_profile` as FieldPath<ManualCustomerFormData>}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={Boolean(field.value)}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
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
