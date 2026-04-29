import { PageHeader } from "@/components/layout/page-header";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { PeopleListWithSelection } from "@/components/people/people-list-with-selection";
import { useAllPeople, useLeadsForSelect } from "@/lib/hooks/use-people";
import { COPY } from "@/lib/copy";
import type { PersonWithCompany } from "@/lib/tauri/types";
import {
  PERSON_USER_STATUS_ORDER,
  type PersonUserStatusType,
  validatePersonUserStatus,
} from "@/lib/constants/status-config";

export default function PeopleListPage() {
  const { people, isLoading, refresh } = useAllPeople();
  const { leads } = useLeadsForSelect();

  const grouped = PERSON_USER_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    {} as Record<PersonUserStatusType, PersonWithCompany[]>
  );

  for (const person of people) {
    const status = validatePersonUserStatus(person.userStatus);
    grouped[status].push({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      title: person.title,
      email: person.email,
      linkedinUrl: person.linkedinUrl,
      leadId: person.leadId,
      companyName: person.companyName,
      researchStatus: person.researchStatus,
      userStatus: person.userStatus,
    } as PersonWithCompany);
  }

  return (
    <>
      <PageHeader
        eyebrow={COPY.people.eyebrow}
        eyebrowColor="var(--color-c-person)"
        title={COPY.people.heroTitle}
        subtitle={COPY.people.heroSub}
        actions={<AddPersonModal leads={leads} onSuccess={refresh} />}
      />

      <div
        className="px-9 py-3 flex items-center gap-4 border-b border-line"
        style={{ background: "var(--color-paper)" }}
      >
        <span className="font-mono-label">Total</span>
        <span className="font-mono text-[11px] text-ink">
          <b className="font-semibold">{people.length}</b>{" "}
          <span className="text-ink-3">contacts</span>
        </span>
      </div>

      {isLoading && people.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span
            className="inline-block w-5 h-5 rounded-full border-2 border-line border-t-flame"
            style={{ animation: "spin-360 0.8s linear infinite" }}
            aria-label="Loading"
          />
        </div>
      ) : (
        <div className="px-9 pt-5 pb-6">
          <PeopleListWithSelection groupedPeople={grouped} />
        </div>
      )}
    </>
  );
}
