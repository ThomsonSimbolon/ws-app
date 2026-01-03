"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserLayout from "@/components/layout/UserLayout";
import DeviceCard from "@/components/user/DeviceCard";
import Card from "@/components/ui/Card";
import SkeletonCard from "@/components/ui/SkeletonCard";
import Button from "@/components/ui/Button";
import { useAppSelector, useAppDispatch } from "@/hooks/useAppDispatch";
import { fetchUserDevices } from "@/store/slices/userDashboardSlice";

export default function DevicesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  const { devices, isLoadingDevices, devicesError } = useAppSelector(
    (state) => state.userDashboard
  );

  // Mark component as mounted on client (using setTimeout to avoid direct setState in effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (user?.role !== "user") {
      router.push("/dashboard");
      return;
    }

    dispatch(fetchUserDevices());
  }, [mounted, isAuthenticated, user, router, dispatch]);

  // Show loading if not mounted yet or user data not loaded
  if (!mounted || !user || user.role !== "user") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            My Devices
          </h1>
          <p className="text-text-secondary">
            Manage and monitor your WhatsApp devices
          </p>
        </div>

        {/* Error Message */}
        {devicesError && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{devicesError}</p>
          </div>
        )}

        {/* Devices Grid */}
        {isLoadingDevices ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : devicesError ? (
          <Card padding="md">
            <div className="text-center py-12">
              <p className="text-text-danger mb-4">Error loading devices</p>
              <p className="text-sm text-text-secondary mb-4">{devicesError}</p>
              <Button
                variant="primary"
                onClick={() => dispatch(fetchUserDevices())}
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : devices.length === 0 ? (
          <Card padding="md">
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No devices found</p>
              <p className="text-sm text-text-secondary mb-4">
                Contact admin to add a device
              </p>
              <Button
                variant="outline"
                onClick={() => dispatch(fetchUserDevices())}
              >
                Refresh
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {devices.map((device, index) => {
              // Ensure unique key: prefer id, fallback to deviceId, then index
              const uniqueKey = device.id
                ? `device-${device.id}`
                : device.deviceId
                ? `device-${device.deviceId}`
                : `device-${index}`;

              return (
                <DeviceCard
                  key={uniqueKey}
                  device={device}
                  onDeviceUpdate={() => {
                    // Refresh devices list after connection
                    dispatch(fetchUserDevices());
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
