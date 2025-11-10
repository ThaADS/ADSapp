'use client';

/**
 * Workflow Templates Gallery Component
 *
 * Displays pre-built workflow templates that users can preview and use.
 * Includes search, filtering by category, and template preview.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Zap,
  MessageSquare,
  Clock,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import {
  workflowTemplates,
  getTemplateCategories,
  searchTemplates,
  getTemplatesByCategory,
  type WorkflowTemplate,
} from '@/lib/workflow/templates';
import { useWorkflowStore } from '@/stores/workflow-store';

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const categoryIcons: Record<WorkflowTemplate['category'], React.ReactNode> = {
  onboarding: <Sparkles className="w-4 h-4" />,
  nurturing: <MessageSquare className="w-4 h-4" />,
  support: <Zap className="w-4 h-4" />,
  marketing: <ChevronRight className="w-4 h-4" />,
  engagement: <MessageSquare className="w-4 h-4" />,
  feedback: <Clock className="w-4 h-4" />,
};

const categoryColors: Record<
  WorkflowTemplate['category'],
  { bg: string; text: string; border: string }
> = {
  onboarding: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  nurturing: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  support: {
    bg: 'bg-violet-50 dark:bg-violet-950',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
  },
  marketing: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  engagement: {
    bg: 'bg-pink-50 dark:bg-pink-950',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
  },
  feedback: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

const difficultyColors = {
  beginner: 'text-green-600 dark:text-green-400',
  intermediate: 'text-yellow-600 dark:text-yellow-400',
  advanced: 'text-red-600 dark:text-red-400',
};

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: (template: WorkflowTemplate) => void;
  onPreview: (template: WorkflowTemplate) => void;
}

function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const categoryColor = categoryColors[template.category];

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Template icon/preview */}
      <div
        className={`${categoryColor.bg} ${categoryColor.border} border-b p-6 flex items-center justify-center`}
      >
        <div className="text-6xl">{template.icon}</div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 ${categoryColor.bg} ${categoryColor.border} border rounded-full text-xs font-medium ${categoryColor.text}`}
          >
            {categoryIcons[template.category]}
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </span>
          {template.estimatedDuration && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              {template.estimatedDuration}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 rounded">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <span
            className={`text-xs font-medium ${difficultyColors[template.difficulty]}`}
          >
            {template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => onPreview(template)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Preview
            </button>
            <button
              onClick={() => onSelect(template)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE PREVIEW MODAL
// ============================================================================

interface TemplatePreviewModalProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onUse: () => void;
}

function TemplatePreviewModal({ template, onClose, onUse }: TemplatePreviewModalProps) {
  const categoryColor = categoryColors[template.category];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${categoryColor.bg} ${categoryColor.border} border-b p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{template.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 ${categoryColor.bg} ${categoryColor.border} border rounded-full text-xs font-medium ${categoryColor.text}`}
                  >
                    {categoryIcons[template.category]}
                    {template.category.charAt(0).toUpperCase() +
                      template.category.slice(1)}
                  </span>
                  <span
                    className={`text-xs font-medium ${difficultyColors[template.difficulty]}`}
                  >
                    {template.difficulty.charAt(0).toUpperCase() +
                      template.difficulty.slice(1)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {template.name}
                </h2>
                {template.estimatedDuration && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Estimated duration: {template.estimatedDuration}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {template.description}
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Workflow structure */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Workflow Structure
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {template.nodes.length} nodes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {template.edges.length} connections
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {
                      template.nodes.filter((node) => node.type === 'message')
                        .length
                    }{' '}
                    messages
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {template.nodes.filter((node) => node.type === 'delay').length}{' '}
                    delays
                  </span>
                </div>
                {template.nodes.filter((node) => node.type === 'condition').length >
                  0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {
                        template.nodes.filter((node) => node.type === 'condition')
                          .length
                      }{' '}
                      conditions
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Default Settings
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">
                    Allow Re-entry:
                  </dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {template.defaultSettings.allowReentry ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">
                    Stop on Error:
                  </dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {template.defaultSettings.stopOnError ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">
                    Track Conversions:
                  </dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {template.defaultSettings.trackConversions ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUse}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface WorkflowTemplatesProps {
  onSelectTemplate?: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<WorkflowTemplate['category'] | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(
    null
  );

  const { setWorkflow } = useWorkflowStore();

  const categories = useMemo(() => getTemplateCategories(), []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = workflowTemplates;

    // Apply category filter
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
      // If category is selected, further filter by category
      if (selectedCategory !== 'all') {
        templates = templates.filter((t) => t.category === selectedCategory);
      }
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  /**
   * Handle template selection
   */
  const handleSelectTemplate = (template: WorkflowTemplate) => {
    // Convert template to full workflow
    const workflow = {
      id: `workflow_${Date.now()}`,
      organizationId: '', // Will be set from context
      name: template.name,
      description: template.description,
      type: 'automation' as const,
      status: 'draft' as const,
      nodes: template.nodes,
      edges: template.edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '', // Will be set from context
      version: 1,
      settings: template.defaultSettings,
    };

    // Load into workflow store
    setWorkflow(workflow);

    // Close preview if open
    setPreviewTemplate(null);

    // Callback
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Workflow Templates
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Start with a pre-built template and customize it for your needs
        </p>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({workflowTemplates.length})
          </button>
          {categories.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-600 mb-2">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
              No templates found
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => handleSelectTemplate(previewTemplate)}
        />
      )}
    </div>
  );
}
