import React from 'react';
import Link from 'next/link';
import { User } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onDelete?: (userId: number) => void;
  currentUserId?: number;
}

export default function UserTable({ users, isLoading = false, onDelete, currentUserId }: UserTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Username</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Email</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Full Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Role</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Devices</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Messages</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  {user.username}
                </Link>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">{user.email}</td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {user.fullName || '-'}
              </td>
              <td className="py-3 px-4">
                <Badge variant={user.role === 'admin' ? 'info' : 'success'}>
                  {user.role}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {user.stats?.totalDevices || 0}
                {user.stats?.connectedDevices ? (
                  <span className="text-success ml-1">
                    ({user.stats.connectedDevices} connected)
                  </span>
                ) : null}
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {user.stats?.totalMessages || 0}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  <Link href={`/admin/users/${user.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                  {onDelete && user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="text-danger hover:text-danger hover:bg-danger-soft"
                    >
                      Delete
                    </Button>
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

