'use client';

import React from 'react';
import { AutoReplyRule } from '@/store/slices/botSlice';
import Card from '@/components/ui/Card';

interface AutoReplyPreviewProps {
  rules: AutoReplyRule[];
  isLoading: boolean;
}

export default function AutoReplyPreview({ rules, isLoading }: AutoReplyPreviewProps) {
  if (isLoading && rules.length === 0) {
    return (
      <Card padding="md">
        <div className="p-4 text-center text-text-muted">Loading rules...</div>
      </Card>
    );
  }

  if (rules.length === 0) {
    return (
      <Card padding="md">
        <div className="p-6 text-center text-text-muted">
          No active auto-reply rules configured for this device.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-text-primary px-1">Auto Reply Preview</h3>
      <div className="grid gap-3">
        {rules.map((rule) => (
          <div 
            key={rule.id} 
            className={`border rounded-lg p-4 bg-surface ${!rule.isActive ? 'opacity-60 grayscale' : 'border-border'}`}
          >
             <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-primary text-sm bg-elevated px-2 py-0.5 rounded">
                  {rule.name}
                </span>
                {!rule.isActive && (
                  <span className="text-[10px] uppercase font-bold text-text-muted border border-border px-1 rounded">
                    Inactive
                  </span>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <div className="text-xs text-text-muted uppercase mb-1">When user sends:</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase border ${
                        rule.matchType === 'exact' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        rule.matchType === 'contains' ? 'bg-green-50 text-green-700 border-green-200' :
                        rule.matchType === 'regex' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {rule.matchType}
                    </span>
                    <code className="text-sm font-mono bg-surface-ground px-2 py-0.5 rounded text-text-primary">
                      {rule.trigger}
                    </code>
                  </div>
               </div>

               <div>
                  <div className="text-xs text-text-muted uppercase mb-1">Bot replies:</div>
                  <div className="text-sm text-text-secondary bg-surface-ground p-2 rounded border border-border">
                    {rule.response}
                  </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
