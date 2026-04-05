import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Settings, Search, Code2 } from "lucide-react";
import logo from "@/assets/logo.png";
import type { JunkCategory, RiskLevel } from "@/types";

interface HomePageProps {
  categories: JunkCategory[];
  selected: Set<string>;
  elevated: boolean;
  devEnabled: boolean;
  devMinAgeDays: number;
  onToggle: (id: string) => void;
  onDevEnabledChange: (enabled: boolean) => void;
  onDevMinAgeDaysChange: (days: number) => void;
  onScan: () => void;
  onSettings: () => void;
}

const riskBadge: Record<RiskLevel, { label: string; className: string }> = {
  Low: { label: "Low Risk", className: "bg-green-900/50 text-green-300 border-green-800" },
  Medium: { label: "Medium Risk", className: "bg-yellow-900/50 text-yellow-300 border-yellow-800" },
  High: { label: "High Risk", className: "bg-red-900/50 text-red-300 border-red-800" },
};

export function HomePage({
  categories,
  selected,
  elevated,
  devEnabled,
  devMinAgeDays,
  onToggle,
  onDevEnabledChange,
  onDevMinAgeDaysChange,
  onScan,
  onSettings,
}: HomePageProps) {
  const canScan = selected.size > 0 || devEnabled;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
            <img src={logo} alt="Dustpan" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Dustpan</h1>
            <p className="text-xs text-muted-foreground">PC Junk Cleaner</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={elevated
              ? "border-green-700 text-green-400 bg-green-950/40"
              : "border-yellow-700 text-yellow-400 bg-yellow-950/40"
            }
          >
            <ShieldAlert className="w-3 h-3 mr-1" />
            {elevated ? "Administrator" : "Standard User"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onSettings}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Junk categories section */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Select categories to scan. Medium-risk categories require administrator privileges.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const disabled = cat.requires_admin && !elevated;
              const isChecked = selected.has(cat.id);
              const badge = riskBadge[cat.risk];

              return (
                <Card
                  key={cat.id}
                  className={`cursor-pointer transition-colors border ${
                    disabled
                      ? "opacity-50 cursor-not-allowed bg-muted/20"
                      : isChecked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                  onClick={() => !disabled && onToggle(cat.id)}
                >
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium leading-tight">
                        {cat.name}
                      </CardTitle>
                      <Checkbox
                        checked={isChecked}
                        disabled={disabled}
                        onCheckedChange={() => !disabled && onToggle(cat.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <CardDescription className="text-xs leading-relaxed mb-2">
                      {cat.description}
                    </CardDescription>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      {disabled && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 border-muted text-muted-foreground">
                          <ShieldAlert className="w-2.5 h-2.5 mr-0.5" />
                          Admin required
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Developer artifacts section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Developer Artifacts</h2>
            </div>
            <Switch
              id="dev-artifacts-switch"
              checked={devEnabled}
              onCheckedChange={onDevEnabledChange}
            />
          </div>

          <Card className={`transition-colors border ${devEnabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10 opacity-60"}`}>
            <CardContent className="px-4 py-3">
              <CardDescription className="text-xs leading-relaxed mb-3">
                Scan entire drives for unused build artifacts from developer projects —
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">node_modules</code>,
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">.venv</code>,
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">target/</code>,
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">.next</code>,
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">__pycache__</code>,
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">.gradle</code>.
                Only removes folders from projects you haven't touched in a while.
              </CardDescription>
              <div className="flex items-center gap-3">
                <Label htmlFor="dev-min-age" className="text-xs text-muted-foreground whitespace-nowrap">
                  Minimum age (days):
                </Label>
                <Input
                  id="dev-min-age"
                  type="number"
                  min={1}
                  max={365}
                  value={devMinAgeDays}
                  disabled={!devEnabled}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) onDevMinAgeDaysChange(val);
                  }}
                  className="h-7 w-20 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size} {selected.size === 1 ? "category" : "categories"} selected
          {devEnabled && " · dev artifacts enabled"}
        </p>
        <Button onClick={onScan} disabled={!canScan} className="gap-2">
          <Search className="w-4 h-4" />
          Scan Selected
        </Button>
      </div>
    </div>
  );
}
