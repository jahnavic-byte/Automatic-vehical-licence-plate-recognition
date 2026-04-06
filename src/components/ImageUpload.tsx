import { useCallback, useState, useRef } from "react";
import { Upload, Camera, Image } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  isProcessing: boolean;
}

const ImageUpload = ({ onImageSelect, isProcessing }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const openCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      // Fallback: open file picker with capture
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = (ev) => {
        const file = (ev.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
      };
      input.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
        handleFile(file);
      }
    }, "image/jpeg", 0.9);
    closeCamera();
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  if (isCameraOpen) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-primary bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />
        {/* Scan overlay */}
        <div className="absolute inset-0 pointer-events-none border-2 border-primary/30">
          <div className="absolute inset-x-[15%] inset-y-[25%] border-2 border-primary/60 rounded-lg" />
        </div>
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={closeCamera}
            className="rounded-lg bg-muted/80 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={capturePhoto}
            className="rounded-full h-14 w-14 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Camera className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

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
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="scan-line absolute inset-x-0 h-1/3" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={openCamera}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Camera className="h-7 w-7" />
        </button>
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
          or click to browse • tap camera to capture live
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;
