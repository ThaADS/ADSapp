/**
 * Workflow Migration Tools
 *
 * Convert legacy drip campaigns and broadcasts to visual workflows.
 * Preserves all configuration, timing, and logic.
 */

import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  TriggerNodeData,
  MessageNodeData,
  DelayNodeData,
} from '@/types/workflow';

// ============================================================================
// TYPE DEFINITIONS FOR LEGACY CAMPAIGNS
// ============================================================================

interface DripCampaignStep {
  id: string;
  order: number;
  delayAmount: number;
  delayUnit: 'minutes' | 'hours' | 'days' | 'weeks';
  messageTemplate?: string;
  customMessage?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
}

interface DripCampaign {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  trigger: 'tag_applied' | 'contact_added';
  triggerConfig: {
    tagIds?: string[];
  };
  steps: DripCampaignStep[];
  createdBy: string;
}

interface BroadcastCampaign {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  scheduledDate?: string;
  scheduledTime?: string;
  message: string;
  templateId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  targetContactIds?: string[];
  targetTagIds?: string[];
  createdBy: string;
}

// ============================================================================
// DRIP CAMPAIGN MIGRATION
// ============================================================================

/**
 * Convert drip campaign to visual workflow
 */
export function migrateDripCampaignToWorkflow(campaign: DripCampaign): Workflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Starting Y position for nodes
  let currentY = 50;
  const nodeSpacing = 180;
  const centerX = 250;

  // 1. Create trigger node
  const triggerNode: WorkflowNode = {
    id: `trigger_${campaign.id}`,
    type: 'trigger',
    position: { x: centerX, y: currentY },
    data: {
      label: 'Campaign Trigger',
      triggerType: campaign.trigger === 'tag_applied' ? 'tag_applied' : 'contact_added',
      triggerConfig: campaign.triggerConfig,
      isValid: true,
    } as TriggerNodeData,
  };

  nodes.push(triggerNode);
  let previousNodeId = triggerNode.id;
  currentY += nodeSpacing;

  // 2. Create nodes for each step
  campaign.steps
    .sort((a, b) => a.order - b.order)
    .forEach((step, index) => {
      // Create delay node (except for first step if delay is 0)
      if (step.delayAmount > 0 || index > 0) {
        const delayNode: WorkflowNode = {
          id: `delay_${step.id}`,
          type: 'delay',
          position: { x: centerX, y: currentY },
          data: {
            label: `Wait ${step.delayAmount} ${step.delayUnit}`,
            delayConfig: {
              amount: step.delayAmount,
              unit: step.delayUnit,
            },
            isValid: true,
          } as DelayNodeData,
        };

        nodes.push(delayNode);

        // Connect previous node to delay
        edges.push({
          id: `edge_${previousNodeId}_${delayNode.id}`,
          source: previousNodeId,
          target: delayNode.id,
          type: 'smoothstep',
        });

        previousNodeId = delayNode.id;
        currentY += nodeSpacing;
      }

      // Create message node
      const messageNode: WorkflowNode = {
        id: `message_${step.id}`,
        type: 'message',
        position: { x: centerX, y: currentY },
        data: {
          label: `Step ${index + 1}`,
          messageConfig: {
            templateId: step.messageTemplate,
            customMessage: step.customMessage,
            mediaUrl: step.mediaUrl,
            mediaType: step.mediaType,
            useContactName: true,
          },
          isValid: true,
        } as MessageNodeData,
      };

      nodes.push(messageNode);

      // Connect previous node to message
      edges.push({
        id: `edge_${previousNodeId}_${messageNode.id}`,
        source: previousNodeId,
        target: messageNode.id,
        type: 'smoothstep',
      });

      previousNodeId = messageNode.id;
      currentY += nodeSpacing;
    });

  // Create workflow
  const workflow: Workflow = {
    id: `workflow_${campaign.id}`,
    organizationId: campaign.organizationId,
    name: `${campaign.name} (Migrated)`,
    description: campaign.description
      ? `${campaign.description}\n\nMigrated from drip campaign on ${new Date().toLocaleDateString()}`
      : `Migrated from drip campaign on ${new Date().toLocaleDateString()}`,
    type: 'drip_campaign',
    status: 'draft',
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: campaign.createdBy,
    version: 1,
    settings: {
      allowReentry: false,
      stopOnError: true,
      trackConversions: true,
      timezone: 'UTC',
    },
  };

  return workflow;
}

/**
 * Convert multiple drip campaigns to workflows
 */
export function migrateDripCampaigns(campaigns: DripCampaign[]): Workflow[] {
  return campaigns.map((campaign) => migrateDripCampaignToWorkflow(campaign));
}

// ============================================================================
// BROADCAST CAMPAIGN MIGRATION
// ============================================================================

/**
 * Convert broadcast to visual workflow
 */
