'use client';

import React, { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchHandoffs, resumeHandoff, Handoff } from '@/store/slices/botSlice';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

interface HandoffManagerProps {
  deviceId: string;
  handoffs: Handoff[];
  isLoading: boolean;
}

export default function HandoffManager({ deviceId, handoffs, isLoading }: HandoffManagerProps) {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchHandoffs(deviceId));
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch, deviceId]);

  const handleResume = async (senderJid: string) => {
    try {
      await dispatch(resumeHandoff({ deviceId, senderJid })).unwrap();
      addToast('Bot resumed successfully', 'success');
    } catch (error) {
      console.error('Failed to resume bot:', error);
      addToast('Failed to resume bot', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading && handoffs.length === 0) {
    return <div className="p-8 text-center text-text-muted">Checking active handoffs...</div>;
  }

  if (handoffs.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-surface-ground">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-text-primary font-medium mb-1">All Clear</p>
        <p className="text-sm text-text-muted mb-4">No active handoffs. The bot is handling all conversations.</p>
        <div className="group relative inline-block">
          <Button disabled variant="outline" className="opacity-50 cursor-not-allowed">
            Resume Bot
          </Button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            No active handoff to resume
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-warning-soft text-warning rounded-lg text-sm mb-4">
         <span className="font-bold">⚠️ Attention Needed:</span>
         <span>There are {handoffs.length} conversations waiting for human response.</span>
      </div>

      <div className="grid gap-4">
        {handoffs.map((handoff) => (
          <Card key={handoff.senderJid} padding="md" className="border-l-4 border-l-warning">
            <div className="flex justify-between items-center flex-wrap gap-4">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-text-primary">
                      {handoff.phoneNumber || handoff.senderJid.split('@')[0]}
                    </span>
                    <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-muted">
                      {handoff.reason === 'keyword' ? 'Keyword Trigger' : 'Manual Escalation'}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary">
                    <span className="text-text-muted">Handoff started:</span> {formatDate(handoff.handoffAt)}
                  </div>
                  <div className="text-sm text-text-secondary">
                    <span className="text-text-muted">Last activity:</span> {formatDate(handoff.lastActivity)}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <a 
                    href={`https://wa.me/${handoff.senderJid.split('@')[0]}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Open WhatsApp ↗
                  </a>
                  <Button onClick={() => handleResume(handoff.senderJid)} variant="primary" size="sm">
                    Resume Bot
                  </Button>
               </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
