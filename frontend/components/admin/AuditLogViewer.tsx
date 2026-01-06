'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, getLogFilters, AdminActionLog, PaginationInfo, LogFilters, GetAuditLogsParams } from '@/lib/adminService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  // Filter state
  const [filters, setFilters] = useState<LogFilters | null>(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Load filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const filterData = await getLogFilters();
        setFilters(filterData);
      } catch (err: any) {
        console.error('Failed to load filters:', err);
        console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
    };
    loadFilters();
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetAuditLogsParams = {
        page,
        limit: 20,
        action: selectedAction || undefined,
        targetType: selectedTargetType || undefined,
        adminId: selectedAdminId || undefined,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const response = await getAuditLogs(params);
      setLogs(response.logs);
      setPagination(response.pagination);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, selectedAction, selectedTargetType, selectedAdminId, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSelectedAction('');
    setSelectedTargetType('');
    setSelectedAdminId('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const toggleRowExpanded = (logId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatTargetType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete') || action.includes('disconnect') || action.includes('cancel')) {
      return 'danger';
    }
    if (action.includes('update') || action.includes('pause') || action.includes('resume')) {
      return 'warning';
    }
    if (action.includes('create') || action.includes('retry')) {
      return 'success';
    }
    return 'info';
  };

  const hasActiveFilters = selectedAction || selectedTargetType || selectedAdminId || searchQuery || startDate || endDate;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">Audit Logs</h2>
        <Button variant="secondary" size="sm" onClick={fetchLogs}>
          Refresh
        </Button>
      </div>

      {/* Filter Section */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-secondary">Filters</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Search</label>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              {filters?.actions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type Filter */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Target Type</label>
            <select
              value={selectedTargetType}
              onChange={(e) => { setSelectedTargetType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              {filters?.targetTypes.map(type => (
                <option key={type} value={type}>
                  {formatTargetType(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Filter */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Admin</label>
            <select
              value={selectedAdminId}
              onChange={(e) => { setSelectedAdminId(e.target.value ? parseInt(e.target.value) : ''); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Admins</option>
              {filters?.admins.map(admin => (
                <option key={admin.id} value={admin.id}>
                  {admin.fullName || admin.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider bg-secondary/30">
                <th className="w-8"></th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Admin</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Target</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-divider">
                    <td colSpan={6} className="p-4">
                      <div className="h-6 bg-elevated animate-pulse rounded"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className="border-b border-divider hover:bg-elevated/50 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpanded(log.id)}
                    >
                      <td className="py-3 px-2 text-center">
                        <span className="text-text-muted transition-transform">
                          {expandedRows.has(log.id) ? '▼' : '▶'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-text-primary">
                        {log.admin ? log.admin.username : `ID: ${log.adminId}`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary">
                        {formatTargetType(log.targetType)}
                        {log.targetId && <span className="text-text-muted ml-1">#{log.targetId}</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted font-mono">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedRows.has(log.id) && (
                      <tr className="bg-elevated/30">
                        <td colSpan={6} className="py-4 px-8">
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <span className="text-text-muted">Log ID:</span>
                                <span className="ml-2 text-text-primary font-mono">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-text-muted">Admin Email:</span>
                                <span className="ml-2 text-text-primary">{log.admin?.email || '-'}</span>
                              </div>
                              <div>
                                <span className="text-text-muted">User Agent:</span>
                                <span className="ml-2 text-text-primary truncate">{log.userAgent?.substring(0, 50) || '-'}...</span>
                              </div>
                              <div>
                                <span className="text-text-muted">Full Name:</span>
                                <span className="ml-2 text-text-primary">{log.admin?.fullName || '-'}</span>
                              </div>
                            </div>
                            {log.details && (
                              <div className="mt-3">
                                <span className="text-text-muted block mb-1">Details:</span>
                                <pre className="bg-base p-3 rounded-lg overflow-x-auto text-xs text-text-secondary">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-divider">
            <div className="text-sm text-text-muted">
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalLogs} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrev || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

