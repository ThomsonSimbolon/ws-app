import React from 'react';
import Link from 'next/link';
import { Group } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface GroupTableProps {
  groups: Group[];
  isLoading?: boolean;
}

export default function GroupTable({ groups, isLoading = false }: GroupTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No groups found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Group Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Device</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Participants</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Admins</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created At</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="text-text-primary font-medium">{group.subject}</p>
                  {group.description && (
                    <p className="text-xs text-text-muted truncate max-w-xs">
                      {group.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {group.device ? (
                  <div>
                    <p className="text-text-primary text-sm">{group.device.deviceName}</p>
                    <p className="text-xs text-text-muted">{group.device.deviceId}</p>
                  </div>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                {group.device?.user ? (
                  <Link
                    href={`/admin/users/${group.device.user.id}`}
                    className="text-primary hover:text-primary-hover font-medium transition-colors text-sm"
                  >
                    {group.device.user.fullName || group.device.user.username}
                  </Link>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <Badge variant="info">
                  {group.participants?.length || 0}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant="warning">
                  {group.admins?.length || 0}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant={group.isActive ? 'success' : 'danger'}>
                  {group.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {new Date(group.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  {group.device?.user && (
                    <Link href={`/admin/users/${group.device.user.id}`}>
                      <Button variant="ghost" size="sm">
                        View User
                      </Button>
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

