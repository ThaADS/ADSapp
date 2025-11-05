/**
 * RBAC Module Index
 *
 * Export all RBAC utilities for easy import
 */

// Permissions
export {
  RESOURCES,
  ACTIONS,
  SYSTEM_ROLES,
  PERMISSION_PRESETS,
  createPermission,
  isWildcardPermission,
  permissionMatches,
  mergePermissions,
  type Resource,
  type Action,
  type Permission,
  type PermissionConditions,
} from './permissions'

// Checker
export {
  hasPermission,
  getUserPermissions,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission as requirePermissionCheck,
  type PermissionCheckContext,
} from './checker'

// Middleware
export {
  withRbac,
  requirePermission,
  withConversationRead,
  withConversationWrite,
  withContactRead,
  withContactWrite,
  withTemplateRead,
  withTemplateWrite,
  withAnalyticsRead,
  withAdminAccess,
  withBillingAccess,
  type RbacOptions,
} from './middleware'

// Roles
export {
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  revokeRole,
  getUserRoles,
  getOrganizationRoles,
  getUserHighestRole,
  hasRole,
  isSuperAdmin,
  isOrganizationOwner,
  isOrganizationAdmin,
  type Role,
  type UserRole,
} from './roles'
