
import React from 'react';
import { Home, Plus, User, PieChart, Trophy } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onCameraClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, onCameraClick }) => {
  const getIconColor = (view: ViewState) => {
    return currentView === view ? "text-[#007AFF]" : "text-gray-400";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 pb-safe pt-2 px-2 z-50 transition-all duration-300">
      <div className="flex justify-between items-end pb-1 px-2">
        <button 
          onClick={() => onNavigate('DASHBOARD')}
          className={`flex-1 flex flex-col items-center gap-1 active:opacity-70 transition-opacity ${getIconColor('DASHBOARD')}`}
        >
          <Home size={26} strokeWidth={currentView === 'DASHBOARD' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Journal</span>
        </button>

        <button 
          onClick={() => onNavigate('PROGRESS')}
          className={`flex-1 flex flex-col items-center gap-1 active:opacity-70 transition-opacity ${getIconColor('PROGRESS')}`}
        >
          <PieChart size={26} strokeWidth={currentView === 'PROGRESS' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Progress</span>
        </button>

        <div className="flex-1 flex justify-center -mt-6">
            <button 
            onClick={onCameraClick}
            className="bg-[#007AFF] text-white p-4 rounded-full shadow-[0_4px_12px_rgba(0,122,255,0.4)] active:scale-90 transition-transform active:shadow-sm"
            >
            <Plus size={30} strokeWidth={3} />
            </button>
        </div>

        <button 
          onClick={() => onNavigate('AWARDS')}
          className={`flex-1 flex flex-col items-center gap-1 active:opacity-70 transition-opacity ${getIconColor('AWARDS')}`}
        >
          <Trophy size={26} strokeWidth={currentView === 'AWARDS' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Awards</span>
        </button>

        <button 
          onClick={() => onNavigate('PROFILE')}
          className={`flex-1 flex flex-col items-center gap-1 active:opacity-70 transition-opacity ${getIconColor('PROFILE')}`}
        >
          <User size={26} strokeWidth={currentView === 'PROFILE' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
};
