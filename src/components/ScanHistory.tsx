import { Clock, Trash2 } from "lucide-react";
import type { PlateData } from "./PlateResult";

interface ScanHistoryProps {
  history: PlateData[];
  onClear: () => void;
}

const ScanHistory = ({ history, onClear }: ScanHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scan History
          </h3>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <img
                src={item.imageUrl}
                alt=""
                className="h-8 w-8 rounded object-cover"
              />
              <span className="font-mono text-sm font-semibold text-primary">
                {item.plateNumber}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScanHistory;
