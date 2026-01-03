'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ContactTable from '@/components/admin/ContactTable';
import ContactFilters from '@/components/admin/ContactFilters';
import { getContacts, GetContactsParams } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function ContactsListPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalContacts: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [isBlocked, setIsBlocked] = useState<boolean | ''>('');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch contacts
  const fetchContacts = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetContactsParams = {
        page,
        limit: 20,
        search: search || undefined,
        userId: userId || undefined,
        isBlocked: isBlocked !== '' ? isBlocked : undefined,
      };

      const response = await getContacts(params);
      setContacts(response.contacts);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  }, [search, userId, isBlocked]);

  // Initial load
  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, userId, isBlocked]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchContacts(page);
  };

  const handleResetFilters = () => {
    setSearch('');
    setUserId('');
    setIsBlocked('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Contacts Management</h1>
          <p className="text-text-secondary">Monitor and manage all contacts</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <ContactFilters
          search={search}
          userId={userId}
          isBlocked={isBlocked}
          onSearchChange={setSearch}
          onUserIdChange={setUserId}
          onIsBlockedChange={setIsBlocked}
          onReset={handleResetFilters}
        />

        {/* Contacts Table */}
        <Card padding="md">
          <ContactTable
            contacts={contacts}
            isLoading={isLoading}
          />
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalContacts} total contacts)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

