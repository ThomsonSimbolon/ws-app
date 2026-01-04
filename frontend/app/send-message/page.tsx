'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDevices, fetchConnectedDevices } from '@/store/slices/userDashboardSlice';
import { sendMessage, sendMedia } from '@/lib/userService';
import { ApiError } from '@/lib/api';

type MessageMode = 'text' | 'media';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function SendMessageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { connectedDevices, isLoadingDevices } = useAppSelector((state) => state.userDashboard);

  const [mode, setMode] = useState<MessageMode>('text');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
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

    const deviceId = searchParams.get('deviceId');
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, user, router, dispatch, searchParams]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 16MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: images, videos, PDF, and Word documents';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDeviceId || !phone) {
      setError('Please select a device and enter a phone number');
      return;
    }

    if (mode === 'text' && !message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (mode === 'media' && !selectedFile) {
      setError('Please select a file to send');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);

    try {
      const phoneNumber = phone.replace(/\D/g, '');

      if (mode === 'text') {
        await sendMessage(selectedDeviceId, {
          phone: phoneNumber,
          message: message.trim(),
          type: 'text',
        });
      } else {
        let mediaType = 'document';
        if (selectedFile.type.startsWith('image/')) {
          mediaType = 'image';
        } else if (selectedFile.type.startsWith('video/')) {
          mediaType = 'video';
        }

        const formData = new FormData();
        formData.append('to', phoneNumber);
        formData.append('mediaType', mediaType);
        formData.append('file', selectedFile!);
        if (caption.trim()) {
          formData.append('caption', caption.trim());
        }

        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        await sendMedia(selectedDeviceId, formData);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
      }

      setSuccess(true);
      setMessage('');
      setCaption('');
      setPhone('');
      clearFile();
      
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress(0);
      }, 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted) return null;
  if (!user || user.role !== 'user') return null;

  const getFileTypeLabel = (file: File) => {
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.startsWith('video/')) return 'Video';
    if (file.type === 'application/pdf') return 'PDF';
    if (file.type.includes('word')) return 'Document';
    return 'File';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Send Message</h1>
        <p className="text-text-secondary">Send WhatsApp messages from your connected devices</p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-success-soft border border-success rounded-lg p-4">
          <p className="text-sm text-success">
            {mode === 'text' ? 'Message' : 'Media'} sent successfully!
          </p>
        </div>
      )}

      <Card padding="md">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Message Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                  mode === 'text'
                    ? 'bg-primary text-white'
                    : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMode('media')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                  mode === 'media'
                    ? 'bg-primary text-white'
                    : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                }`}
              >
                Media
              </button>
            </div>
          </div>

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

          {/* Text Mode - Message */}
          {mode === 'text' && (
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
          )}

          {/* Media Mode - File Upload */}
          {mode === 'media' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                
                {!selectedFile ? (
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-elevated transition-colors"
                  >
                    <svg
                      className="w-10 h-10 text-text-muted mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-text-secondary">Click to upload file</p>
                    <p className="text-xs text-text-muted mt-1">Max 16MB • Images, Videos, PDF, Word</p>
                  </label>
                ) : (
                  <div className="p-4 bg-elevated rounded-lg">
                    <div className="flex items-center gap-4">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-primary-soft rounded-lg flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{selectedFile.name}</p>
                        <p className="text-sm text-text-muted">
                          {getFileTypeLabel(selectedFile)} • {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="p-2 text-text-muted hover:text-danger transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Caption (Optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption to your media..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all resize-none"
                />
              </div>
            </>
          )}

          {/* Upload Progress */}
          {isSending && mode === 'media' && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-text-secondary mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-elevated rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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
              {isSending ? 'Sending...' : mode === 'text' ? 'Send Message' : 'Send Media'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

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

export default function SendMessagePage() {
  return (
    <UserLayout>
      <Suspense fallback={<SendMessageFallback />}>
        <SendMessageContent />
      </Suspense>
    </UserLayout>
  );
}
