'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: React.ReactNode;
  supportsCsv: boolean;
  hasDateFilter: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'users',
    name: 'Users',
    description: 'Export user accounts with device counts',
    endpoint: '/admin/export/users',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    supportsCsv: true,
    hasDateFilter: false,
  },
  {
    id: 'devices',
    name: 'Devices',
    description: 'Export WhatsApp devices and connection status',
    endpoint: '/admin/export/devices',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    supportsCsv: true,
    hasDateFilter: false,
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Export message history with status',
    endpoint: '/admin/export/messages',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    supportsCsv: true,
    hasDateFilter: true,
  },
  {
    id: 'logs',
    name: 'Audit Logs',
    description: 'Export admin action logs',
    endpoint: '/admin/export/logs',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    supportsCsv: true,
    hasDateFilter: true,
  },
];

export default function DataExport() {
  const [selectedExport, setSelectedExport] = useState<string | null>(null);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async (option: ExportOption) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Build query params
      const params = new URLSearchParams();
      params.append('format', format);
      if (option.hasDateFilter && startDate) params.append('startDate', startDate);
      if (option.hasDateFilter && endDate) params.append('endDate', endDate);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const url = `${baseUrl}${option.endpoint}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${option.id}_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        setSuccess(`${option.name} exported successfully as CSV`);
      } else {
        // Download JSON file
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${option.id}_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        setSuccess(`${option.name} exported successfully as JSON (${data.data?.totalRecords || 0} records)`);
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Data Export</h2>
        <p className="text-sm text-text-muted mt-1">
          Export data in JSON or CSV format for analysis and reporting
        </p>
      </div>

      {/* Format Selection */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Export Format</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="w-4 h-4 text-primary"
            />
            <span className="text-text-primary">JSON</span>
            <span className="text-xs text-text-muted">(structured data)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="w-4 h-4 text-primary"
            />
            <span className="text-text-primary">CSV</span>
            <span className="text-xs text-text-muted">(spreadsheet compatible)</span>
          </label>
        </div>
      </Card>

      {/* Date Range Filter */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Date Range <span className="text-text-muted">(for Messages and Logs)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-elevated border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-success-soft text-success rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map((option) => (
          <div 
            key={option.id}
            className={`cursor-pointer transition-all ${selectedExport === option.id ? 'ring-2 ring-primary/20' : ''}`}
            onClick={() => setSelectedExport(option.id)}
          >
            <Card 
              padding="md" 
              className={`h-full ${selectedExport === option.id ? 'border-primary' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-soft rounded-lg">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-text-primary">{option.name}</h3>
                    {option.hasDateFilter && (
                      <Badge variant="info" className="text-xs">Date Filter</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-muted mt-1">{option.description}</p>
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={loading}
                      onClick={() => {
                        handleExport(option);
                      }}
                    >
                      {loading && selectedExport === option.id ? 'Exporting...' : `Export ${option.name}`}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Export History - Placeholder */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Export Tips</h3>
        <ul className="text-sm text-text-muted space-y-2">
          <li>• JSON format includes nested data and is best for programmatic analysis</li>
          <li>• CSV format is compatible with Excel, Google Sheets, and other spreadsheet tools</li>
          <li>• Messages and Logs can be filtered by date range to limit export size</li>
          <li>• Large exports may take a few seconds to complete</li>
        </ul>
      </Card>
    </div>
  );
}
