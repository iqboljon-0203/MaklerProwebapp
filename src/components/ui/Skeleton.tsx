import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// ===================================
// Base Skeleton Component
// ===================================

interface SkeletonBaseProps {
  className?: string;
  shimmer?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children?: ReactNode;
}

export function SkeletonBase({ 
  className = '', 
  shimmer = true,
  rounded = 'lg',
  children 
}: SkeletonBaseProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={`
        bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800
        ${roundedClasses[rounded]}
        ${shimmer ? 'animate-shimmer bg-[length:200%_100%]' : 'animate-pulse'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ===================================
// Skeleton Text Line
// ===================================

interface SkeletonTextProps {
  width?: string;
  height?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonText({ 
  width = 'w-full', 
  height = 'md',
  className = '' 
}: SkeletonTextProps) {
  const heights = {
    xs: 'h-2',
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
  };

  return (
    <SkeletonBase 
      className={`${heights[height]} ${width} ${className}`}
      rounded="md"
    />
  );
}

// ===================================
// Skeleton Avatar
// ===================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ 
  size = 'md',
  className = '' 
}: SkeletonAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <SkeletonBase 
      className={`${sizes[size]} ${className}`}
      rounded="full"
    />
  );
}

// ===================================
// Skeleton Button
// ===================================

interface SkeletonButtonProps {
  width?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonButton({ 
  width = 'w-24',
  size = 'md',
  className = '' 
}: SkeletonButtonProps) {
  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return (
    <SkeletonBase 
      className={`${heights[size]} ${width} ${className}`}
      rounded="xl"
    />
  );
}

// ===================================
// Skeleton Image
// ===================================

interface SkeletonImageProps {
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  className?: string;
}

export function SkeletonImage({ 
  aspectRatio = '4:3',
  className = '' 
}: SkeletonImageProps) {
  const ratios = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
  };

  return (
    <SkeletonBase 
      className={`w-full ${ratios[aspectRatio]} ${className}`}
      rounded="xl"
    />
  );
}

// ===================================
// Property Card Skeleton
// ===================================

export function SkeletonPropertyCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5"
    >
      {/* Image placeholder */}
      <SkeletonImage aspectRatio="4:3" className="rounded-none" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <SkeletonText width="w-3/4" height="lg" />
        
        {/* Details row */}
        <div className="flex gap-3">
          <SkeletonText width="w-16" height="sm" />
          <SkeletonText width="w-20" height="sm" />
          <SkeletonText width="w-12" height="sm" />
        </div>
        
        {/* Price */}
        <SkeletonText width="w-1/3" height="lg" />
        
        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <SkeletonButton width="flex-1" size="md" />
          <SkeletonButton width="w-10" size="md" />
        </div>
      </div>
    </motion.div>
  );
}

// ===================================
// AI Text Block Skeleton
// ===================================

export function SkeletonAiTextBlock() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#1E1E1E] rounded-2xl p-4 border border-white/5 space-y-4"
    >
      {/* Header with icon */}
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-8 h-8" rounded="lg" />
        <SkeletonText width="w-32" height="md" />
      </div>
      
      {/* Text lines - mimicking paragraph */}
      <div className="space-y-2.5">
        <SkeletonText width="w-full" height="sm" />
        <SkeletonText width="w-full" height="sm" />
        <SkeletonText width="w-11/12" height="sm" />
        <SkeletonText width="w-full" height="sm" />
        <SkeletonText width="w-4/5" height="sm" />
      </div>
      
      {/* Second paragraph */}
      <div className="space-y-2.5 pt-2">
        <SkeletonText width="w-full" height="sm" />
        <SkeletonText width="w-10/12" height="sm" />
        <SkeletonText width="w-full" height="sm" />
        <SkeletonText width="w-3/4" height="sm" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <SkeletonButton width="flex-1" size="lg" />
        <SkeletonButton width="w-14" size="lg" />
      </div>
    </motion.div>
  );
}

// ===================================
// Image Enhancement Preview Skeleton
// ===================================

export function SkeletonImagePreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Main image preview */}
      <div className="relative rounded-2xl overflow-hidden">
        <SkeletonImage aspectRatio="4:3" />
        
        {/* Processing indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
            <SkeletonBase className="w-12 h-12" rounded="full" />
          </div>
        </div>
      </div>
      
      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonBase 
            key={i}
            className="w-16 h-16 flex-shrink-0"
            rounded="lg"
          />
        ))}
      </div>
      
      {/* Enhancement controls */}
      <div className="bg-[#1E1E1E] rounded-2xl p-4 space-y-4">
        {/* Slider labels */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonText width="w-20" height="sm" />
              <SkeletonText width="w-8" height="sm" />
            </div>
            <SkeletonBase className="w-full h-2" rounded="full" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ===================================
// User Profile Stats Skeleton
// ===================================

export function SkeletonProfileStats() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#1E1E1E] rounded-2xl p-6 border border-white/5"
    >
      {/* Header with avatar */}
      <div className="flex items-center gap-4 mb-6">
        <SkeletonAvatar size="xl" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-32" height="lg" />
          <SkeletonText width="w-24" height="sm" />
        </div>
        <SkeletonButton width="w-20" size="sm" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <SkeletonText width="w-12 mx-auto" height="lg" />
            <SkeletonText width="w-16 mx-auto" height="xs" />
          </div>
        ))}
      </div>
      
      {/* Activity summary */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBase className="w-8 h-8" rounded="lg" />
            <div className="flex-1 space-y-1">
              <SkeletonText width="w-3/4" height="sm" />
              <SkeletonText width="w-1/2" height="xs" />
            </div>
            <SkeletonText width="w-12" height="sm" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ===================================
// Gallery Grid Skeleton
// ===================================

interface SkeletonGalleryGridProps {
  count?: number;
  columns?: 1 | 2 | 3;
}

export function SkeletonGalleryGrid({ 
  count = 6, 
  columns = 2 
}: SkeletonGalleryGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <SkeletonPropertyCard />
        </motion.div>
      ))}
    </div>
  );
}

// ===================================
// History List Skeleton
// ===================================

export function SkeletonHistoryList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <SkeletonBase className="w-14 h-14" rounded="lg" />
            <div className="flex-1 space-y-2">
              <SkeletonText width="w-3/4" height="md" />
              <SkeletonText width="w-1/2" height="xs" />
            </div>
            <SkeletonButton width="w-8" size="sm" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ===================================
// Form Skeleton
// ===================================

export function SkeletonForm() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Input fields */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonText width="w-24" height="sm" />
          <SkeletonBase className="w-full h-12" rounded="xl" />
        </div>
      ))}
      
      {/* Textarea */}
      <div className="space-y-2">
        <SkeletonText width="w-32" height="sm" />
        <SkeletonBase className="w-full h-32" rounded="xl" />
      </div>
      
      {/* Submit button */}
      <SkeletonButton width="w-full" size="lg" />
    </motion.div>
  );
}

// ===================================
// Skeleton Wrapper with Transition
// ===================================

interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

export function SkeletonWrapper({ 
  isLoading, 
  skeleton, 
  children 
}: SkeletonWrapperProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

// ===================================
// Exports
// ===================================

export default {
  Base: SkeletonBase,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Button: SkeletonButton,
  Image: SkeletonImage,
  PropertyCard: SkeletonPropertyCard,
  AiTextBlock: SkeletonAiTextBlock,
  ImagePreview: SkeletonImagePreview,
  ProfileStats: SkeletonProfileStats,
  GalleryGrid: SkeletonGalleryGrid,
  HistoryList: SkeletonHistoryList,
  Form: SkeletonForm,
  Wrapper: SkeletonWrapper,
};
