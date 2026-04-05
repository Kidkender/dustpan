import { invoke } from "@tauri-apps/api/core";
import type {
  JunkCategory,
  ScanResult,
  AnalysisReport,
  CleanReport,
  Config,
  DevArtifactEntry,
  LargeEntry,
  HistoryEntry,
  HistoryStats,
} from "@/types";

export const getCategories = () =>
  invoke<JunkCategory[]>("get_categories");

export const scan = (categoryIds: string[]) =>
  invoke<ScanResult[]>("scan", { categoryIds });

export const analyze = () =>
  invoke<AnalysisReport>("analyze");

export const clean = (categoryIds: string[], dryRun = false, useRecycleBin = false) =>
  invoke<CleanReport>("clean", { categoryIds, dryRun, useRecycleBin });

export const loadConfig = () =>
  invoke<Config>("load_config");

export const saveConfig = (config: Config) =>
  invoke<void>("save_config", { config });

export const isElevated = () =>
  invoke<boolean>("is_elevated");

export const restartAsAdmin = () =>
  invoke<void>("restart_as_admin");

export const scanDevArtifacts = (minAgeDays: number) =>
  invoke<DevArtifactEntry[]>("scan_dev_artifacts", { minAgeDays });

export const cleanDevArtifactEntries = (artifactPaths: string[], dryRun = false, useRecycleBin = false) =>
  invoke<CleanReport>("clean_dev_artifact_entries", { artifactPaths, dryRun, useRecycleBin });

export const cancelScan = () =>
  invoke<void>("cancel_scan");

export const scanLargeFiles = (minSizeMb: number) =>
  invoke<LargeEntry[]>("scan_large_files", { minSizeMb });

export const deleteLargeEntries = (paths: string[], dryRun = false, useRecycleBin = false) =>
  invoke<CleanReport>("delete_large_entries", { paths, dryRun, useRecycleBin });

export const getCleanHistory = () =>
  invoke<HistoryEntry[]>("get_clean_history");

export const getHistoryStats = () =>
  invoke<HistoryStats>("get_history_stats");

export const recordCleanSession = (
  freedBytes: number,
  deletedCount: number,
  skippedCount: number,
  label: string,
) => invoke<void>("record_clean_session", { freedBytes, deletedCount, skippedCount, label });
