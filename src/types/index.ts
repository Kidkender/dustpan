export type RiskLevel = "Low" | "Medium" | "High";

export interface JunkCategory {
  id: string;
  name: string;
  description: string;
  risk: RiskLevel;
  requires_admin: boolean;
}

export interface ScannedFile {
  path: string;
  size_bytes: number;
  category_id: string;
}

export interface ScanResult {
  category_id: string;
  files: ScannedFile[];
  total_bytes: number;
  errors: string[];
}

export interface CategorySummary {
  category_id: string;
  file_count: number;
  total_bytes: number;
}

export interface AnalysisReport {
  categories: CategorySummary[];
  grand_total_bytes: number;
  grand_total_files: number;
}

export interface CleanReport {
  deleted_count: number;
  freed_bytes: number;
  skipped: [string, string][];
}

export interface Config {
  enabled_categories: string[];
  min_age_days: number;
  custom_paths: string[];
  exclude_paths: string[];
  use_recycle_bin: boolean;
}

export interface ScanProgressPayload {
  category_id: string;
  files_found: number;
  bytes_found: number;
  categories_done: number;
  categories_total: number;
}

export interface CleanProgressPayload {
  deleted_count: number;
  freed_bytes: number;
  total_files: number;
  current_file: string;
}

export type ArtifactKind =
  | "NodeModules"
  | "PythonVenv"
  | "RustTarget"
  | "NextBuild"
  | "PythonCache"
  | "GradleCache";

export type ArtifactConfidence = "High" | "Medium" | "Low";

export interface DevArtifactEntry {
  kind: ArtifactKind;
  artifact_path: string;
  project_name: string;
  project_path: string;
  size_bytes: number;
  last_modified_secs: number;
  age_days: number;
  confidence: ArtifactConfidence;
}

export interface DevScanProgressPayload {
  found_count: number;
  total_size_bytes: number;
  current_project: string;
}

export type FileRisk = "Safe" | "AppData" | "System";

export interface LargeEntry {
  path: string;
  name: string;
  parent: string;
  size_bytes: number;
  modified_secs: number;
  risk: FileRisk;
}

export interface LargeScanProgressPayload {
  scanned_count: number;
  found_count: number;
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  freed_bytes: number;
  deleted_count: number;
  skipped_count: number;
  label: string;
}

export interface HistoryStats {
  total_freed_bytes: number;
  session_count: number;
}
