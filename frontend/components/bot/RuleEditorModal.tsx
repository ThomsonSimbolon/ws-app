'use client';

import React, { useState, useEffect } from 'react';
import { AutoReplyRule } from '@/store/slices/botSlice';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Partial<AutoReplyRule>) => Promise<void>;
  initialRule: AutoReplyRule | null;
}

export default function RuleEditorModal({ isOpen, onClose, onSave, initialRule }: RuleEditorModalProps) {
  const [formData, setFormData] = useState<Partial<AutoReplyRule>>({
    name: '',
    trigger: '',
    matchType: 'contains',
    response: '',
    priority: 0,
    cooldownSeconds: 60,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialRule) {
        setFormData(initialRule);
      } else {
        // Reset for new rule
        setFormData({
          name: '',
          trigger: '',
          matchType: 'contains',
          response: '',
          priority: 0,
          cooldownSeconds: 60,
          isActive: true,
        });
      }
    }
  }, [isOpen, initialRule]);

  // useToast must be called before any early return (Rules of Hooks)
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side Regex Validation
    if (formData.matchType === 'regex' && formData.trigger) {
      try {
        new RegExp(formData.trigger);
      } catch (err) {
        addToast('Invalid Regex pattern', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose(); // Only close on success or let parent handle? The parent closes.
      // addToast handled by parent usually, but here it was here.
      // Wait, original code had onSave then addToast. 
      // I will keep original flow but strict validation first.
    } catch (error) {
      console.error('Failed to save rule:', error);
      // addToast('Failed to save rule. Please check inputs.', 'error'); // Let parent handle or keep?
      // Original code kept it.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-text-primary">
            {initialRule ? 'Edit Rule' : 'New Auto Reply Rule'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Rule Name</label>
            <input 
              type="text" 
              required
              className="w-full p-2 border border-border rounded bg-surface-ground text-text-primary"
              placeholder="e.g. Greeting, Price Info"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* Trigger & Match Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
               <label className="block text-sm font-medium text-text-secondary mb-1">Trigger Keywords</label>
               <input 
                 type="text"
                 required
                 className="w-full p-2 border border-border rounded bg-surface-ground text-text-primary"
                 placeholder={formData.matchType === 'regex' ? '^hello.*' : 'hello, hi'}
                 value={formData.trigger}
                 onChange={(e) => setFormData({...formData, trigger: e.target.value})}
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-text-secondary mb-1">Match Type</label>
               <select 
                 className="w-full p-2 border border-border rounded bg-surface-ground text-text-primary"
                 value={formData.matchType}
                 onChange={(e) => setFormData({...formData, matchType: e.target.value as any})}
               >
                 <option value="contains">Contains</option>
                 <option value="exact">Exact Match</option>
                 <option value="startsWith">Starts With</option>
                 <option value="regex">Regex</option>
               </select>
            </div>
          </div>

          {/* Response */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Response Message</label>
            <textarea 
              required
              className="w-full p-2 border border-border rounded bg-surface-ground text-text-primary h-32 resize-y"
              placeholder="Enter the automated reply..."
              value={formData.response}
              onChange={(e) => setFormData({...formData, response: e.target.value})}
            />
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4 bg-elevated p-3 rounded">
            <div>
               <label className="block text-xs font-medium text-text-secondary mb-1">Priority (Higher = First)</label>
               <input 
                 type="number"
                 className="w-full p-1 border border-border rounded bg-surface text-text-primary text-sm"
                 value={formData.priority}
                 onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
               />
            </div>
            <div>
               <label className="block text-xs font-medium text-text-secondary mb-1">Cooldown (Seconds)</label>
               <input 
                 type="number"
                 className="w-full p-1 border border-border rounded bg-surface text-text-primary text-sm"
                 value={formData.cooldownSeconds}
                 onChange={(e) => setFormData({...formData, cooldownSeconds: parseInt(e.target.value) || 0})}
               />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <input 
               type="checkbox"
               id="isActive"
               checked={formData.isActive}
               onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
             />
             <label htmlFor="isActive" className="text-sm text-text-primary">Enable this rule</label>
          </div>

        </form>

        <div className="p-4 border-t border-border bg-surface-ground flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit as any} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
