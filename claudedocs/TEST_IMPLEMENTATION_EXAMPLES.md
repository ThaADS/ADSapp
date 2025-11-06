# TEST IMPLEMENTATION EXAMPLES

Practical code examples for implementing the testing roadmap from the Quality Engineering Audit.

---

## 1. AUTHENTICATION UNIT TESTS

### File: `src/app/api/auth/signin/__tests__/route.test.ts`

```typescript
import { POST } from '@/app/api/auth/signin/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server')

describe('POST /api/auth/signin', () => {
  const mockRequest = (body: unknown) =>
    ({
      json: async () => body,
    }) as NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Successful Authentication', () => {
    it('should sign in user with valid credentials', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: {
              user: { id: '123', email: 'test@example.com' },
              session: { access_token: 'token123' },
            },
            error: null,
          }),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        })
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
      expect(data.session).toBeDefined()
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      })
    })
  })

  describe('Input Validation - Edge Cases', () => {
    it('AUTH-001: should return 400 when email is missing', async () => {
      // Act
      const response = await POST(mockRequest({ password: 'password123' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('AUTH-002: should return 400 when password is missing', async () => {
      // Act
      const response = await POST(mockRequest({ email: 'test@example.com' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('AUTH-003: should return 400 when both fields are missing', async () => {
      // Act
      const response = await POST(mockRequest({}))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('AUTH-004: should handle null email gracefully', async () => {
      // Act
      const response = await POST(mockRequest({ email: null, password: 'password123' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('AUTH-005: should handle empty string email', async () => {
      // Act
      const response = await POST(mockRequest({ email: '', password: 'password123' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })

    it('AUTH-006: should handle whitespace-only email', async () => {
      // Act
      const response = await POST(mockRequest({ email: '   ', password: 'password123' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })
  })

  describe('Security - SQL Injection Prevention', () => {
    it('AUTH-007: should reject SQL injection in email', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' },
          }),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: "admin'--",
          password: 'password',
        })
      )

      // Assert
      expect(response.status).toBe(400)
      // Should NOT execute SQL, should be treated as invalid credential
    })

    it('AUTH-008: should reject SQL injection in password', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' },
          }),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: 'test@example.com',
          password: "' OR '1'='1",
        })
      )

      // Assert
      expect(response.status).toBe(400)
      // Should NOT bypass authentication
    })
  })

  describe('Authentication Failures', () => {
    it('AUTH-009: should return 400 for invalid credentials', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' },
          }),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid credentials')
    })

    it('AUTH-010: should return 401 when user not found', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
          }),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })
  })

  describe('Error Handling', () => {
    it('AUTH-011: should handle database connection errors', async () => {
      // Arrange
      ;(createClient as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await POST(
        mockRequest({
          email: 'test@example.com',
          password: 'password123',
        })
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('AUTH-012: should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockRejectedValue(new Error('Unexpected error')),
        },
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(
        mockRequest({
          email: 'test@example.com',
          password: 'password123',
        })
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
```

---

## 2. MULTI-TENANT SECURITY TESTS

### File: `tests/integration/multi-tenant-isolation.test.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

