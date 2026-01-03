"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import {
  createDeviceThunk,
  connectDeviceThunk,
  getDeviceStatusThunk,
  getQRCodeImageThunk,
  clearDeviceState,
  clearErrors,
} from "@/store/slices/deviceSlice";
import { ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface QRCodeModalProps {
  deviceId: string;
  deviceName: string;
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

// Constants matching the HTML flow
const STATUS_POLL_INTERVAL_MS = 5000; // Check status every 5 seconds
const QR_REFRESH_INTERVAL_MS = 40000; // Refresh QR every 40 seconds if not connected
const INITIAL_QR_DELAY_MS = 3000; // Delay before showing QR (3 seconds - reduced for better UX)
const MAX_QR_ERROR_BEFORE_WIPE = 3; // Max errors before cancel-and-wipe (increased for reliability)

export default function QRCodeModal({
  deviceId,
  deviceName,
  isOpen,
  onClose,
  onConnected,
}: QRCodeModalProps) {
  const dispatch = useAppDispatch();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for intervals and tracking
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const lastQrFetchedAtRef = useRef<number>(0);
  const qrErrorCountRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const fetchQRCodeRef = useRef<(() => Promise<void>) | null>(null);
  const startStatusAndQrLoopsRef = useRef<(() => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting for Portal (Next.js SSR compatibility)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Helper function to clear all intervals and timeouts
  const clearAllIntervals = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    if (qrRefreshIntervalRef.current) {
      clearInterval(qrRefreshIntervalRef.current);
      qrRefreshIntervalRef.current = null;
    }
    if (qrErrorTimeoutRef.current) {
      clearTimeout(qrErrorTimeoutRef.current);
      qrErrorTimeoutRef.current = null;
    }
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQrCode(null);
      setError(null);
      setStatus("connecting");
      setIsLoading(false);
      setIsConnecting(false);
      connectionStartTimeRef.current = 0;
      lastQrFetchedAtRef.current = 0;
      qrErrorCountRef.current = 0;
      isInitializedRef.current = false;
      clearAllIntervals();
      dispatch(clearDeviceState());
      dispatch(clearErrors());
    }
  }, [isOpen, clearAllIntervals, dispatch]);

  // Helper function to extract error message from various error formats
  const extractErrorMessage = useCallback(
    (err: unknown, defaultMessage: string = "Terjadi kesalahan"): string => {
      if (!err) return defaultMessage;

      // Handle string errors
      if (typeof err === "string") {
        return err || defaultMessage;
      }

      // Handle Error objects
      if (err instanceof Error) {
        return err.message || defaultMessage;
      }

      // Handle objects with message property
      if (
        typeof err === "object" &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        return err.message || defaultMessage;
      }

      // Handle objects with error property
      if (
        typeof err === "object" &&
        "error" in err &&
        typeof err.error === "string"
      ) {
        return err.error || defaultMessage;
      }

      // Handle empty objects - check if it's a rejected thunk
      if (typeof err === "object" && Object.keys(err).length === 0) {
        return defaultMessage;
      }

      // Fallback: try to stringify
      try {
        const errorStr = String(err);
        return errorStr !== "[object Object]" ? errorStr : defaultMessage;
      } catch {
        return defaultMessage;
      }
    },
    []
  );

  // Helper to update status text
  const updateStatus = useCallback((text: string) => {
    setStatus((prev) => {
      // Map status text to status value
      if (text.includes("terhubung") || text.includes("connected")) {
        return "connected";
      }
      if (text.includes("QR") || text.includes("scan")) {
        return "qr_required";
      }
      if (text.includes("menghubungkan") || text.includes("connecting")) {
        return "connecting";
      }
      return prev;
    });
  }, []);

  // Check status once (for initial check)
  const checkStatusOnce = useCallback(async (): Promise<boolean> => {
    if (!deviceId) return false;

    try {
      const result = await dispatch(getDeviceStatusThunk(deviceId));
      if (getDeviceStatusThunk.fulfilled.match(result)) {
        const deviceStatus = result.payload.status;
        if (deviceStatus.status === "connected") {
          setStatus("connected");
          if (onConnected) {
            onConnected();
          }
          onClose();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Status check error:", err);
      return false;
    }
  }, [deviceId, onConnected, onClose, dispatch]);

  // Cancel and wipe device (delete session files)
  const cancelAndWipeDevice = useCallback(async () => {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_BASE_URL}/whatsapp-multi-device/devices/${encodeURIComponent(
          deviceId
        )}/cancel-and-wipe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Parse JSON response dengan error handling
      let json: {
        success?: boolean;
        message?: string;
        error?: string;
      } = {};

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          json = await response.json();
        } else {
          // Jika response bukan JSON, gunakan status text
          const text = await response.text();
          json = {
            message:
              text || response.statusText || "Failed to cancel and wipe device",
          };
        }
      } catch (parseError) {
        // Jika gagal parse JSON, gunakan status text
        console.warn("Failed to parse response JSON:", parseError);
        json = {
          message: response.statusText || "Failed to cancel and wipe device",
        };
      }

      if (!response.ok) {
        // Throw error dengan status code untuk ditangani di handleQrErrorLimit
        const error: ApiError = {
          message:
            json.message ||
            json.error ||
            `Failed to cancel and wipe device (${response.status})`,
          status: response.status,
        };
        throw error;
      }

      return json.success === true || response.ok;
    } catch (fetchError: unknown) {
      // Handle network errors atau errors lainnya
      if (
        fetchError &&
        typeof fetchError === "object" &&
        "status" in fetchError
      ) {
        // Sudah dalam format ApiError, throw langsung
        throw fetchError;
      }

      // Convert ke ApiError format
      const error: ApiError = {
        message:
          fetchError &&
          typeof fetchError === "object" &&
          "message" in fetchError &&
          typeof fetchError.message === "string"
            ? fetchError.message
            : fetchError instanceof Error
            ? fetchError.message
            : typeof fetchError === "string"
            ? fetchError
            : "Failed to cancel and wipe device",
        status:
          fetchError &&
          typeof fetchError === "object" &&
          "status" in fetchError &&
          typeof fetchError.status === "number"
            ? fetchError.status
            : 0,
      };
      throw error;
    }
  }, [deviceId]);

  // Handler saat QR error mencapai batas
  const handleQrErrorLimit = useCallback(async () => {
    console.warn("QR error limit reached, performing cancel-and-wipe...");
    clearAllIntervals(); // stop semua polling
    setIsLoading(true);
    setError("Terlalu banyak error, mereset koneksi...");
    updateStatus("Mereset koneksi...");

    try {
      // Coba lakukan cancel-and-wipe, tapi jika gagal (403/404), lanjut saja
      let wiped = false;
      try {
        wiped = await cancelAndWipeDevice();
      } catch (wipeError: unknown) {
        // Jika error 403 atau 404, device mungkin belum dibuat atau tidak milik user
        // Ini tidak masalah, kita akan create device lagi nanti
        let errorStatus: number | null = null;

        // Handle berbagai format error object
        if (wipeError && typeof wipeError === "object") {
          // Cek jika error memiliki properti status
          if ("status" in wipeError && typeof wipeError.status === "number") {
            errorStatus = wipeError.status;
          }
          // Cek jika error adalah Response object
          else if (wipeError instanceof Response) {
            errorStatus = wipeError.status;
          }
          // Cek jika error memiliki properti message untuk logging
          const errorMessage =
            "message" in wipeError && typeof wipeError.message === "string"
              ? wipeError.message
              : "Unknown error";
          console.warn("Error saat cancel-and-wipe:", {
            error: wipeError,
            message: errorMessage,
            status: errorStatus,
          });
        } else {
          console.warn("Error saat cancel-and-wipe (non-object):", wipeError);
        }

        if (errorStatus === 403 || errorStatus === 404) {
          console.log(
            "Device tidak ditemukan atau tidak milik user, akan dibuat ulang"
          );
          wiped = true; // Treat as success, we'll recreate device
        }
      }

      if (wiped) {
        console.log("Cancel-and-wipe berhasil, memulai ulang koneksi...");
        setError("");
        qrErrorCountRef.current = 0; // Reset error counter

        // Delay sebentar sebelum mulai ulang
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mulai ulang dari awal - createDevice dulu seperti HTML flow
        // The thunk already handles 403 and "already exists" errors as success
        updateStatus("Memulai ulang koneksi...");
        const createResult = await dispatch(
          createDeviceThunk({ deviceId, deviceName })
        );
        if (createDeviceThunk.rejected.match(createResult)) {
          // For safety, double-check if it's a permission error that slipped through
          const errorMessage = extractErrorMessage(createResult.payload, "");
          if (
            errorMessage.toLowerCase().includes("forbidden") ||
            errorMessage.toLowerCase().includes("akses ditolak") ||
            errorMessage.toLowerCase().includes("sudah ada")
          ) {
            // Permission error or already exists - continue (shouldn't happen but defense in depth)
            console.log(
              "Device creation skipped (permission/exists), continuing..."
            );
          } else {
            // Real error - throw it
            throw new Error(errorMessage);
          }
        }
        const connectResult = await dispatch(connectDeviceThunk(deviceId));
        if (connectDeviceThunk.rejected.match(connectResult)) {
          throw new Error(
            extractErrorMessage(
              connectResult.payload,
              "Gagal menghubungkan device"
            )
          );
        }
        const connected = await checkStatusOnce();

        if (!connected) {
          updateStatus("Tunggu sebentar, QR akan muncul dalam beberapa detik");
          await new Promise((resolve) =>
            setTimeout(resolve, INITIAL_QR_DELAY_MS)
          );
          // Panggil fetchQRCode dan startStatusAndQrLoops melalui ref
          if (fetchQRCodeRef.current && startStatusAndQrLoopsRef.current) {
            try {
              await fetchQRCodeRef.current();
              startStatusAndQrLoopsRef.current();
            } catch (refError: unknown) {
              console.error(
                "Error saat memanggil fetchQRCode/startStatusAndQrLoops:",
                refError
              );
              // Jangan throw, biarkan flow continue
            }
          }
        }
      } else {
        // Jika tidak bisa wipe, tetap coba restart connection tanpa wipe
        console.log(
          "Tidak bisa wipe device, mencoba restart koneksi langsung..."
        );
        setError("");
        qrErrorCountRef.current = 0; // Reset error counter

        // Delay sebentar sebelum mulai ulang
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mulai ulang dari awal - createDevice dulu seperti HTML flow
        // The thunk already handles 403 and "already exists" errors as success
        updateStatus("Memulai ulang koneksi...");
        try {
          const createResult = await dispatch(
            createDeviceThunk({ deviceId, deviceName })
          );
          if (createDeviceThunk.rejected.match(createResult)) {
            // For safety, double-check if it's a permission error that slipped through
            const errorMessage = extractErrorMessage(createResult.payload, "");
            if (
              errorMessage.toLowerCase().includes("forbidden") ||
              errorMessage.toLowerCase().includes("akses ditolak") ||
              errorMessage.toLowerCase().includes("sudah ada")
            ) {
              // Permission error or already exists - continue (shouldn't happen but defense in depth)
              console.log(
                "Device creation skipped (permission/exists), continuing..."
              );
            } else {
              // Real error - throw it
              throw new Error(errorMessage);
            }
          }
          const connectResult = await dispatch(connectDeviceThunk(deviceId));
          if (connectDeviceThunk.rejected.match(connectResult)) {
            throw new Error(
              extractErrorMessage(
                connectResult.payload,
                "Gagal menghubungkan device"
              )
            );
          }
          const connected = await checkStatusOnce();

          if (!connected) {
            updateStatus(
              "Tunggu sebentar, QR akan muncul dalam beberapa detik"
            );
            await new Promise((resolve) =>
              setTimeout(resolve, INITIAL_QR_DELAY_MS)
            );
            // Panggil fetchQRCode dan startStatusAndQrLoops melalui ref
            if (fetchQRCodeRef.current && startStatusAndQrLoopsRef.current) {
              try {
                await fetchQRCodeRef.current();
                startStatusAndQrLoopsRef.current();
              } catch (refError: unknown) {
                console.error(
                  "Error saat memanggil fetchQRCode/startStatusAndQrLoops:",
                  refError
                );
                // Jangan throw, biarkan flow continue
              }
            }
          }
        } catch (restartError: unknown) {
          console.error("Error saat restart koneksi:", restartError);
          const errorMessage =
            restartError &&
            typeof restartError === "object" &&
            "message" in restartError &&
            typeof restartError.message === "string"
              ? restartError.message
              : "Gagal memulai ulang koneksi";
          setError(errorMessage);
        }
      }
    } catch (e: unknown) {
      // Improved error handling dengan logging yang lebih detail
      // Pastikan error object tidak kosong dengan menambahkan informasi yang berguna
      const errorInfo: Record<string, unknown> = {
        errorType: typeof e,
        errorString: String(e),
        timestamp: new Date().toISOString(),
      };

      // Tambahkan properti error jika ada
      if (e && typeof e === "object") {
        errorInfo.errorKeys = Object.keys(e);

        // Coba extract message
        if ("message" in e && typeof e.message === "string") {
          errorInfo.errorMessage = e.message;
        }

        // Coba extract status
        if ("status" in e && typeof e.status === "number") {
          errorInfo.errorStatus = e.status;
        }

        // Coba extract error
        if ("error" in e) {
          errorInfo.error = e.error;
        }

        // Jika adalah Error instance
        if (e instanceof Error) {
          errorInfo.errorName = e.name;
          errorInfo.errorStack = e.stack;
        }
      }

      console.error("Error saat handle QR error limit:", errorInfo);

      // Extract error message dengan lebih robust
      let errorMessage = "Gagal mereset koneksi. Silakan refresh halaman.";
      if (e && typeof e === "object") {
        if ("message" in e && typeof e.message === "string" && e.message) {
          errorMessage = e.message;
        } else if ("error" in e && typeof e.error === "string" && e.error) {
          errorMessage = e.error;
        } else if (e instanceof Error && e.message) {
          errorMessage = e.message;
        } else if (Object.keys(e).length === 0) {
          // Jika error object kosong, gunakan pesan default yang lebih informatif
          errorMessage =
            "Terjadi kesalahan saat mereset koneksi. Silakan coba lagi atau refresh halaman.";
        }
      } else if (typeof e === "string" && e) {
        errorMessage = e;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    deviceId,
    deviceName,
    cancelAndWipeDevice,
    clearAllIntervals,
    checkStatusOnce,
    updateStatus,
    dispatch,
    extractErrorMessage,
  ]);

  // Fetch QR code with proper error handling and delayed error display
  // Menggunakan /qr-image?format=png seperti HTML flow
  // Backend mengembalikan JSON response dengan qrImage sebagai base64 data URL
  const fetchQRCode = useCallback(async () => {
    // Cancel pending error timeout
    if (qrErrorTimeoutRef.current) {
      clearTimeout(qrErrorTimeoutRef.current);
      qrErrorTimeoutRef.current = null;
    }

    try {
      const result = await dispatch(
        getQRCodeImageThunk({ deviceId, format: "png" })
      );

      if (getQRCodeImageThunk.fulfilled.match(result)) {
        setQrCode(result.payload.qrCode);
        setError(null);
        lastQrFetchedAtRef.current = Date.now();
        qrErrorCountRef.current = 0; // Reset error counter on success
        setStatus("qr_required");
        return;
      } else {
        // Handle rejected
        const errorMessage = extractErrorMessage(
          result.payload,
          "QR code not available in response"
        );
        throw new Error(errorMessage);
      }
    } catch (err: unknown) {
      qrErrorCountRef.current += 1;
      console.warn(`QR fetch error (attempt ${qrErrorCountRef.current}):`, err);

      // Jika sudah 2 kali error, lakukan cancel-and-wipe
      if (qrErrorCountRef.current >= MAX_QR_ERROR_BEFORE_WIPE) {
        // Handle error dengan try-catch untuk mencegah error object kosong
        try {
          await handleQrErrorLimit();
        } catch (limitError: unknown) {
          console.error("Error saat memanggil handleQrErrorLimit:", limitError);
          // Jangan throw lagi, biarkan error handling di handleQrErrorLimit yang menangani
        }
      } else {
        // Tunda penampilan error agar tidak flicker jika QR menyusul
        qrErrorTimeoutRef.current = setTimeout(() => {
          const errorMessage = extractErrorMessage(
            err,
            `Failed to fetch QR code (percobaan ${qrErrorCountRef.current}/${MAX_QR_ERROR_BEFORE_WIPE})`
          );
          setError(errorMessage);
        }, 1500);
      }
    }
  }, [deviceId, handleQrErrorLimit, dispatch, extractErrorMessage]);

  // Check status and handle updates (for polling)
  // Hanya update status text seperti HTML flow, tidak auto fetch QR
  const checkStatusAndHandle = useCallback(async () => {
    if (!deviceId) return;

    try {
      const result = await dispatch(getDeviceStatusThunk(deviceId));
      if (getDeviceStatusThunk.fulfilled.match(result)) {
        const deviceStatus = result.payload.status;

        // Update status
        setStatus((prevStatus) => {
          if (prevStatus !== deviceStatus.status) {
            return deviceStatus.status;
          }
          return prevStatus;
        });

        // Jika connected, stop polling dan trigger callback
        if (deviceStatus.status === "connected") {
          clearAllIntervals();
          if (onConnected) {
            onConnected();
          }
          onClose();
          return;
        }

        // Update status text seperti HTML flow (tidak auto fetch QR)
        if (deviceStatus.status === "qr_required") {
          updateStatus("Scan QR Code untuk menghubungkan WhatsApp");
        }
      }
    } catch (err) {
      // Handle error gracefully
      console.error("Status check error:", err);
    }
  }, [
    deviceId,
    onConnected,
    onClose,
    clearAllIntervals,
    updateStatus,
    dispatch,
  ]);

  // Start status and QR refresh loops (dual interval pattern sesuai HTML)
  const startStatusAndQrLoops = useCallback(() => {
    clearAllIntervals();
    connectionStartTimeRef.current = Date.now();

    // Immediate first check
    checkStatusAndHandle();

    // Interval 1: Check status setiap 5 detik (tidak ada timeout seperti HTML flow)
    statusIntervalRef.current = setInterval(() => {
      checkStatusAndHandle();
    }, STATUS_POLL_INTERVAL_MS);

    // Interval 2: Check kebutuhan refresh QR setiap 1 detik (refresh jika 40 detik sudah lewat)
    qrRefreshIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (
        now - lastQrFetchedAtRef.current >= QR_REFRESH_INTERVAL_MS &&
        status !== "connected"
      ) {
        fetchQRCode().catch(() => {
          // Ignore errors
        });
      }
    }, 1000);
  }, [checkStatusAndHandle, clearAllIntervals, status, fetchQRCode]);

  // Update refs setelah fetchQRCode dan startStatusAndQrLoops didefinisikan
  useEffect(() => {
    fetchQRCodeRef.current = fetchQRCode;
    startStatusAndQrLoopsRef.current = startStatusAndQrLoops;
  }, [fetchQRCode, startStatusAndQrLoops]);

  // Main flow when modal opens - following the HTML pattern
  const startFlow = useCallback(async () => {
    if (!deviceId || isInitializedRef.current) return;

    isInitializedRef.current = true;

    try {
      setIsLoading(true);
      setError(null);
      setStatus("connecting");
      updateStatus("Mempersiapkan perangkat...");

      // Step 1: Create device (if not exists, treat "already exists" or 403 as success)
      // Note: createDevice requires admin, but device might already exist
      // The thunk already handles 403 and "already exists" errors as success
      updateStatus("Membuat device...");
      const createResult = await dispatch(
        createDeviceThunk({ deviceId, deviceName })
      );
      // If rejected, it means a real error occurred (thunk already filtered 403/"sudah ada")
      if (createDeviceThunk.rejected.match(createResult)) {
        // For safety, double-check if it's a permission error that slipped through
        const errorMessage = extractErrorMessage(createResult.payload, "");
        if (
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("akses ditolak") ||
          errorMessage.toLowerCase().includes("sudah ada")
        ) {
          // Permission error or already exists - continue (shouldn't happen but defense in depth)
          console.log(
            "Device creation skipped (permission/exists), continuing..."
          );
        } else {
          // Real error - throw it
          throw new Error(errorMessage);
        }
      }

      // Step 2: Connect device
      updateStatus("Menghubungkan perangkat...");
      const connectResult = await dispatch(connectDeviceThunk(deviceId));
      if (connectDeviceThunk.rejected.match(connectResult)) {
        throw new Error(
          extractErrorMessage(
            connectResult.payload,
            "Gagal menghubungkan device"
          )
        );
      }

      // Step 3: Check status once
      const connected = await checkStatusOnce();

      if (!connected) {
        // Step 4: Wait 5 seconds before showing QR
        updateStatus("Tunggu sebentar, QR akan muncul dalam beberapa detik");
        await new Promise((resolve) =>
          setTimeout(resolve, INITIAL_QR_DELAY_MS)
        );

        // Step 5: Fetch and show QR
        await fetchQRCode();

        // Step 6: Start polling loops
        startStatusAndQrLoops();
      }

      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Error in startFlow:", error);
      const errorMessage = extractErrorMessage(
        error,
        "Terjadi kesalahan saat memulai koneksi"
      );
      setError(errorMessage);
      setIsLoading(false);
      isInitializedRef.current = false;
    }
  }, [
    deviceId,
    deviceName,
    checkStatusOnce,
    fetchQRCode,
    startStatusAndQrLoops,
    updateStatus,
    dispatch,
    extractErrorMessage,
  ]);

  // Initialize flow when modal opens
  useEffect(() => {
    if (isOpen && deviceId && !isInitializedRef.current) {
      // Start flow after a small delay
      const timer = setTimeout(() => {
        startFlow();
      }, 100);

      return () => {
        clearTimeout(timer);
        clearAllIntervals();
      };
    }
  }, [isOpen, deviceId, startFlow, clearAllIntervals]);

  const handleRegenerate = useCallback(async () => {
    setQrCode(null);
    setError(null);
    qrErrorCountRef.current = 0;
    lastQrFetchedAtRef.current = 0;
    setIsLoading(true);
    updateStatus("Memulai ulang koneksi...");

    try {
      // Mengikuti HTML flow: createDevice → connectDevice → fetchQRCode
      // The thunk already handles 403 and "already exists" errors as success
      const createResult = await dispatch(
        createDeviceThunk({ deviceId, deviceName })
      );
      if (createDeviceThunk.rejected.match(createResult)) {
        // For safety, double-check if it's a permission error that slipped through
        const errorMessage = extractErrorMessage(createResult.payload, "");
        if (
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("akses ditolak") ||
          errorMessage.toLowerCase().includes("sudah ada")
        ) {
          // Permission error or already exists - continue (shouldn't happen but defense in depth)
          console.log(
            "Device creation skipped (permission/exists), continuing..."
          );
        } else {
          // Real error - throw it
          throw new Error(errorMessage);
        }
      }

      const connectResult = await dispatch(connectDeviceThunk(deviceId));
      if (connectDeviceThunk.rejected.match(connectResult)) {
        throw new Error(
          extractErrorMessage(
            connectResult.payload,
            "Gagal menghubungkan device"
          )
        );
      }

      await fetchQRCode();
      startStatusAndQrLoops();
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Regenerate error:", err);
      const errorMessage = extractErrorMessage(err, "Gagal refresh QR code");
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [
    deviceId,
    deviceName,
    fetchQRCode,
    startStatusAndQrLoops,
    updateStatus,
    dispatch,
    extractErrorMessage,
  ]);

  // Modal content
  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        // Close modal when clicking outside
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card padding="lg" className="max-w-md w-full mx-4 relative">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Connect Device
              </h2>
              <p className="text-sm text-text-secondary mt-1">{deviceName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger-soft border border-danger rounded-lg p-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* QR Code Display */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-text-secondary">Generating QR code...</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-text-secondary">
                  Scan this QR code with WhatsApp to connect your device
                </p>
                <p className="text-xs text-text-muted">
                  Open WhatsApp → Settings → Linked Devices → Link a Device
                </p>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  className="flex-1"
                >
                  Regenerate QR
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    setIsConnecting(true);
                    try {
                      await checkStatusAndHandle();
                    } finally {
                      setIsConnecting(false);
                    }
                  }}
                  className="flex-1"
                  disabled={isConnecting}
                >
                  {isConnecting ? "Checking..." : "Check Status"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-text-secondary mb-4">No QR code available</p>
              <Button variant="primary" onClick={fetchQRCode}>
                Generate QR Code
              </Button>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                status === "connected"
                  ? "bg-success"
                  : status === "connecting" || status === "qr_required"
                  ? "bg-warning animate-pulse"
                  : "bg-danger"
              }`}
            />
            <span className="text-text-secondary capitalize">
              Status: {status === "qr_required" ? "Waiting for scan" : status}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );

  // Don't render on server-side or if modal is closed
  if (!isOpen || !mounted) return null;

  // Render modal using Portal directly to document.body
  // This ensures modal is outside the nested DOM hierarchy and always centered
  return createPortal(modalContent, document.body);
}
