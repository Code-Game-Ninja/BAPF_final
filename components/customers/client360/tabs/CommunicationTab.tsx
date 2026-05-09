"use client";

import useSWR from "swr";
import { MessageSquare, Mail, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/10 text-green-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  pending: "bg-amber-500/10 text-amber-400",
  bounced: "bg-orange-500/10 text-orange-400",
};

async function fetchCommunications(customerId: string) {
  const { data, error } = await supabase
    .from("communication_logs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function CommunicationTab({ customerId }: { customerId: string }) {
  const { data: logs, isLoading } = useSWR(
    `comm-logs-${customerId}`,
    () => fetchCommunications(customerId),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Communication History</h3>
        <Badge variant="secondary" className="text-xs">{logs?.length ?? 0}</Badge>
      </div>

      {!logs || logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No communication history yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const Icon = CHANNEL_ICONS[log.channel] ?? MessageSquare;
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{log.subject || `${log.channel} message`}</p>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[log.status] || ""}`}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {log.recipient}
                    {log.created_at && ` · ${format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}`}
                  </p>
                  {log.body && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
