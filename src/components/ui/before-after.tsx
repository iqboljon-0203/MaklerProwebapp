import { useState, useRef, useEffect, useCallback } from "react";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterComparisonProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export function BeforeAfterComparison({
  beforeImage,
  afterImage,
  className,
}: BeforeAfterComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
      }
    },
    []
  );

  const onMouseDown = useCallback(() => setIsDragging(true), []);
  const onTouchStart = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
    }

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border select-none touch-none bg-muted/50",
        className
      )}
      // Allow the container to take height from content if not specified, 
      // but usually needs a fixed aspect or height in UI. 
      // We'll trust className or default scaling.
    >
      <div className="relative w-full h-full grid place-items-center">
        {/* Background (After) */}
        <img
          src={afterImage}
          alt="After"
          className="block max-h-full w-auto max-w-full object-contain pointer-events-none select-none"
          draggable={false}
        />
        <div className="absolute top-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          После
        </div>

        {/* Foreground (Before) - Clipped */}
        <div
          className="absolute inset-0 z-20"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt="Before"
            className="block h-full w-full object-contain pointer-events-none select-none"
            draggable={false}
          />
           <div className="absolute top-4 left-4 z-30 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            До
          </div>
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute inset-y-0 z-40 w-1 cursor-ew-resize bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="absolute top-1/2 left-1/2 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-primary">
          <MoveHorizontal size={16} />
        </div>
      </div>
    </div>
  );
}
