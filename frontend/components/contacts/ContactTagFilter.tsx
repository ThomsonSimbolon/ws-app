'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getUserTags } from '@/lib/userService';

interface ContactTagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export default function ContactTagFilter({
  selectedTags,
  onTagsChange,
  className = '',
}: ContactTagFilterProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserTags();
      setAvailableTags(result.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-text-secondary">Loading tags...</span>
      </div>
    );
  }

  if (availableTags.length === 0) {
    return null; // Don't show filter if no tags exist
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-text-secondary">Filter:</span>
      
      {availableTags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleTag(tag)}
          className={`
            px-3 py-1 text-sm rounded-full border transition-all
            ${selectedTags.includes(tag)
              ? 'bg-primary text-white border-primary'
              : 'bg-background text-text-primary border-border hover:border-primary'
            }
          `}
        >
          {tag}
        </button>
      ))}

      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={clearTags}
          className="px-2 py-1 text-xs text-danger hover:text-danger-dark transition-colors"
        >
          × Clear
        </button>
      )}
    </div>
  );
}
