import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ResultItem {
  phone: string;
  success: boolean;
  error?: string;
}

interface ResultsSummaryProps {
  results: ResultItem[];
  onReset: () => void;
}

export default function ResultsSummary({ results, onReset }: ResultsSummaryProps) {
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return (
    <Card padding="md" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Execution Results</h3>
          <p className="text-sm text-text-secondary">
            {successCount} successful, {failedCount} failed
          </p>
        </div>
        <Button variant="secondary" onClick={onReset}>
          Schedule More
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated text-text-secondary sticky top-0">
              <tr>
                <th className="p-3">Phone Number</th>
                <th className="p-3">Status</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((result, idx) => (
                <tr key={idx} className="hover:bg-elevated/50">
                  <td className="p-3 font-mono">{result.phone}</td>
                  <td className="p-3">
                    <span 
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        result.success 
                          ? 'bg-success-soft text-success' 
                          : 'bg-danger-soft text-danger'
                      }`}
                    >
                      {result.success ? 'Scheduled' : 'Failed'}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary break-all">
                    {result.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
