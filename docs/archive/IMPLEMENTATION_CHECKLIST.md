# Stripe Integration - Implementation Checklist

## ✅ Phase 1: Foundation (COMPLETED - 40%)

### Database Infrastructure

- [x] **webhook_events** table with idempotency tracking
- [x] **refunds** table with authorization workflow
- [x] **payment_intents** table with 3DS tracking
- [x] Helper functions for all three systems
- [x] RLS policies for security
- [x] Views for statistics and monitoring
- [x] Data retention and cleanup functions

### Security Middleware

- [x] Webhook signature verification
- [x] Timestamp validation (replay attack prevention)
- [x] Request body size validation
- [x] Event structure validation
- [x] Idempotency checking
- [x] Rate limiting logic
- [x] Security monitoring and logging
- [x] Sensitive data sanitization

### Business Logic - Refunds

- [x] RefundManager class
- [x] Complete refund workflow
- [x] Stripe API integration
- [x] Authorization validation
- [x] Eligibility checking
- [x] Full/partial/prorated calculations
- [x] Subscription cancellation
- [x] Notification management
- [x] Error handling
- [x] Audit logging

### Documentation

- [x] Progress tracking document
- [x] Technical summary document
- [x] Implementation guide
- [x] Delivery summary
- [x] This checklist

---

## 📋 Phase 2: Core Logic (PENDING - 20%)

### Payment Intent Manager (S-002)

**File**: `src/lib/billing/payment-intent.ts`

- [ ] Create `PaymentIntentManager` class
- [ ] `createPaymentIntent()` method
  - [ ] Create PaymentIntent with automatic_payment_methods
  - [ ] Store in database with `create_payment_intent_record()`
  - [ ] Return client_secret for frontend
  - [ ] Handle SCA requirements
- [ ] `confirmPayment()` method
  - [ ] Confirm PaymentIntent after 3DS
  - [ ] Update payment intent status
  - [ ] Update subscription if successful
  - [ ] Log authentication event
- [ ] `handle3DSChallenge()` method
  - [ ] Handle frictionless authentication
  - [ ] Handle challenge flow
  - [ ] Mobile redirect support
- [ ] `handleAuthenticationFailure()` method
  - [ ] Log failed authentication
  - [ ] Update payment intent status
  - [ ] Notify customer
- [ ] `checkSCAExemption()` method
  - [ ] Low-value transaction check (<€30)
  - [ ] Recurring payment exemption
  - [ ] Trusted beneficiary check
  - [ ] Transaction risk analysis
- [ ] `logComplianceEvent()` method
  - [ ] PSD2 compliance logging
  - [ ] SCA validation logging
  - [ ] PCI DSS audit trail
- [ ] Error handling and retry logic
- [ ] Complete TypeScript types
- [ ] Comprehensive documentation

**Estimated Time**: 6 hours

### Enhanced Webhook Processor (S-003)

**File**: `src/lib/billing/webhook-processor-enhanced.ts`

- [ ] Create `EnhancedWebhookProcessor` class
- [ ] Extend existing `StripeWebhookProcessor`
- [ ] Add `checkIdempotency()` method
  - [ ] Query webhook_events table
  - [ ] Check if already processed
  - [ ] Return boolean result
- [ ] Add `markProcessing()` method
  - [ ] Call `mark_webhook_event_processing()` function
  - [ ] Atomic operation with unique constraint
  - [ ] Return event ID
- [ ] Add `markCompleted()` method
  - [ ] Call `mark_webhook_event_completed()` function
  - [ ] Log processing duration
- [ ] Add `markFailed()` method
  - [ ] Call `mark_webhook_event_failed()` function
  - [ ] Log error details
  - [ ] Schedule retry if needed
- [ ] Override `processEvent()` method
  - [ ] Add idempotency check
  - [ ] Wrap existing logic
  - [ ] Add completion/failure marking
- [ ] Add new event handlers:
  - [ ] `handleChargeRefunded()` - Refund webhook
  - [ ] `handlePaymentIntentSucceeded()` - Successful payment
  - [ ] `handlePaymentIntentFailed()` - Failed payment
  - [ ] `handlePaymentIntentRequiresAction()` - 3DS required
  - [ ] `handleRefundCreated()` - Refund created
  - [ ] `handleRefundFailed()` - Refund failed
- [ ] Add retry logic
  - [ ] Exponential backoff (1m, 2m, 4m)
  - [ ] Maximum 3 attempts
  - [ ] Dead letter queue for persistent failures
