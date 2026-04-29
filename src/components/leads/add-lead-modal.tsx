"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GhostButton, PrimaryButton } from "@/components/layout/editor-card";
import { Icon, PlusIcon, LoaderIcon } from "@/components/ui/icon";
import { insertLead } from "@/lib/tauri/commands";
import { COPY } from "@/lib/copy";
import { toast } from "sonner";

interface AddLeadModalProps {
  onSuccess?: () => void;
}

export function AddLeadModal({ onSuccess }: AddLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    city: "",
    state: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return;
    setLoading(true);
    try {
      await insertLead({
        companyName: formData.companyName.trim(),
        website: formData.website.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
      });
      setOpen(false);
      setFormData({ companyName: "", website: "", city: "", state: "", country: "" });
      onSuccess?.();
      toast.success("Lead added");
    } catch {
      toast.error("Failed to add lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhostButton>
          <Icon icon={PlusIcon} size={14} strokeWidth={1.7} />
          Add Lead
        </GhostButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.modals.addLead.title}</DialogTitle>
          <DialogDescription>{COPY.modals.addLead.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field id="companyName" label="Company Name *">
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData((p) => ({ ...p, companyName: e.target.value }))}
              placeholder={COPY.modals.addLead.placeholders.companyName}
              required
            />
          </Field>
          <Field id="website" label="Website">
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
              placeholder={COPY.modals.addLead.placeholders.website}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="City">
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                placeholder={COPY.modals.addLead.placeholders.city}
              />
            </Field>
            <Field id="state" label="State">
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                placeholder={COPY.modals.addLead.placeholders.state}
              />
            </Field>
          </div>
          <Field id="country" label="Country">
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
              placeholder={COPY.modals.addLead.placeholders.country}
            />
          </Field>
          <DialogFooter>
            <PrimaryButton type="submit" disabled={loading || !formData.companyName.trim()}>
              {loading && <Icon icon={LoaderIcon} size={14} strokeWidth={1.7} className="animate-spin" />}
              {loading ? "Adding…" : "Add Lead"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        {label}
      </Label>
      {children}
    </div>
  );
}
