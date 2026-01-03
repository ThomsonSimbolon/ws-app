'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDevices, fetchConnectedDevices } from '@/store/slices/userDashboardSlice';
import { sendMessage, Device } from '@/lib/userService';
import { ApiError } from '@/lib/api';

// Component yang menggunakan useSearchParams - dipisahkan untuk Suspense boundary
function SendMessageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  // Use connectedDevices directly from Redux for accurate status
  const { devices, connectedDevices, isLoadingDevices } = useAppSelector((state) => state.userDashboard);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted on client side to prevent hydration mismatch
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

    // Fetch both devices and connected devices. Use connected devices for dropdown
    dispatch(fetchUserDevices());
    dispatch(fetchConnectedDevices());

    // Get deviceId from query params if available
    const deviceId = searchParams.get('deviceId');
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, user, router, dispatch, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDeviceId || !phone || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      await sendMessage(selectedDeviceId, {
        phone: phone.replace(/\D/g, ''),
        message: message.trim(),
        type: 'text',
      });

      setSuccess(true);
      setMessage('');
      setPhone('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Wait for mount to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!user || user.role !== 'user') {
    return null;
  }

  // connectedDevices now comes directly from Redux state (via fetchConnectedDevices)
  // which has real-time status from the backend

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Send Message</h1>
          <p className="text-text-secondary">Send WhatsApp messages from your connected devices</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-success-soft border border-success rounded-lg p-4">
            <p className="text-sm text-success">Message sent successfully!</p>
          </div>
        )}

        {/* Form */}
        <Card padding="md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Device Selector */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Select Device
              </label>
              {isLoadingDevices ? (
                <div className="animate-pulse h-10 bg-elevated rounded-lg" />
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

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="e.g., 6281234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-text-muted mt-1">
                Enter phone number with country code (without +)
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !selectedDeviceId || connectedDevices.length === 0}
              >
                {isSending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>
        </Card>
    </div>
  );
}

// Fallback component untuk Suspense
function SendMessageFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Send Message</h1>
        <p className="text-text-secondary">Send WhatsApp messages from your connected devices</p>
      </div>
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-elevated rounded-lg" />
          <div className="h-10 bg-elevated rounded-lg" />
          <div className="h-32 bg-elevated rounded-lg" />
        </div>
      </Card>
    </div>
  );
}

// Main page component dengan Suspense boundary
export default function SendMessagePage() {
  return (
    <UserLayout>
      <Suspense fallback={<SendMessageFallback />}>
        <SendMessageContent />
      </Suspense>
    </UserLayout>
  );
}

