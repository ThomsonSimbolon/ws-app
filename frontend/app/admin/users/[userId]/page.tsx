'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppDispatch';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatsCard from '@/components/dashboard/StatsCard';
import Badge from '@/components/ui/Badge';
import DeleteUserModal from '@/components/admin/DeleteUserModal';
import DeviceForm from '@/components/admin/DeviceForm';
import UserInsightPanel from '@/components/admin/UserInsightPanel';
import { getUserDetails, deleteUser, createDevice } from '@/lib/adminService';
import { ApiError } from '@/lib/api';
import SkeletonCard from '@/components/ui/SkeletonCard';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  const userId = parseInt(params.userId as string);

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    hasActiveDevices: false,
    activeDeviceCount: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Device Modal
  const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'insights'>('details');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getUserDetails(userId);
        setUser(response.user);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch user details');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const handleDeleteClick = () => {
    if (user) {
      setDeleteModal({
        isOpen: true,
        hasActiveDevices: (user.stats?.connectedDevices || 0) > 0,
        activeDeviceCount: user.stats?.connectedDevices || 0,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await deleteUser(userId);
      router.push('/admin/users');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete user');
      setDeleteModal({ ...deleteModal, isOpen: false });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateDevice = async (data: { userId: number; deviceName?: string }) => {
    try {
      setIsCreatingDevice(true);
      await createDevice(data);
      setShowCreateDeviceModal(false);
      // Refresh user details to show new device
      const response = await getUserDetails(userId);
      setUser(response.user);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create device');
      throw err; // Re-throw to let form handle it
    } finally {
      setIsCreatingDevice(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !user) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/admin/users')}>
            Back to Users List
          </Button>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="text-center py-12">
            <p className="text-text-muted">User not found</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/users')}
              className="mt-4"
            >
              Back to Users List
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isOwnAccount = currentUser?.id === user.id;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/users')}
              className="mb-2"
            >
              ← Back to Users
            </Button>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {user.fullName || user.username}
            </h1>
            <p className="text-text-secondary">User details and statistics</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/users/${userId}/edit`)}
            >
              Edit User
            </Button>
            {!isOwnAccount && (
              <Button
                variant="danger"
                onClick={handleDeleteClick}
              >
                Delete User
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-elevated rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'details'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-secondary'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'insights'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-secondary'
            }`}
          >
            Insights
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'insights' ? (
          <UserInsightPanel userId={userId} />
        ) : (
          <>
        {/* User Information Card */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-text-muted">Username</label>
              <p className="text-text-primary mt-1">{user.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Email</label>
              <p className="text-text-primary mt-1">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Full Name</label>
              <p className="text-text-primary mt-1">{user.fullName || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Role</label>
              <div className="mt-1">
                <Badge variant={user.role === 'admin' ? 'info' : 'success'}>
                  {user.role}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Status</label>
              <div className="mt-1">
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Last Login</label>
              <p className="text-text-primary mt-1">{formatDate(user.lastLogin)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Created At</label>
              <p className="text-text-primary mt-1">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-muted">Updated At</label>
              <p className="text-text-primary mt-1">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            label="Total Devices"
            value={user.stats?.totalDevices || 0}
            change={`${user.stats?.connectedDevices || 0} connected`}
          />
          <StatsCard
            label="Connected Devices"
            value={user.stats?.connectedDevices || 0}
          />
          <StatsCard
            label="Total Messages"
            value={user.stats?.totalMessages || 0}
          />
        </div>

        {/* Devices List */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Devices</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateDeviceModal(true)}
            >
              + Add Device
            </Button>
          </div>
          {user.whatsappSessions && user.whatsappSessions.length > 0 ? (
            <div className="space-y-3">
              {user.whatsappSessions.map((device: any) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 bg-elevated rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{device.deviceName}</p>
                      <p className="text-xs text-text-muted">
                        {device.deviceId} {device.phoneNumber && `• ${device.phoneNumber}`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      device.status === 'connected'
                        ? 'success'
                        : device.status === 'connecting'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {device.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-muted mb-4">No devices found</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateDeviceModal(true)}
              >
                Add First Device
              </Button>
            </div>
          )}
        </Card>
          </>
        )}

        {/* Create Device Modal */}
        {showCreateDeviceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card padding="lg" className="max-w-md w-full mx-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-text-primary">Add Device for {user.fullName || user.username}</h2>
                  <button
                    onClick={() => setShowCreateDeviceModal(false)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <DeviceForm
                  userId={userId}
                  onSubmit={handleCreateDevice}
                  onCancel={() => setShowCreateDeviceModal(false)}
                  isLoading={isCreatingDevice}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Delete Modal */}
        <DeleteUserModal
          isOpen={deleteModal.isOpen}
          userName={user.fullName || user.username}
          hasActiveDevices={deleteModal.hasActiveDevices}
          activeDeviceCount={deleteModal.activeDeviceCount}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
}

