import React from 'react';
import Link from 'next/link';
import { Contact } from '@/lib/adminService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ContactTableProps {
  contacts: Contact[];
  isLoading?: boolean;
}

export default function ContactTable({ contacts, isLoading = false }: ContactTableProps) {
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Phone Number</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Email</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Tags</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Blocked</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Last Message</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              className="border-b border-divider hover:bg-elevated transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-text-primary font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-text-primary font-medium">{contact.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {contact.phoneNumber}
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {contact.email || '-'}
              </td>
              <td className="py-3 px-4">
                {contact.user ? (
                  <Link
                    href={`/admin/users/${contact.user.id}`}
                    className="text-primary hover:text-primary-hover font-medium transition-colors text-sm"
                  >
                    {contact.user.fullName || contact.user.username}
                  </Link>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {contact.tags && contact.tags.length > 0 ? (
                    contact.tags.slice(0, 2).map((tag, idx) => (
                      <Badge key={idx} variant="info" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-text-muted text-xs">-</span>
                  )}
                  {contact.tags && contact.tags.length > 2 && (
                    <span className="text-text-muted text-xs">+{contact.tags.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={contact.isBlocked ? 'danger' : 'success'}>
                  {contact.isBlocked ? 'Blocked' : 'Active'}
                </Badge>
              </td>
              <td className="py-3 px-4 text-text-secondary text-sm">
                {formatRelativeTime(contact.lastMessageAt)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  {contact.user && (
                    <Link href={`/admin/users/${contact.user.id}`}>
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

