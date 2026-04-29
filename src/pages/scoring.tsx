import { useEffect, useState, useCallback } from "react";
import { ScoringConfigEditor } from "@/components/scoring/config-editor";
import { getActiveScoringConfig } from "@/lib/tauri/commands";
import { defaultScoringConfig } from "@/lib/types/scoring";
import type { RequiredCharacteristic, DemandSignifier } from "@/lib/types/scoring";

type ScoringInitial = {
  id: number | null;
  name: string;
  isActive: boolean;
  requiredCharacteristics: RequiredCharacteristic[];
  demandSignifiers: DemandSignifier[];
  tierHotMin: number;
  tierWarmMin: number;
  tierNurtureMin: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function ScoringPage() {
  const [initialConfig, setInitialConfig] = useState<ScoringInitial | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getActiveScoringConfig();
      if (config) {
        const requiredCharacteristics =
          typeof config.requiredCharacteristics === "string"
            ? JSON.parse(config.requiredCharacteristics)
            : config.requiredCharacteristics;
        const demandSignifiers =
          typeof config.demandSignifiers === "string"
            ? JSON.parse(config.demandSignifiers)
            : config.demandSignifiers;
        setInitialConfig({
          id: config.id,
          name: config.name,
          isActive: config.isActive,
          requiredCharacteristics,
          demandSignifiers,
          tierHotMin: config.tierHotMin,
          tierWarmMin: config.tierWarmMin,
          tierNurtureMin: config.tierNurtureMin,
          createdAt: config.createdAt ? new Date(config.createdAt).toISOString() : null,
          updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
        });
      } else {
        setInitialConfig({
          ...defaultScoringConfig,
          id: null,
          createdAt: null,
          updatedAt: null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch scoring config:", error);
      setInitialConfig({
        ...defaultScoringConfig,
        id: null,
        createdAt: null,
        updatedAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading || !initialConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <span
          className="inline-block w-5 h-5 rounded-full border-2 border-line border-t-flame"
          style={{ animation: "spin-360 0.8s linear infinite" }}
          aria-label="Loading"
        />
      </div>
    );
  }

  return <ScoringConfigEditor initialConfig={initialConfig} />;
}
