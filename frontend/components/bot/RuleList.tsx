'use client';

import React from 'react';
import { AutoReplyRule } from '@/store/slices/botSlice';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface RuleListProps {
  rules: AutoReplyRule[];
  onEdit?: (rule: AutoReplyRule) => void;
  onDelete?: (ruleId: number) => void;
  isLoading: boolean;
  readOnly?: boolean;
}

export default function RuleList({ rules, onEdit, onDelete, isLoading, readOnly = false }: RuleListProps) {
  if (isLoading && rules.length === 0) {
    return <div className="p-8 text-center text-text-muted">Loading rules...</div>;
  }

  if (rules.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-surface-ground">
        <p className="text-text-secondary font-medium mb-2">No rules found</p>
        <p className="text-sm text-text-muted">Create your first auto-reply rule to start automating responses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <Card key={rule.id} padding="md" className="group hover:border-primary transition-colors">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                 <span className="font-bold text-text-primary truncate">{rule.name}</span>
                 {!rule.isActive && (
                   <span className="bg-text-muted text-white text-[10px] px-1.5 py-0.5 rounded uppercase">Inactive</span>
                 )}
                 <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase border ${
                    rule.matchType === 'exact' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    rule.matchType === 'contains' ? 'bg-green-50 text-green-700 border-green-200' :
                    rule.matchType === 'regex' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                 }`}>
                   {rule.matchType}
                 </span>
                 <span className="text-xs text-text-muted bg-elevated px-2 py-0.5 rounded-full">
                   Priority: {rule.priority}
                 </span>
               </div>
               
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-xs text-text-muted uppercase tracking-wider">Trigger:</span>
                 <code className="text-sm bg-elevated px-2 py-0.5 rounded font-mono text-primary truncate max-w-[200px]">
                   {rule.trigger}
                 </code>
               </div>

               <div className="bg-surface-ground p-2 rounded text-sm text-text-secondary line-clamp-2 border border-border">
                 {rule.response}
               </div>
            </div>

            {!readOnly && (
              <div className="flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {onEdit && <Button size="sm" variant="outline" onClick={() => onEdit(rule)}>Edit</Button>}
                {onDelete && <Button size="sm" variant="danger" onClick={() => onDelete(rule.id)}>Delete</Button>}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
