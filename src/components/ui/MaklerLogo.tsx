import React from 'react';

export const MaklerLogo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="bgGradient" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
        
        {/* Deep Blue Frame Gradient */}
        <linearGradient id="frameGradient" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#005bea" />
          <stop offset="100%" stopColor="#00c6fb" />
        </linearGradient>

        {/* Golden Glow Gradient */}
        <radialGradient id="goldGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(256 300) rotate(90) scale(150)">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>

        {/* Shield Border Gradient */}
        <linearGradient id="shieldBorder" x1="100" y1="100" x2="412" y2="412" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id="shadow" x="-50" y="-50" width="612" height="612" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.3" />
        </filter>
        
        {/* Inner Glow Filter */}
        <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
          <feFlood floodColor="white" floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="shadowDiff" operator="in" />
        </filter>
      </defs>

      {/* 1. Main Background Container (Rounded Square) */}
      <rect x="32" y="32" width="448" height="448" rx="100" fill="url(#frameGradient)" filter="url(#shadow)" />
      
      {/* 2. Inner Light Overlay (Glass effect) */}
      <rect x="32" y="32" width="448" height="448" rx="100" fill="url(#bgGradient)" fillOpacity="0.4" />
      
      {/* 3. The Shield Shape */}
      <path 
        d="M256 90 C 256 90, 80 110, 80 230 C 80 340, 200 420, 256 440 C 312 420, 432 340, 432 230 C 432 110, 256 90, 256 90 Z" 
        fill="#0f172a" 
        stroke="url(#shieldBorder)" 
        strokeWidth="12"
        strokeLinejoin="round"
      />

      {/* 4. Golden Burst from bottom center */}
      <circle cx="256" cy="300" r="120" fill="url(#goldGlow)" style={{ mixBlendMode: 'screen' }} />

      {/* 5. The House Icon (Silhouette) */}
      <path 
        d="M256 160 L 150 260 H 180 V 360 H 332 V 260 H 362 L 256 160 Z" 
        fill="#0f172a" 
        stroke="white" 
        strokeWidth="4"
        strokeLinejoin="round"
        fillOpacity="0.8"
      />
      
      {/* 6. Door Light (The 'Open' glow) */}
      <rect x="236" y="280" width="40" height="80" rx="4" fill="#fbbf24" filter="url(#innerGlow)" />
      
      {/* 7. Highlights/Reflections */}
      <path 
        d="M60 100 Q 256 50 452 100" 
        stroke="white" 
        strokeWidth="2" 
        strokeOpacity="0.3" 
        fill="none" 
      />
      
    </svg>
  );
};
