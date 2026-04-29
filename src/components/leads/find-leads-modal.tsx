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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Icon, SearchIcon, LoaderIcon } from "@/components/ui/icon";
import { GhostButton, PrimaryButton } from "@/components/layout/editor-card";
import { startFindLeads } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { COPY } from "@/lib/copy";
import { toast } from "sonner";

interface FindLeadsModalProps {
  onSuccess?: () => void;
}

export function FindLeadsModal({ onSuccess }: FindLeadsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [icp, setIcp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icp.trim()) return;
    setLoading(true);
    try {
      await startFindLeads(icp.trim(), handleStreamEvent);
      setOpen(false);
      setIcp("");
      onSuccess?.();
      toast.success("Lead discovery started — watch the dock");
    } catch {
      toast.error("Failed to start lead finder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhostButton>
          <Icon icon={SearchIcon} size={14} strokeWidth={1.7} />
          Find Leads
        </GhostButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.modals.findLeads.title}</DialogTitle>
          <DialogDescription>{COPY.modals.findLeads.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="icp" className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              Ideal Customer Profile
            </Label>
            <Textarea
              id="icp"
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder={COPY.modals.findLeads.placeholder}
              rows={6}
              required
            />
          </div>
          <DialogFooter>
            <PrimaryButton type="submit" disabled={loading || !icp.trim()}>
              {loading && <Icon icon={LoaderIcon} size={14} strokeWidth={1.7} className="animate-spin" />}
              {loading ? "Starting…" : "Find Leads"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
