import { useEffect, useState } from "react";
import { HomePage } from "@/pages/HomePage";
import { ScanningPage } from "@/pages/ScanningPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { CleaningPage } from "@/pages/CleaningPage";
import { DonePage } from "@/pages/DonePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LargeFilesPage } from "@/pages/LargeFilesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import * as api from "@/lib/api";
import type { JunkCategory, AnalysisReport, CleanReport, Config, DevArtifactEntry } from "@/types";
import { Home, HardDrive, Clock, Settings } from "lucide-react";

type Screen = "scanning" | "results" | "cleaning" | "done";
type Tab = "home" | "large-files" | "history" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen | null>(null);

  const [categories, setCategories] = useState<JunkCategory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [elevated, setElevated] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [cleanReport, setCleanReport] = useState<CleanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dev artifacts state
  const [devEnabled, setDevEnabled] = useState(false);
  const [devMinAgeDays, setDevMinAgeDays] = useState(30);
  const [devArtifacts, setDevArtifacts] = useState<DevArtifactEntry[]>([]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.loadConfig(), api.isElevated()])
      .then(([cats, cfg, elev]) => {
        setCategories(cats);
        setConfig(cfg);
        setElevated(elev);
        setSelected(new Set(cfg.enabled_categories));
      })
      .catch((e) => setError(String(e)));
  }, []);

  const handleToggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleScan = async () => {
    setScreen("scanning");
    setError(null);
    try {
      const scanPromises: Promise<unknown>[] = [];
      if (selected.size > 0) scanPromises.push(api.scan(Array.from(selected)));
      if (devEnabled) {
        scanPromises.push(
          api.scanDevArtifacts(devMinAgeDays).then((entries) => setDevArtifacts(entries))
        );
      }
      await Promise.all(scanPromises);

      const analysisReport = selected.size > 0
        ? await api.analyze()
        : { categories: [], grand_total_bytes: 0, grand_total_files: 0 };
      setReport(analysisReport);
      setScreen("results");
    } catch {
      setScreen(null);
    }
  };

  const handleCancelScan = async () => {
    try { await api.cancelScan(); } catch { /* ignore */ }
    setScreen(null);
  };

  const handleClean = async (categoryIds: string[], devArtifactPaths: string[]) => {
    setScreen("cleaning");
    setError(null);
    const useRecycleBin = config?.use_recycle_bin ?? false;
    try {
      let result: CleanReport = { deleted_count: 0, freed_bytes: 0, skipped: [] };

      if (categoryIds.length > 0) {
        result = await api.clean(categoryIds, false, useRecycleBin);
      }
      if (devArtifactPaths.length > 0) {
        const devResult = await api.cleanDevArtifactEntries(devArtifactPaths, false, useRecycleBin);
        result = {
          deleted_count: result.deleted_count + devResult.deleted_count,
          freed_bytes: result.freed_bytes + devResult.freed_bytes,
          skipped: [...result.skipped, ...devResult.skipped],
        };
      }

      // Record to history
      const labelParts: string[] = [];
      if (categoryIds.length > 0) labelParts.push("Junk Files");
      if (devArtifactPaths.length > 0) labelParts.push("Dev Artifacts");
      await api.recordCleanSession(
        result.freed_bytes,
        result.deleted_count,
        result.skipped.length,
        labelParts.join(" + ") || "Clean",
      );

      setCleanReport(result);
      setScreen("done");
    } catch (e) {
      setError(String(e));
      setScreen("results");
    }
  };

  const handleSaveConfig = async (newConfig: Config) => {
    try {
      await api.saveConfig(newConfig);
      setConfig(newConfig);
      setSelected(new Set(newConfig.enabled_categories));
    } catch (e) {
      setError(String(e));
    }
  };

  const handleRestartAsAdmin = async () => {
    try { await api.restartAsAdmin(); } catch (e) { setError(String(e)); }
  };

  const handleScanAgain = () => {
    setReport(null);
    setCleanReport(null);
    setDevArtifacts([]);
    setScreen(null);
    setTab("home");
  };

  // Full-screen flows override the tab layout
  if (screen === "scanning") {
    return (
      <div className="h-screen bg-background text-foreground">
        <ScanningPage devEnabled={devEnabled} onCancel={handleCancelScan} />
      </div>
    );
  }
  if (screen === "results" && report) {
    return (
      <div className="h-screen bg-background text-foreground">
        <ResultsPage
          report={report}
          categories={categories}
          devArtifacts={devArtifacts}
          onClean={handleClean}
          onScanAgain={handleScanAgain}
        />
      </div>
    );
  }
  if (screen === "cleaning") {
    return (
      <div className="h-screen bg-background text-foreground">
        <CleaningPage />
      </div>
    );
  }
  if (screen === "done" && cleanReport) {
    return (
      <div className="h-screen bg-background text-foreground">
        <DonePage report={cleanReport} onScanAgain={handleScanAgain} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-8 bg-background text-foreground">
        <p className="text-destructive text-sm font-medium">{error}</p>
        <button className="text-xs text-muted-foreground underline" onClick={() => setError(null)}>
          Dismiss
        </button>
      </div>
    );
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
    { id: "large-files", label: "Large Files", icon: <HardDrive className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <Clock className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {tab === "home" && (
          <HomePage
            categories={categories}
            selected={selected}
            elevated={elevated}
            devEnabled={devEnabled}
            devMinAgeDays={devMinAgeDays}
            onToggle={handleToggle}
            onDevEnabledChange={setDevEnabled}
            onDevMinAgeDaysChange={setDevMinAgeDays}
            onScan={handleScan}
            onSettings={() => setTab("settings")}
          />
        )}
        {tab === "large-files" && (
          <LargeFilesPage useRecycleBin={config?.use_recycle_bin ?? false} />
        )}
        {tab === "history" && <HistoryPage />}
        {tab === "settings" && config && (
          <SettingsPage
            config={config}
            categories={categories}
            elevated={elevated}
            onSave={handleSaveConfig}
            onBack={() => setTab("home")}
            onRestartAsAdmin={handleRestartAsAdmin}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                tab === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
