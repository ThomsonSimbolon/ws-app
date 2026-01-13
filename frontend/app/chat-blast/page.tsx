'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RateLimitWarning from '@/components/jobs/RateLimitWarning';
import { get, post, ApiError } from '@/lib/api';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDevices, fetchConnectedDevices } from '@/store/slices/userDashboardSlice';

interface Contact {
  id: number;
  phoneNumber: string;
  name: string | null;
}

interface DeviceOption {
  deviceId: string;
  deviceName: string;
  status: string;
}

interface MessageItem {
  to: string;
  message: string;
}

export default function ChatBlastPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { connectedDevices } = useAppSelector((state) => state.userDashboard);

  // Form state
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [recipients, setRecipients] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [delay, setDelay] = useState<number>(3);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load devices on mount
  useEffect(() => {
    dispatch(fetchConnectedDevices());
  }, [dispatch]);

  // Auto-select first connected device
  useEffect(() => {
    if (connectedDevices.length > 0 && !selectedDevice) {
      setSelectedDevice(connectedDevices[0].deviceId);
    }
  }, [connectedDevices, selectedDevice]);

  const parseRecipients = (): string[] => {
    return recipients
      .split(/[\n,;]+/)
      .map((num) => num.trim())
      .filter((num) => num.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    const recipientList = parseRecipients();
    if (recipientList.length === 0) {
      setError('Please enter at least one recipient');
      return;
    }

    if (recipientList.length > 100) {
      setError('Maximum 100 recipients per job');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setIsLoading(true);

      // Build messages array
      const messages: MessageItem[] = recipientList.map((to) => ({
        to,
        message: message.trim(),
      }));

      // Create job
      const response = await post<{ jobId: string; status: string; total: number }>(
        `/whatsapp-multi-device/devices/${encodeURIComponent(selectedDevice)}/jobs/send-text`,
        {
          messages,
          delay,
        }
      );

      if (response.success && response.data) {
        setSuccess(`Job created! Sending to ${response.data.total} recipients. Job ID: ${response.data.jobId}`);
        // Clear form
        setRecipients('');
        setMessage('');
        // Redirect to jobs page after a short delay
        setTimeout(() => {
          router.push('/jobs');
        }, 2000);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create job');
    } finally {
      setIsLoading(false);
    }
  };

  const recipientCount = parseRecipients().length;

  return (
    <UserLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Chat Blast</h1>
            <p className="text-text-muted">Send bulk messages to multiple recipients</p>
          </div>
        </div>

        {/* Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Device Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Select Device
              </label>
              {connectedDevices.length === 0 ? (
                <div className="p-4 bg-warning-soft border border-warning rounded-lg">
                  <p className="text-sm text-warning">
                    No connected devices. Please connect a device first.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/devices')}
                  >
                    Go to Devices
                  </Button>
                </div>
              ) : (
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {connectedDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.deviceName || device.deviceId} ({device.phoneNumber || 'Unknown'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Recipients {recipientCount > 0 && <span className="text-primary">({recipientCount})</span>}
              </label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter phone numbers separated by commas, semicolons, or new lines&#10;&#10;Example: +6281234567890 081234567891 +6281234567892"
                rows={6}
                className="w-full px-4 py-3 bg-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
              />
              <p className="text-xs text-text-muted mt-1">
                Maximum 100 recipients per job. Supports formats: +62xxx, 62xxx, 08xxx
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
                className="w-full px-4 py-3 bg-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <p className="text-xs text-text-muted mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Delay */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Delay between messages: {delay} seconds
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={delay}
                onChange={(e) => setDelay(parseInt(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>1s (faster)</span>
                <span>10s (safer)</span>
              </div>
            </div>

            {/* Rate Limit Warning */}
            <RateLimitWarning recipientsCount={recipientCount} delaySeconds={delay} />

            {/* Error / Success */}
            {error && (
              <div className="p-4 bg-danger-soft border border-danger rounded-lg">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-success-soft border border-success rounded-lg">
                <p className="text-sm text-success">{success}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={isLoading || connectedDevices.length === 0}
              >
                {isLoading ? 'Creating Job...' : `Send to ${recipientCount} Recipients`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/jobs')}
              >
                View Jobs
              </Button>
            </div>
          </form>
        </Card>

        {/* Tips */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">💡 Tips</h3>
          <ul className="text-sm text-text-muted space-y-1">
            <li>• Use a delay of 3-5 seconds to avoid rate limiting</li>
            <li>• You can monitor job progress in the "My Jobs" page</li>
            <li>• Jobs can be cancelled while in progress</li>
            <li>• Failed messages can be retried</li>
          </ul>
        </Card>
      </div>
    </UserLayout>
  );
}
