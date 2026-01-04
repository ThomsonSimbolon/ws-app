import React, { useEffect, useState } from 'react';

interface ScheduleTimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ScheduleTimePicker({ value, onChange }: ScheduleTimePickerProps) {
  // Get local min datetime string (YYYY-MM-DDTHH:mm)
  const getMinDateTime = () => {
    const now = new Date();
    // No buffer - allow current time
    // now.setMinutes(now.getMinutes() + 0);
    
    // Format to local ISO string
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [minTime, setMinTime] = useState('');

  useEffect(() => {
    setMinTime(getMinDateTime());
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Schedule Time
      </label>
      <input
        type="datetime-local"
        value={value}
        min={minTime}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all [color-scheme:dark]"
        required
      />
      <p className="mt-1 text-xs text-text-secondary">
        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
