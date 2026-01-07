'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  AutoReplyRule
} from '@/store/slices/botSlice';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import RuleList from '@/components/bot/RuleList';
import RuleEditorModal from '@/components/bot/RuleEditorModal';
import { useToast } from '@/context/ToastContext';

export default function AdminDeviceRulesPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const deviceId = decodeURIComponent(params?.deviceId as string);
  const { addToast } = useToast();

  const { rules, loading } = useAppSelector((state) => state.bot);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

  useEffect(() => {
    if (deviceId) {
      dispatch(fetchRules(deviceId));
    }
  }, [dispatch, deviceId]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<AutoReplyRule>) => {
    try {
      if (editingRule) {
        await dispatch(updateRule({ deviceId, ruleId: editingRule.id, rule: ruleData })).unwrap();
        addToast('Rule updated successfully', 'success');
      } else {
        await dispatch(createRule({ deviceId, rule: ruleData })).unwrap();
        addToast('Rule created successfully', 'success');
      }
      setIsRuleModalOpen(false);
      dispatch(fetchRules(deviceId)); // Refresh
    } catch (error: any) {
      console.error('Failed to save rule:', error);
      // Re-throw so the modal interface knows it failed (and keeps open)
      throw error; 
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (confirm('Are you sure you want to delete this rule? This cannot be undone.')) {
      try {
        await dispatch(deleteRule({ deviceId, ruleId })).unwrap();
        addToast('Rule deleted successfully', 'success');
      } catch (error: any) {
        console.error('Failed to delete rule:', error);
        addToast(error?.message || 'Failed to delete rule', 'error');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <div className="flex-1">
             <h1 className="text-2xl font-bold text-text-primary">Rule Management</h1>
             <p className="text-text-muted text-sm">Managing rules for device: {deviceId}</p>
          </div>
          <Button variant="primary" onClick={handleCreateRule}>
            + New Rule
          </Button>
        </div>

        <div className="bg-surface rounded-lg">
          <RuleList 
             rules={rules}
             onEdit={handleEditRule}
             onDelete={handleDeleteRule}
             isLoading={loading.rules}
             readOnly={false}
          />
        </div>
      </div>

      <RuleEditorModal 
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSave={handleSaveRule}
        initialRule={editingRule}
      />
    </AdminLayout>
  );
}