- [ ] Error handling improvements
- [ ] Complete documentation

**Estimated Time**: 3 hours

---

## 📋 Phase 3: API Layer (PENDING - 15%)

### Enhanced Webhook Endpoint (S-003)

**File**: `src/app/api/webhooks/stripe/route.ts` (UPDATE)

- [ ] Import `validateStripeWebhook` from middleware
- [ ] Import `EnhancedWebhookProcessor`
- [ ] Update POST handler:
  - [ ] Add webhook validation
  - [ ] Return 400 if validation fails
  - [ ] Use enhanced processor
  - [ ] Return appropriate status codes
- [ ] Add error handling
- [ ] Add security headers
- [ ] Test with Stripe CLI

**Estimated Time**: 1 hour

### Admin Refunds API (S-001)

**File**: `src/app/api/admin/billing/refunds/route.ts`

- [ ] Create POST handler (Create refund)
  - [ ] Validate super admin authorization
  - [ ] Parse request body
  - [ ] Validate input (amount, organization, reason)
  - [ ] Call `RefundManager.processRefund()`
  - [ ] Return result
  - [ ] Error handling
- [ ] Create GET handler (List refunds)
  - [ ] Validate super admin authorization
  - [ ] Parse query parameters (filters, pagination)
  - [ ] Call `RefundManager.listRefunds()`
  - [ ] Return paginated results
  - [ ] Error handling
- [ ] Add TypeScript types
- [ ] Add API documentation comments

**Estimated Time**: 2 hours

**File**: `src/app/api/admin/billing/refunds/[id]/route.ts`

- [ ] Create GET handler (Get refund details)
  - [ ] Validate super admin authorization
  - [ ] Call `RefundManager.getRefund()`
  - [ ] Return refund details
  - [ ] Error handling
- [ ] Create POST handler for `/approve`
  - [ ] Validate super admin authorization
  - [ ] Call `RefundManager.approveRefund()`
  - [ ] Return success
  - [ ] Error handling
- [ ] Create POST handler for `/cancel`
  - [ ] Validate super admin authorization
  - [ ] Call `RefundManager.cancelRefund()`
  - [ ] Return success
  - [ ] Error handling
- [ ] Add TypeScript types
- [ ] Add API documentation

**Estimated Time**: 1 hour

### Payment Intent API (S-002)

**File**: `src/app/api/billing/payment-intent/route.ts`

- [ ] Create POST handler (Create payment intent)
  - [ ] Validate user authentication
  - [ ] Parse request body (amount, currency, purpose)
  - [ ] Get organization and customer
  - [ ] Call `PaymentIntentManager.createPaymentIntent()`
  - [ ] Return client_secret (never in logs!)
  - [ ] Error handling
- [ ] Add TypeScript types
- [ ] Add API documentation

**Estimated Time**: 2 hours

**File**: `src/app/api/billing/confirm-payment/route.ts`

- [ ] Create POST handler (Confirm payment)
  - [ ] Validate user authentication
  - [ ] Parse request body (paymentIntentId)
  - [ ] Call `PaymentIntentManager.confirmPayment()`
  - [ ] Return success/failure
  - [ ] Error handling
- [ ] Add TypeScript types
- [ ] Add API documentation

**Estimated Time**: 1 hour

### Stats Endpoint (Optional)

**File**: `src/app/api/admin/billing/stats/route.ts`

- [ ] Create GET handler
  - [ ] Validate super admin
  - [ ] Get refund statistics
  - [ ] Get payment intent statistics
  - [ ] Get webhook statistics
  - [ ] Return aggregated stats
- [ ] Add caching

**Estimated Time**: 1 hour

---

## 📋 Phase 4: UI Layer (PENDING - 15%)

### Refund Manager Component (S-001)

**File**: `src/components/admin/refund-manager.tsx`

- [ ] Install dependencies (if needed)
  ```bash
  npm install @headlessui/react date-fns react-hot-toast
  ```
- [ ] Create `RefundManagerLayout` component
- [ ] Create `RefundRequestForm` component
  - [ ] Organization selector (dropdown)
  - [ ] Amount input with validation
  - [ ] Currency selector
  - [ ] Refund type selector (full/partial/prorated)
  - [ ] Reason selector
  - [ ] Reason details textarea
  - [ ] Cancel subscription checkbox
  - [ ] Submit button
  - [ ] Form validation with error messages
