import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus2, ArrowRight, Sparkles, Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { customerService, dashboardService } from "@/lib/services";
import { Customer, Policy, Renewal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pageTransition } from "@/lib/helpers/animations";
import { supabase } from "@/lib/supabase/client";

interface Props {
  onSelect: (customer: Customer | 'new') => void;
  category?: string | null;
  action?: string | null;
}

interface SmartSuggestion {
  type: 'renewal' | 'endorsement' | 'policy';
  title: string;
  subtitle: string;
  customer: Customer;
  policy?: Policy;
  renewal?: Renewal;
  urgency?: 'high' | 'medium' | 'low';
}

interface SalesLead {
  id: string;
  converted_customer_id: string | null;
  customer_name: string | null;
  mobile: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
  created_by: string | null;
}

export function CustomerSelection({ onSelect, category, action }: Props) {
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);

  // Helper function to check if policy type matches category
  const matchesCategory = useCallback((policyType: string | null | undefined, cat: string | null | undefined): boolean => {
    if (!cat) return true;
    const type = (policyType || '').toLowerCase();
    
    switch (cat) {
      case 'motor':
        return type.includes('motor') || type.includes('car') || type.includes('vehicle') || type.includes('bike') || type.includes('two_wheeler');
      case 'health':
        return type.includes('health') || type.includes('medical') || type.includes('hospital');
      case 'life':
        return type.includes('life') || type.includes('term') || type.includes('endowment') || type.includes('ulip');
      case 'commercial':
        return ['fire', 'marine', 'liability', 'engineering', 'burglary', 'property', 'car', 'ear'].some(t => type.includes(t));
      default:
        return true;
    }
  }, []);

  // Helper to map lead source to category
  const getCategoryFromLeadSource = useCallback((source: string): string => {
    const src = source?.toLowerCase() || '';
    if (src.includes('motor') || src.includes('car') || src.includes('vehicle')) return 'motor';
    if (src.includes('health') || src.includes('medical')) return 'health';
    if (src.includes('life')) return 'life';
    return 'commercial';
  }, []);

  const loadSmartSuggestions = useCallback(async () => {
    if (!category && !action) return;
    
    try {
      const suggestionsList: SmartSuggestion[] = [];

      // ──────────────────────────────────────────────────────────────
      // RENEWAL - Show upcoming/overdue renewals filtered by category
      // ──────────────────────────────────────────────────────────────
      if (action === 'renewal') {
        const { renewals } = await dashboardService.getOverdueItems();
        
        for (const renewal of renewals.slice(0, 5)) {
          if (!renewal.policy_id) continue;
          
          const { data: policy } = await supabase
            .from('policies')
            .select('*')
            .eq('id', renewal.policy_id)
            .single() as { data: Policy | null };
          
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', renewal.customer_id)
            .single() as { data: Customer | null };

          if (customer && policy && matchesCategory(policy.policy_type, category)) {
            const dueDate = renewal.due_date ? new Date(renewal.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date();
            const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            suggestionsList.push({
              type: 'renewal',
              title: `${customer.name}`,
              subtitle: `${policy.policy_number || 'Policy'} • ${isOverdue ? `⚠️ ${daysOverdue} days overdue` : `Due ${dueDate?.toLocaleDateString()}`}`,
              customer: customer,
              policy: policy,
              renewal: renewal,
              urgency: isOverdue ? 'high' : 'medium'
            });
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // ENDORSEMENT - Show active policies eligible for endorsement
      // ──────────────────────────────────────────────────────────────
      if (action === 'endorsement') {
        const { data: policies } = await supabase
          .from('policies')
          .select('*')
          .eq('status', 'active')
          .order('end_date', { ascending: true })
          .limit(10) as { data: Policy[] | null };

        if (policies) {
          for (const policy of policies) {
            if (matchesCategory(policy.policy_type, category)) {
              const { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('id', policy.customer_id)
                .single() as { data: Customer | null };
                
              if (customer) {
                const daysRemaining = policy.end_date ? Math.floor((new Date(policy.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                
                suggestionsList.push({
                  type: 'endorsement',
                  title: `${customer.name}`,
                  subtitle: `${policy.policy_number || 'Policy'} • ${policy.policy_type} • ${daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}`,
                  customer: customer,
                  policy: policy,
                  urgency: daysRemaining < 30 ? 'high' : daysRemaining < 90 ? 'medium' : 'low'
                });
              }
            }
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // CLAIM - Show active policies eligible for claims
      // ──────────────────────────────────────────────────────────────
      if (action === 'claim') {
        const { data: policies } = await supabase
          .from('policies')
          .select('*')
          .eq('status', 'active')
          .order('end_date', { ascending: true })
          .limit(10) as { data: Policy[] | null };

        if (policies) {
          for (const policy of policies) {
            if (matchesCategory(policy.policy_type, category)) {
              const { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('id', policy.customer_id)
                .single() as { data: Customer | null };
                
              if (customer) {
                suggestionsList.push({
                  type: 'policy',
                  title: `${customer.name}`,
                  subtitle: `${policy.policy_number || 'Policy'} • ${policy.policy_type} • SI: ₹${policy.sum_insured?.toLocaleString() || 0}`,
                  customer: customer,
                  policy: policy,
                  urgency: 'medium'
                });
              }
            }
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // QUOTE - Show recent leads and prospects
      // ──────────────────────────────────────────────────────────────
      if (action === 'quote') {
        const { data: leads } = await supabase
          .from('sales_leads')
          .select('*')
          .in('status', ['new', 'contacted', 'follow_up', 'interested'])
          .order('created_at', { ascending: false })
          .limit(8) as { data: SalesLead[] | null };

        if (leads) {
          for (const lead of leads) {
            const leadCategory = getCategoryFromLeadSource(lead.source || '');
            if (!category || category === leadCategory) {
              suggestionsList.push({
                type: 'policy',
                title: `${lead.customer_name || 'Lead'}`,
                subtitle: `${lead.source || 'Lead'} • ${lead.status} • ${new Date(lead.created_at).toLocaleDateString()}`,
                customer: { 
                  id: lead.converted_customer_id || lead.id, 
                  name: lead.customer_name || 'Unknown', 
                  phone: lead.mobile || 'N/A',
                  email: lead.email || 'N/A',
                  uid: '',
                  status: 'active',
                  type: 'individual',
                  createdAt: lead.created_at,
                  updatedAt: lead.created_at,
                  created_by: lead.created_by || '',
                } as Customer,
                urgency: lead.status === 'interested' ? 'high' : lead.status === 'follow_up' ? 'medium' : 'low'
              });
            }
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // NEW POLICY - Show recent customers without active policies in category
      // ──────────────────────────────────────────────────────────────
      if (action === 'policy' || action === 'new_business') {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8) as { data: Customer[] | null };

        if (customers) {
          for (const customer of customers) {
            const { data: customerPolicies } = await supabase
              .from('policies')
              .select('*')
              .eq('customer_id', customer.id)
              .eq('status', 'active') as { data: Policy[] | null };
              
            const policiesList = customerPolicies || [];
            const hasCategoryPolicy = policiesList.some((p) => matchesCategory(p.policy_type, category));
            
            if (!hasCategoryPolicy) {
              suggestionsList.push({
                type: 'policy',
                title: `${customer.name}`,
                subtitle: `${policiesList.length > 0 ? `${policiesList.length} existing policies` : 'No policies yet'} • ${customer.phone || 'No phone'}`,
                customer: customer,
                urgency: policiesList.length === 0 ? 'high' : 'medium'
              });
            }
          }
        }
      }

      setSuggestions(suggestionsList.slice(0, 6));
    } catch (err) {
      console.error('[CustomerSelection] Failed to load suggestions:', err);
    }
  }, [category, action, matchesCategory, getCategoryFromLeadSource]);

  // Load context-aware suggestions based on category and action
  useEffect(() => {
    void loadSmartSuggestions();
  }, [loadSmartSuggestions]);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const resp = await customerService.searchByNameOrPhone(val);
      setResults(resp);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'renewal': return <Clock className="h-4 w-4" />;
      case 'endorsement': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <motion.div {...pageTransition} className="max-w-4xl mx-auto space-y-6">
      {/* Smart Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">
              {action === 'renewal' && 'Urgent Renewals'}
              {action === 'endorsement' && 'Eligible for Endorsement'}
              {action === 'claim' && 'Active Policies'}
              {!action && 'Recommended'}
            </h4>
            {category && (
              <Badge variant="outline" className="text-[9px] uppercase">
                {category}
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={`${suggestion.customer.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02]",
                  getUrgencyColor(suggestion.urgency)
                )}
                onClick={() => onSelect(suggestion.customer)}
              >
                <div className="h-10 w-10 rounded-xl bg-white/50 flex items-center justify-center">
                  {getSuggestionIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{suggestion.title}</p>
                  <p className="text-[10px] opacity-70 truncate">{suggestion.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card/40 rounded-[2.5rem] border-2 border-border p-10 space-y-6 shadow-xl hover:border-primary/30 transition-all group">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
             <Search className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading">Search Existing</h3>
            <p className="text-sm text-muted-foreground mt-1">Look up verified client profiles from master database.</p>
          </div>
          
          <div className="relative pt-4">
             <Search className={cn(
               "absolute left-4 top-[2.1rem] h-5 w-5 transition-colors",
               isSearching ? "text-primary animate-pulse" : "text-muted-foreground"
             )} />
             <Input 
                placeholder="Name or Mobile Number..." 
                className="h-14 pl-12 rounded-2xl border-2 bg-background/50 font-bold focus:ring-primary/20 transition-all"
                value={search}
                onChange={e => void handleSearch(e.target.value)}
             />
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
             {results.map(cust => (
               <div 
                key={cust.id} 
                className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group/item"
                onClick={() => onSelect(cust)}
               >
                 <div>
                    <p className="font-bold text-sm tracking-tight">{cust.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{cust.phone} • {cust.city}</p>
                 </div>
                 <ArrowRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
               </div>
             ))}
             {search.length >= 3 && results.length === 0 && !isSearching && (
               <div className="text-center py-8 opacity-40">
                  <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
               </div>
             )}
          </div>
        </div>

        <div className="bg-card/40 rounded-[2.5rem] border-2 border-border p-10 space-y-8 shadow-xl hover:border-emerald-500/30 transition-all group">
           <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg">
             <UserPlus2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-heading">New Onboarding</h3>
            <p className="text-sm text-muted-foreground mt-1">Create a fresh individual or corporate profile with KYC.</p>
          </div>
          
          <div className="pt-4 h-full flex flex-col justify-end">
            <Button 
               variant="outline" 
               className="h-14 w-full rounded-2xl border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all"
               onClick={() => onSelect('new')}
            >
               Begin Onboarding <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
