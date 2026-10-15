import React from 'react';

interface PhilippineFlagProps {
  className?: string;
}

export const PhilippineFlag: React.FC<PhilippineFlagProps> = ({ className = 'w-5 h-3.5' }) => {
  return (
    <svg
      viewBox="0 0 600 300"
      className={`${className} rounded-[2px] shadow-xs shrink-0 inline-block align-middle`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Flag of the Philippines"
      role="img"
    >
      {/* Royal Blue Top Half */}
      <rect width="600" height="150" fill="#0038A8" />

      {/* Scarlet Red Bottom Half */}
      <rect y="150" width="600" height="150" fill="#CE1126" />

      {/* White Equilateral Triangle */}
      <polygon points="0,0 259.8,150 0,300" fill="#FFFFFF" />

      {/* Golden Sun & 8 Rays */}
      <g transform="translate(86.6, 150)" fill="#FCD116">
        <circle r="26" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {/* Primary Ray */}
            <polygon points="0,-48 3.8,-24 -3.8,-24" />
            {/* Flanking Minor Rays */}
            <polygon points="2.5,-44 7,-24 0,-24" opacity="0.95" />
            <polygon points="-2.5,-44 0,-24 -7,-24" opacity="0.95" />
          </g>
        ))}
      </g>

      {/* 3 Golden Five-Pointed Stars (Luzon, Visayas, Mindanao) */}
      <polygon
        points="0,-10 2.9,-3 10,-3 4.3,1.5 6.5,8.5 0,4.2 -6.5,8.5 -4.3,1.5 -10,-3 -2.9,-3"
        transform="translate(26, 34) scale(1.15)"
        fill="#FCD116"
      />
      <polygon
        points="0,-10 2.9,-3 10,-3 4.3,1.5 6.5,8.5 0,4.2 -6.5,8.5 -4.3,1.5 -10,-3 -2.9,-3"
        transform="translate(225, 150) scale(1.15)"
        fill="#FCD116"
      />
      <polygon
        points="0,-10 2.9,-3 10,-3 4.3,1.5 6.5,8.5 0,4.2 -6.5,8.5 -4.3,1.5 -10,-3 -2.9,-3"
        transform="translate(26, 266) scale(1.15)"
        fill="#FCD116"
      />
    </svg>
  );
};
