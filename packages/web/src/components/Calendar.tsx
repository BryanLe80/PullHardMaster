import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, addDays, parseISO } from 'date-fns';
import { Battery, Star } from 'lucide-react';

type Session = {
  id: string;
  date: string;
  location: string;
  energy_level: number;
  session_quality: number;
  climbs?: { id: string }[];
};

type CalendarProps = {
  sessions: Session[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
};

const getQualityColor = (quality: number, isDark: boolean = false): string => {
  if (isDark) {
    switch (quality) {
      case 1: return 'dark:bg-red-900/30 dark:text-red-200';
      case 2: return 'dark:bg-orange-900/30 dark:text-orange-200';
      case 3: return 'dark:bg-yellow-900/30 dark:text-yellow-200';
      case 4: return 'dark:bg-lime-900/30 dark:text-lime-200';
      case 5: return 'dark:bg-green-900/30 dark:text-green-200';
      default: return 'dark:bg-gray-800 dark:text-gray-200';
    }
  }
  switch (quality) {
    case 1: return 'bg-red-100 text-red-800';
    case 2: return 'bg-orange-100 text-orange-800';
    case 3: return 'bg-yellow-100 text-yellow-800';
    case 4: return 'bg-lime-100 text-lime-800';
    case 5: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function Calendar({ sessions, currentMonth, onMonthChange }: CalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const days = eachDayOfInterval({ start: startDate, end: monthEnd });

  // Add days to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    const lastDay = days[days.length - 1];
    for (let i = 1; i <= remainingDays; i++) {
      days.push(addDays(lastDay, i));
    }
  }

  const previousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          →
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const session = sessions.find(s => {
            return isSameDay(parseISO(s.date), day);
          });
          
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const lightQualityColor = session ? getQualityColor(session.session_quality, false) : '';
          const darkQualityColor = session ? getQualityColor(session.session_quality, true) : '';

          return (
            <div
              key={day.toISOString()}
              className={`
                h-24 p-2 border dark:border-gray-700 rounded-lg
                ${isCurrentMonth ? `${lightQualityColor} ${darkQualityColor}` : 'bg-gray-50 dark:bg-gray-800'}
                ${!isCurrentMonth && 'text-gray-400 dark:text-gray-600'}
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                relative
              `}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{format(day, 'd')}</span>
              {session && isCurrentMonth && (
                <div className="mt-1 space-y-1">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-200">{session.location}</div>
                  <div className="flex items-center space-x-1">
                    <Battery className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {session.energy_level}/5
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {session.session_quality}/5
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center space-x-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">Session Quality Scale:</div>
        {[1, 2, 3, 4, 5].map(quality => (
          <div key={quality} className="flex items-center">
            <div className={`w-4 h-4 rounded ${getQualityColor(quality, false)} ${getQualityColor(quality, true)} mr-1`} />
            <span className="text-xs text-gray-600 dark:text-gray-300">{quality}</span>
          </div>
        ))}
      </div>
    </div>
  );
}