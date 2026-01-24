// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock admin components
const OrganizationList = ({ organizations, onSuspend, onActivate, onView }: any) => (
  <div>
    <h2>Organizations</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Users</th>
          <th>Subscription</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org: any) => (
          <tr key={org.id} data-testid={`org-${org.id}`}>
            <td>{org.name}</td>
            <td>
              <span className={`status-${org.status}`}>{org.status}</span>
            </td>
            <td>{org.userCount}</td>
            <td>{org.subscription}</td>
            <td>
              <button onClick={() => onView(org.id)} aria-label={`View ${org.name}`}>
                View
              </button>
              {org.status === 'active' ? (
                <button
                  onClick={() => onSuspend(org.id)}
                  aria-label={`Suspend ${org.name}`}
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => onActivate(org.id)}
                  aria-label={`Activate ${org.name}`}
                >
                  Activate
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {organizations.length === 0 && <p>No organizations found</p>}
  </div>
);

const UserManagement = ({ users, onRoleChange, onDelete, onImpersonate }: any) => (
  <div>
    <h2>User Management</h2>
    <div>
      <input type="text" placeholder="Search users..." aria-label="Search users" />
      <select aria-label="Filter by role">
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="agent">Agent</option>
        <option value="viewer">Viewer</option>
      </select>
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Organization</th>
          <th>Last Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user: any) => (
          <tr key={user.id} data-testid={`user-${user.id}`}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>
              <select
                value={user.role}
                onChange={(e) => onRoleChange(user.id, e.target.value)}
                aria-label={`Change role for ${user.name}`}
              >
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </td>
            <td>{user.organization}</td>
            <td>{user.lastActive}</td>
            <td>
              <button
                onClick={() => onImpersonate(user.id)}
                aria-label={`Impersonate ${user.name}`}
              >
                Impersonate
              </button>
              <button
                onClick={() => onDelete(user.id)}
                aria-label={`Delete ${user.name}`}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {users.length === 0 && <p>No users found</p>}
  </div>
);

const AuditLogViewer = ({ logs, onFilter, onExport }: any) => (
  <div>
    <h2>Audit Logs</h2>
    <div>
      <select aria-label="Filter by action type">
        <option value="all">All Actions</option>
        <option value="login">Login</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
        <option value="suspend">Suspend</option>
      </select>
      <select aria-label="Filter by user">
        <option value="all">All Users</option>
        <option value="admin">Admin Users</option>
        <option value="user">Regular Users</option>
      </select>
      <input type="date" aria-label="From date" />
      <input type="date" aria-label="To date" />
      <button onClick={onFilter} aria-label="Apply filters">
        Apply Filters
      </button>
      <button onClick={onExport} aria-label="Export logs">
        Export
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Resource</th>
          <th>Details</th>
          <th>IP Address</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log: any) => (
          <tr key={log.id} data-testid={`log-${log.id}`}>
            <td>{log.timestamp}</td>
            <td>{log.user}</td>
            <td>
              <span className={`action-${log.action}`}>{log.action}</span>
            </td>
            <td>{log.resource}</td>
            <td>{log.details}</td>
            <td>{log.ipAddress}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {logs.length === 0 && <p>No audit logs found</p>}
  </div>
);

describe('Admin Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true);
  });

  describe('OrganizationList', () => {
    const mockOrganizations = [
      {
        id: '1',
        name: 'Acme Corp',
        status: 'active',
        userCount: 25,
        subscription: 'Enterprise',
      },
      {
        id: '2',
        name: 'Tech Solutions',
        status: 'active',
        userCount: 10,
        subscription: 'Professional',
      },
      {
        id: '3',
        name: 'Suspended Co',
        status: 'suspended',
        userCount: 5,
        subscription: 'Basic',
      },
    ];

    it('should render all organizations', () => {
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
      expect(screen.getByText('Suspended Co')).toBeInTheDocument();
    });

    it('should display organization details correctly', () => {
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Enterprise')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should show suspend button for active organizations', () => {
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      expect(screen.getByLabelText('Suspend Acme Corp')).toBeInTheDocument();
    });

    it('should show activate button for suspended organizations', () => {
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      expect(screen.getByLabelText('Activate Suspended Co')).toBeInTheDocument();
    });

    it('should call onSuspend when suspend button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      const suspendButton = screen.getByLabelText('Suspend Acme Corp');
      await user.click(suspendButton);

      expect(mockOnSuspend).toHaveBeenCalledWith('1');
    });

    it('should call onView when view button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(mockOnView).toHaveBeenCalledWith('1');
    });

    it('should show no organizations message when list is empty', () => {
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={[]}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('No organizations found')).toBeInTheDocument();
    });
  });

  describe('UserManagement', () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Admin',
        email: 'john@acme.com',
        role: 'admin',
        organization: 'Acme Corp',
        lastActive: '2024-01-25 10:30',
      },
      {
        id: '2',
        name: 'Jane Agent',
        email: 'jane@acme.com',
        role: 'agent',
        organization: 'Acme Corp',
        lastActive: '2024-01-25 09:15',
      },
      {
        id: '3',
        name: 'Bob Viewer',
        email: 'bob@tech.com',
        role: 'viewer',
        organization: 'Tech Solutions',
        lastActive: '2024-01-24 16:45',
      },
    ];

    it('should render all users', () => {
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      expect(screen.getByText('John Admin')).toBeInTheDocument();
      expect(screen.getByText('Jane Agent')).toBeInTheDocument();
      expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    });

    it('should have search and filter controls', () => {
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      expect(screen.getByLabelText('Search users')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
    });

    it('should call onRoleChange when role is changed', async () => {
      const user = userEvent.setup();
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      const roleSelect = screen.getByLabelText('Change role for John Admin');
      await user.selectOptions(roleSelect, 'agent');

      expect(mockOnRoleChange).toHaveBeenCalledWith('1', 'agent');
    });

    it('should call onImpersonate when impersonate button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      const impersonateButton = screen.getByLabelText('Impersonate John Admin');
      await user.click(impersonateButton);

      expect(mockOnImpersonate).toHaveBeenCalledWith('1');
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      const deleteButton = screen.getByLabelText('Delete Bob Viewer');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('3');
    });
  });

  describe('AuditLogViewer', () => {
    const mockLogs = [
      {
        id: '1',
        timestamp: '2024-01-25 10:30:15',
        user: 'admin@example.com',
        action: 'suspend',
        resource: 'Organization: Acme Corp',
        details: 'Suspended due to payment failure',
        ipAddress: '192.168.1.1',
      },
      {
        id: '2',
        timestamp: '2024-01-25 09:15:30',
        user: 'user@example.com',
        action: 'login',
        resource: 'System',
        details: 'Successful login',
        ipAddress: '192.168.1.100',
      },
      {
        id: '3',
        timestamp: '2024-01-24 16:45:00',
        user: 'admin@example.com',
        action: 'delete',
        resource: 'User: john@acme.com',
        details: 'User account deleted',
        ipAddress: '192.168.1.1',
      },
    ];

    it('should render all audit logs', () => {
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText('admin@example.com').length).toBeGreaterThan(0);
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText(/suspended due to payment failure/i)).toBeInTheDocument();
    });

    it('should have filter controls for action type and user', () => {
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByLabelText('Filter by action type')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by user')).toBeInTheDocument();
      expect(screen.getByLabelText('From date')).toBeInTheDocument();
      expect(screen.getByLabelText('To date')).toBeInTheDocument();
    });

    it('should call onFilter when apply filters button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      const applyButton = screen.getByLabelText('Apply filters');
      await user.click(applyButton);

      expect(mockOnFilter).toHaveBeenCalled();
    });

    it('should call onExport when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByLabelText('Export logs');
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalled();
    });

    it('should display log actions with appropriate styling', () => {
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      const suspendAction = screen.getByText('suspend');
      expect(suspendAction).toHaveClass('action-suspend');

      const loginAction = screen.getByText('login');
      expect(loginAction).toHaveClass('action-login');
    });

    it('should show no logs message when list is empty', () => {
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={[]}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('No audit logs found')).toBeInTheDocument();
    });
  });

  describe('Admin Accessibility', () => {
    it('should have accessible action buttons with descriptive labels', () => {
      const mockOrganizations = [
        { id: '1', name: 'Acme Corp', status: 'active', userCount: 25, subscription: 'Enterprise' },
      ];
      const mockOnSuspend = jest.fn();
      const mockOnActivate = jest.fn();
      const mockOnView = jest.fn();

      render(
        <OrganizationList
          organizations={mockOrganizations}
          onSuspend={mockOnSuspend}
          onActivate={mockOnActivate}
          onView={mockOnView}
        />
      );

      const suspendButton = screen.getByLabelText('Suspend Acme Corp');
      expect(suspendButton).toHaveAccessibleName();
    });

    it('should have accessible role select dropdowns', () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Admin',
          email: 'john@acme.com',
          role: 'admin',
          organization: 'Acme Corp',
          lastActive: '2024-01-25 10:30',
        },
      ];
      const mockOnRoleChange = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnImpersonate = jest.fn();

      render(
        <UserManagement
          users={mockUsers}
          onRoleChange={mockOnRoleChange}
          onDelete={mockOnDelete}
          onImpersonate={mockOnImpersonate}
        />
      );

      const roleSelect = screen.getByLabelText('Change role for John Admin');
      expect(roleSelect).toHaveAccessibleName();
    });

    it('should have accessible filter controls in audit logs', () => {
      const mockLogs = [];
      const mockOnFilter = jest.fn();
      const mockOnExport = jest.fn();

      render(
        <AuditLogViewer
          logs={mockLogs}
          onFilter={mockOnFilter}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByLabelText('Filter by action type')).toHaveAccessibleName();
      expect(screen.getByLabelText('Filter by user')).toHaveAccessibleName();
      expect(screen.getByLabelText('From date')).toHaveAccessibleName();
      expect(screen.getByLabelText('To date')).toHaveAccessibleName();
    });
  });
});
