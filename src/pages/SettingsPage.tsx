import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, RotateCcw, ShieldAlert, Plus, X } from "lucide-react";
import type { Config, JunkCategory } from "@/types";

interface SettingsPageProps {
  config: Config;
  categories: JunkCategory[];
  elevated: boolean;
  onSave: (config: Config) => void;
  onBack: () => void;
  onRestartAsAdmin: () => void;
}

const DEFAULT_CONFIG: Config = {
  enabled_categories: ["user_temp", "browser_chrome", "browser_edge", "browser_firefox", "thumbnail_cache", "crash_dumps"],
  min_age_days: 0,
  custom_paths: [],
  exclude_paths: [],
  use_recycle_bin: true,
};

export function SettingsPage({ config, categories, elevated, onSave, onBack, onRestartAsAdmin }: SettingsPageProps) {
  const [local, setLocal] = useState<Config>({ ...config });
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [newCustomPath, setNewCustomPath] = useState("");
  const [newExcludePath, setNewExcludePath] = useState("");

  const toggleCategory = (id: string) => {
    setLocal((prev) => ({
      ...prev,
      enabled_categories: prev.enabled_categories.includes(id)
        ? prev.enabled_categories.filter((c) => c !== id)
        : [...prev.enabled_categories, id],
    }));
  };

  const addPath = (field: "custom_paths" | "exclude_paths", value: string) => {
    if (!value.trim()) return;
    setLocal((prev) => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    if (field === "custom_paths") setNewCustomPath("");
    else setNewExcludePath("");
  };

  const removePath = (field: "custom_paths" | "exclude_paths", index: number) => {
    setLocal((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Elevation warning */}
        {!elevated && (
          <Card className="border-yellow-800 bg-yellow-950/30">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p className="text-sm">Some categories require administrator privileges.</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 border-yellow-700 text-yellow-400 hover:bg-yellow-950" onClick={() => setConfirmAdmin(true)}>
                Run as Admin
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Default categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Default Categories</CardTitle>
            <CardDescription className="text-xs">
              These categories are cleaned when no specific selection is made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {cat.risk}
                    </Badge>
                    {cat.requires_admin && (
                      <span className="text-xs text-muted-foreground">Admin required</span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={local.enabled_categories.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                  disabled={cat.requires_admin && !elevated}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Scan options */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scan Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Minimum file age (days)</p>
                <p className="text-xs text-muted-foreground">Only delete files older than this. 0 = no filter.</p>
              </div>
              <input
                type="number"
                min={0}
                max={365}
                value={local.min_age_days}
                onChange={(e) => setLocal((prev) => ({ ...prev, min_age_days: Number(e.target.value) }))}
                className="w-20 px-2 py-1 text-sm text-right bg-input border border-border rounded-md text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Deletion mode */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deletion Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Send to Recycle Bin</p>
                <p className="text-xs text-muted-foreground">
                  Move files to Recycle Bin instead of permanent deletion. Slower but recoverable.
                </p>
              </div>
              <Switch
                checked={local.use_recycle_bin}
                onCheckedChange={(v) => setLocal((prev) => ({ ...prev, use_recycle_bin: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom paths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Custom Scan Paths</CardTitle>
            <CardDescription className="text-xs">Extra directories to include in scans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {local.custom_paths.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-muted-foreground truncate">{p}</p>
                <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0" onClick={() => removePath("custom_paths", i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Separator />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="C:\path\to\folder"
                value={newCustomPath}
                onChange={(e) => setNewCustomPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPath("custom_paths", newCustomPath)}
                className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground"
              />
              <Button size="sm" variant="outline" onClick={() => addPath("custom_paths", newCustomPath)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exclude paths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Exclude Paths</CardTitle>
            <CardDescription className="text-xs">Paths that will never be touched.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {local.exclude_paths.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-muted-foreground truncate">{p}</p>
                <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0" onClick={() => removePath("exclude_paths", i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Separator />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="C:\path\to\exclude"
                value={newExcludePath}
                onChange={(e) => setNewExcludePath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPath("exclude_paths", newExcludePath)}
                className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground"
              />
              <Button size="sm" variant="outline" onClick={() => addPath("exclude_paths", newExcludePath)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex justify-between">
        <Button
          variant="outline"
          onClick={() => setLocal({ ...DEFAULT_CONFIG })}
          className="gap-2 text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" /> Reset Defaults
        </Button>
        <Button onClick={() => onSave(local)} className="gap-2">
          <Save className="w-4 h-4" /> Save
        </Button>
      </div>

      {/* Confirm admin restart */}
      <Dialog open={confirmAdmin} onOpenChange={setConfirmAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart as Administrator?</DialogTitle>
            <DialogDescription>
              Dustpan will restart with administrator privileges. Any unsaved settings will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAdmin(false)}>Cancel</Button>
            <Button onClick={onRestartAsAdmin}>Restart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
