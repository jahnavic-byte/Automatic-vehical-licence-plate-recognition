import { Shield, MapPin, Car, Calendar } from "lucide-react";

export interface PlateData {
  plateNumber: string;
  confidence: number;
  vehicleType?: string;
  region?: string;
  timestamp: string;
  imageUrl: string;
}

interface PlateResultProps {
  data: PlateData;
}

const PlateResult = ({ data }: PlateResultProps) => {
  const confidenceColor =
    data.confidence >= 90
      ? "text-success"
      : data.confidence >= 70
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="rounded-xl border border-border bg-card p-6 glow-border animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Plate display */}
      <div className="mb-6 flex items-center justify-center">
        <div className="rounded-lg border-2 border-primary/30 bg-background px-8 py-4">
          <span className="font-mono-plate text-4xl font-bold tracking-[0.2em] text-primary plate-glow">
            {data.plateNumber}
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Shield className={`h-5 w-5 ${confidenceColor}`} />
          <div>
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className={`font-mono text-sm font-semibold ${confidenceColor}`}>
              {data.confidence}%
            </p>
          </div>
        </div>

        {data.vehicleType && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Car className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium">{data.vehicleType}</p>
            </div>
          </div>
        )}

        {data.region && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Region</p>
              <p className="text-sm font-medium">{data.region}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Scanned</p>
            <p className="text-sm font-medium">
              {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Image preview */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <img
          src={data.imageUrl}
          alt="Scanned vehicle"
          className="h-40 w-full object-cover"
        />
      </div>
    </div>
  );
};

export default PlateResult;