- [ ] Create `RefundList` component
  - [ ] Table with columns: ID, Organization, Amount, Type, Status, Date
  - [ ] Status badges (pending, approved, processing, completed, failed)
  - [ ] Filtering controls (status, date range, organization)
  - [ ] Pagination
  - [ ] Sort by date/amount/status
- [ ] Create `RefundDetailsModal` component
  - [ ] Show all refund details
  - [ ] Show refund history timeline
  - [ ] Show approval/rejection buttons
  - [ ] Show related subscription info
  - [ ] Show Stripe refund ID with link
- [ ] Create `RefundStatsDashboard` component
  - [ ] Total refunds count
  - [ ] Total refunds amount
  - [ ] Refunds by status (pie chart)
  - [ ] Refunds by reason (bar chart)
  - [ ] Monthly trend (line chart)
- [ ] Add real-time updates
  - [ ] Subscribe to Supabase realtime
  - [ ] Update list when status changes
  - [ ] Show toast notifications
- [ ] Add export functionality
  - [ ] Export to CSV
  - [ ] Export to Excel
- [ ] Mobile-responsive design
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

**Estimated Time**: 5 hours

### Payment Form Component (S-002)

**File**: `src/components/billing/payment-form.tsx`

- [ ] Install Stripe dependencies
  ```bash
  npm install @stripe/stripe-js @stripe/react-stripe-js
  ```
- [ ] Create Stripe provider wrapper
  ```typescript
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)
  ```
- [ ] Create `PaymentFormWrapper` component
  - [ ] Wrap with Elements provider
  - [ ] Pass theme and fonts
- [ ] Create `CheckoutForm` component
  - [ ] CardElement integration
  - [ ] Card input validation
  - [ ] Cardholder name input
  - [ ] Billing address (optional)
  - [ ] Submit button
- [ ] Create `ThreeDSModal` component
  - [ ] Show 3DS challenge iframe
  - [ ] Handle redirect flow
  - [ ] Mobile-friendly
  - [ ] Loading indicator
- [ ] Create `PaymentStatus` component
  - [ ] Show authentication status
  - [ ] Show success message
  - [ ] Show error message
  - [ ] Retry button on failure
- [ ] Implement payment flow
  - [ ] Create PaymentIntent via API
  - [ ] Confirm card payment with Stripe.js
  - [ ] Handle requires_action (3DS)
  - [ ] Confirm payment via API
  - [ ] Show success/failure
- [ ] Add loading states
  - [ ] During PaymentIntent creation
  - [ ] During card validation
  - [ ] During 3DS authentication
  - [ ] During payment confirmation
- [ ] Add error handling
  - [ ] Card validation errors
  - [ ] Authentication errors
  - [ ] Network errors
  - [ ] Stripe API errors
  - [ ] Show clear error messages
- [ ] Mobile-responsive design
- [ ] Accessibility (WCAG 2.1 AA)
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] Focus management
  - [ ] Error announcements
- [ ] Test with Stripe test cards
  - [ ] 4242 4242 4242 4242 (Success)
  - [ ] 4000 0000 0000 3220 (3DS required)
  - [ ] 4000 0000 0000 9995 (Decline)

**Estimated Time**: 5 hours

---

## 📋 Phase 5: Testing (PENDING - 15%)

### Unit Tests - Refunds

**File**: `tests/unit/refunds.test.ts`

- [ ] Setup test environment
  - [ ] Mock Stripe API
  - [ ] Mock Supabase client
  - [ ] Test data fixtures
- [ ] Test `checkRefundEligibility()`
  - [ ] Active subscription → eligible
  - [ ] Cancelled subscription → not eligible
  - [ ] Too many recent refunds → not eligible
  - [ ] New organization → eligible
- [ ] Test `calculateRefundAmount()`
  - [ ] Full refund → return full amount
  - [ ] Partial refund → return specified amount
  - [ ] Prorated refund → calculate correctly
  - [ ] Edge cases (expired subscription, invalid amount)
- [ ] Test `processRefund()`
  - [ ] Successful refund flow
  - [ ] Authorization failure
  - [ ] Eligibility failure
  - [ ] Stripe API failure
  - [ ] Database failure
  - [ ] Notification failure (should not break refund)
- [ ] Test `validateAdminAuthorization()`
  - [ ] Super admin → authorized
  - [ ] Regular admin → not authorized
  - [ ] Agent → not authorized
  - [ ] Invalid user → not authorized
- [ ] Test error handling
  - [ ] Network errors
  - [ ] Invalid input
  - [ ] Database constraints
