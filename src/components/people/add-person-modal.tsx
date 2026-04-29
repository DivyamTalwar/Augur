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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon, PlusIcon, LoaderIcon } from "@/components/ui/icon";
import { GhostButton, PrimaryButton } from "@/components/layout/editor-card";
import { insertPerson } from "@/lib/tauri/commands";
import { COPY } from "@/lib/copy";
import { toast } from "sonner";

type Lead = {
  id: number;
  companyName: string;
};

interface AddPersonModalProps {
  leads: Lead[];
  onSuccess?: () => void;
}

export function AddPersonModal({ leads, onSuccess }: AddPersonModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    linkedinUrl: "",
    leadId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;
    setLoading(true);
    try {
      await insertPerson({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        title: formData.title.trim() || undefined,
        linkedinUrl: formData.linkedinUrl.trim() || undefined,
        leadId: formData.leadId ? parseInt(formData.leadId) : undefined,
      });
      setOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        title: "",
        linkedinUrl: "",
        leadId: "",
      });
      onSuccess?.();
      toast.success("Person added");
    } catch {
      toast.error("Failed to add person");
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.firstName.trim() && formData.lastName.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhostButton>
          <Icon icon={PlusIcon} size={14} strokeWidth={1.7} />
          Add Person
        </GhostButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.modals.addPerson.title}</DialogTitle>
          <DialogDescription>{COPY.modals.addPerson.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="firstName" label="First Name *">
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                placeholder={COPY.modals.addPerson.placeholders.firstName}
                required
              />
            </Field>
            <Field id="lastName" label="Last Name *">
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                placeholder={COPY.modals.addPerson.placeholders.lastName}
                required
              />
            </Field>
          </div>
          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder={COPY.modals.addPerson.placeholders.email}
            />
          </Field>
          <Field id="title" label="Title">
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder={COPY.modals.addPerson.placeholders.title}
            />
          </Field>
          <Field id="linkedinUrl" label="LinkedIn">
            <Input
              id="linkedinUrl"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData((p) => ({ ...p, linkedinUrl: e.target.value }))}
              placeholder={COPY.modals.addPerson.placeholders.linkedinUrl}
            />
          </Field>
          <Field id="company" label="Company">
            <Select
              value={formData.leadId}
              onValueChange={(value) => setFormData((p) => ({ ...p, leadId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No company (optional)" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id.toString()}>
                    {lead.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <PrimaryButton type="submit" disabled={loading || !isValid}>
              {loading && <Icon icon={LoaderIcon} size={14} strokeWidth={1.7} className="animate-spin" />}
              {loading ? "Adding…" : "Add Person"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
        {label}
      </Label>
      {children}
    </div>
  );
}
