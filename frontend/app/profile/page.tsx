'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { getProfile, updateProfile, uploadProfilePhoto, Profile } from '@/lib/userService';
import { ApiError } from '@/lib/api';
import { updateUser } from '@/store/slices/authSlice';
import { Camera, User, Mail, Phone, FileText, Save, X } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');

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
      setPhoneNumber(response.user.phoneNumber || '');
      setBio(response.user.bio || '');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: Record<string, string | undefined> = {
        username,
        email,
        fullName: fullName || undefined,
        phoneNumber: phoneNumber || undefined,
        bio: bio || undefined,
      };

      const response = await updateProfile(updateData);
      setSuccess(true);
      
      // Update Redux state
      if (response.user) {
        dispatch(updateUser(response.user));
      }
      
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

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload an image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);

    try {
      const response = await uploadProfilePhoto(file);
      setProfile(response.user);
      
      // Update Redux state
      dispatch(updateUser(response.user));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getProfilePhotoUrl = () => {
    if (profile?.profilePhoto) {
      // If it's already an absolute URL, use it directly
      if (profile.profilePhoto.startsWith('http')) {
        return profile.profilePhoto;
      }
      // Otherwise, prepend the API base URL
      return `${API_BASE_URL}${profile.profilePhoto}`;
    }
    return null;
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <UserLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Profile</h1>
          <p className="text-text-secondary">Manage your profile information and settings</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4 flex items-center gap-2">
            <X className="w-5 h-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-success-soft border border-success rounded-lg p-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-success shrink-0" />
            <p className="text-sm text-success">Profile updated successfully!</p>
          </div>
        )}

        {isLoading ? (
          <Card padding="md">
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 rounded-full bg-elevated animate-pulse" />
                <div className="space-y-2">
                  <div className="animate-pulse h-6 w-40 bg-elevated rounded" />
                  <div className="animate-pulse h-4 w-32 bg-elevated rounded" />
                </div>
              </div>
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
            </div>
          </Card>
        ) : (
          <>
            {/* Profile Photo Section */}
            <Card padding="md">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Profile Photo</h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div 
                    className="w-24 h-24 rounded-full bg-elevated border-2 border-divider overflow-hidden cursor-pointer hover:border-primary transition-colors"
                    onClick={handlePhotoClick}
                  >
                    {getProfilePhotoUrl() ? (
                      <img 
                        src={getProfilePhotoUrl()!} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <User className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handlePhotoClick}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary hover:bg-primary-hover rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={isUploadingPhoto}
                  />
                </div>
                <div>
                  <p className="text-text-primary font-medium">{profile?.fullName || profile?.username}</p>
                  <p className="text-sm text-text-muted">{profile?.email}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {isUploadingPhoto ? 'Uploading...' : 'Click to change photo'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Profile Form */}
            <Card padding="md">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>

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
                      <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+62..."
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    />
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
            </Card>
          </>
        )}
      </div>
    </UserLayout>
  );
}
