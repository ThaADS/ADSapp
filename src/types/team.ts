import { z } from 'zod';

// User roles with hierarchy
export type UserRole = 'owner' | 'admin' | 'agent' | 'viewer';

// Team member interface
export interface TeamMember {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

// Team invitation interface
export interface TeamInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  token: string;
  invited_by: string;
  invited_by_name?: string;
  invited_by_email?: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Permission structure
export interface UserPermissions {
  'team.manage'?: boolean;
  'conversations.view'?: boolean;
  'conversations.manage'?: boolean;
  'conversations.delete'?: boolean;
  'contacts.view'?: boolean;
  'contacts.manage'?: boolean;
  'contacts.delete'?: boolean;
  'templates.view'?: boolean;
  'templates.use'?: boolean;
  'templates.manage'?: boolean;
  'automation.view'?: boolean;
  'automation.manage'?: boolean;
  'analytics.view'?: boolean;
  'analytics.export'?: boolean;
  'billing.view'?: boolean;
  'billing.manage'?: boolean;
  'settings.view'?: boolean;
  'settings.manage'?: boolean;
}

// Zod validation schemas
export const UserRoleSchema = z.enum(['owner', 'admin', 'agent', 'viewer']);

export const UserPermissionsSchema = z.record(z.boolean()).optional();

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: UserRoleSchema,
  permissions: UserPermissionsSchema.default({}),
});

export const UpdateMemberSchema = z.object({
  role: UserRoleSchema.optional(),
  permissions: UserPermissionsSchema,
}).refine(
  (data) => data.role !== undefined || data.permissions !== undefined,
  { message: 'At least one of role or permissions must be provided' }
);

export const ListMembersQuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  role: UserRoleSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const ListInvitationsQuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'expired', 'accepted', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Type exports for schema inference
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type ListMembersQuery = z.infer<typeof ListMembersQuerySchema>;
export type ListInvitationsQuery = z.infer<typeof ListInvitationsQuerySchema>;

// API response types
export interface ListMembersResponse {
  members: TeamMember[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListInvitationsResponse {
  invitations: TeamInvitation[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvitationCreatedResponse {
  invitation: TeamInvitation;
  message: string;
}

export interface MemberUpdatedResponse {
  member: TeamMember;
  message: string;
}

export interface MemberRemovedResponse {
  message: string;
}

export interface InvitationCancelledResponse {
  message: string;
}
