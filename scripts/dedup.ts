import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("customers").select("id, name, phone, email, status").order("created_at", { ascending: true });
  if (error) {
    console.error("Error fetching customers:", error);
    return;
  }
  
  console.log("Total customers:", data?.length);
  const byPhone = new Map();
  const byName = new Map();
  const toMerge: { keep: string; remove: string; reason: string }[] = [];
  
  data?.forEach(c => {
    if (c.status === "inactive") return;
    
    // Check phone
    const phoneKey = c.phone?.replace(/[\s\-\.\(\)]/g, "").replace(/^(\+91|91|0)/, "");
    if (phoneKey && phoneKey.length >= 7 && phoneKey.toLowerCase() !== "na" && phoneKey.toLowerCase() !== "n/a") {
      if (byPhone.has(phoneKey)) {
        toMerge.push({ keep: byPhone.get(phoneKey).id, remove: c.id, reason: "phone" });
        return; // skip further checks
      }
      byPhone.set(phoneKey, c);
    }
    
    // Check name
    const nameKey = c.name?.toLowerCase().trim();
    if (nameKey && nameKey !== "unknown" && nameKey !== "n/a" && nameKey.length > 3) {
      if (byName.has(nameKey)) {
        toMerge.push({ keep: byName.get(nameKey).id, remove: c.id, reason: "name" });
        return;
      }
      byName.set(nameKey, c);
    }
  });
  
  console.log("Duplicates found:", toMerge.length);
  
  for (const m of toMerge) {
    console.log("Merging", m.remove, "into", m.keep, "reason:", m.reason);
    
    // Update policies
    await supabase.from("policies").update({ customer_id: m.keep }).eq("customer_id", m.remove);
    // Update business cases
    await supabase.from("business_cases").update({ customer_id: m.keep }).eq("customer_id", m.remove);
    // Update documents
    await supabase.from("documents").update({ customer_id: m.keep }).eq("customer_id", m.remove);
    
    // Inactivate old customer
    await supabase.from("customers").update({ status: "inactive" }).eq("id", m.remove);
  }
  console.log("Deduplication complete.");
}

run().catch(console.error);
