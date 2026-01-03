'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DeviceTable from '@/components/admin/DeviceTable';
import DeviceFilters from '@/components/admin/DeviceFilters';
import DeviceForm from '@/components/admin/DeviceForm';
import { getDevices, createDevice, GetDevicesParams } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function DevicesListPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDevices: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'qr_required' | ''>('');
  const [isActive, setIsActive] = useState<boolean | ''>('');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Device Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch devices
  const fetchDevices = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetDevicesParams = {
        page,
        limit: 20,
        search: search || undefined,
        userId: userId || undefined,
        status: status || undefined,
        isActive: isActive !== '' ? isActive : undefined,
      };

      const response = await getDevices(params);
      setDevices(response.devices);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  }, [search, userId, status, isActive]);

  // Initial load
  useEffect(() => {
    fetchDevices(1);
  }, [fetchDevices]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDevices(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, userId, status, isActive]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchDevices(page);
  };

  const handleResetFilters = () => {
    setSearch('');
    setUserId('');
    setStatus('');
    setIsActive('');
  };

  const handleCreateDevice = async (data: { userId: number; deviceName?: string }) => {
    try {
      setIsCreating(true);
      await createDevice(data);
      setShowCreateModal(false);
      // Refresh devices list
      fetchDevices(pagination.currentPage);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create device');
      throw err; // Re-throw to let form handle it
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Device Management</h1>
            <p className="text-text-secondary">Monitor and manage all WhatsApp devices</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Add Device
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <DeviceFilters
          search={search}
          userId={userId}
          status={status}
          isActive={isActive}
          onSearchChange={setSearch}
          onUserIdChange={setUserId}
          onStatusChange={setStatus}
          onIsActiveChange={setIsActive}
          onReset={handleResetFilters}
        />

        {/* Devices Table */}
        <Card padding="md">
          <DeviceTable
            devices={devices}
            isLoading={isLoading}
          />
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalDevices} total devices)
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

        {/* Create Device Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card padding="lg" className="max-w-md w-full mx-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-text-primary">Create New Device</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <DeviceForm
                  onSubmit={handleCreateDevice}
                  onCancel={() => setShowCreateModal(false)}
                  isLoading={isCreating}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

