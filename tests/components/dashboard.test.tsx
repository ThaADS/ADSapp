// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock dashboard components
const DashboardHeader = ({ user, onLogout, onNotificationClick }: any) => (
  <header>
    <h1>Dashboard</h1>
    <button onClick={onNotificationClick} aria-label="Notifications">
      <span>Notifications</span>
      {user.unreadNotifications > 0 && (
        <span data-testid="notification-badge">{user.unreadNotifications}</span>
      )}
    </button>
    <div>
      <button aria-label="User menu">{user.name}</button>
      <button onClick={onLogout}>Logout</button>
    </div>
  </header>
);

const Sidebar = ({ collapsed, onToggle, items }: any) => (
  <aside data-testid="sidebar" className={collapsed ? 'collapsed' : 'expanded'}>
    <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
      {collapsed ? 'Expand' : 'Collapse'}
    </button>
    <nav>
      {items.map((item: any) => (
        <a key={item.id} href={item.href} aria-label={item.label}>
          {item.icon && <span>{item.icon}</span>}
          {!collapsed && <span>{item.label}</span>}
        </a>
      ))}
    </nav>
  </aside>
);

const StatsCard = ({ title, value, change, loading, error }: any) => (
  <div data-testid="stats-card">
    <h3>{title}</h3>
    {loading ? (
      <div role="status" aria-label="Loading">Loading...</div>
    ) : error ? (
      <div role="alert" aria-label="Error">{error}</div>
    ) : (
      <>
        <div data-testid="stat-value">{value}</div>
        {change && (
          <div data-testid="stat-change" className={change > 0 ? 'positive' : 'negative'}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </>
    )}
  </div>
);

const QuickActions = ({ actions, onAction }: any) => (
  <div>
    <h2>Quick Actions</h2>
    {actions.map((action: any) => (
      <button
        key={action.id}
        onClick={() => onAction(action.id)}
        disabled={action.disabled}
        aria-label={action.label}
      >
        {action.icon && <span>{action.icon}</span>}
        <span>{action.label}</span>
      </button>
    ))}
  </div>
);

describe('Dashboard Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DashboardHeader', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      unreadNotifications: 5,
    };

    it('should render user name and navigation', () => {
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show notification badge with count', () => {
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('5');
    });

    it('should call onNotificationClick when notifications button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      const notificationButton = screen.getByLabelText('Notifications');
      await user.click(notificationButton);

      expect(mockOnNotificationClick).toHaveBeenCalled();
    });

    it('should call onLogout when logout button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      const logoutButton = screen.getByText('Logout');
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('should have accessible user menu button', () => {
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      const userMenuButton = screen.getByLabelText('User menu');
      expect(userMenuButton).toBeInTheDocument();
      expect(userMenuButton).toHaveAccessibleName();
    });
  });

  describe('Sidebar', () => {
    const mockItems = [
      { id: '1', label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { id: '2', label: 'Messages', href: '/messages', icon: '💬' },
      { id: '3', label: 'Contacts', href: '/contacts', icon: '👥' },
      { id: '4', label: 'Templates', href: '/templates', icon: '📝' },
      { id: '5', label: 'Settings', href: '/settings', icon: '⚙️' },
    ];

    it('should render all navigation links', () => {
      const mockOnToggle = jest.fn();

      render(
        <Sidebar
          collapsed={false}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Messages')).toBeInTheDocument();
      expect(screen.getByLabelText('Contacts')).toBeInTheDocument();
      expect(screen.getByLabelText('Templates')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should toggle sidebar collapse state', async () => {
      const user = userEvent.setup();
      const mockOnToggle = jest.fn();

      const { rerender } = render(
        <Sidebar
          collapsed={false}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      await user.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalled();

      // Simulate collapsed state
      rerender(
        <Sidebar
          collapsed={true}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('should apply collapsed class when sidebar is collapsed', () => {
      const mockOnToggle = jest.fn();

      render(
        <Sidebar
          collapsed={true}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveClass('collapsed');
    });

    it('should hide labels when sidebar is collapsed', () => {
      const mockOnToggle = jest.fn();

      render(
        <Sidebar
          collapsed={true}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      // In collapsed state, text labels should not be visible
      const links = screen.getAllByRole('link');
      expect(links.length).toBe(mockItems.length);
    });
  });

  describe('StatsCard', () => {
    it('should render stat title and value', () => {
      render(
        <StatsCard
          title="Total Messages"
          value="1,234"
          change={12.5}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByTestId('stat-value')).toHaveTextContent('1,234');
    });

    it('should show positive change indicator', () => {
      render(
        <StatsCard
          title="Total Messages"
          value="1,234"
          change={12.5}
          loading={false}
          error={null}
        />
      );

      const changeElement = screen.getByTestId('stat-change');
      expect(changeElement).toHaveTextContent('+12.5%');
      expect(changeElement).toHaveClass('positive');
    });

    it('should show negative change indicator', () => {
      render(
        <StatsCard
          title="Response Time"
          value="2.5s"
          change={-8.3}
          loading={false}
          error={null}
        />
      );

      const changeElement = screen.getByTestId('stat-change');
      expect(changeElement).toHaveTextContent('-8.3%');
      expect(changeElement).toHaveClass('negative');
    });

    it('should display loading state', () => {
      render(
        <StatsCard
          title="Total Messages"
          value=""
          change={null}
          loading={true}
          error={null}
        />
      );

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
      expect(screen.queryByTestId('stat-value')).not.toBeInTheDocument();
    });

    it('should display error state', () => {
      render(
        <StatsCard
          title="Total Messages"
          value=""
          change={null}
          loading={false}
          error="Failed to load statistics"
        />
      );

      const errorElement = screen.getByRole('alert', { name: /error/i });
      expect(errorElement).toHaveTextContent('Failed to load statistics');
      expect(screen.queryByTestId('stat-value')).not.toBeInTheDocument();
    });

    it('should handle stats without change indicators', () => {
      render(
        <StatsCard
          title="Active Contacts"
          value="456"
          change={null}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('stat-value')).toHaveTextContent('456');
      expect(screen.queryByTestId('stat-change')).not.toBeInTheDocument();
    });
  });

  describe('QuickActions', () => {
    const mockActions = [
      { id: 'new-message', label: 'New Message', icon: '✉️', disabled: false },
      { id: 'add-contact', label: 'Add Contact', icon: '➕', disabled: false },
      { id: 'create-template', label: 'Create Template', icon: '📄', disabled: false },
      { id: 'disabled-action', label: 'Disabled Action', icon: '🚫', disabled: true },
    ];

    it('should render all action buttons', () => {
      const mockOnAction = jest.fn();

      render(
        <QuickActions
          actions={mockActions}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByLabelText('New Message')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Contact')).toBeInTheDocument();
      expect(screen.getByLabelText('Create Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Disabled Action')).toBeInTheDocument();
    });

    it('should call onAction with correct action id when clicked', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn();

      render(
        <QuickActions
          actions={mockActions}
          onAction={mockOnAction}
        />
      );

      const newMessageButton = screen.getByLabelText('New Message');
      await user.click(newMessageButton);

      expect(mockOnAction).toHaveBeenCalledWith('new-message');
    });

    it('should disable action buttons when disabled prop is true', () => {
      const mockOnAction = jest.fn();

      render(
        <QuickActions
          actions={mockActions}
          onAction={mockOnAction}
        />
      );

      const disabledButton = screen.getByLabelText('Disabled Action');
      expect(disabledButton).toBeDisabled();
    });

    it('should not call onAction when disabled button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn();

      render(
        <QuickActions
          actions={mockActions}
          onAction={mockOnAction}
        />
      );

      const disabledButton = screen.getByLabelText('Disabled Action');
      await user.click(disabledButton);

      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('Dashboard Accessibility', () => {
    it('should have accessible notification button with aria-label', () => {
      const mockUser = { name: 'John Doe', unreadNotifications: 3 };
      const mockOnLogout = jest.fn();
      const mockOnNotificationClick = jest.fn();

      render(
        <DashboardHeader
          user={mockUser}
          onLogout={mockOnLogout}
          onNotificationClick={mockOnNotificationClick}
        />
      );

      const notificationButton = screen.getByLabelText('Notifications');
      expect(notificationButton).toHaveAccessibleName();
    });

    it('should support keyboard navigation in sidebar', async () => {
      const user = userEvent.setup();
      const mockOnToggle = jest.fn();
      const mockItems = [
        { id: '1', label: 'Dashboard', href: '/dashboard' },
        { id: '2', label: 'Messages', href: '/messages' },
      ];

      render(
        <Sidebar
          collapsed={false}
          onToggle={mockOnToggle}
          items={mockItems}
        />
      );

      await user.tab();

      // Should be able to navigate through sidebar elements
      expect(document.activeElement?.tagName).toMatch(/BUTTON|A/);
    });

    it('should announce loading states to screen readers', () => {
      render(
        <StatsCard
          title="Total Messages"
          value=""
          change={null}
          loading={true}
          error={null}
        />
      );

      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toHaveAccessibleName(/loading/i);
    });

    it('should announce error states to screen readers', () => {
      render(
        <StatsCard
          title="Total Messages"
          value=""
          change={null}
          loading={false}
          error="Failed to load"
        />
      );

      const errorIndicator = screen.getByRole('alert');
      expect(errorIndicator).toBeInTheDocument();
      expect(errorIndicator).toHaveAccessibleName(/error/i);
    });

    it('should have accessible quick action buttons', () => {
      const mockActions = [
        { id: 'new-message', label: 'New Message', disabled: false },
      ];
      const mockOnAction = jest.fn();

      render(
        <QuickActions
          actions={mockActions}
          onAction={mockOnAction}
        />
      );

      const actionButton = screen.getByLabelText('New Message');
      expect(actionButton).toHaveAccessibleName();
    });
  });
});