export function migrateBroadcastToWorkflow(broadcast: BroadcastCampaign): Workflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const centerX = 250;
  let currentY = 50;
  const nodeSpacing = 180;

  // 1. Create trigger node
  const triggerNode: WorkflowNode = {
    id: `trigger_${broadcast.id}`,
    type: 'trigger',
    position: { x: centerX, y: currentY },
    data: {
      label: 'Broadcast Trigger',
      triggerType: broadcast.scheduledDate ? 'date_time' : 'tag_applied',
      triggerConfig: {
        scheduledDate: broadcast.scheduledDate,
        scheduledTime: broadcast.scheduledTime,
        timezone: 'UTC',
        tagIds: broadcast.targetTagIds,
      },
      isValid: true,
    } as TriggerNodeData,
  };

  nodes.push(triggerNode);
  currentY += nodeSpacing;

  // 2. Create message node
  const messageNode: WorkflowNode = {
    id: `message_${broadcast.id}`,
    type: 'message',
    position: { x: centerX, y: currentY },
    data: {
      label: 'Broadcast Message',
      messageConfig: {
        templateId: broadcast.templateId,
        customMessage: broadcast.message,
        mediaUrl: broadcast.mediaUrl,
        mediaType: broadcast.mediaType,
        useContactName: true,
      },
      isValid: true,
    } as MessageNodeData,
  };

  nodes.push(messageNode);

  // 3. Connect nodes
  edges.push({
    id: `edge_${triggerNode.id}_${messageNode.id}`,
    source: triggerNode.id,
    target: messageNode.id,
    type: 'smoothstep',
  });

  // Create workflow
  const workflow: Workflow = {
    id: `workflow_${broadcast.id}`,
    organizationId: broadcast.organizationId,
    name: `${broadcast.name} (Migrated)`,
    description: broadcast.description
      ? `${broadcast.description}\n\nMigrated from broadcast on ${new Date().toLocaleDateString()}`
      : `Migrated from broadcast on ${new Date().toLocaleDateString()}`,
    type: 'broadcast',
    status: 'draft',
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: broadcast.createdBy,
    version: 1,
    settings: {
      allowReentry: false,
      stopOnError: false,
      trackConversions: true,
      timezone: 'UTC',
    },
  };

  return workflow;
}

/**
 * Convert multiple broadcasts to workflows
 */
export function migrateBroadcasts(broadcasts: BroadcastCampaign[]): Workflow[] {
  return broadcasts.map((broadcast) => migrateBroadcastToWorkflow(broadcast));
}

// ============================================================================
// BULK MIGRATION UTILITIES
// ============================================================================

/**
 * Migration result summary
 */
export interface MigrationResult {
  success: boolean;
  workflowsCreated: number;
  errors: Array<{
    campaignId: string;
    campaignName: string;
    error: string;
  }>;
  workflows: Workflow[];
}

/**
 * Bulk migrate drip campaigns
 */
export function bulkMigrateDripCampaigns(
  campaigns: DripCampaign[]
): MigrationResult {
  const result: MigrationResult = {
    success: true,
    workflowsCreated: 0,
    errors: [],
    workflows: [],
  };

  campaigns.forEach((campaign) => {
    try {
      const workflow = migrateDripCampaignToWorkflow(campaign);
      result.workflows.push(workflow);
      result.workflowsCreated++;
    } catch (error) {
      result.success = false;
      result.errors.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return result;
}

/**
 * Bulk migrate broadcast campaigns
 */
export function bulkMigrateBroadcasts(
  broadcasts: BroadcastCampaign[]
): MigrationResult {
  const result: MigrationResult = {
    success: true,
    workflowsCreated: 0,
    errors: [],
    workflows: [],
  };

  broadcasts.forEach((broadcast) => {
    try {
      const workflow = migrateBroadcastToWorkflow(broadcast);
      result.workflows.push(workflow);
      result.workflowsCreated++;
    } catch (error) {
      result.success = false;
      result.errors.push({
        campaignId: broadcast.id,
        campaignName: broadcast.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return result;
}

/**
 * Preview workflow before migration (return JSON preview)
 */
export function previewDripCampaignMigration(campaign: DripCampaign): {
  nodesCount: number;
  edgesCount: number;
  estimatedDuration: string;
  workflow: Workflow;
} {
  const workflow = migrateDripCampaignToWorkflow(campaign);

  // Calculate estimated duration
  let totalMinutes = 0;
  campaign.steps.forEach((step) => {
    switch (step.delayUnit) {
      case 'minutes':
        totalMinutes += step.delayAmount;
        break;
      case 'hours':
        totalMinutes += step.delayAmount * 60;
        break;
      case 'days':
        totalMinutes += step.delayAmount * 24 * 60;
        break;
      case 'weeks':
        totalMinutes += step.delayAmount * 7 * 24 * 60;
        break;
    }
  });

  let estimatedDuration = '';
  if (totalMinutes < 60) {
    estimatedDuration = `${totalMinutes} minutes`;
  } else if (totalMinutes < 24 * 60) {
    estimatedDuration = `${Math.round(totalMinutes / 60)} hours`;
  } else if (totalMinutes < 7 * 24 * 60) {
    estimatedDuration = `${Math.round(totalMinutes / (24 * 60))} days`;
  } else {
    estimatedDuration = `${Math.round(totalMinutes / (7 * 24 * 60))} weeks`;
  }

  return {
    nodesCount: workflow.nodes.length,
    edgesCount: workflow.edges.length,
    estimatedDuration,
    workflow,
  };
}
