import React from 'react';

interface ResiliLogoProps {
  size?: number | string;
  className?: string;
  withGlow?: boolean;
}

export const ResiliLogo: React.FC<ResiliLogoProps> = ({
  size = 28,
  className = '',
  withGlow = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`resiligraph-logo-container ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: withGlow
          ? 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5)) drop-shadow(0 0 18px rgba(168, 85, 247, 0.35))'
          : 'none',
      }}
    >
      <img
        src="/logo.png"
        alt="ResiliGraph Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    </div>
  );
};

export default ResiliLogo;
