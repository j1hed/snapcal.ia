
import React, { useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const WeekCalendar: React.FC<WeekCalendarProps> = ({ selectedDate, onSelectDate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate an array of dates (e.g., last 14 days + next 2 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    // Show 14 days into the past and 2 days into the future
    for (let i = -14; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dates = generateDates();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return formatDate(date) === selectedDate;
  };

  // Auto-scroll to selected date on mount
  useEffect(() => {
    if (scrollRef.current) {
        // Simple logic to scroll to the end (today) initially
        // In a real app, we'd calculate the exact offset of the selected element
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  return (
    <div className="w-full bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-gray-800 transition-colors duration-500">
      <div className="flex justify-between items-center px-5 pt-4 pb-2">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon size={16} className="text-[#007AFF]" />
          <span>History</span>
        </h2>
        
        {/* Helper to jump back to today if we are far away */}
        {selectedDate !== formatDate(new Date()) && (
            <button 
                onClick={() => onSelectDate(formatDate(new Date()))}
                className="text-xs font-semibold text-[#007AFF]"
            >
                Jump to Today
            </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar px-4 pb-4 gap-2 snap-x"
      >
        {dates.map((date, index) => {
            const selected = isSelected(date);
            const today = isToday(date);
            
            return (
                <button
                    key={index}
                    onClick={() => onSelectDate(formatDate(date))}
                    className={`
                        flex flex-col items-center justify-center min-w-[50px] h-[70px] rounded-2xl transition-all duration-200 snap-center
                        ${selected 
                            ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 scale-105' 
                            : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }
                    `}
                >
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${selected ? 'text-blue-100' : ''}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <div className={`
                        w-8 h-8 flex items-center justify-center rounded-full text-lg font-semibold
                        ${today && !selected ? 'bg-gray-100 dark:bg-gray-700 text-[#007AFF]' : ''}
                    `}>
                        {date.getDate()}
                    </div>
                </button>
            );
        })}
      </div>
    </div>
  );
};
