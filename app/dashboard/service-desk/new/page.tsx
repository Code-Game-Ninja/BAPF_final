"use client";

import { useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/components/service-desk/CreateTicketDialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer") || undefined;
  const policyId = searchParams.get("policy") || undefined;
  const [open, setOpen] = useState(true);

  return (
    <CreateTicketDialog
      open={open}
      onOpenChange={open => {
        setOpen(open);
        if (!open) router.push("/dashboard/service-desk");
      }}
      prefillCustomerId={customerId}
      prefillPolicyId={policyId}
    />
  );
}