describe('Multi-Tenant Isolation', () => {
  let supabaseAdmin: ReturnType<typeof createClient>
  let userAClient: ReturnType<typeof createClient>
  let userBClient: ReturnType<typeof createClient>

  let orgA: { id: string }
  let orgB: { id: string }
  let userA: { id: string; access_token: string }
  let userB: { id: string; access_token: string }

  beforeAll(async () => {
    // Setup: Create admin client
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create Organization A
    const { data: orgAData } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Organization A',
        subdomain: 'org-a-test',
      })
      .select()
      .single()
    orgA = orgAData

    // Create Organization B
    const { data: orgBData } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Organization B',
        subdomain: 'org-b-test',
      })
      .select()
      .single()
    orgB = orgBData

    // Create User A in Org A
    const { data: authUserA } = await supabaseAdmin.auth.admin.createUser({
      email: 'usera@test.com',
      password: 'TestPassword123!',
      email_confirm: true,
    })
    userA = { id: authUserA.user!.id, access_token: '' }

    await supabaseAdmin.from('profiles').insert({
      id: userA.id,
      organization_id: orgA.id,
      email: 'usera@test.com',
      role: 'owner',
    })

    // Create User B in Org B
    const { data: authUserB } = await supabaseAdmin.auth.admin.createUser({
      email: 'userb@test.com',
      password: 'TestPassword123!',
      email_confirm: true,
    })
    userB = { id: authUserB.user!.id, access_token: '' }

    await supabaseAdmin.from('profiles').insert({
      id: userB.id,
      organization_id: orgB.id,
      email: 'userb@test.com',
      role: 'owner',
    })

    // Create authenticated clients
    const { data: sessionA } = await supabaseAdmin.auth.signInWithPassword({
      email: 'usera@test.com',
      password: 'TestPassword123!',
    })
    userA.access_token = sessionA.session!.access_token
    userAClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${userA.access_token}` },
        },
      }
    )

    const { data: sessionB } = await supabaseAdmin.auth.signInWithPassword({
      email: 'userb@test.com',
      password: 'TestPassword123!',
    })
    userB.access_token = sessionB.session!.access_token
    userBClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${userB.access_token}` },
        },
      }
    )
  })

  afterAll(async () => {
    // Cleanup
    await supabaseAdmin.from('profiles').delete().eq('id', userA.id)
    await supabaseAdmin.from('profiles').delete().eq('id', userB.id)
    await supabaseAdmin.auth.admin.deleteUser(userA.id)
    await supabaseAdmin.auth.admin.deleteUser(userB.id)
    await supabaseAdmin.from('organizations').delete().eq('id', orgA.id)
    await supabaseAdmin.from('organizations').delete().eq('id', orgB.id)
  })

  describe('Organizations Table Isolation', () => {
    it('TENANT-001: User A can only see their own organization', async () => {
      // Act
      const { data, error } = await userAClient.from('organizations').select('*')

      // Assert
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe(orgA.id)
    })

    it('TENANT-002: User A cannot access Organization B data', async () => {
      // Act
      const { data, error } = await userAClient.from('organizations').select('*').eq('id', orgB.id)

      // Assert
      expect(data).toHaveLength(0) // RLS should prevent access
    })

    it('TENANT-003: User A cannot update Organization B', async () => {
      // Act
      const { error } = await userAClient
        .from('organizations')
        .update({ name: 'Hacked Org B' })
        .eq('id', orgB.id)

      // Assert
      expect(error).toBeDefined() // Should fail due to RLS

      // Verify Organization B was not modified
      const { data } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgB.id)
        .single()
      expect(data.name).toBe('Organization B')
    })

    it('TENANT-004: User A cannot delete Organization B', async () => {
      // Act
      const { error } = await userAClient.from('organizations').delete().eq('id', orgB.id)

      // Assert
      expect(error).toBeDefined()

      // Verify Organization B still exists
      const { data } = await supabaseAdmin.from('organizations').select('*').eq('id', orgB.id)
      expect(data).toHaveLength(1)
    })
  })

  describe('Contacts Table Isolation', () => {
    let contactA: { id: string }
    let contactB: { id: string }

    beforeAll(async () => {
      // Create contact for Org A
      const { data: contactAData } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: orgA.id,
          whatsapp_id: 'wa_contact_a',
          phone_number: '+1234567890',
          name: 'Contact A',
        })
        .select()
        .single()
      contactA = contactAData

      // Create contact for Org B
      const { data: contactBData } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: orgB.id,
          whatsapp_id: 'wa_contact_b',
          phone_number: '+0987654321',
          name: 'Contact B',
        })
        .select()
        .single()
      contactB = contactBData
    })

    afterAll(async () => {
      await supabaseAdmin.from('contacts').delete().eq('id', contactA.id)
      await supabaseAdmin.from('contacts').delete().eq('id', contactB.id)
    })

    it('TENANT-005: User A can only see their org contacts', async () => {
      // Act
      const { data, error } = await userAClient.from('contacts').select('*')

      // Assert
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe(contactA.id)
    })

    it('TENANT-006: User A cannot access Org B contacts', async () => {
      // Act
      const { data, error } = await userAClient.from('contacts').select('*').eq('id', contactB.id)

      // Assert
      expect(data).toHaveLength(0)
    })

    it('TENANT-007: User A cannot update Org B contacts', async () => {
      // Act
      const { error } = await userAClient
        .from('contacts')
        .update({ name: 'Hacked Contact' })
        .eq('id', contactB.id)

      // Assert
      expect(error).toBeDefined()

      // Verify contact was not modified
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('name')
        .eq('id', contactB.id)
        .single()
      expect(data.name).toBe('Contact B')
    })
  })

  describe('Conversations Table Isolation', () => {
    let conversationA: { id: string }
    let conversationB: { id: string }
    let contactA: { id: string }
    let contactB: { id: string }

    beforeAll(async () => {
      // Create contacts first
      const { data: contactAData } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: orgA.id,
          whatsapp_id: 'wa_conv_contact_a',
          phone_number: '+1111111111',
        })
        .select()
        .single()
      contactA = contactAData

      const { data: contactBData } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: orgB.id,
          whatsapp_id: 'wa_conv_contact_b',
          phone_number: '+2222222222',
        })
        .select()
        .single()
      contactB = contactBData

      // Create conversations
      const { data: conversationAData } = await supabaseAdmin
        .from('conversations')
        .insert({
          organization_id: orgA.id,
          contact_id: contactA.id,
          status: 'open',
        })
        .select()
        .single()
      conversationA = conversationAData

      const { data: conversationBData } = await supabaseAdmin
        .from('conversations')
        .insert({
          organization_id: orgB.id,
          contact_id: contactB.id,
          status: 'open',
        })
        .select()
        .single()
      conversationB = conversationBData
    })

    afterAll(async () => {
      await supabaseAdmin.from('conversations').delete().eq('id', conversationA.id)
      await supabaseAdmin.from('conversations').delete().eq('id', conversationB.id)
      await supabaseAdmin.from('contacts').delete().eq('id', contactA.id)
      await supabaseAdmin.from('contacts').delete().eq('id', contactB.id)
    })

    it('TENANT-008: User A cannot access Org B conversations', async () => {
      // Act
      const { data, error } = await userAClient
        .from('conversations')
        .select('*')
        .eq('id', conversationB.id)

      // Assert
      expect(data).toHaveLength(0)
    })

    it('TENANT-009: User A cannot send messages in Org B conversations', async () => {
      // Act
      const { error } = await userAClient.from('messages').insert({
        conversation_id: conversationB.id,
        sender_id: userA.id,
        content: 'Unauthorized message',
        message_type: 'text',
      })

      // Assert
      expect(error).toBeDefined()
    })
  })
})
```

---

## 3. WHATSAPP CLIENT UNIT TESTS

### File: `src/lib/whatsapp/__tests__/client.test.ts`

```typescript
import { WhatsAppClient } from '../client'

