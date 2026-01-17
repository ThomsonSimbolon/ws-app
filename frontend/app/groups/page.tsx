"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserLayout from "@/components/layout/UserLayout";
import UserGroupTable from "@/components/user/UserGroupTable";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAppSelector, useAppDispatch } from "@/hooks/useAppDispatch";
import { getGroupsThunk } from "@/store/slices/groupSlice";
import { fetchUserDevices } from "@/store/slices/userDashboardSlice"; // To get devices list first

export default function GroupsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const { groups, isLoading: isLoadingGroups, error: groupsError } = useAppSelector(
    (state) => state.group
  );
  
  const { devices, isLoadingDevices } = useAppSelector(
    (state) => state.userDashboard
  );

  // Mark component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check auth
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user?.role !== "user") {
      router.push("/dashboard"); // Admins go to their dashboard
      return;
    }
  }, [mounted, isAuthenticated, user, router]);

  // Load devices first
  useEffect(() => {
    if (mounted && isAuthenticated && user?.role === "user") {
        dispatch(fetchUserDevices());
    }
  }, [mounted, isAuthenticated, user, dispatch]);

  // Set default selected device and load groups
  useEffect(() => {
      if (devices.length > 0 && !selectedDeviceId) {
          // Select first connected device if available, or just first device
          const connectedDevice = devices.find(d => d.status === 'connected');
          const targetId = connectedDevice ? connectedDevice.deviceId : devices[0].deviceId;
          setSelectedDeviceId(targetId);
      }
  }, [devices, selectedDeviceId]);

  // Load groups when device changes
  useEffect(() => {
    if (selectedDeviceId) {
        dispatch(getGroupsThunk(selectedDeviceId));
    }
  }, [selectedDeviceId, dispatch]);


  if (!mounted || !user) {
    return null; // Or loading spinner
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Groups
          </h1>
          <p className="text-text-secondary">
            View groups from your WhatsApp devices
          </p>
        </div>

        {/* Device Selector */}
        {devices.length > 0 && (
           <div className="flex items-center gap-4">
               <span className="text-text-secondary text-sm">Select Device:</span>
               <select 
                  className="bg-elevated border border-divider text-text-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
               >
                   {devices.map(device => (
                       <option key={device.deviceId} value={device.deviceId}>
                           {device.deviceName || device.deviceId} ({device.status})
                       </option>
                   ))}
               </select>
               <Button variant="ghost" size="sm" onClick={() => selectedDeviceId && dispatch(getGroupsThunk(selectedDeviceId))}>
                   Refresh
               </Button>
           </div>
        )}

        {/* Content */}
        {devices.length === 0 && !isLoadingDevices ? (
            <Card padding="md">
               <div className="text-center py-8">
                   <p className="text-text-muted">No devices found. Please connect a device first.</p>
               </div>
            </Card>
        ) : (
            <Card padding="none">
                 {groupsError && (
                    <div className="p-4 bg-danger-soft text-danger text-sm border-b border-danger-soft">
                        {groupsError}
                    </div>
                 )}
                 <UserGroupTable groups={groups} isLoading={isLoadingGroups || isLoadingDevices} />
            </Card>
        )}
      </div>
    </UserLayout>
  );
}
