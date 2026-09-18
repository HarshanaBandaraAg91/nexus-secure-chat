import React, { useRef, useState, useEffect } from 'react';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'bright' | 'terminal' | 'danger';
  showDataTrail?: boolean;
  magneticStrength?: number; // max pixels to shift (default 4px)
  children: React.ReactNode;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  variant = 'terminal',
  showDataTrail = true,
  magneticStrength = 4,
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [showTrail, setShowTrail] = useState(false);

  const baseClass =
    variant === 'bright'
      ? 'btn-terminal-bright'
      : variant === 'danger'
      ? 'btn-terminal-danger'
      : 'btn-terminal';

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current || props.disabled) return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = btnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, deltaX)) * magneticStrength;
    const clampedY = Math.max(-1, Math.min(1, deltaY)) * magneticStrength;

    setOffset({ x: clampedX, y: clampedY });
    onMouseMove?.(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    setShowTrail(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
    setShowTrail(false);
    onMouseLeave?.(e);
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: !props.disabled && isHovered ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
      }}
      className={`${baseClass} ${className} relative overflow-hidden`}
      {...props}
    >
      {/* Corner HUD Accent Highlights */}
      <span
        aria-hidden="true"
        className={`absolute top-0 left-0 w-1.5 h-1.5 border-t border-l pointer-events-none transition-colors duration-200 ${
          variant === 'bright'
            ? 'border-black'
            : isHovered
            ? 'border-[#39FF88] shadow-[0_0_6px_#00FF41]'
            : 'border-[#00FF41]/40'
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r pointer-events-none transition-colors duration-200 ${
          variant === 'bright'
            ? 'border-black'
            : isHovered
            ? 'border-[#39FF88] shadow-[0_0_6px_#00FF41]'
            : 'border-[#00FF41]/40'
        }`}
      />

      {/* Button Children Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>

      {/* Thin Horizontal Data Trail Scan */}
      {showDataTrail && showTrail && !props.disabled && (
        <span aria-hidden="true" className="btn-trail-scan" />
      )}
    </button>
  );
};