describe('WhatsAppClient', () => {
  let client: WhatsAppClient
  const mockAccessToken = 'test_token_123'
  const mockPhoneNumberId = 'phone_123'

  beforeEach(() => {
    client = new WhatsAppClient(mockAccessToken, mockPhoneNumberId)
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sendTextMessage', () => {
    it('WHATSAPP-001: should send text message successfully', async () => {
      // Arrange
      const mockResponse = {
        messages: [{ id: 'wamid.123' }],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      // Act
      const result = await client.sendTextMessage('+1234567890', 'Hello World')

      // Assert
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        `https://graph.facebook.com/v18.0/${mockPhoneNumberId}/messages`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"messaging_product":"whatsapp"'),
        })
      )
    })

    it('WHATSAPP-002: should reject empty message body', async () => {
      // Act & Assert
      await expect(client.sendTextMessage('+1234567890', '')).rejects.toThrow()
    })

    it('WHATSAPP-003: should reject invalid phone number', async () => {
      // Arrange
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: 'Invalid phone number' },
        }),
      })

      // Act & Assert
      await expect(client.sendTextMessage('invalid_number', 'Hello')).rejects.toThrow(
        'WhatsApp API Error: Invalid phone number'
      )
    })

    it('WHATSAPP-004: should handle API rate limiting', async () => {
      // Arrange
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            message: 'Rate limit exceeded',
            code: 4,
          },
        }),
      })

      // Act & Assert
      await expect(client.sendTextMessage('+1234567890', 'Hello')).rejects.toThrow(
        'Rate limit exceeded'
      )
    })

    it('WHATSAPP-005: should handle network timeout', async () => {
      // Arrange
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'))

      // Act & Assert
      await expect(client.sendTextMessage('+1234567890', 'Hello')).rejects.toThrow(
        'Network timeout'
      )
    })
  })

  describe('sendTemplateMessage', () => {
    it('WHATSAPP-006: should send template message successfully', async () => {
      // Arrange
      const mockResponse = {
        messages: [{ id: 'wamid.124' }],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      // Act
      const result = await client.sendTemplateMessage('+1234567890', 'welcome_template', 'en')

      // Assert
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalled()
    })

    it('WHATSAPP-007: should reject unapproved template', async () => {
      // Arrange
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: 'Template not approved' },
        }),
      })

      // Act & Assert
      await expect(
        client.sendTemplateMessage('+1234567890', 'unapproved_template')
      ).rejects.toThrow('Template not approved')
    })
  })

  describe('sendImageMessage', () => {
    it('WHATSAPP-008: should send image message successfully', async () => {
      // Arrange
      const mockResponse = {
        messages: [{ id: 'wamid.125' }],
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      // Act
      const result = await client.sendImageMessage(
        '+1234567890',
        'https://example.com/image.jpg',
        'Test caption'
      )

      // Assert
      expect(result).toEqual(mockResponse)
    })

    it('WHATSAPP-009: should handle media upload failure', async () => {
      // Arrange
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: 'Media upload failed' },
        }),
      })

      // Act & Assert
      await expect(
        client.sendImageMessage('+1234567890', 'https://invalid-url.com/image.jpg')
      ).rejects.toThrow('Media upload failed')
    })
  })

  describe('markAsRead', () => {
    it('WHATSAPP-010: should mark message as read', async () => {
      // Arrange
      const mockResponse = { success: true }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      // Act
      const result = await client.markAsRead('wamid.123')

      // Assert
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          body: expect.stringContaining('"status":"read"'),
        })
      )
    })
  })
})
```

---

## 4. BILLING API INTEGRATION TESTS

### File: `tests/integration/billing-checkout.test.ts`

```typescript
import { POST } from '@/app/api/billing/checkout/route'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/stripe/server'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/server')
jest.mock('@/lib/auth')

