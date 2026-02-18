
export const MaklerLogo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. Left House Half (Blue) */}
      <path 
        d="M256 60 L70 220 H120 V400 H200 V270 L256 220 Z" 
        fill="#0EA5E9" 
      />

      {/* 2. Right House Half (Green) */}
      <path 
        d="M256 60 L442 220 H392 V400 H312 V270 L256 220 Z" 
        fill="#84CC16" 
      />

      {/* 3. Letter M - Left Half (White) */}
      {/* 
         Structure:
         - Left Vertical Bar: x=210 to x=240
         - Left Diagonal: from (240,280) towards center (256,360)
      */}
      <path 
        d="M210 400 V280 H240 L256 330 V370 L240 330 V400 H210 Z" 
        fill="white" 
      />

      {/* 4. Letter M - Right Half (Green) */}
      <path 
        d="M302 400 V280 H272 L256 330 V370 L272 330 V400 H302 Z" 
        fill="#84CC16"
      />
      
      {/* 
         Correction on the M shape:
         The diagonals should look connected. 
         My path (240,280 -> 256,330) is a bit shallow. 
         Let's deepen the V. Center point (256, 360).
      */}
       


    </svg>
  );
};
