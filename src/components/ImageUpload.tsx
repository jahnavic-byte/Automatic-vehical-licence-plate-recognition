import { useCallback, useState, useRef, useEffect } from "react";
import { Upload, Camera, Image, Crosshair } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  isProcessing: boolean;
  onAutoDetectCapture?: (file: File, previewUrl: string) => void;
}

const ImageUpload = ({ onImageSelect, isProcessing, onAutoDetectCapture }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const [autoDetectStatus, setAutoDetectStatus] = useState<string>("Initializing...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoDetectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const isCapturingRef = useRef(false);
  const motionCooldownRef = useRef(false);

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

  const stopAutoDetect = useCallback(() => {
    if (autoDetectIntervalRef.current) {
      clearInterval(autoDetectIntervalRef.current);
      autoDetectIntervalRef.current = null;
    }
    isCapturingRef.current = false;
    motionCooldownRef.current = false;
    prevFrameRef.current = null;
  }, []);

  const closeCamera = useCallback(() => {
    stopAutoDetect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setIsAutoDetect(false);
    setAutoDetectStatus("Initializing...");
  }, [stopAutoDetect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoDetect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopAutoDetect]);

  const startCamera = async (autoDetectMode: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setIsAutoDetect(autoDetectMode);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
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

  const captureFrame = useCallback((): File | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert synchronously to blob via toDataURL for speed
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/jpeg" });
    return new File([blob], `autodetect-${Date.now()}.jpg`, { type: "image/jpeg" });
  }, []);

  // Detect motion by comparing current frame to previous frame
  const detectMotion = useCallback((): boolean => {
    if (!videoRef.current || videoRef.current.readyState < 2) return false;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    const w = 160; // downscale for performance
    const h = 90;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (!prevFrameRef.current) {
      prevFrameRef.current = currentFrame;
      return false;
    }

    const prev = prevFrameRef.current.data;
    const curr = currentFrame.data;
    let diffCount = 0;
    const totalPixels = w * h;
    for (let i = 0; i < prev.length; i += 16) { // sample every 4th pixel
      const dr = Math.abs(curr[i] - prev[i]);
      const dg = Math.abs(curr[i + 1] - prev[i + 1]);
      const db = Math.abs(curr[i + 2] - prev[i + 2]);
      if (dr + dg + db > 80) diffCount++;
    }
    prevFrameRef.current = currentFrame;
    const changeRatio = diffCount / (totalPixels / 4);
    // Trigger when 8-60% of pixels changed (vehicle entering, not camera shake or full scene change)
    return changeRatio > 0.08 && changeRatio < 0.6;
  }, []);

  // Start auto-detect scanning loop — only captures when motion (vehicle) is detected
  useEffect(() => {
    if (!isAutoDetect || !isCameraOpen) return;

    const handler = onAutoDetectCapture || onImageSelect;

    const startTimeout = setTimeout(() => {
      setAutoDetectStatus("Waiting for vehicle...");

      // Check for motion frequently, but only capture on detection
      autoDetectIntervalRef.current = setInterval(() => {
        if (isCapturingRef.current || motionCooldownRef.current) return;

        const motionDetected = detectMotion();
        if (!motionDetected) return;

        // Motion detected — capture full-res frame
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        const canvas = canvasRef.current;
        canvas.width = videoRef.current!.videoWidth;
        canvas.height = videoRef.current!.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoRef.current!, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const byteString = atob(dataUrl.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: "image/jpeg" });
        const file = new File([blob], `autodetect-${Date.now()}.jpg`, { type: "image/jpeg" });

        isCapturingRef.current = true;
        motionCooldownRef.current = true;
        setAutoDetectStatus("Vehicle detected! Scanning plate...");
        const url = URL.createObjectURL(file);
        handler(file, url);

        // Cooldown — wait 10s before allowing next detection
        setTimeout(() => {
          isCapturingRef.current = false;
          motionCooldownRef.current = false;
          prevFrameRef.current = null; // reset baseline after cooldown
          setAutoDetectStatus("Waiting for vehicle...");
        }, 7000);
      }, 500); // Check motion every 500ms
    }, 1000);

    return () => {
      clearTimeout(startTimeout);
      if (autoDetectIntervalRef.current) {
        clearInterval(autoDetectIntervalRef.current);
        autoDetectIntervalRef.current = null;
      }
    };
  }, [isAutoDetect, isCameraOpen, detectMotion, onAutoDetectCapture, onImageSelect]);

  const openCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await startCamera(false);
  };

  const openAutoDetect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await startCamera(true);
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
          {isAutoDetect && (
            <>
              {/* Animated scan line */}
              <div className="scan-line absolute inset-x-[15%] h-1/3" />
              {/* Status badge */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary/90 px-4 py-1.5 text-xs font-bold text-primary-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                </span>
                {autoDetectStatus}
              </div>
            </>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={closeCamera}
            className="rounded-lg bg-muted/80 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {isAutoDetect ? "Stop" : "Cancel"}
          </button>
          {!isAutoDetect && (
            <button
              onClick={capturePhoto}
              className="rounded-full h-14 w-14 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Camera className="h-6 w-6" />
            </button>
          )}
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
          title="Manual capture"
        >
          <Camera className="h-7 w-7" />
        </button>
        <button
          onClick={openAutoDetect}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors border border-accent/40"
          title="Auto-detect plates"
        >
          <Crosshair className="h-7 w-7" />
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
          click to browse • camera for manual • crosshair for autodetect
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;
