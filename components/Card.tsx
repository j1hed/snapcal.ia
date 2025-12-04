
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  isPressable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, isPressable = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 ${isPressable ? 'active:scale-[0.98] transition-transform duration-200 ease-out cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};