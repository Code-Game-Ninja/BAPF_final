"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Upload, Eye, Save, X, Building2 } from "lucide-react";
import useSWR from "swr";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ECardTemplateFormProps {
  customerId: string;
}

interface ECardTemplate {
  company_name: string;
  tpa_name: string;
  tpa_contact: string;
  tpa_email: string;
  emergency_contact: string;
  logo_url?: string;
}

function ECardPreview({ template, logoPreview }: { template: ECardTemplate; logoPreview?: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl p-5 text-white w-full max-w-sm mx-auto shadow-xl">
      <div className="flex items-center justify-between mb-4">
        {(logoPreview || template.logo_url) ? (
          <img
            src={logoPreview || template.logo_url}
            alt="Company Logo"
            className="h-10 w-auto object-contain bg-white rounded p-1"
          />
        ) : (
          <div className="h-10 w-20 bg-white/20 rounded flex items-center justify-center text-xs">Logo</div>
        )}
        <div className="text-right">
          <p className="text-xs opacity-70">Group Mediclaim</p>
          <p className="text-xs font-bold">E-CARD</p>
        </div>
      </div>
      <div className="border-t border-white/20 pt-3 mb-3">
        <p className="text-sm font-bold">{template.company_name || "Company Name"}</p>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="opacity-70">Member Name</span>
          <span className="font-medium">John Doe</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Employee ID</span>
          <span className="font-medium">EMP001</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">DOB</span>
          <span className="font-medium">01 Jan 1990</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Policy No.</span>
          <span className="font-medium">POL-2024-00001</span>
        </div>
      </div>
      {(template.tpa_name || template.tpa_contact) && (
        <div className="border-t border-white/20 mt-3 pt-3 space-y-1 text-xs">
          {template.tpa_name && (
            <div className="flex justify-between">
              <span className="opacity-70">TPA</span>
              <span className="font-medium">{template.tpa_name}</span>
            </div>
          )}
          {template.tpa_contact && (
            <div className="flex justify-between">
              <span className="opacity-70">TPA Contact</span>
              <span className="font-medium">{template.tpa_contact}</span>
            </div>
          )}
        </div>
      )}
      {template.emergency_contact && (
        <div className="border-t border-white/20 mt-3 pt-2 text-xs">
          <span className="opacity-70">Emergency: </span>
          <span className="font-bold">{template.emergency_contact}</span>
        </div>
      )}
    </div>
  );
}

export function ECardTemplateForm({ customerId }: ECardTemplateFormProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [form, setForm] = useState<ECardTemplate>({
    company_name: "",
    tpa_name: "",
    tpa_contact: "",
    tpa_email: "",
    emergency_contact: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data, mutate } = useSWR(
    token ? `ecard-template-${customerId}` : null,
    async () => {
      const res = await fetch(`/api/gmc/${customerId}/ecard-template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (data) {
      setForm({
        company_name: data.company_name || "",
        tpa_name: data.tpa_name || "",
        tpa_contact: data.tpa_contact || "",
        tpa_email: data.tpa_email || "",
        emergency_contact: data.emergency_contact || "",
        logo_url: data.logo_url || "",
      });
    }
  }, [data]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      toast.error("Logo must be PNG or JPG");
      return;
    }
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error("Company Name is required");
      return;
    }
    setSaving(true);
    try {
      let logoUrl = form.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        fd.append("folder", "ecard-logos");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          logoUrl = uploadData.url || uploadData.file_url;
        }
      }

      const res = await fetch(`/api/gmc/${customerId}/ecard-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, logo_url: logoUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save template");
      }

      toast.success("E-Card template saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-bold uppercase tracking-wider">E-Card Template</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2">
            <Eye className="w-4 h-4" /> {showPreview ? "Hide" : "Preview"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Form */}
        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo (PNG/JPG, max 2MB)</Label>
            <div className="flex items-center gap-3">
              {(logoPreview || form.logo_url) ? (
                <div className="relative">
                  <img
                    src={logoPreview || form.logo_url}
                    alt="Logo preview"
                    className="h-16 w-auto object-contain border border-border rounded-lg p-1 bg-white"
                  />
                  <button
                    onClick={() => { setLogoFile(null); setLogoPreview(""); setForm(f => ({ ...f, logo_url: "" })); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" /> Upload Logo
              </Button>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Company Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. Acme Corporation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>TPA Name</Label>
              <Input
                value={form.tpa_name}
                onChange={e => setForm(f => ({ ...f, tpa_name: e.target.value }))}
                placeholder="e.g. Medi Assist"
              />
            </div>
            <div className="space-y-1.5">
              <Label>TPA Contact</Label>
              <Input
                value={form.tpa_contact}
                onChange={e => setForm(f => ({ ...f, tpa_contact: e.target.value }))}
                placeholder="1800-XXX-XXXX"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>TPA Email</Label>
            <Input
              type="email"
              value={form.tpa_email}
              onChange={e => setForm(f => ({ ...f, tpa_email: e.target.value }))}
              placeholder="claims@tpa.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Emergency Contact</Label>
            <Input
              value={form.emergency_contact}
              onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
              placeholder="1800-XXX-XXXX"
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Preview</p>
            <ECardPreview template={form} logoPreview={logoPreview} />
          </div>
        )}
      </div>
    </div>
  );
}
