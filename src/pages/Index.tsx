import { useState } from "react";
import { ScanLine, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import PlateResult, { type PlateData } from "@/components/PlateResult";
import ScanHistory from "@/components/ScanHistory";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<PlateData | null>(null);
  const [history, setHistory] = useState<PlateData[]>([]);

  const handleImageSelect = async (file: File, previewUrl: string) => {
    setIsProcessing(true);
    setCurrentResult(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("recognize-plate", {
        body: { image: base64 },
      });

      if (error) throw error;

      const result: PlateData = {
        plateNumber: data.plateNumber || "UNKNOWN",
        confidence: data.confidence || 0,
        vehicleType: data.vehicleType,
        region: data.region,
        timestamp: new Date().toISOString(),
        imageUrl: previewUrl,
      };

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev].slice(0, 20));
      toast.success(`Plate detected: ${result.plateNumber}`);
    } catch (err: any) {
      console.error("Recognition error:", err);
      toast.error("Failed to recognize plate. Please try another image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ScanLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">PlateScanner</h1>
              <p className="text-xs text-muted-foreground">AI-Powered ALPR</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {history.length} scans
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Upload + Result */}
          <div className="space-y-6 lg:col-span-3">
            <ImageUpload
              onImageSelect={handleImageSelect}
              isProcessing={isProcessing}
            />

            {currentResult && <PlateResult data={currentResult} />}
          </div>

          {/* Right: History */}
          <div className="lg:col-span-2">
            <ScanHistory
              history={history}
              onClear={() => setHistory([])}
            />

            {history.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <ScanLine className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No scans yet. Upload a vehicle image to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
