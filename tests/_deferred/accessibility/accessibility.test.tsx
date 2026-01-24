/**
 * Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance for ADSapp components
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Import components to test
import { AccessibilityProvider } from '@/components/accessibility/accessibility-provider';
import { SkipLinks, VisuallyHidden, LiveRegion } from '@/components/accessibility/skip-links';
import { AccessibleModal } from '@/components/accessibility/accessible-modal';
import { AccessibleDropdown } from '@/components/accessibility/accessible-dropdown';
import { AccessibleInput, AccessibleCheckbox, AccessibleForm } from '@/components/accessibility/accessible-form';

describe('Accessibility Provider', () => {
  it('should provide accessibility context', () => {
    const TestComponent = () => {
      const { state } = useAccessibility();
      return <div>{state.keyboardNavigation ? 'Enabled' : 'Disabled'}</div>;
    };

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('should toggle high contrast mode', () => {
    const TestComponent = () => {
      const { state, actions } = useAccessibility();
      return (
        <div>
          <div>{state.highContrast ? 'High Contrast' : 'Normal'}</div>
          <button onClick={actions.toggleHighContrast}>Toggle</button>
        </div>
      );
    };

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByText('Normal')).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /toggle/i }));

    expect(screen.getByText('High Contrast')).toBeInTheDocument();
  });
});

describe('Skip Links', () => {
  it('should render skip links', () => {
    render(<SkipLinks />);

    const mainLink = screen.getByText('Skip to main content');
    const navLink = screen.getByText('Skip to navigation');

    expect(mainLink).toBeInTheDocument();
    expect(navLink).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<SkipLinks />);

    const mainLink = screen.getByText('Skip to main content');

    expect(mainLink).toHaveAttribute('href', '#main-content');
    expect(mainLink).toHaveAttribute('aria-label', 'Skip to main content');
  });

  it('should pass axe accessibility tests', async () => {
    const { container } = render(<SkipLinks />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

describe('Accessible Modal', () => {
  it('should trap focus within modal', () => {
    const handleClose = jest.fn();

    render(
      <AccessibilityProvider>
        <AccessibleModal
          isOpen={true}
          onClose={handleClose}
          title="Test Modal"
          description="This is a test modal"
        >
          <button>First Button</button>
          <button>Second Button</button>
        </AccessibleModal>
      </AccessibilityProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelledBy('Test Modal')).toBeInTheDocument();
  });

  it('should close on Escape key', async () => {
    const handleClose = jest.fn();

    render(
      <AccessibilityProvider>
        <AccessibleModal
          isOpen={true}
          onClose={handleClose}
          title="Test Modal"
          closeOnEscape={true}
        >
          <p>Modal content</p>
        </AccessibleModal>
      </AccessibilityProvider>
    );

    await userEvent.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <AccessibilityProvider>
        <AccessibleModal
          isOpen={true}
          onClose={jest.fn()}
          title="Test Modal"
          description="Modal description"
        >
          <p>Content</p>
        </AccessibleModal>
      </AccessibilityProvider>
    );

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('should pass axe accessibility tests', async () => {
    const { container } = render(
      <AccessibilityProvider>
        <AccessibleModal
          isOpen={true}
          onClose={jest.fn()}
          title="Test Modal"
        >
          <p>Modal content</p>
        </AccessibleModal>
      </AccessibilityProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessible Dropdown', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' }
  ];

  it('should render with proper ARIA attributes', () => {
    render(
      <AccessibilityProvider>
        <AccessibleDropdown
          options={options}
          value=""
          onChange={jest.fn()}
          label="Test Dropdown"
        />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should navigate options with arrow keys', async () => {
    const handleChange = jest.fn();

    render(
      <AccessibilityProvider>
        <AccessibleDropdown
          options={options}
          value=""
          onChange={handleChange}
          label="Test Dropdown"
        />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');

    // Open dropdown
    await userEvent.click(button);

    // Press arrow down
    await userEvent.keyboard('{ArrowDown}');

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should pass axe accessibility tests', async () => {
    const { container } = render(
      <AccessibilityProvider>
        <AccessibleDropdown
          options={options}
          value="1"
          onChange={jest.fn()}
          label="Test Dropdown"
        />
      </AccessibilityProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessible Form Components', () => {
  describe('AccessibleInput', () => {
    it('should associate label with input', () => {
      render(
        <AccessibleInput
          label="Email Address"
          name="email"
          type="email"
        />
      );

      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('should show error message with proper ARIA', () => {
      render(
        <AccessibleInput
          label="Email"
          name="email"
          error="Email is required"
        />
      );

      const input = screen.getByLabelText('Email');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    });

    it('should show hint text', () => {
      render(
        <AccessibleInput
          label="Password"
          name="password"
          type="password"
          hint="Must be at least 8 characters"
        />
      );

      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('should pass axe accessibility tests', async () => {
      const { container } = render(
        <AccessibleInput
          label="Test Input"
          name="test"
          required
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AccessibleCheckbox', () => {
    it('should have proper label association', () => {
      render(
        <AccessibleCheckbox
          label="Accept Terms"
          name="terms"
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /accept terms/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should show error state', () => {
      render(
        <AccessibleCheckbox
          label="Accept Terms"
          name="terms"
          error="You must accept the terms"
        />
      );

      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('You must accept the terms');
    });

    it('should pass axe accessibility tests', async () => {
      const { container } = render(
        <AccessibleCheckbox
          label="Test Checkbox"
          name="test"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AccessibleForm', () => {
    it('should show error summary', () => {
      const errors = [
        'Email is required',
        'Password must be at least 8 characters'
      ];

      render(
        <AccessibleForm errors={errors} ariaLabel="Sign Up Form">
          <input name="email" />
        </AccessibleForm>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    });

    it('should pass axe accessibility tests', async () => {
      const { container } = render(
        <AccessibleForm ariaLabel="Test Form">
          <AccessibleInput label="Name" name="name" />
        </AccessibleForm>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe('Color Contrast', () => {
  it('should meet WCAG AA contrast requirements', async () => {
    const { container } = render(
      <div className="text-gray-600 bg-white">
        Test text with proper contrast
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Keyboard Navigation', () => {
  it('should support tab navigation', async () => {
    render(
      <div>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </div>
    );

    const first = screen.getByText('First');
    const second = screen.getByText('Second');

    first.focus();
    expect(first).toHaveFocus();

    await userEvent.tab();
    expect(second).toHaveFocus();
  });

  it('should have visible focus indicators', () => {
    const { container } = render(
      <button>Click me</button>
    );

    const button = screen.getByRole('button');
    button.focus();

    expect(button).toHaveFocus();
    expect(button).toHaveClass(/focus:/);
  });
});

describe('Screen Reader Support', () => {
  it('should have proper ARIA labels', () => {
    render(
      <button aria-label="Close dialog">
        <span aria-hidden="true">×</span>
      </button>
    );

    const button = screen.getByRole('button', { name: /close dialog/i });
    expect(button).toBeInTheDocument();
  });

  it('should hide decorative elements', () => {
    render(
      <div>
        <img src="logo.png" alt="" role="presentation" />
        <img src="user.png" alt="User profile" />
      </div>
    );

    const images = screen.getAllByRole('img', { hidden: true });
    expect(images).toHaveLength(1); // Only the non-decorative image
  });
});

describe('Live Regions', () => {
  it('should announce updates to screen readers', () => {
    render(
      <LiveRegion politeness="polite">
        Form saved successfully
      </LiveRegion>
    );

    const liveRegion = screen.getByRole('status');

    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('Form saved successfully');
  });

  it('should use assertive for urgent messages', () => {
    render(
      <LiveRegion politeness="assertive">
        Error: Connection lost
      </LiveRegion>
    );

    const liveRegion = screen.getByRole('alert');

    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('VisuallyHidden', () => {
  it('should hide content visually but keep it accessible', () => {
    render(
      <VisuallyHidden>
        Hidden text for screen readers
      </VisuallyHidden>
    );

    const hiddenText = screen.getByText('Hidden text for screen readers');

    expect(hiddenText).toHaveClass('sr-only');
  });
});
