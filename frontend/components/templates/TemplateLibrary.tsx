'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageTemplate, 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '@/lib/userService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface TemplateLibraryProps {
  onSelectTemplate?: (template: MessageTemplate) => void;
  selectable?: boolean;
}

export default function TemplateLibrary({ 
  onSelectTemplate, 
  selectable = false 
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTemplates({ search: searchQuery || undefined });
      setTemplates(result.templates);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(timer);
  }, [fetchTemplates]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContent.trim()) return;

    setFormSubmitting(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, {
          name: formName,
          content: formContent,
          category: formCategory || undefined
        });
      } else {
        await createTemplate({
          name: formName,
          content: formContent,
          category: formCategory || undefined
        });
      }
      resetForm();
      fetchTemplates();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      alert(errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      fetchTemplates();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      alert(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setFormName(template.name);
    setFormContent(template.content);
    setFormCategory(template.category || '');
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormContent('');
    setFormCategory('');
  };

  // Extract variable preview
  const getVariablePreview = (variables: string[]) => {
    if (variables.length === 0) return null;
    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {variables.map(v => (
          <span key={v} className="text-xs bg-primary-soft text-primary px-1.5 py-0.5 rounded">
            {`{{${v}}}`}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Message Templates
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Save and reuse message templates with variables
            </p>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            + New Template
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-elevated rounded-lg border border-border space-y-3">
            <h3 className="font-medium text-text-primary">
              {editingId ? 'Edit Template' : 'Create Template'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Template Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
                maxLength={100}
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={50}
              />
            </div>

            <textarea
              placeholder="Message content... Use {{variableName}} for placeholders"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
              required
              maxLength={2000}
            />

            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-danger-soft text-danger rounded-lg text-sm">{error}</div>
        )}

        {/* Template List */}
        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <svg className="w-12 h-12 mx-auto text-text-muted opacity-50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-text-secondary">
              {searchQuery ? 'No templates match your search' : 'No templates yet. Create your first one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-4 border border-border rounded-lg hover:border-primary/50 transition-colors ${
                  selectable ? 'cursor-pointer' : ''
                }`}
                onClick={() => selectable && onSelectTemplate?.(template)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary">{template.name}</h4>
                      {template.category && (
                        <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary">
                          {template.category}
                        </span>
                      )}
                      <span className="text-xs text-text-secondary">
                        Used {template.usageCount}×
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                      {template.content}
                    </p>
                    {getVariablePreview(template.variables)}
                  </div>

                  {!selectable && (
                    <div className="flex gap-1 shrink-0">
                      <button 
                        type="button"
                        className="h-8 px-2 rounded-lg transition-all bg-transparent text-text-secondary hover:bg-elevated hover:text-text-primary"
                        onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        className="h-8 px-2 rounded-lg transition-all bg-transparent text-danger hover:bg-danger-soft"
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
