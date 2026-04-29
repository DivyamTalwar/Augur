import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domAnimation } from "motion/react";
import { Sidebar } from "@/components/layout/sidebar";
import { AppBackground } from "@/components/layout/app-background";
import { MainShell } from "@/components/layout/main-shell";
import { Toaster } from "@/components/ui/sonner";
import { useEventBridge } from "@/lib/tauri/use-event-bridge";
import { queryClient } from "@/lib/query/query-client";
import { CompanyOverviewDialog } from "@/components/onboarding/company-overview-dialog";
import { useOnboardingStatus } from "@/lib/query";

const LeadListPage = lazy(() => import("@/pages/lead/list"));
const LeadDetailPage = lazy(() => import("@/pages/lead/detail"));
const PeopleListPage = lazy(() => import("@/pages/people/list"));
const PersonDetailPage = lazy(() => import("@/pages/people/detail"));
const PromptPage = lazy(() => import("@/pages/prompt"));
const ScoringPage = lazy(() => import("@/pages/scoring"));

function LoaderRing() {
  return (
    <span
      aria-label="Loading"
      className="inline-block w-5 h-5 rounded-full border-2 border-line border-t-flame"
      style={{ animation: "spin-360 0.8s linear infinite" }}
    />
  );
}

function AppContent() {
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return (
      <>
        <AppBackground />
        <div className="relative z-[2] flex h-screen items-center justify-center">
          <LoaderRing />
        </div>
      </>
    );
  }

  return (
    <>
      <AppBackground />
      <CompanyOverviewDialog hasCompanyOverview={onboardingStatus?.hasCompanyOverview ?? false} />
      <div className="relative z-[2] flex h-screen font-sans antialiased">
        <Sidebar />
        <MainShell>
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center py-20">
                <LoaderRing />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/lead" replace />} />
              <Route path="/lead" element={<LeadListPage />} />
              <Route path="/lead/:id" element={<LeadDetailPage />} />
              <Route path="/people" element={<PeopleListPage />} />
              <Route path="/people/:id" element={<PersonDetailPage />} />
              <Route path="/prompt" element={<PromptPage />} />
              <Route path="/scoring" element={<ScoringPage />} />
            </Routes>
          </Suspense>
        </MainShell>
        <Toaster />
      </div>
    </>
  );
}

export default function App() {
  useEventBridge();
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <AppContent />
      </LazyMotion>
    </QueryClientProvider>
  );
}
