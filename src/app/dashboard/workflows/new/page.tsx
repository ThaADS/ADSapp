'use client';

/**
 * Visual Workflow Builder Page
 *
 * Drag-and-drop interface for creating campaign workflows.
 * Supports conditional branching, delays, and message sequences.
 *
 * Phase 2 Feature - Visual Workflow Builder
 */

import React, { useEffect } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { WorkflowSidebar } from '@/components/workflow/workflow-sidebar';
import { WorkflowToolbar } from '@/components/workflow/workflow-toolbar';

// ============================================================================
// WORKFLOW BUILDER PAGE
// ============================================================================

export default function NewWorkflowPage() {
  const { workflow, createWorkflow } = useWorkflowStore();

  /**
   * Initialize workflow on mount
   */
  useEffect(() => {
    if (!workflow) {
      // Create a new workflow if none exists
      createWorkflow('Untitled Workflow', 'custom');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Toolbar */}
      <WorkflowToolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette Sidebar */}
        <WorkflowSidebar />

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas />
        </div>

        {/* Properties Panel (Future Implementation) */}
        {/* This will show node configuration details when a node is selected */}
      </div>
    </div>
  );
}
