'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserTags } from '@/lib/userService';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
  disabled?: boolean;
  className?: string;
}

export default function TagInput({
  value = [],
  onChange,
  placeholder = 'Add tag...',
  maxTags = 10,
  maxTagLength = 30,
  disabled = false,
  className = '',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch existing tags for autocomplete
  const fetchTags = useCallback(async () => {
    if (allTags.length > 0) return; // Already fetched
    
    setLoading(true);
    try {
      const result = await getUserTags();
      setAllTags(result.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }, [allTags.length]);

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags
        .filter(tag => 
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allTags, value]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().slice(0, maxTagLength);
    
    // Validate tag format (alphanumeric, spaces, dashes)
    if (!/^[\w\s-]+$/.test(cleanTag)) {
      return;
    }

    if (cleanTag && !value.includes(cleanTag) && value.length < maxTags) {
      onChange([...value, cleanTag]);
      setInputValue('');
      setSuggestions([]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div 
        className={`
          flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background 
          focus-within:ring-2 focus-within:ring-primary transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed bg-elevated' : 'border-border'}
        `}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map(tag => (
          <span 
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-soft text-primary text-sm rounded-full"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:text-danger transition-colors"
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {value.length < maxTags && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-text-primary"
            disabled={disabled}
          />
        )}

        {/* Max tags indicator */}
        {value.length >= maxTags && (
          <span className="text-xs text-text-secondary ml-auto">
            Max {maxTags} tags
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-2 text-sm text-text-secondary">Loading...</div>
          ) : (
            suggestions.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSuggestionClick(tag)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-elevated transition-colors flex items-center gap-2"
              >
                <span className="text-primary">+</span>
                {tag}
              </button>
            ))
          )}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 text-xs text-text-secondary">
        Press Enter or comma to add. {value.length}/{maxTags} tags.
      </div>
    </div>
  );
}
