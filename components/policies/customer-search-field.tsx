"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/types";

interface CustomerSearchFieldProps {
  selectedCustomer: Customer | null;
  searchQuery: string;
  results: Customer[];
  isSearching: boolean;
  errorMessage?: string;
  onSearch: (query: string) => void;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
}

export function CustomerSearchField({
  selectedCustomer,
  searchQuery,
  results,
  isSearching,
  errorMessage,
  onSearch,
  onSelect,
  onClear,
}: CustomerSearchFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm">
        <User className="h-3.5 w-3.5" /> Customer
      </Label>
      {selectedCustomer ? (
        <div className="flex items-center justify-between rounded-md border border-muted-foreground/30 bg-card px-3 py-2">
          <div>
            <span className="text-sm font-medium">{selectedCustomer.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedCustomer.uid}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Change
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer by name or phone..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {/* Search Results Dropdown */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute z-10 mt-1 w-full rounded-md border border-muted-foreground/30 bg-card py-1 shadow-lg"
              >
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted-foreground/10"
                    onClick={() => onSelect(c)}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.uid} &bull; {c.phone}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
