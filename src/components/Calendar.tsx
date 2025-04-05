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

const getQualityColor = (quality: number): string => {
  switch (quality) {
    case 1: return 'bg-red-100';
    case 2: return 'bg-orange-100';
    case 3: return 'bg-yellow-100';
    case 4: return 'bg-lime-100';
    case 5: return 'bg-green-100';
    default: return '';
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 rounded hover:bg-gray-100"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-100"
        >
          →
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const session = sessions.find(s => {
            // Parse the session date string to a Date object for comparison
            return isSameDay(parseISO(s.date), day);
          });
          
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const qualityColor = session ? getQualityColor(session.session_quality) : '';

          return (
            <div
              key={day.toISOString()}
              className={`
                h-24 p-2 border rounded-lg
                ${isCurrentMonth ? qualityColor : 'bg-gray-50'}
                ${!isCurrentMonth && 'text-gray-400'}
                hover:bg-gray-50 transition-colors
                relative
              `}
            >
              <span className="text-sm font-medium">{format(day, 'd')}</span>
              {session && isCurrentMonth && (
                <div className="mt-1 space-y-1">
                  <div className="text-xs font-semibold">{session.location}</div>
                  <div className="flex items-center space-x-1">
                    <Battery className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {session.energy_level}/5
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
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
        <div className="text-sm">Session Quality Scale:</div>
        {[1, 2, 3, 4, 5].map(quality => (
          <div key={quality} className="flex items-center">
            <div className={`w-4 h-4 rounded ${getQualityColor(quality)} mr-1`} />
            <span className="text-xs">{quality}</span>
          </div>
        ))}
      </div>
    </div>
  );
}