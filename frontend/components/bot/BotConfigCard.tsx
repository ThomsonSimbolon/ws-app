'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useToast } from '@/context/ToastContext';
import { BotConfig, updateBotConfig } from '@/store/slices/botSlice';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface BotConfigCardProps {
  config: BotConfig | null;
  deviceId: string;
  error?: string | null;
}

export default function BotConfigCard({ config, deviceId, error }: BotConfigCardProps) {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const [isBusinessHoursOpen, setIsBusinessHoursOpen] = useState(false);
  
  // Local state for editing
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [offHoursMessage, setOffHoursMessage] = useState('');
  const [businessHours, setBusinessHours] = useState<any[]>([]);

  // Sync local state with props when config loads
  useEffect(() => {
    if (config) {
      setTimezone(config.timezone || 'Asia/Jakarta');
      setOffHoursMessage(config.offHoursMessage || 'Terima kasih telah menghubungi kami. Kami akan membalas pada jam kerja.');
      setBusinessHours(config.businessHours || []);
    }
  }, [config]);

  if (error) {
    return (
      <Card padding="lg">
        <div className="bg-danger-soft border border-danger p-4 rounded-lg text-danger">
          <h3 className="font-bold mb-2">Failed to load configuration</h3>
          <p>{error}</p>
          <div className="mt-4">
             <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
               Retry
             </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  const handleToggleBot = async () => {
    try {
      await dispatch(updateBotConfig({ 
        deviceId, 
        config: { botEnabled: !config.botEnabled } 
      })).unwrap();
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await dispatch(updateBotConfig({
        deviceId,
        config: {
          timezone,
          offHoursMessage,
          businessHours, // Now including businessHours in save
        }
      })).unwrap();
      addToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      addToast('Failed to save settings', 'error');
    }
  };

  // Helper to update schedule for a specific day
  const updateDaySchedule = (dayIndex: number, changes: any) => {
    let newSchedule = [...businessHours];
    const existingIndex = newSchedule.findIndex(s => s.day === dayIndex);

    if (existingIndex >= 0) {
      // Update existing day
      if (changes === null) {
        // Remove day (close)
        newSchedule.splice(existingIndex, 1);
      } else {
        // Modify times
        newSchedule[existingIndex] = { ...newSchedule[existingIndex], ...changes };
      }
    } else if (changes !== null) {
      // Add new day (open)
      newSchedule.push({ day: dayIndex, ...changes });
    }

    // Sort by day index
    newSchedule.sort((a, b) => a.day - b.day);
    setBusinessHours(newSchedule);
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Universal Toggle */}
      <Card padding="lg" className={config.botEnabled ? 'border-primary' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Auto Reply Bot</h2>
            <p className="text-sm text-text-muted">
              {config.botEnabled 
                ? 'Bot is active and responding to messages.' 
                : 'Bot is currently paused.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-medium ${
               config.botEnabled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
             }`}>
               {config.botEnabled ? 'ACTIVE' : 'PAUSED'}
             </div>
             <Button 
               variant={config.botEnabled ? 'danger' : 'primary'}
               onClick={handleToggleBot}
             >
               {config.botEnabled ? 'Disable Bot' : 'Enable Bot'}
             </Button>
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card padding="lg">
        <h3 className="text-md font-bold mb-4">General Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Timezone</label>
            <select 
              className="w-full p-2 border border-border rounded bg-surface text-text-primary"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              <option value="UTC">UTC</option>
            </select>
            <p className="text-xs text-text-muted mt-1">Affects business hours calculations.</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-text-secondary mb-1">Off-Hours Message</label>
             <textarea 
               className="w-full p-2 border border-border rounded bg-surface text-text-primary h-24 resize-none"
               value={offHoursMessage}
               onChange={(e) => setOffHoursMessage(e.target.value)}
             />
             <p className="text-xs text-text-muted mt-1">Sent when message received outside business hours (if enabled).</p>
          </div>
        </div>
      </Card>
      
      {/* Business Hours Editor */}
      <Card padding="lg">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-md font-bold">Business Hours</h3>
           <Button variant="ghost" size="sm" onClick={() => setIsBusinessHoursOpen(!isBusinessHoursOpen)}>
             {isBusinessHoursOpen ? 'Hide' : 'Edit Schedule'}
           </Button>
        </div>
        
        {isBusinessHoursOpen && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="border border-border rounded-lg overflow-hidden">
               <table className="w-full text-sm">
                 <thead className="bg-elevated text-text-secondary border-b border-border">
                   <tr>
                     <th className="p-3 text-left font-medium w-32">Day</th>
                     <th className="p-3 text-center font-medium w-20">Open</th>
                     <th className="p-3 text-left font-medium">Opening Time</th>
                     <th className="p-3 text-left font-medium">Closing Time</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border bg-surface">
                   {days.map((dayName, index) => {
                     const existingDay = businessHours.find(s => s.day === index);
                     const isOpen = !!existingDay;
                     
                     return (
                       <tr key={index} className={!isOpen ? 'bg-surface-ground text-text-muted' : ''}>
                         <td className="p-3 font-medium">{dayName}</td>
                         <td className="p-3 text-center">
                           <input 
                             type="checkbox"
                             checked={isOpen}
                             className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                             onChange={(e) => {
                               if (e.target.checked) {
                                  updateDaySchedule(index, { start: '09:00', end: '17:00' });
                               } else {
                                  updateDaySchedule(index, null);
                               }
                             }}
                           />
                         </td>
                         <td className="p-3">
                           <input 
                             type="time" 
                             disabled={!isOpen}
                             value={existingDay?.start || ''}
                             className={`border border-border rounded px-2 py-1 text-sm ${!isOpen ? 'bg-transparent text-transparent border-transparent' : 'bg-surface text-text-primary'}`}
                             onChange={(e) => updateDaySchedule(index, { start: e.target.value })}
                           />
                         </td>
                         <td className="p-3">
                            <input 
                             type="time" 
                             disabled={!isOpen}
                             value={existingDay?.end || ''}
                             className={`border border-border rounded px-2 py-1 text-sm ${!isOpen ? 'bg-transparent text-transparent border-transparent' : 'bg-surface text-text-primary'}`}
                             onChange={(e) => updateDaySchedule(index, { end: e.target.value })}
                           />
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
            <div className="flex justify-between items-center pt-2">
               <p className="text-xs text-text-muted">
                 Don't forget to save changes after modifying the schedule.
               </p>
               <Button variant="primary" onClick={handleSaveSettings}>
                 Save All Changes
               </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
