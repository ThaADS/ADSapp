import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BillingDashboard } from '@/components/billing/billing-dashboard'
import { ToastProvider } from '@/components/ui/toast'
import type { Organization, Profile } from '@/types'

// Mock fetch
global.fetch = jest.fn()

// Mock data
const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  subscription_tier: 'starter',
  subscription_status: 'active',
  stripe_customer_id: 'cus_test123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

const mockProfile: Profile = {
  id: 'user-1',
  organization_id: 'org-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'admin',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

const mockUsage = {
  users: { current: 2, limit: 3, unlimited: false },
  contacts: { current: 150, limit: 500, unlimited: false },
  messages: { current: 450, limit: 1000, unlimited: false }
}

const mockPlans = {
  starter: {
    name: 'Starter',
    description: 'Perfect for small businesses',
    price: 29,
    interval: 'month',
    features: ['Up to 3 team members', 'Up to 500 contacts']
  },
  professional: {
    name: 'Professional',
    description: 'Growing businesses',
    price: 79,
    interval: 'month',
    features: ['Up to 10 team members', 'Up to 5,000 contacts']
  }
}

const BillingDashboardWithToast = (props: any) => (
  <ToastProvider>
    <BillingDashboard {...props} />
  </ToastProvider>
)

describe('BillingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders current subscription information', () => {
    render(
      <BillingDashboardWithToast
        organization={mockOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('$29')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('displays usage metrics correctly', () => {
    render(
      <BillingDashboardWithToast
        organization={mockOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument() // users
    expect(screen.getByText('150')).toBeInTheDocument() // contacts
    expect(screen.getByText('450')).toBeInTheDocument() // messages
  })

  it('shows upgrade button for non-current plans', () => {
    render(
      <BillingDashboardWithToast
        organization={mockOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    const upgradeButtons = screen.getAllByText('Upgrade')
    expect(upgradeButtons).toHaveLength(1) // Professional plan upgrade
  })

  it('handles upgrade click', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/test' })
    } as Response)

    // Mock window.location.href
    delete (window as any).location
    window.location = { ...window.location, href: '' }

    render(
      <BillingDashboardWithToast
        organization={mockOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    const upgradeButton = screen.getByText('Upgrade')
    fireEvent.click(upgradeButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'professional' })
      })
    })
  })

  it('displays billing portal button when customer exists', () => {
    render(
      <BillingDashboardWithToast
        organization={mockOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    expect(screen.getByText('Manage Billing')).toBeInTheDocument()
  })

  it('shows past due warning', () => {
    const pastDueOrganization = {
      ...mockOrganization,
      subscription_status: 'past_due'
    }

    render(
      <BillingDashboardWithToast
        organization={pastDueOrganization}
        profile={mockProfile}
        usage={mockUsage}
        plans={mockPlans}
      />
    )

    expect(screen.getByText('Payment Issue')).toBeInTheDocument()
    expect(screen.getByText(/payment method failed/i)).toBeInTheDocument()
  })
})