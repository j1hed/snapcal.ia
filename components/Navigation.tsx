import React from 'react';
import { Home, Plus, User, FileText } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onCameraClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, onCameraClick }) => {
  const getIconColor = (view: ViewState) => {
    return currentView === view ? "text-black" : "text-gray-400";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-safe pt-2 px-6 z-50">
      <div className="flex justify-between items-end pb-2">
        <button 
          onClick={() => onNavigate('DASHBOARD')}
          className={`flex flex-col items-center gap-1 ${getIconColor('DASHBOARD')}`}
        >
          <Home size={24} strokeWidth={currentView === 'DASHBOARD' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Today</span>
        </button>

        {/* Floating Action Button for Camera */}
        <button 
          onClick={onCameraClick}
          className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-600/30 transform -translate-y-4 active:scale-90 transition-transform"
        >
          <Plus size={28} strokeWidth={3} />
        </button>

        <button 
          onClick={() => onNavigate('PROFILE')}
          className={`flex flex-col items-center gap-1 ${getIconColor('PROFILE')}`}
        >
          <User size={24} strokeWidth={currentView === 'PROFILE' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
};
