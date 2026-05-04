"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  IconBuilding,
  IconUser,
  IconChartBar,
  IconArrowRight,
} from "@/components/ui/icon";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
import { useAllPeople } from "@/lib/hooks/use-people";

const NAV_ACTIONS: Array<{
  id: string;
  label: string;
  to: string;
  group: string;
}> = [
  { id: "nav-companies", label: "Companies", to: "/lead", group: "Navigate" },
  { id: "nav-people", label: "People", to: "/people", group: "Navigate" },
  { id: "nav-prompt", label: "Prompt", to: "/prompt", group: "Navigate" },
  { id: "nav-scoring", label: "Scoring", to: "/scoring", group: "Navigate" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { leads } = useLeadsWithScores();
  const { people } = useAllPeople();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const topLeads = useMemo(() => leads.slice(0, 8), [leads]);
  const topPeople = useMemo(() => people.slice(0, 8), [people]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to, { viewTransition: true });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search companies, people, or jump to a page..." />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAV_ACTIONS.map((action) => (
            <CommandItem
              key={action.id}
              value={`${action.label} ${action.group}`}
              onSelect={() => go(action.to)}
            >
              <IconArrowRight className="opacity-60" />
              <span>{action.label}</span>
              <CommandShortcut>{action.to}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {topLeads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Companies">
              {topLeads.map((lead) => (
                <CommandItem
                  key={`lead-${lead.id}`}
                  value={`${lead.companyName} ${lead.industry ?? ""} ${lead.city ?? ""}`}
                  onSelect={() => go(`/lead/${lead.id}`)}
                >
                  <IconBuilding className="opacity-60" />
                  <span className="truncate">{lead.companyName}</span>
                  {lead.score?.totalScore != null && (
                    <CommandShortcut>{lead.score.totalScore}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {topPeople.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="People">
              {topPeople.map((person) => {
                const fullName = `${person.firstName} ${person.lastName}`.trim();
                return (
                  <CommandItem
                    key={`person-${person.id}`}
                    value={`${fullName} ${person.title ?? ""} ${person.companyName ?? ""}`}
                    onSelect={() => go(`/people/${person.id}`)}
                  >
                    <IconUser className="opacity-60" />
                    <span className="truncate">{fullName}</span>
                    {person.companyName && (
                      <CommandShortcut className="truncate max-w-[120px]">
                        {person.companyName}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Tools">
          <CommandItem
            value="Scoring config"
            onSelect={() => go("/scoring")}
          >
            <IconChartBar className="opacity-60" />
            <span>Scoring configuration</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
