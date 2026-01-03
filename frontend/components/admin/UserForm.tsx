'use client';

import React, { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { CreateUserRequest, UpdateUserRequest } from '@/lib/adminService';

interface UserFormProps {
  initialData?: {
    username?: string;
    email?: string;
    fullName?: string;
    role?: 'admin' | 'user';
    isActive?: boolean;
  };
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  currentUserId?: number;
}

export default function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
  currentUserId,
}: UserFormProps) {
  const [formData, setFormData] = useState({
    username: initialData?.username || '',
    email: initialData?.email || '',
    password: '',
    fullName: initialData?.fullName || '',
    role: initialData?.role || ('user' as 'admin' | 'user'),
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      errors.username = 'Username must be alphanumeric';
    } else if (formData.username.length < 3 || formData.username.length > 30) {
      errors.username = 'Username must be between 3 and 30 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation (required for create, optional for edit)
    if (!isEdit && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 2 || formData.fullName.length > 100) {
      errors.fullName = 'Full name must be between 2 and 100 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateUserRequest | UpdateUserRequest = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        role: formData.role,
        isActive: formData.isActive,
      };

      // Only include password if provided (for edit) or required (for create)
      if (!isEdit || formData.password) {
        (submitData as any).password = formData.password;
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isOwnAccount = currentUserId && initialData && 'id' in initialData && (initialData as any).id === currentUserId;

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username */}
        <Input
          type="text"
          name="username"
          label="Username"
          placeholder="Enter username"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={formErrors.username}
          required
          disabled={isLoading}
        />

        {/* Email */}
        <Input
          type="email"
          name="email"
          label="Email"
          placeholder="Enter email address"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={formErrors.email}
          required
          disabled={isLoading}
        />

        {/* Password */}
        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            label={isEdit ? 'Password (leave empty to keep current)' : 'Password'}
            placeholder={isEdit ? 'Enter new password (optional)' : 'Enter password'}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={formErrors.password}
            required={!isEdit}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="mt-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            {showPassword ? 'Hide' : 'Show'} password
          </button>
        </div>

        {/* Full Name */}
        <Input
          type="text"
          name="fullName"
          label="Full Name"
          placeholder="Enter full name"
          value={formData.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          error={formErrors.fullName}
          required
          disabled={isLoading}
        />

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Role
            {isOwnAccount && (
              <span className="text-xs text-text-muted ml-2">(Cannot change your own role)</span>
            )}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="user"
                checked={formData.role === 'user'}
                onChange={(e) => handleChange('role', e.target.value)}
                disabled={isLoading || isOwnAccount}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-text-primary">User</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={(e) => handleChange('role', e.target.value)}
                disabled={isLoading || isOwnAccount}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-text-primary">Admin</span>
            </label>
          </div>
        </div>

        {/* Is Active */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              disabled={isLoading || isOwnAccount}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <span className="text-text-primary">
              Active
              {isOwnAccount && (
                <span className="text-xs text-text-muted ml-2">(Cannot deactivate your own account)</span>
              )}
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {isEdit ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              isEdit ? 'Update User' : 'Create User'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

