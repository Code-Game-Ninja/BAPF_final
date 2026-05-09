"use client";

import { ManualCustomerForm } from "@/components/customers/manual-customer-form";
import { Breadcrumbs } from "@/components/global/breadcrumbs";

export default function NewCustomerPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <Breadcrumbs />
      </div>

      <ManualCustomerForm />
    </div>
  );
}
