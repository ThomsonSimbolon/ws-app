'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  fetchBotConfig,
  fetchRules,
  fetchHandoffs,
  fetchLogs,
} from '@/store/slices/botSlice';
import UserLayout from '@/components/layout/UserLayout';
import Button from '@/components/ui/Button';
import BotConfigCard from '@/components/bot/BotConfigCard';
import RuleList from '@/components/bot/RuleList';
import HandoffManager from '@/components/bot/HandoffManager';
import BotLogsTable from '@/components/bot/BotLogsTable';

type Tab = 'config' | 'rules' | 'handoffs' | 'logs';

export default function BotManagementPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const deviceId = decodeURIComponent(params?.deviceId as string);

  const { config, rules, handoffs, logs, loading } = useAppSelector((state) => state.bot);
  const [activeTab, setActiveTab] = useState<Tab>('config');

  useEffect(() => {
    if (deviceId) {
      dispatch(fetchBotConfig(deviceId));
      dispatch(fetchRules(deviceId));
      dispatch(fetchHandoffs(deviceId));
      dispatch(fetchLogs({ deviceId, page: 1 }));
    }
  }, [dispatch, deviceId]);

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto space-y-6">
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
            <BotConfigCard config={config} deviceId={deviceId} />
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-text-primary">Active Rules</h2>
              </div>
              <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm mb-4">
                ℹ️ Rules are managed by administrators. You can view the active rules below.
              </div>
              <RuleList 
                rules={rules} 
                isLoading={loading.rules} 
                readOnly={true}
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
      </div>
    </UserLayout>
  );
}
