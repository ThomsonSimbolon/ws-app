'use client';

import React, { useState } from 'react';
import DestructiveActionModal from './DestructiveActionModal';
import { useDestructiveAction } from '@/hooks/useDestructiveAction';
import Button from '@/components/ui/Button';

/**
 * Example Component: Safe Device Deletion
 * 
 * Demonstrates:
 * 1. Initializing useDestructiveAction with an async handler
 * 2. Using validation to block actions on invalid state
 * 3. Coupling the Modal with the Hook's loading/execute state
 */
export default function DestructiveActionExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mockDevice, setMockDevice] = useState({
    id: 'dev-12345',
    name: 'iPhone 13 Pro',
    status: 'connected', // Intentionally 'connected' to show validation
  });

  // 1. Mock Async Action (Simulates API call)
  const mockDeleteApi = async (deviceId: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random success/failure
        if (Math.random() > 0.5) {
          console.log(`Deleted device ${deviceId}`);
          resolve(true);
        } else {
          // Simulate 409 Conflict
          reject({ status: 409, message: 'Device is active elsewhere' });
        }
      }, 2000);
    });
  };

  // 2. Initialize Hook
  const { execute, isLoading, error } = useDestructiveAction<string>({
    action: mockDeleteApi,
    // VALIDATION: Block delete if connected
    validate: () => {
      if (mockDevice.status === 'connected') {
        return 'Cannot delete a connected device. Please disconnect it first.';
      }
      return null;
    },
    onSuccess: () => {
      alert('Success! Device deleted.');
      setIsModalOpen(false);
    },
  });

  // 3. Handler wrapper
  const handleConfirm = () => {
    execute(mockDevice.id);
  };

  return (
    <div className="p-8 space-y-4 border rounded-lg bg-white">
      <h2 className="text-xl font-bold">Security Hardening Example</h2>
      
      {/* Control Panel */}
      <div className="flex gap-4 items-center">
         <div>
            <p className="text-sm text-gray-600">Device Status: <strong>{mockDevice.status}</strong></p>
            <button 
                onClick={() => setMockDevice(p => ({...p, status: p.status === 'connected' ? 'disconnected' : 'connected'}))}
                className="text-xs text-blue-600 underline"
            >
                Toggle Status
            </button>
         </div>
      </div>

      {/* Trigger Button */}
      <Button 
        variant="danger" 
        onClick={() => setIsModalOpen(true)}
      >
        Delete Device
      </Button>

      {/* Error Feedback (from Hook) */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
          ❌ {error}
        </div>
      )}

      {/* 4. The Modal */}
      <DestructiveActionModal
        isOpen={isModalOpen}
        title="Delete Device Permanently"
        targetId={`${mockDevice.name} (${mockDevice.id})`}
        description="This action cannot be undone. All session data will be wiped."
        confirmKeyword="DELETE" // High Risk Action -> Requires typing
        isLoading={isLoading} // Hook controls loading state
        onConfirm={handleConfirm}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}