- [ ] Test edge cases
  - [ ] Concurrent refund requests
  - [ ] Duplicate refunds
  - [ ] Refund > charge amount

**Estimated Time**: 2 hours

### Unit Tests - Payment Intents

**File**: `tests/unit/payment-intent.test.ts`

- [ ] Setup test environment
  - [ ] Mock Stripe API
  - [ ] Mock Supabase client
  - [ ] Test data fixtures
- [ ] Test `createPaymentIntent()`
  - [ ] Successful creation
  - [ ] With 3DS required
  - [ ] With SCA exemption
  - [ ] Invalid amount
  - [ ] Invalid customer
- [ ] Test `confirmPayment()`
  - [ ] Successful confirmation
  - [ ] Authentication failure
  - [ ] Payment failure
  - [ ] Network error
- [ ] Test `checkSCAExemption()`
  - [ ] Low value (<€30) → exempt
  - [ ] High value (>€30) → not exempt
  - [ ] Recurring payment → exempt
  - [ ] Trusted beneficiary → exempt
- [ ] Test `handle3DSChallenge()`
  - [ ] Frictionless flow
  - [ ] Challenge flow
  - [ ] Redirect flow
  - [ ] Authentication failure
- [ ] Test compliance logging
  - [ ] PSD2 compliance
  - [ ] SCA validation
  - [ ] Authentication events
- [ ] Test error handling
  - [ ] Expired payment intent
  - [ ] Invalid payment method
  - [ ] Network errors

**Estimated Time**: 2 hours

### Unit Tests - Webhook Idempotency

**File**: `tests/unit/webhook-idempotency.test.ts`

- [ ] Setup test environment
  - [ ] Mock Stripe webhooks
  - [ ] Mock database
  - [ ] Test events
- [ ] Test webhook validation
  - [ ] Valid signature → accept
  - [ ] Invalid signature → reject
  - [ ] Expired timestamp → reject
  - [ ] Invalid event structure → reject
- [ ] Test idempotency checking
  - [ ] New event → process
  - [ ] Duplicate event → skip
  - [ ] Failed event → retry
  - [ ] Processing event → wait
- [ ] Test atomic operations
  - [ ] Mark as processing → success
  - [ ] Concurrent marking → one succeeds
  - [ ] Mark completed → success
  - [ ] Mark failed → schedule retry
- [ ] Test retry logic
  - [ ] First retry → immediate
  - [ ] Second retry → 2min backoff
  - [ ] Third retry → 4min backoff
  - [ ] Fourth retry → move to DLQ
- [ ] Test event routing
  - [ ] Subscription events
  - [ ] Invoice events
  - [ ] Payment intent events
  - [ ] Refund events
  - [ ] Unknown events → log warning
- [ ] Test error handling
  - [ ] Database errors
  - [ ] Network errors
  - [ ] Invalid event data

**Estimated Time**: 2 hours

### Integration Tests

**File**: `tests/integration/billing-flow.test.ts`

- [ ] Setup test environment
  - [ ] Use Stripe test mode
  - [ ] Use test database
  - [ ] Test organization
  - [ ] Test user accounts
- [ ] Test complete refund flow
  - [ ] Create test subscription
  - [ ] Make test payment
  - [ ] Request refund
  - [ ] Approve refund
  - [ ] Verify refund in Stripe
  - [ ] Verify refund in database
  - [ ] Verify subscription cancellation
  - [ ] Verify notifications sent
- [ ] Test complete 3DS payment flow
  - [ ] Create payment intent
  - [ ] Trigger 3DS challenge
  - [ ] Complete authentication
  - [ ] Confirm payment
  - [ ] Verify payment in Stripe
  - [ ] Verify payment in database
  - [ ] Verify subscription update
  - [ ] Verify compliance logs
- [ ] Test webhook processing
  - [ ] Send test webhook
  - [ ] Verify signature validation
  - [ ] Verify idempotency
  - [ ] Verify processing
  - [ ] Send duplicate webhook
  - [ ] Verify duplicate rejected
  - [ ] Verify audit log
- [ ] Test failed scenarios
  - [ ] Failed refund → proper error handling
  - [ ] Failed authentication → retry flow
  - [ ] Failed webhook → retry with backoff
- [ ] Test edge cases
  - [ ] Concurrent webhooks
  - [ ] Slow webhook processing
  - [ ] Network interruptions
  - [ ] Database unavailable

**Estimated Time**: 3 hours

---

## 📋 Phase 6: Deployment (PENDING - 10%)

### Pre-Deployment Checklist

