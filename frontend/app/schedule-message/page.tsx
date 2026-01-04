'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDevices, fetchConnectedDevices } from '@/store/slices/userDashboardSlice';
import { scheduleMessage, normalizePhoneNumber, parsePhoneNumbers } from '@/lib/userService';
import { ApiError } from '@/lib/api';
import TargetNumbersInput from '@/components/scheduler/TargetNumbersInput';
import ScheduleTimePicker from '@/components/scheduler/ScheduleTimePicker';
import ExecutionProgress from '@/components/scheduler/ExecutionProgress';
import ResultsSummary from '@/components/scheduler/ResultsSummary';
import ScheduledMessageHistory from '@/components/scheduler/ScheduledMessageHistory';

function ScheduleMessageContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { connectedDevices, isLoadingDevices, devicesError } = useAppSelector(
    (state) => state.userDashboard
  );

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [refreshHistory, setRefreshHistory] = useState(0);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [targets, setTargets] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [results, setResults] = useState<any[]>([]); // Using any for simplicity in results passing
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'user') {
      router.push('/dashboard');
      return;
    }

    dispatch(fetchUserDevices());
    dispatch(fetchConnectedDevices());
  }, [mounted, isAuthenticated, user, router, dispatch]);

  // Auto-select first device if available and none selected
  useEffect(() => {
    if (connectedDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(connectedDevices[0].deviceId);
    }
  }, [connectedDevices, selectedDeviceId]);

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) {
      setError('Please select a device');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }
    if (!scheduleDate) {
      setError('Please select a schedule time');
      return;
    }

    const { valid, invalid } = parsePhoneNumbers(phoneInput);
    if (valid.length === 0) {
      setError('Please enter at least one valid phone number');
      return;
    }

    if (invalid.length > 0) {
      // Optional: warn about invalid numbers but proceed with valid ones
      // For now, let's strictly require all to be clean or just ignore invalid
    }

    setTargets(valid);
    setError(null);
    setShowConfirm(true); // Proceed to confirmation/execution flow
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsProcessing(true);
    setProgress({ current: 0, total: targets.length, success: 0, failed: 0 });
    setResults([]);

    const resultsList = [];
    let successCount = 0;
    let failedCount = 0;

    // Process sequentially to avoid overwhelming the server/device
    for (let i = 0; i < targets.length; i++) {
        const phone = targets[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));

        try {
            await scheduleMessage(selectedDeviceId, {
                to: phone,
                message: message.trim(),
                scheduleTime: new Date(scheduleDate).toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            successCount++;
            resultsList.push({ phone, success: true });
        } catch (err: any) {
            failedCount++;
            resultsList.push({ phone, success: false, error: err.message || 'Failed' });
        }
        
        setProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));
    }

    setResults(resultsList);
    setIsProcessing(false);
    
    if (successCount > 0) {
        setSuccess(true);
        // Clear form
        setPhoneInput('');
        setMessage('');
        setScheduleDate('');
        
        setRefreshHistory(prev => prev + 1); // Trigger history refresh
        
        // Switch to history tab if all successful, or just show summary
        setTimeout(() => {
             setSuccess(false);
             setActiveTab('history');
        }, 2000);
    }
  };

  if (!mounted) return null;
  if (!user || user.role !== 'user') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Schedule Message
        </h1>
        <p className="text-text-secondary">
          Schedule WhatsApp messages for automatic delivery
        </p>
      </div>

       {/* Tabs */}
       <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          New Schedule
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          History
        </button>
      </div>

      {/* Device Selector */}
      <Card padding="md">
        <div className="mb-0">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Select Device
          </label>
           {isLoadingDevices ? (
            <div className="animate-pulse h-10 bg-elevated rounded-lg" />
          ) : devicesError ? (
            <div className="p-4 bg-danger-soft border border-danger rounded-lg">
              <p className="text-sm text-danger">
                Failed to load devices: {devicesError}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => dispatch(fetchConnectedDevices())}
              >
                Retry
              </Button>
            </div>
          ) : connectedDevices.length === 0 ? (
            <div className="p-4 bg-warning-soft border border-warning rounded-lg">
              <p className="text-sm text-warning">
                No connected devices available. Please connect a device first.
              </p>
            </div>
          ) : (
             <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
                  required
                >
                  <option value="">Select a device</option>
                  {connectedDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.deviceName} {device.phoneNumber ? `(${device.phoneNumber})` : ''}
                    </option>
                  ))}
                </select>
          )}
        </div>
      </Card>

      {activeTab === 'schedule' ? (
          <>
            {isProcessing ? (
                <ExecutionProgress 
                    current={progress.current}
                    total={progress.total}
                    success={progress.success}
                    failed={progress.failed}
                    isComplete={progress.current === progress.total}
                />
            ) : results.length > 0 ? (
                <ResultsSummary 
                    results={results}
                    onReset={() => setResults([])}
                />
            ) : (
                <Card padding="md">
                    {/* Warning about persistence REMOVED as requested (now persistent) */}
                    
                    {error && (
                        <div className="bg-danger-soft border border-danger rounded-lg p-4 mb-4">
                        <p className="text-sm text-danger">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="bg-success-soft border border-success rounded-lg p-4 mb-4">
                        <p className="text-sm text-success">Messages scheduled successfully!</p>
                        </div>
                    )}

                    <form onSubmit={handleValidate} className="space-y-6">
                        <TargetNumbersInput 
                            value={phoneInput}
                            onChange={setPhoneInput}
                        />

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message here..."
                                rows={4}
                                className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all resize-none"
                                required
                            />
                        </div>

                        <ScheduleTimePicker 
                            value={scheduleDate}
                            onChange={setScheduleDate}
                        />

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                            type="submit"
                            variant="primary"
                            disabled={!selectedDeviceId || connectedDevices.length === 0}
                            >
                            Review Schedule
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Confirmation Dialog would typically be a Modal, simulating here for simplicity */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-card border border-border shadow-xl">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-text-primary mb-4">Confirm Schedule</h3>
                            <div className="space-y-4 text-sm text-text-secondary">
                                <p>You are about to schedule a message to <strong>{targets.length} recipients</strong>.</p>
                                <div className="p-3 bg-elevated rounded-lg">
                                    <p className="font-medium text-text-primary mb-1">Time:</p>
                                    <p>{new Date(scheduleDate).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-elevated rounded-lg">
                                    <p className="font-medium text-text-primary mb-1">Message:</p>
                                    <p className="line-clamp-3 italic">{message}</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleConfirm}>Confirm & Schedule</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
          </>
      ) : (
          <Card padding="md">
              <ScheduledMessageHistory 
                  deviceId={selectedDeviceId} 
                  refreshTrigger={refreshHistory} 
              />
          </Card>
      )}

    </div>
  );
}

function ScheduleMessageFallback() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-48 bg-elevated rounded-lg" />
        <div className="h-4 w-64 bg-elevated rounded-lg" />
        <div className="h-64 bg-elevated rounded-lg" />
      </div>
    </div>
  );
}

export default function ScheduleMessagePage() {
  return (
    <UserLayout>
      <Suspense fallback={<ScheduleMessageFallback />}>
        <ScheduleMessageContent />
      </Suspense>
    </UserLayout>
  );
}
