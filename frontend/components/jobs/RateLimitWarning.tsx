'use client';

import React from 'react';

interface RateLimitWarningProps {
  recipientsCount: number;
  delaySeconds: number;
}

type RiskLevel = 'safe' | 'aggressive' | 'high-risk';

interface RiskAssessment {
  level: RiskLevel;
  icon: string;
  title: string;
  message: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

/**
 * Calculate risk level based on recipients count and delay
 * 
 * Heuristic Logic:
 * - Messages per minute = 60 / delaySeconds
 * - Safe: ≤10 msg/min OR (recipients ≤ 20 AND delay ≥ 3s)
 * - Aggressive: 10-20 msg/min OR (recipients 21-50 AND delay 2-3s)
 * - High Risk: >20 msg/min OR (recipients >50 AND delay <3s)
 */
function assessRisk(recipientsCount: number, delaySeconds: number): RiskAssessment {
  // Calculate messages per minute
  const messagesPerMinute = 60 / Math.max(delaySeconds, 1);
  
  // Scoring factors
  const isHighVolume = recipientsCount > 50;
  const isMediumVolume = recipientsCount > 20;
  const isFastRate = messagesPerMinute > 20;
  const isModerateRate = messagesPerMinute > 10;
  const isSlowDelay = delaySeconds < 2;
  
  // Determine risk level
  let level: RiskLevel;
  
  if (isFastRate || (isHighVolume && isSlowDelay)) {
    level = 'high-risk';
  } else if (isModerateRate || (isMediumVolume && delaySeconds < 3)) {
    level = 'aggressive';
  } else {
    level = 'safe';
  }
  
  // Generate assessment
  const estimatedDuration = Math.ceil((recipientsCount * delaySeconds) / 60);
  
  switch (level) {
    case 'safe':
      return {
        level,
        icon: '✅',
        title: 'Safe Sending Rate',
        message: `Sending ${recipientsCount} messages with ${delaySeconds}s delay is within safe limits. Estimated time: ~${estimatedDuration} min.`,
        bgClass: 'bg-success-soft',
        borderClass: 'border-success/30',
        textClass: 'text-success',
      };
    case 'aggressive':
      return {
        level,
        icon: '⚠️',
        title: 'Aggressive Rate',
        message: `${recipientsCount} recipients at ${delaySeconds}s delay may trigger rate limiting. Consider increasing delay to 4-5 seconds.`,
        bgClass: 'bg-warning-soft',
        borderClass: 'border-warning/30',
        textClass: 'text-warning',
      };
    case 'high-risk':
      return {
        level,
        icon: '🔴',
        title: 'High Ban Risk',
        message: `Sending ${recipientsCount} messages at ${delaySeconds}s delay is risky. WhatsApp may temporarily block your number. Strongly recommend: delay ≥5s, batch ≤30 recipients.`,
        bgClass: 'bg-danger-soft',
        borderClass: 'border-danger/30',
        textClass: 'text-danger',
      };
  }
}

export default function RateLimitWarning({ recipientsCount, delaySeconds }: RateLimitWarningProps) {
  // Don't show if no recipients configured
  if (recipientsCount === 0) return null;

  const assessment = assessRisk(recipientsCount, delaySeconds);

  return (
    <div className={`p-4 rounded-lg border ${assessment.bgClass} ${assessment.borderClass}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{assessment.icon}</span>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm ${assessment.textClass}`}>
            {assessment.title}
          </h4>
          <p className="text-sm text-text-secondary mt-1">
            {assessment.message}
          </p>
          
          {/* Quick Tips for non-safe levels */}
          {assessment.level !== 'safe' && (
            <div className="mt-3 text-xs text-text-muted">
              <strong>Tips:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Use 5-10 second delays for large batches</li>
                <li>Split large campaigns into multiple smaller jobs</li>
                <li>Avoid sending to new/unknown numbers in bulk</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