- [ ] **Code Review**
  - [ ] All code reviewed by team
  - [ ] Security review completed
  - [ ] Performance review completed
  - [ ] Code quality standards met

- [ ] **Testing**
  - [ ] All unit tests passing (>80% coverage)
  - [ ] All integration tests passing
  - [ ] Manual testing completed
  - [ ] Edge cases tested
  - [ ] Error handling tested

- [ ] **Security**
  - [ ] Penetration testing completed
  - [ ] Security audit passed
  - [ ] API keys secured
  - [ ] Webhook secrets configured
  - [ ] RLS policies verified

- [ ] **Documentation**
  - [ ] API documentation complete
  - [ ] UI documentation complete
  - [ ] Operations runbook created
  - [ ] Troubleshooting guide created
  - [ ] Deployment guide updated

- [ ] **Environment Configuration**
  - [ ] Production Stripe keys configured
  - [ ] Webhook endpoint URL configured
  - [ ] Supabase connection verified
  - [ ] Email service configured (Resend)
  - [ ] Monitoring configured
  - [ ] Alerts configured

### Staging Deployment

- [ ] **Database Migration**
  - [ ] Backup staging database
  - [ ] Run migrations on staging
  - [ ] Verify migrations successful
  - [ ] Test database functions
  - [ ] Verify RLS policies

- [ ] **Application Deployment**
  - [ ] Deploy to staging environment
  - [ ] Verify deployment successful
  - [ ] Run smoke tests
  - [ ] Verify all endpoints working

- [ ] **Webhook Configuration**
  - [ ] Configure Stripe staging webhook
  - [ ] Test webhook delivery
  - [ ] Verify idempotency
  - [ ] Test all event types

- [ ] **End-to-End Testing**
  - [ ] Test complete refund flow
  - [ ] Test complete 3DS payment flow
  - [ ] Test webhook processing
  - [ ] Test admin UI
  - [ ] Test customer UI

- [ ] **Performance Testing**
  - [ ] Load testing
  - [ ] Stress testing
  - [ ] Response time validation
  - [ ] Database performance

### Production Deployment

- [ ] **Pre-Deployment**
  - [ ] Create deployment plan
  - [ ] Schedule maintenance window
  - [ ] Notify stakeholders
  - [ ] Backup production database

- [ ] **Database Migration**
  - [ ] Run migrations on production
  - [ ] Verify migrations successful
  - [ ] Test database functions
  - [ ] Verify data integrity

- [ ] **Application Deployment**
  - [ ] Deploy to production
  - [ ] Verify deployment successful
  - [ ] Run smoke tests
  - [ ] Monitor error rates

- [ ] **Webhook Configuration**
  - [ ] Configure Stripe production webhook
  - [ ] Test webhook delivery
  - [ ] Verify processing
  - [ ] Monitor webhook events

- [ ] **Post-Deployment Monitoring**
  - [ ] Monitor for 24 hours
  - [ ] Check error rates
  - [ ] Verify webhook processing
  - [ ] Monitor API response times
  - [ ] Check database performance

### Post-Deployment

- [ ] **Verification**
  - [ ] Test all endpoints
  - [ ] Verify webhook processing
  - [ ] Check monitoring dashboards
  - [ ] Review audit logs

- [ ] **Documentation**
  - [ ] Update production docs
  - [ ] Document any issues
  - [ ] Update runbook
  - [ ] Update changelog

- [ ] **Team Training**
  - [ ] Train support team
  - [ ] Document common issues
  - [ ] Create FAQ
  - [ ] Schedule Q&A session

---

## 📊 Progress Tracking

### Overall Progress

- ✅ Phase 1: Foundation (40%) - **COMPLETE**
- 📋 Phase 2: Core Logic (20%) - **PENDING**
- 📋 Phase 3: API Layer (15%) - **PENDING**
- 📋 Phase 4: UI Layer (15%) - **PENDING**
- 📋 Phase 5: Testing (15%) - **PENDING**
- 📋 Phase 6: Deployment (10%) - **PENDING**

### Time Estimates

- ✅ Completed: 10 hours
- 📋 Remaining: 39 hours
- **Total**: 49 hours

### Next Immediate Steps

1. Implement PaymentIntentManager (6h)
2. Implement EnhancedWebhookProcessor (3h)
3. Update webhook endpoint (1h)

---

**Last Updated**: 2025-10-13
**Status**: Foundation Complete (40%)
**Next Milestone**: Core Logic Complete (60%)
