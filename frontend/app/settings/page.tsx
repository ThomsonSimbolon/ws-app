'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import AdminLayout from '@/components/layout/AdminLayout';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { updateProfile } from '@/lib/userService';
import { ApiError } from '@/lib/api';
import { Lock, Shield, Bell, AlertTriangle, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isHydrated = useAppSelector((state) => state.auth.isHydrated);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateProfile({ password: newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setPasswordError(apiError.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const Layout = user.role === 'admin' ? AdminLayout : UserLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your account security and preferences</p>
        </div>

        {/* Change Password Section */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Change Password</h2>
              <p className="text-sm text-text-muted">Update your password to keep your account secure</p>
            </div>
          </div>

          {/* Password Error */}
          {passwordError && (
            <div className="bg-danger-soft border border-danger rounded-lg p-4 flex items-center gap-2 mb-4">
              <X className="w-5 h-5 text-danger shrink-0" />
              <p className="text-sm text-danger">{passwordError}</p>
            </div>
          )}

          {/* Password Success */}
          {passwordSuccess && (
            <div className="bg-success-soft border border-success rounded-lg p-4 flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-success shrink-0" />
              <p className="text-sm text-success">Password changed successfully!</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Security Settings */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Security</h2>
              <p className="text-sm text-text-muted">Manage your security settings</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-divider">
              <div>
                <p className="text-text-primary font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-text-muted">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-divider">
              <div>
                <p className="text-text-primary font-medium">Login History</p>
                <p className="text-sm text-text-muted">View all active sessions</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Notifications</h2>
              <p className="text-sm text-text-muted">Manage how you receive notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            {['Email Notifications', 'Push Notifications', 'SMS Alerts', 'Weekly Reports'].map((setting) => (
              <label key={setting} className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-text-secondary">{setting}</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  defaultChecked
                />
              </label>
            ))}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-danger">Danger Zone</h2>
              <p className="text-sm text-text-muted">Irreversible and destructive actions</p>
            </div>
          </div>

          <div className="border border-danger/30 rounded-lg p-4 bg-danger/5">
            <p className="text-text-muted text-sm mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="danger" disabled>
              Delete Account
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
