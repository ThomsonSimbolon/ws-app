import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { User } from '@/lib/adminService';

interface RecentUsersListProps {
  users: User[];
  isLoading?: boolean;
  className?: string;
}

export default function RecentUsersList({ users, isLoading = false, className = '' }: RecentUsersListProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Users</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-elevated rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Users</h3>
        <p className="text-text-muted text-sm">No users found</p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Recent Users</h3>
        <a
          href="/admin/users"
          className="text-sm text-primary hover:text-primary-hover transition-colors"
        >
          View All
        </a>
      </div>
      
      <div className="space-y-3">
        {users.slice(0, 10).map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-elevated rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.fullName || user.username}
                </p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
            </div>
            
            {/* Badge & Stats */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant={user.role === 'admin' ? 'info' : 'success'}
              >
                {user.role}
              </Badge>
              {user.stats && (
                <div className="text-xs text-text-muted hidden md:block">
                  {user.stats.totalDevices} devices
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

