'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface DeleteUserModalProps {
  isOpen: boolean;
  userName: string;
  hasActiveDevices: boolean;
  activeDeviceCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function DeleteUserModal({
  isOpen,
  userName,
  hasActiveDevices,
  activeDeviceCount = 0,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />

      {/* Modal */}
      <Card className="relative z-10 max-w-md w-full" padding="lg">
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-danger-soft flex items-center justify-center">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Delete User
            </h3>
            <p className="text-text-secondary text-sm">
              Are you sure you want to delete <strong>{userName}</strong>?
            </p>
          </div>

          {/* Warning Messages */}
          {hasActiveDevices && (
            <div className="bg-warning-soft border border-warning rounded-lg p-3">
              <p className="text-sm text-warning">
                <strong>Warning:</strong> This user has {activeDeviceCount} active device(s).
                Please disconnect all devices before deleting the user.
              </p>
            </div>
          )}

          <div className="bg-danger-soft border border-danger rounded-lg p-3">
            <p className="text-sm text-danger">
              This action cannot be undone. All user data will be permanently deleted.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={isLoading || hasActiveDevices}
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
                  Deleting...
                </span>
              ) : (
                'Delete User'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

