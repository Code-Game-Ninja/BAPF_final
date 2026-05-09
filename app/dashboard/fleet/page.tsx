"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Truck, Building2, Plus, Search, X, Car } from "lucide-react";
import { useState, useMemo } from "react";
import { useCustomers } from "@/lib/hooks/use-customers";
import { pageTransition } from "@/lib/helpers/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function FleetDashboardPage() {
  const router = useRouter();
  const { data: customers, isLoading } = useCustomers();
  const [search, setSearch] = useState("");

  const corporateCustomers = useMemo(() => {
    if (!customers) return [];
    let list = customers.filter(c =>
      ["corporate", "sme", "government", "transporter", "manufacturer"].includes(c.type) &&
      (!c.status || c.status === "active")
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.uid?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search]);

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Fleet Insurance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage fleet vehicles, drivers, validity documents, and claims
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search corporate customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : corporateCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Building2 className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No corporate customers found.</p>
          <Button onClick={() => router.push("/dashboard/customers/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Corporate Customer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {corporateCustomers.map(customer => (
            <button
              key={customer.id}
              onClick={() => router.push(`/dashboard/fleet/${customer.id}/vehicles`)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:bg-muted/30 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {customer.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{customer.name}</p>
                  <Badge variant="secondary" className="font-mono text-xs text-primary bg-primary/10 mt-0.5">
                    {customer.uid}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Car className="w-3.5 h-3.5" />
                <span>View Fleet Vehicles</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
