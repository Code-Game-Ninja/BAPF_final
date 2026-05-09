"use client";

import { useParams } from "next/navigation";
import { Client360View } from "@/components/customers/client360/Client360View";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  return <Client360View customerId={customerId} />;
}
