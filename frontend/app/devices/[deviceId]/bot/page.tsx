'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  fetchBotConfig,
  fetchRules,
  fetchHandoffs,
  fetchLogs,
  createRule,
  updateRule,
  deleteRule,
  AutoReplyRule,
} from '@/store/slices/botSlice';
import UserLayout from '@/components/layout/UserLayout';
import Button from '@/components/ui/Button';
import BotConfigCard from '@/components/bot/BotConfigCard';
import BotStatsCard from '@/components/bot/BotStatsCard';
import RuleList from '@/components/bot/RuleList';
import RuleEditorModal from '@/components/bot/RuleEditorModal';
import HandoffManager from '@/components/bot/HandoffManager';
import BotLogsTable from '@/components/bot/BotLogsTable';

type Tab = 'config' | 'rules' | 'handoffs' | 'logs';

export default function BotManagementPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const deviceId = decodeURIComponent(params?.deviceId as string);

  const { config, rules, handoffs, logs, loading, error: configError } = useAppSelector((state) => state.bot);
  const [activeTab, setActiveTab] = useState<Tab>('config');

  // Rule editor state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

  useEffect(() => {
    if (deviceId) {
      dispatch(fetchBotConfig(deviceId));
      dispatch(fetchRules(deviceId));
      dispatch(fetchHandoffs(deviceId));
      dispatch(fetchLogs({ deviceId, page: 1 }));
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

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    await dispatch(deleteRule({ deviceId, ruleId }));
  };

  const handleSaveRule = async (ruleData: Partial<AutoReplyRule>) => {
    if (editingRule) {
      await dispatch(updateRule({ deviceId, ruleId: editingRule.id, rule: ruleData }));
    } else {
      await dispatch(createRule({ deviceId, rule: ruleData }));
    }
    setIsRuleModalOpen(false);
    setEditingRule(null);
  };

  return (
    <UserLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back to Device
          </Button>
          <div className="flex-1">
             <h1 className="text-2xl font-bold text-text-primary">Bot Management</h1>
             <p className="text-text-muted text-sm">{deviceId}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border space-x-6">
          {(['config', 'rules', 'handoffs', 'logs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'config' ? 'Configuration' : tab}
              {tab === 'handoffs' && handoffs.length > 0 && (
                <span className="ml-2 bg-warning text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {handoffs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'config' && (
            <>
              <BotConfigCard config={config} deviceId={deviceId} error={configError} />
              <BotStatsCard deviceId={deviceId} />
            </>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-text-primary">Auto-Reply Rules</h2>
                 <Button variant="primary" size="sm" onClick={handleCreateRule}>
                   + New Rule
                 </Button>
              </div>
              <RuleList 
                rules={rules} 
                isLoading={loading.rules} 
                readOnly={false}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
              />
            </div>
          )}

          {activeTab === 'handoffs' && (
            <HandoffManager 
              deviceId={deviceId} 
              handoffs={handoffs} 
              isLoading={loading.handoffs} 
            />
          )}

          {activeTab === 'logs' && (
            <BotLogsTable 
              logs={logs} 
              deviceId={deviceId} 
              isLoading={loading.logs} 
            />
          )}
        </div>

        {/* Rule Editor Modal */}
        <RuleEditorModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setEditingRule(null);
          }}
          onSave={handleSaveRule}
          initialRule={editingRule}
        />
      </div>
    </UserLayout>
  );
}
