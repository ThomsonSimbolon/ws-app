'use client';

import React, { useState, useEffect } from 'react';
import { getDevices, disconnectDevice, deleteDevice, Device, PaginationInfo, GetDevicesParams } from '@/lib/adminService';
import DeviceTable from './DeviceTable';
import DeviceFilters from './DeviceFilters';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function DeviceMonitoring() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<Exclude<GetDevicesParams['status'], undefined>>('');
  const [userIdFilter, setUserIdFilter] = useState<number | ''>('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await getDevices({
        page,
        limit: 20,
        status: statusFilter,
        userId: userIdFilter,
        isActive: isActiveFilter,
        search: searchQuery
      });
      setDevices(response.devices);
      setPagination(response.pagination);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [page, statusFilter, userIdFilter, isActiveFilter]);

  // Handle search with debounce could be added here, but for now we trigger on enter or via button if we had one
  useEffect(() => {
     // Simple debounce effect for search
     const timer = setTimeout(() => {
         fetchDevices();
     }, 500);
     return () => clearTimeout(timer);
  }, [searchQuery]);


  const handleDisconnect = async (deviceId: string) => {
    if (!confirm('Are you sure you want to disconnect this device? Session will be terminated.')) return;
    try {
      await disconnectDevice(deviceId);
      fetchDevices(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect device');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY DELETE this device? This action is irreversible.')) return;
    try {
      await deleteDevice(deviceId);
      fetchDevices(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleResetFilters = () => {
    setStatusFilter('');
    setUserIdFilter('');
    setIsActiveFilter('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">Device Monitoring</h2>
        <Button variant="secondary" size="sm" onClick={fetchDevices}>
          Refresh
        </Button>
      </div>

       <DeviceFilters
        status={statusFilter}
        onStatusChange={setStatusFilter}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        userId={userIdFilter}
        onUserIdChange={setUserIdFilter}
        isActive={isActiveFilter}
        onIsActiveChange={setIsActiveFilter}
        onReset={handleResetFilters}
      />

      {error && (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <DeviceTable 
          devices={devices}
          isLoading={loading}
          onDisconnect={handleDisconnect}
          onDelete={handleDelete}
        />
        
        {/* Pagination - Reuse or create shared pagination components later */}
         {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-divider">
            <div className="text-sm text-text-muted">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrev || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
