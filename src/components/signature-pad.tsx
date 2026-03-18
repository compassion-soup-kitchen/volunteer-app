"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RiDeleteBinLine } from "@remixicon/react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialValue?: string | null;
  label?: string;
}

export function SignaturePad({
  onSignatureChange,
  initialValue,
  label = "Draw your signature below",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialValue);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return { canvas, ctx };
  }, []);

  // Set up canvas dimensions and load initial value
  useEffect(() => {
    const result = getCtx();
    if (!result) return;
    const { canvas, ctx } = result;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;

    // Fill canvas with white background so exported PNG is visible in any theme
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Always draw in dark ink for contrast on white background
    ctx.strokeStyle = "#1a1a1a";

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialValue;
    }
  }, [getCtx, initialValue]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    const result = getCtx();
    if (!result) return;
    const pos = getPos(e);
    result.ctx.beginPath();
    result.ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const result = getCtx();
    if (!result) return;
    const pos = getPos(e);
    result.ctx.lineTo(pos.x, pos.y);
    result.ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL("image/png"));
    }
  }

  function clear() {
    const result = getCtx();
    if (!result) return;
    const { canvas, ctx } = result;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    // Restore white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onSignatureChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        {hasSignature && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <RiDeleteBinLine className="size-3" />
            Clear
          </Button>
        )}
      </div>
      <div className="rounded-md border border-input bg-white">
        <canvas
          ref={canvasRef}
          className="h-32 w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Use your finger or mouse to sign
      </p>
    </div>
  );
}
