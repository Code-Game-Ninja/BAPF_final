"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Copy,
  Check,
  FileText,
  UserSearch,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { useCustomerByUID } from "@/lib/hooks/use-customers";
import { usePoliciesByCustomer } from "@/lib/hooks/use-policies";
import { Customer } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomerForm } from "@/components/customers/customer-form";

export function CustomerLookup() {
  const router = useRouter();
  const [uidInput, setUidInput] = useState("");
  const [searchUID, setSearchUID] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const { data: customer, isLoading, error } = useCustomerByUID(searchUID);
  const { data: linkedPolicies } = usePoliciesByCustomer(customer?.id ?? null);

  const handleSearch = () => {
    const cleaned = uidInput.trim().toUpperCase();
    if (!cleaned) {
      toast.error("Please enter a customer UID");
      return;
    }
    // Accept both "C-0001" and "0001"
    const uid = cleaned.startsWith("C-") ? cleaned : `C-${cleaned.padStart(4, "0")}`;
    setSearchUID(uid);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <UserSearch className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-cabin font-bold text-foreground uppercase tracking-wider">
          Customer Lookup
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter a 4-digit customer UID to view their details
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Customer
        </Button>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
            C-
          </span>
          <Input
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value.replace(/[^0-9cC-]/g, ""))}
            onKeyDown={handleKeyDown}
            placeholder="0001"
            maxLength={10}
            className="pl-10 font-mono text-lg tracking-widest"
            autoFocus
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading} className="gap-2 px-6">
          <Search className="w-4 h-4" />
          Lookup
        </Button>
      </div>

      {/* Results */}
      <div aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {isLoading && searchUID && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-xl p-8 text-center"
          >
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">
              Looking up {searchUID}...
            </p>
          </motion.div>
        )}

        {!isLoading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-red-500/20 rounded-xl p-8 text-center"
          >
            <p className="text-red-400 font-cabin font-bold uppercase tracking-wider">
              Error
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Failed to lookup customer. Please try again.
            </p>
          </motion.div>
        )}

        {!isLoading && !error && searchUID && !customer && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-red-500/20 rounded-xl p-8 text-center"
          >
            <p className="text-red-400 font-cabin font-bold uppercase tracking-wider">
              Customer Not Found
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              No customer with UID <span className="font-mono">{searchUID}</span> exists.
            </p>
          </motion.div>
        )}

        {!isLoading && customer && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            {/* Name + UID */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-cabin font-bold text-primary">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-cabin font-bold text-foreground text-lg">
                  {customer.name}
                </p>
                <button
                  onClick={() => handleCopy(customer.uid)}
                  className="flex items-center gap-1"
                >
                  <Badge
                    variant="secondary"
                    className="text-primary bg-primary/10 font-mono"
                  >
                    {customer.uid}
                  </Badge>
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{customer.email}</span>
              </div>
              {(customer.address || customer.city) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-foreground">
                    {[customer.address, customer.city, customer.state, customer.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Linked policies */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-cabin mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Linked Policies
                {linkedPolicies && linkedPolicies.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{linkedPolicies.length}</Badge>
                )}
              </p>
              {linkedPolicies && linkedPolicies.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedPolicies.map((p) => {
                    const statusColor: Record<string, string> = {
                      active: "bg-green-500/10 text-green-400",
                      expired: "bg-red-500/10 text-red-400",
                      cancelled: "bg-gray-500/10 text-gray-400",
                      archived: "bg-amber-500/10 text-amber-400",
                    };
                    return (
                      <button
                        key={p.id}
                        onClick={() => router.push(`/dashboard/policies/${p.id}`)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left text-sm"
                      >
                        <span className="text-foreground truncate">{p.policy_number || "—"}</span>
                        <Badge className={`text-xs capitalize ${statusColor[p.status] || ""}`}>
                          {p.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No policies linked yet.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Customer creation form dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
