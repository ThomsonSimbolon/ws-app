'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ContactTagFilter from '@/components/contacts/ContactTagFilter';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchConnectedDevices, fetchUserDevices } from '@/store/slices/userDashboardSlice';
import { getContacts, Contact } from '@/lib/userService';
import { ApiError } from '@/lib/api';

function ContactsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { connectedDevices, isLoadingDevices } = useAppSelector((state) => state.userDashboard);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'user') {
      router.push('/dashboard');
      return;
    }

    dispatch(fetchUserDevices());
    dispatch(fetchConnectedDevices());

    const deviceId = searchParams.get('deviceId');
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    }
  }, [mounted, isAuthenticated, user, router, dispatch, searchParams]);

  const loadContacts = useCallback(async () => {
    if (!selectedDeviceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getContacts(selectedDeviceId);
      const contactList = response.contacts || [];
      setContacts(contactList);
      setFilteredContacts(contactList);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 403) {
        setError('You do not have permission to access this device.');
      } else {
        setError(apiError.message || 'Failed to load contacts');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadContacts();
    }
  }, [selectedDeviceId, loadContacts]);

  useEffect(() => {
    if (!searchQuery.trim() && selectedTags.length === 0) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter((contact) => {
      // Search filter
      const matchesSearch = !query || 
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        contact.phoneNumber.includes(query) ||
        contact.jid.includes(query);
      
      // Tag filter (if tags exist on contact)
      const contactTags = (contact as any).tags as string[] | undefined;
      const matchesTags = selectedTags.length === 0 || 
        (contactTags && selectedTags.some(tag => contactTags.includes(tag)));
      
      return matchesSearch && matchesTags;
    });
    setFilteredContacts(filtered);
  }, [searchQuery, selectedTags, contacts]);

  const handleContactClick = (contact: Contact) => {
    router.push(`/chat-history?jid=${encodeURIComponent(contact.jid)}&deviceId=${selectedDeviceId}`);
  };

  if (!mounted) return null;

  if (!user || user.role !== 'user') return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Contacts</h1>
        <p className="text-text-secondary">View and manage your WhatsApp contacts</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card padding="md">
        {/* Device Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Select Device
          </label>
          {isLoadingDevices ? (
            <div className="animate-pulse h-10 bg-elevated rounded-lg" />
          ) : connectedDevices.length === 0 ? (
            <div className="p-4 bg-warning-soft border border-warning rounded-lg">
              <p className="text-sm text-warning">
                No connected devices available. Please connect a device first.
              </p>
            </div>
          ) : (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                setContacts([]);
                setFilteredContacts([]);
                setSearchQuery('');
              }}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
            >
              <option value="">Select a device</option>
              {connectedDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.deviceName} {device.phoneNumber ? `(${device.phoneNumber})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        {selectedDeviceId && (
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Search contacts by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Tag Filter */}
        {selectedDeviceId && contacts.length > 0 && (
          <div className="mb-4">
            <ContactTagFilter
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>
        )}

        {/* Contacts List */}
        {selectedDeviceId && (
          <div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-text-muted opacity-50 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-text-muted">
                  {searchQuery ? 'No contacts match your search' : 'No contacts found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                <p className="text-sm text-text-muted mb-3">
                  {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
                {filteredContacts.map((contact, index) => (
                  <button
                    key={contact.jid || index}
                    onClick={() => handleContactClick(contact)}
                    className="w-full text-left p-4 rounded-lg bg-elevated hover:bg-primary-soft transition-colors flex items-center gap-4"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-lg">
                        {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">
                        {contact.name || contact.phoneNumber}
                      </p>
                      <p className="text-sm text-text-muted truncate">
                        {contact.phoneNumber}
                      </p>
                    </div>
                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-text-muted flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ContactsFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Contacts</h1>
        <p className="text-text-secondary">View and manage your WhatsApp contacts</p>
      </div>
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-elevated rounded-lg" />
          <div className="h-10 bg-elevated rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-elevated rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <UserLayout>
      <Suspense fallback={<ContactsFallback />}>
        <ContactsContent />
      </Suspense>
    </UserLayout>
  );
}
