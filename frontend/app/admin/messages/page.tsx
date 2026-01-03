'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MessageTable from '@/components/admin/MessageTable';
import MessageFilters from '@/components/admin/MessageFilters';
import MessageDetailModal from '@/components/admin/MessageDetailModal';
import { getMessages, GetMessagesParams, Message } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function MessagesListPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [fromNumber, setFromNumber] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [deviceId, setDeviceId] = useState<string | ''>('');
  const [direction, setDirection] = useState<'incoming' | 'outgoing' | ''>('');
  const [status, setStatus] = useState<'pending' | 'sent' | 'delivered' | 'read' | 'failed' | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetMessagesParams = {
        page,
        limit: 50,
        fromNumber: fromNumber || undefined,
        toNumber: toNumber || undefined,
        userId: userId || undefined,
        deviceId: deviceId || undefined,
        direction: direction || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const response = await getMessages(params);
      setMessages(response.messages);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [fromNumber, toNumber, userId, deviceId, direction, status, startDate, endDate]);

  // Initial load
  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [fromNumber, toNumber, userId, deviceId, direction, status, startDate, endDate]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchMessages(page);
  };

  const handleResetFilters = () => {
    setFromNumber('');
    setToNumber('');
    setUserId('');
    setDeviceId('');
    setDirection('');
    setStatus('');
    setStartDate('');
    setEndDate('');
  };

  const handleViewDetail = (message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Message Management</h1>
          <p className="text-text-secondary">Monitor and search all WhatsApp messages</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <MessageFilters
          fromNumber={fromNumber}
          toNumber={toNumber}
          userId={userId}
          deviceId={deviceId}
          direction={direction}
          status={status}
          startDate={startDate}
          endDate={endDate}
          onFromNumberChange={setFromNumber}
          onToNumberChange={setToNumber}
          onUserIdChange={setUserId}
          onDeviceIdChange={setDeviceId}
          onDirectionChange={setDirection}
          onStatusChange={setStatus}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onReset={handleResetFilters}
        />

        {/* Messages Table */}
        <Card padding="md">
          <MessageTable
            messages={messages}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
          />
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalMessages} total messages)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Message Detail Modal */}
        <MessageDetailModal
          isOpen={isModalOpen}
          message={selectedMessage}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMessage(null);
          }}
        />
      </div>
    </AdminLayout>
  );
}

