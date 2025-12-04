import React from 'react';

interface MacroRingProps {
  current: number;
  target: number;
  label: string;
  color: string;
  unit?: string;
}

export const MacroRing: React.FC<MacroRingProps> = ({ current, target, label, color, unit = 'g' }) => {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70">
          <circle
            cx="35"
            cy="35"
            r={radius}
            stroke="#f3f4f6"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="35"
            cy="35"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-gray-900">{Math.round(current)}</span>
          <span className="text-[9px] text-gray-400">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500 mt-1">{label}</span>
    </div>
  );
};
