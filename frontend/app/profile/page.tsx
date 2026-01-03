'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/hooks/useAppDispatch';
import { getProfile, updateProfile, Profile } from '@/lib/userService';
import { ApiError } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    loadProfile();
  }, [isAuthenticated, router]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getProfile();
      setProfile(response.user);
      setUsername(response.user.username);
      setEmail(response.user.email);
      setFullName(response.user.fullName || '');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: any = {
        username,
        email,
        fullName: fullName || undefined,
      };

      if (password) {
        updateData.password = password;
      }

      await updateProfile(updateData);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      
      // Reload profile
      await loadProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Profile</h1>
          <p className="text-text-secondary">Manage your profile information</p>
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
            <p className="text-sm text-success">Profile updated successfully!</p>
          </div>
        )}

        {/* Profile Form */}
        <Card padding="md">
          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Password Section */}
              <div className="pt-4 border-t border-divider">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Change Password</h3>
                <p className="text-sm text-text-muted mb-4">
                  Leave blank if you don't want to change your password
                </p>

                <div className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </UserLayout>
  );
}

