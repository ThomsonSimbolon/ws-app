import React, { useState, useEffect } from 'react';
import { getAuditLogs, AdminActionLog, PaginationInfo } from '@/lib/adminService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchLogs = async (currentPage: number) => {
    setLoading(true);
    try {
      const response = await getAuditLogs({ page: currentPage, limit: 20 });
      setLogs(response.logs);
      setPagination(response.pagination);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">Audit Logs</h2>
        <Button variant="secondary" size="sm" onClick={() => fetchLogs(page)}>
          Refresh
        </Button>
      </div>

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
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Admin</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Target</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-divider">
                    <td colSpan={5} className="p-4">
                      <div className="h-6 bg-elevated animate-pulse rounded"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-divider hover:bg-elevated/50 transition-colors">
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
                    <td className="py-3 px-4 text-sm text-text-secondary max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-divider">
            <div className="text-sm text-text-muted">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrev || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => handlePageChange(page + 1)}
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
