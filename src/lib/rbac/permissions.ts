/**
 * RBAC Permission Definitions
 *
 * Defines all resources, actions, and permission structures
 */

/**
 * Available resources in the system
 */
export const RESOURCES = {
  // Core resources
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
  ROLES: 'roles',
  CONVERSATIONS: 'conversations',
  CONTACTS: 'contacts',
  MESSAGES: 'messages',
  TEMPLATES: 'templates',
  AUTOMATION: 'automation',

  // Business resources
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  BILLING: 'billing',
  SETTINGS: 'settings',

  // System resources
  WEBHOOKS: 'webhooks',
  INTEGRATIONS: 'integrations',
  API_KEYS: 'api_keys',
  AUDIT_LOGS: 'audit_logs',
} as const

export type Resource = typeof RESOURCES[keyof typeof RESOURCES]

/**
 * Available actions
 */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',

  // Special actions
  EXPORT: 'export',
  IMPORT: 'import',
  USE: 'use',
  ASSIGN: 'assign',
  CLOSE: 'close',
  ARCHIVE: 'archive',
  RESTORE: 'restore',

  // Wildcard
  ALL: '*',
} as const

export type Action = typeof ACTIONS[keyof typeof ACTIONS]

/**
 * Permission conditions
 */
export interface PermissionConditions {
  /** User owns the resource */
  own?: boolean
  /** Resource belongs to user's team */
  team?: boolean
  /** Resource belongs to user's organization */
  organization?: boolean
  /** Resource has specific tags */
  tags?: string[]
  /** Resource status */
  status?: string[]
  /** Custom conditions */
  custom?: Record<string, any>
}

/**
 * Permission structure
 */
export interface Permission {
  resource: Resource | '*'
  action: Action
  conditions?: PermissionConditions
  description?: string
}

/**
 * System role definitions with default permissions
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    description: 'Platform super administrator with full access',
    priority: 1000,
    permissions: [
      { resource: '*', action: ACTIONS.ALL },
    ] as Permission[],
  },

  ORGANIZATION_OWNER: {
    name: 'organization_owner',
    description: 'Organization owner with full organizational access',
    priority: 900,
    permissions: [
      { resource: RESOURCES.ORGANIZATIONS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.USERS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.ROLES, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.AUTOMATION, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.ANALYTICS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.REPORTS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.BILLING, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.SETTINGS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.WEBHOOKS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.INTEGRATIONS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.API_KEYS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.AUDIT_LOGS, action: ACTIONS.READ, conditions: { organization: true } },
    ] as Permission[],
  },

  ORGANIZATION_ADMIN: {
    name: 'organization_admin',
    description: 'Organization administrator with management access',
    priority: 800,
    permissions: [
      { resource: RESOURCES.USERS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.USERS, action: ACTIONS.CREATE, conditions: { organization: true } },
      { resource: RESOURCES.USERS, action: ACTIONS.UPDATE, conditions: { organization: true } },
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.AUTOMATION, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.REPORTS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.SETTINGS, action: ACTIONS.READ, conditions: { organization: true } },
    ] as Permission[],
  },

  TEAM_LEAD: {
    name: 'team_lead',
    description: 'Team lead with team management access',
    priority: 700,
    permissions: [
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.ALL, conditions: { team: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.ALL, conditions: { team: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.ALL, conditions: { team: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.USE, conditions: { organization: true } },
      { resource: RESOURCES.AUTOMATION, action: ACTIONS.READ, conditions: { team: true } },
      { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, conditions: { team: true } },
      { resource: RESOURCES.REPORTS, action: ACTIONS.READ, conditions: { team: true } },
    ] as Permission[],
  },

  SUPERVISOR: {
    name: 'supervisor',
    description: 'Supervisor with monitoring and reporting access',
    priority: 650,
    permissions: [
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.REPORTS, action: ACTIONS.ALL, conditions: { organization: true } },
    ] as Permission[],
  },

  AGENT: {
    name: 'agent',
    description: 'Agent with conversation handling access',
    priority: 600,
    permissions: [
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.CREATE, conditions: { organization: true } },
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.UPDATE, conditions: { own: true } },
      { resource: RESOURCES.CONVERSATIONS, action: ACTIONS.CLOSE, conditions: { own: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.CREATE, conditions: { organization: true } },
      { resource: RESOURCES.CONTACTS, action: ACTIONS.UPDATE, conditions: { own: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.MESSAGES, action: ACTIONS.CREATE, conditions: { own: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.TEMPLATES, action: ACTIONS.USE, conditions: { organization: true } },
    ] as Permission[],
  },

  BILLING_MANAGER: {
    name: 'billing_manager',
    description: 'Billing manager with financial access',
    priority: 500,
    permissions: [
      { resource: RESOURCES.BILLING, action: ACTIONS.ALL, conditions: { organization: true } },
      { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, conditions: { organization: true } },
      { resource: RESOURCES.REPORTS, action: ACTIONS.READ, conditions: { organization: true } },
    ] as Permission[],
  },
} as const

/**
 * Helper to create custom permissions
 */
export function createPermission(
  resource: Resource | '*',
  action: Action,
  conditions?: PermissionConditions
): Permission {
  return { resource, action, conditions }
}

/**
 * Check if permission allows all actions on resource
 */
export function isWildcardPermission(permission: Permission): boolean {
  return permission.resource === '*' || permission.action === '*'
}

/**
 * Check if permission matches resource and action
 */
export function permissionMatches(
  permission: Permission,
  resource: Resource,
  action: Action
): boolean {
  const resourceMatches = permission.resource === '*' || permission.resource === resource
  const actionMatches = permission.action === '*' || permission.action === action

  return resourceMatches && actionMatches
}

/**
 * Merge multiple permission arrays, removing duplicates
 */
export function mergePermissions(...permissionArrays: Permission[][]): Permission[] {
  const merged = permissionArrays.flat()
  const unique = new Map<string, Permission>()

  merged.forEach(permission => {
    const key = `${permission.resource}:${permission.action}`
    if (!unique.has(key) || isWildcardPermission(permission)) {
      unique.set(key, permission)
    }
  })

  return Array.from(unique.values())
}

/**
 * Permission presets for common scenarios
 */
export const PERMISSION_PRESETS = {
  READ_ONLY: [
    createPermission(RESOURCES.CONVERSATIONS, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.CONTACTS, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.MESSAGES, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.TEMPLATES, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.ANALYTICS, ACTIONS.READ, { organization: true }),
  ],

  CONVERSATION_HANDLER: [
    createPermission(RESOURCES.CONVERSATIONS, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.CONVERSATIONS, ACTIONS.CREATE, { organization: true }),
    createPermission(RESOURCES.CONVERSATIONS, ACTIONS.UPDATE, { own: true }),
    createPermission(RESOURCES.MESSAGES, ACTIONS.CREATE, { own: true }),
    createPermission(RESOURCES.CONTACTS, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.TEMPLATES, ACTIONS.USE, { organization: true }),
  ],

  CONTENT_MANAGER: [
    createPermission(RESOURCES.TEMPLATES, ACTIONS.ALL, { organization: true }),
    createPermission(RESOURCES.AUTOMATION, ACTIONS.ALL, { organization: true }),
  ],

  ANALYST: [
    createPermission(RESOURCES.ANALYTICS, ACTIONS.ALL, { organization: true }),
    createPermission(RESOURCES.REPORTS, ACTIONS.ALL, { organization: true }),
    createPermission(RESOURCES.CONVERSATIONS, ACTIONS.READ, { organization: true }),
    createPermission(RESOURCES.CONTACTS, ACTIONS.READ, { organization: true }),
  ],
}