describe('POST /api/billing/checkout', () => {
  const mockRequest = (body: unknown) =>
    ({
      json: async () => body,
    }) as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Successful Checkout', () => {
    it('BILLING-001: should create checkout session for valid plan', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      const mockOrg = { id: 'org-123', name: 'Test Org' }
      const mockProfile = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'owner',
        organization: mockOrg,
      }

      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      jest.mocked(StripeService.createCustomer).mockResolvedValue('cus_123')
      jest.mocked(StripeService.createCheckoutSession).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/123',
      } as any)

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/123')
      expect(StripeService.createCustomer).toHaveBeenCalledWith(
        'org-123',
        'owner@test.com',
        'Test Org'
      )
    })
  })

  describe('Input Validation', () => {
    it('BILLING-002: should reject invalid plan ID', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      // Act
      const response = await POST(mockRequest({ planId: 'invalid_plan' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan')
    })

    it('BILLING-003: should reject missing plan ID', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      // Act
      const response = await POST(mockRequest({}))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan')
    })
  })

  describe('Authorization', () => {
    it('BILLING-004: should reject non-owner/admin users', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'agent@test.com' }
      const mockProfile = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'agent', // Not owner or admin
        organization: { id: 'org-123', name: 'Test Org' },
      }

      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('BILLING-005: should allow owner to create checkout', async () => {
      // Test owner role
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      const mockProfile = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'owner',
        organization: { id: 'org-123', name: 'Test Org' },
      }

      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      jest.mocked(StripeService.createCustomer).mockResolvedValue('cus_123')
      jest.mocked(StripeService.createCheckoutSession).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/123',
      } as any)

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))

      // Assert
      expect(response.status).toBe(200)
    })

    it('BILLING-006: should allow admin to create checkout', async () => {
      // Test admin role
      const mockUser = { id: 'user-123', email: 'admin@test.com' }
      const mockProfile = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'admin',
        organization: { id: 'org-123', name: 'Test Org' },
      }

      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      jest.mocked(StripeService.createCustomer).mockResolvedValue('cus_123')
      jest.mocked(StripeService.createCheckoutSession).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/123',
      } as any)

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('BILLING-007: should handle Stripe API errors', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      const mockProfile = {
        id: 'user-123',
        organization_id: 'org-123',
        role: 'owner',
        organization: { id: 'org-123', name: 'Test Org' },
      }

      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        })),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      jest.mocked(StripeService.createCustomer).mockRejectedValue(new Error('Stripe API error'))

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create checkout session')
    })

    it('BILLING-008: should handle database errors', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'owner@test.com' }
      jest.mocked(require('@/lib/auth').requireAuth).mockResolvedValue(mockUser)

      ;(createClient as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await POST(mockRequest({ planId: 'professional' }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create checkout session')
    })
  })
})
```

---

## 5. COMPONENT TESTING EXAMPLES

### File: `src/components/auth/__tests__/signup-form.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupForm from '../signup-form';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('SignupForm', () => {
  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<SignupForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'weak');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error for empty organization name', async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/organization name is required/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<SignupForm onSubmit={mockSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'StrongPass123!',
          organizationName: 'Test Org',
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<SignupForm onSubmit={mockSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });

    it('should display error message on submission failure', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn().mockRejectedValue(
        new Error('Email already exists')
      );
      render(<SignupForm onSubmit={mockSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security', () => {
    it('should sanitize XSS attempts in organization name', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<SignupForm onSubmit={mockSubmit} />);

      await user.type(
        screen.getByLabelText(/organization name/i),
        '<script>alert("XSS")</script>'
      );
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Verify XSS was sanitized
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationName: expect.not.stringContaining('<script>'),
          })
        );
      });
    });
  });
});
```

---

## 6. E2E COMPLETE USER JOURNEY

### File: `tests/e2e/complete-messaging-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Complete WhatsApp Messaging Flow', () => {
  test('user can complete full messaging journey', async ({ page }) => {
    // Step 1: Sign up
    await page.goto('http://localhost:3000/auth/signup')
    await page.fill('input[name="email"]', 'newuser@test.com')
    await page.fill('input[name="password"]', 'StrongPass123!')
    await page.fill('input[name="organizationName"]', 'Test Company')
    await page.click('button[type="submit"]')

    // Step 2: Complete onboarding
    await expect(page).toHaveURL(/\/onboarding/)
    await page.waitForTimeout(1000)

    // Step 3: Navigate to inbox
    await page.goto('http://localhost:3000/dashboard/inbox')
    await expect(page).toHaveURL(/\/dashboard\/inbox/)

    // Step 4: Select or create conversation
    const conversationList = page.locator('[data-testid="conversation-list"]')
    if ((await conversationList.locator('[data-testid="conversation-item"]').count()) > 0) {
      // Select existing conversation
      await conversationList.locator('[data-testid="conversation-item"]').first().click()
    } else {
      // Create new conversation
      await page.click('[data-testid="new-conversation-button"]')
      await page.fill('[data-testid="phone-number-input"]', '+1234567890')
      await page.click('[data-testid="start-conversation-button"]')
    }

    // Step 5: Send text message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Hello! This is a test message.')
    await page.click('[data-testid="send-button"]')

    // Step 6: Verify message sent
    await expect(page.locator('text=Hello! This is a test message.').last()).toBeVisible()

    await expect(page.locator('[data-testid="message-status"]').last()).toContainText(
      /sent|delivered/i
    )

    // Step 7: Send template message
    await page.click('[data-testid="template-button"]')
    await page.click('[data-testid="template-item"]').first()
    await page.click('[data-testid="send-template-button"]')

    // Step 8: Verify template sent
    await expect(page.locator('[data-testid="message-template-indicator"]').last()).toBeVisible()

    // Step 9: Check analytics
    await page.goto('http://localhost:3000/dashboard/analytics')
    await expect(page).toHaveURL(/\/dashboard\/analytics/)

    // Verify message count increased
    const messageCount = page.locator('[data-testid="messages-sent-count"]')
    await expect(messageCount).toBeVisible()

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/complete-messaging-flow.png',
      fullPage: true,
    })
  })

  test('user can complete payment flow', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3000/auth/signin')
    await page.fill('input[type="email"]', 'owner@demo-company.com')
    await page.fill('input[type="password"]', 'Demo2024!Owner')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Step 2: Navigate to billing
    await page.goto('http://localhost:3000/dashboard/settings/billing')

    // Step 3: Select plan
    await page.click('[data-testid="professional-plan-button"]')

    // Step 4: Verify redirect to Stripe
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 })
    expect(page.url()).toContain('checkout.stripe.com')

    // Note: Do not complete Stripe checkout in E2E tests
    // Use Stripe test mode webhooks for testing payment completion
  })
})
```

---

## SUMMARY

These test examples demonstrate:

1. **Unit Tests** - Isolated testing of functions and classes
2. **Integration Tests** - Testing API routes with database
3. **Multi-Tenant Tests** - Security-critical tenant isolation
4. **Component Tests** - UI component behavior and validation
5. **E2E Tests** - Complete user journeys

**Next Steps:**

1. Copy these examples to your project
2. Adapt to your specific implementation
3. Run tests: `npm run test` and `npm run test:e2e`
4. Add more tests following these patterns
5. Aim for 80% code coverage

**Test Execution:**

```bash
# Unit and integration tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```
