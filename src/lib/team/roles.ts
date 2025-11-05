import { UserRole, UserPermissions } from '@/types/team';

// Role hierarchy levels (higher number = more authority)
const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  agent: 2,
  viewer: 1,
};

// Default permissions for each role
const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    'team.manage': true,
    'conversations.view': true,
    'conversations.manage': true,
    'conversations.delete': true,
    'contacts.view': true,
    'contacts.manage': true,
    'contacts.delete': true,
    'templates.view': true,
    'templates.use': true,
    'templates.manage': true,
    'automation.view': true,
    'automation.manage': true,
    'analytics.view': true,
    'analytics.export': true,
    'billing.view': true,
    'billing.manage': true,
    'settings.view': true,
    'settings.manage': true,
  },
  admin: {
    'team.manage': true,
    'conversations.view': true,
    'conversations.manage': true,
    'conversations.delete': true,
    'contacts.view': true,
    'contacts.manage': true,
    'contacts.delete': true,
    'templates.view': true,
    'templates.use': true,
    'templates.manage': true,
    'automation.view': true,
    'automation.manage': true,
    'analytics.view': true,
    'analytics.export': true,
    'billing.view': false,
    'billing.manage': false,
    'settings.view': true,
    'settings.manage': true,
  },
  agent: {
    'team.manage': false,
    'conversations.view': true,
    'conversations.manage': true,
    'conversations.delete': false,
    'contacts.view': true,
    'contacts.manage': true,
    'contacts.delete': false,
    'templates.view': true,
    'templates.use': true,
    'templates.manage': false,
    'automation.view': false,
    'automation.manage': false,
    'analytics.view': true,
    'analytics.export': false,
    'billing.view': false,
    'billing.manage': false,
    'settings.view': true,
    'settings.manage': false,
  },
  viewer: {
    'team.manage': false,
    'conversations.view': true,
    'conversations.manage': false,
    'conversations.delete': false,
    'contacts.view': true,
    'contacts.manage': false,
    'contacts.delete': false,
    'templates.view': true,
    'templates.use': false,
    'templates.manage': false,
    'automation.view': false,
    'automation.manage': false,
    'analytics.view': true,
    'analytics.export': false,
    'billing.view': false,
    'billing.manage': false,
    'settings.view': true,
    'settings.manage': false,
  },
};

/**
 * Get numeric level for a role
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role];
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: UserRole): UserPermissions {
  return { ...DEFAULT_PERMISSIONS[role] };
}

/**
 * Check if actor role can manage target role
 * Actor must have higher authority level than target
 */
export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Check if actor role can assign a specific role
 * Actor can assign roles at their level or below
 */
export function canAssignRole(actorRole: UserRole, roleToAssign: UserRole): boolean {
  return getRoleLevel(actorRole) >= getRoleLevel(roleToAssign);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permissions: Record<string, boolean>,
  requiredPermission: string
): boolean {
  // Owner has all permissions
  if (role === 'owner') {
    return true;
  }

  // Check explicit permission
  if (permissions[requiredPermission] === true) {
    return true;
  }

  // Check wildcard permissions (e.g., 'conversations.*' grants 'conversations.view')
  const permissionParts = requiredPermission.split('.');
  if (permissionParts.length === 2) {
    const wildcardPermission = `${permissionParts[0]}.*`;
    if (permissions[wildcardPermission] === true) {
      return true;
    }
  }

  // Check default role permissions
  const defaultPerms = DEFAULT_PERMISSIONS[role];
  return defaultPerms[requiredPermission as keyof UserPermissions] === true;
}

/**
 * Check if user can manage team (invite, remove members, change roles)
 */
export function canManageTeam(role: UserRole, permissions: Record<string, boolean>): boolean {
  return hasPermission(role, permissions, 'team.manage');
}

/**
 * Validate role transition
 * Returns error message if invalid, null if valid
 */
export function validateRoleChange(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
  isTargetSelf: boolean
): string | null {
  // Cannot change your own role
  if (isTargetSelf) {
    return 'Cannot modify your own role';
  }

  // Must have higher authority than target's current role
  if (!canManageRole(actorRole, targetCurrentRole)) {
    return `Insufficient permissions to modify ${targetCurrentRole} role`;
  }

  // Cannot assign role higher than your own
  if (!canAssignRole(actorRole, targetNewRole)) {
    return `Cannot assign ${targetNewRole} role (requires ${targetNewRole} or higher)`;
  }

  return null;
}

/**
 * Validate member removal
 * Returns error message if invalid, null if valid
 */
export function validateMemberRemoval(
  actorRole: UserRole,
  targetRole: UserRole,
  isTargetSelf: boolean,
  isLastOwner: boolean
): string | null {
  // Cannot remove yourself
  if (isTargetSelf) {
    return 'Cannot remove yourself from the team';
  }

  // Cannot remove last owner
  if (targetRole === 'owner' && isLastOwner) {
    return 'Cannot remove the last owner. Assign another owner first';
  }

  // Must have higher authority than target
  if (!canManageRole(actorRole, targetRole)) {
    return `Insufficient permissions to remove ${targetRole}`;
  }

  return null;
}

/**
 * Get all roles that an actor can assign
 */
export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  const actorLevel = getRoleLevel(actorRole);
  return Object.entries(ROLE_LEVELS)
    .filter(([, level]) => level <= actorLevel)
    .map(([role]) => role as UserRole)
    .sort((a, b) => getRoleLevel(b) - getRoleLevel(a));
}

/**
 * Merge custom permissions with default role permissions
 */
export function mergePermissions(
  role: UserRole,
  customPermissions: Record<string, boolean> = {}
): UserPermissions {
  const defaultPerms = getDefaultPermissions(role);
  return { ...defaultPerms, ...customPermissions };
}

/**
 * Validate permissions object
 * Returns array of invalid permission keys
 */
export function validatePermissions(permissions: Record<string, boolean>): string[] {
  const validPermissions = new Set(
    Object.keys(DEFAULT_PERMISSIONS.owner)
  );

  return Object.keys(permissions).filter(
    (perm) => !validPermissions.has(perm)
  );
}
