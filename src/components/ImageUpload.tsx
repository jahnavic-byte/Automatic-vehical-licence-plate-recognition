import { useCallback, useState } from "react";
import { Upload, Camera, Image } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  isProcessing: boolean;
}

const ImageUpload = ({ onImageSelect, isProcessing }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      onImageSelect(file, url);
    },
    [onImageSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
        ${isDragging ? "border-primary bg-primary/5 glow-border" : "border-border hover:border-primary/50 hover:bg-muted/30"}
        ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      {/* Scan line overlay */}
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="scan-line absolute inset-x-0 h-1/3" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Camera className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Image className="h-7 w-7" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          {isProcessing ? "Scanning plate..." : "Drop vehicle image here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse • JPG, PNG, WEBP supported
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;
