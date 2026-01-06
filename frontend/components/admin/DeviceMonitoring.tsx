'use client';

import React, { useState, useEffect } from 'react';
import { getDevices, disconnectDevice, deleteDevice, Device, PaginationInfo, GetDevicesParams } from '@/lib/adminService';
import DeviceTable from './DeviceTable';
import DeviceFilters from './DeviceFilters';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DestructiveActionModal from './ui/DestructiveActionModal';
import DeviceHealthCard from './DeviceHealthCard';
import { useDestructiveAction } from '@/hooks/useDestructiveAction';

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

  // Local state for modal management
  const [actionType, setActionType] = useState<'disconnect' | 'delete' | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Health modal state
  const [healthDeviceId, setHealthDeviceId] = useState<string | null>(null);

  // Import Hook & Modal
  const { execute: executeDisconnect, isLoading: isDisconnecting } = useDestructiveAction<string>({
    action: disconnectDevice,
    onSuccess: () => {
      fetchDevices();
      setActionType(null);
      setSelectedDevice(null);
    },
    onError: (err: unknown) => {
        let msg = 'Failed to disconnect';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'object' && err !== null && 'message' in err) msg = String((err as Record<string, unknown>).message);
        alert(msg);
    },
    validate: (deviceId) => {
        // Find device and check status (Optimistic validation)
        const device = devices.find(d => d.deviceId === deviceId);
        if (device && device.status === 'disconnected') {
            return `Device ${device.deviceName} is already disconnected.`;
        }
        return null;
    }
  });

  const { execute: executeDelete, isLoading: isDeleting } = useDestructiveAction<string>({
    action: deleteDevice,
    onSuccess: () => {
      fetchDevices();
      setActionType(null);
      setSelectedDevice(null);
    },
    onError: (err: unknown) => {
        let msg = 'Failed to delete';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'object' && err !== null && 'message' in err) msg = String((err as Record<string, unknown>).message);
        alert(msg);
    },
    validate: (deviceId) => {
        const device = devices.find(d => d.deviceId === deviceId);
        // Enforce Disconnect before Delete rule
        if (device && device.status === 'connected') {
            return `Please disconnect ${device.deviceName} before deleting it.`;
        }
        return null;
    }
  });

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
    } catch (err: unknown) {
        let msg = 'Failed to fetch devices';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'object' && err !== null && 'message' in err) msg = String((err as Record<string, unknown>).message);
        setError(msg);
    } finally {
      setLoading(false);
    }
  };




  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, userIdFilter, isActiveFilter]);

  // Handle search with debounce
  useEffect(() => {
     const timer = setTimeout(() => {
         fetchDevices();
     }, 500);
     return () => clearTimeout(timer);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Handler replacements - Open Modals instead of confirm()
  const handleDisconnectClick = (deviceId: string) => {
    const device = devices.find(d => d.deviceId === deviceId);
    if (!device) return;
    setSelectedDevice(device);
    setActionType('disconnect');
  };

  const handleDeleteClick = (deviceId: string) => {
    const device = devices.find(d => d.deviceId === deviceId);
    if (!device) return;
    setSelectedDevice(device);
    setActionType('delete');
  };

  const handleViewHealth = (deviceId: string) => {
    setHealthDeviceId(deviceId);
  };

  const confirmAction = () => {
      if (!selectedDevice || !actionType) return;
      
      if (actionType === 'disconnect') {
          executeDisconnect(selectedDevice.deviceId);
      } else if (actionType === 'delete') {
          executeDelete(selectedDevice.deviceId);
      }
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setUserIdFilter('');
    setIsActiveFilter('');
    setSearchQuery('');
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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
          onDisconnect={handleDisconnectClick}
          onDelete={handleDeleteClick}
          onViewHealth={handleViewHealth}
        />
        
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

      {/* Destructive Action Modal */}
      <DestructiveActionModal
        isOpen={!!actionType}
        title={actionType === 'disconnect' ? 'Disconnect Device' : 'Delete Device Permanently'}
        targetId={selectedDevice ? `${selectedDevice.deviceName} (${selectedDevice.deviceId})` : ''}
        description={
            actionType === 'disconnect' 
            ? 'Are you sure you want to disconnect this device? The session will be terminated and the user will need to scan the QR code again.' 
            : 'This action cannot be undone. All session history and logs associated with this device will be permanently removed.'
        }
        confirmKeyword={actionType === 'delete' ? 'DELETE' : undefined}
        confirmText={actionType === 'disconnect' ? 'Disconnect' : 'Delete Device'}
        variant="danger"
        isLoading={isDisconnecting || isDeleting}
        onConfirm={confirmAction}
        onCancel={() => {
            setActionType(null);
            setSelectedDevice(null);
        }}
      />

      {/* Health Modal */}
      {healthDeviceId && (
        <DeviceHealthModal 
          deviceId={healthDeviceId}
          onClose={() => setHealthDeviceId(null)}
        />
      )}
    </div>
  );
}

// Helper component to fetch and display device health
function DeviceHealthModal({ deviceId, onClose }: { deviceId: string; onClose: () => void }) {
  const [health, setHealth] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { getDeviceHealth } = await import('@/lib/adminService');
        const data = await getDeviceHealth(deviceId);
        setHealth(data);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch health data');
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, [deviceId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <h3 className="text-lg font-semibold text-text-primary">Device Health</h3>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-danger">{error}</div>
          ) : health ? (
            <DeviceHealthCard 
              health={health}
              onRefresh={() => {
                setLoading(true);
                import('@/lib/adminService').then(({ getDeviceHealth }) => {
                  getDeviceHealth(deviceId).then(setHealth).finally(() => setLoading(false));
                });
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
