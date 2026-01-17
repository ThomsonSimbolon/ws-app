import React from 'react';
import { Group } from '@/lib/groupService';
import Badge from '@/components/ui/Badge';

interface UserGroupTableProps {
  groups: Group[];
  isLoading?: boolean;
}

export default function UserGroupTable({ groups, isLoading = false }: UserGroupTableProps) {
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
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Participants</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created At</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4">
                <p className="text-text-primary font-medium">{group.subject}</p>
              </td>
              <td className="py-3 px-4">
                <Badge variant="info">
                  {group.participants?.length || 0}
                </Badge>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {group.creation ? new Date(group.creation * 1000).toLocaleDateString() : '-'}
              </td>
               <td className="py-3 px-4">
                 {group.description ? (
                    <p className="text-xs text-text-muted truncate max-w-xs">{group.description}</p>
                 ) : (
                    <span className="text-text-muted">-</span>
                 )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
