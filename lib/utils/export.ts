import { Policy } from "@/lib/types";

/**
 * Generates a CSV from policy data and triggers a download.
 */
export function exportPoliciesToCSV(policies: Policy[], filename = "bpaf_policies_export.csv") {
  if (!policies.length) return;

  const headers = [
    "Policy Number",
    "Type",
    "Customer",
    "Insurer",
    "Premium",
    "OD Premium",
    "TP Premium",
    "GST",
    "Net Premium",
    "Sum Insured",
    "Start Date",
    "End Date",
    "Status",
    "Assigned To",
    "Vehicle Number",
    "Make",
    "Model",
    "Comm Receivable %",
    "Comm Payable Final",
    "TDS Amount",
    "PPT (Life)",
    "Nominee",
    "Sum Assured (Life)"
  ];

  const rows = policies.map(p => [
    p.policy_number,
    p.policy_type,
    p.customer_name,
    p.insurer_name || "",
    p.premium_amount,
    p.motor_meta?.net_premium || 0,
    p.motor_meta?.tp_premium || 0,
    p.motor_meta?.gst_amount || 0,
    (p.motor_meta?.net_premium || 0) + (p.motor_meta?.tp_premium || 0),
    p.sum_insured || "",
    p.start_date,
    p.end_date,
    p.status,
    p.assigned_to_name || p.assigned_to,
    p.motor_meta?.registration_number || p.vehicle_number || "",
    p.motor_meta?.make || "",
    p.motor_meta?.model || "",
    p.finance_meta?.commission_receivable_percent || 0,
    p.finance_meta?.commission_payable_final || 0,
    p.finance_meta?.tds_amount || 0,
    p.life_meta?.premium_payment_term || "",
    p.life_meta?.nominees?.map(n => n.name).join(" / ") || "",
    p.life_meta?.sum_assured || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
