import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50 ${className}`}
    >
      {children}
    </div>
  );
};
