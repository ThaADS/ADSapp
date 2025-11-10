# Workflow Builder Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Node Types](#node-types)
4. [Building Workflows](#building-workflows)
5. [Configuration](#configuration)
6. [Analytics](#analytics)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Introduction

The Visual Workflow Builder is a powerful drag-and-drop interface for creating automated WhatsApp messaging campaigns and workflows. Build complex automation sequences without writing code using our intuitive node-based system.

### Key Features

- **Visual Canvas**: Drag-and-drop interface for building workflows
- **10 Node Types**: Comprehensive set of building blocks for any automation
- **Real-time Validation**: Instant feedback on workflow configuration
- **Analytics Dashboard**: Track performance and conversions
- **Template Library**: Pre-built workflows to get started quickly
- **A/B Testing**: Built-in split testing for message optimization
- **AI Integration**: Leverage AI for intelligent automation

---

## Getting Started

### Creating Your First Workflow

1. Navigate to **Dashboard → Workflows**
2. Click **"New Workflow"** button
3. Choose a workflow type:
   - **Drip Campaign**: Sequential message series
   - **Broadcast**: One-time bulk message
   - **Automation**: Trigger-based automation
   - **Custom**: Build from scratch

4. Give your workflow a name and description
5. Click **"Create Workflow"**

### The Workflow Builder Interface

#### Sidebar (Left)
- **Node Palette**: Drag nodes onto canvas
- **Organized by category**: Triggers, Actions, Logic
- **Quick Tips**: Helpful hints for beginners

#### Canvas (Center)
- **Workflow visualization**: See your automation flow
- **Minimap**: Navigate large workflows
- **Zoom controls**: Zoom in/out, fit view
- **Grid background**: Align nodes precisely

#### Toolbar (Top)
- **Save**: Save workflow changes
- **Validate**: Check for errors
- **Test**: Preview workflow execution
- **Deploy**: Activate workflow

#### Validation Panel (Right)
- **Real-time feedback**: See errors and warnings
- **Node status**: Visual indicators for each node
- **Suggested fixes**: Auto-fix common issues

---

## Node Types

### 1. Trigger Node 🎯

**Purpose**: Starts your workflow when specific events occur

**Trigger Types**:
- **Contact Added**: When new contact is added to list
- **Tag Applied**: When tag is added to contact
- **Webhook Received**: External API trigger
- **Scheduled**: Run at specific date/time
- **Contact Replied**: When contact sends message
- **Field Changed**: When custom field is updated

**Configuration**:
```
Label: "New Customer Trigger"
Type: Contact Added
Tags: ["customer", "trial"]
```

**Best Practices**:
- Every workflow needs exactly ONE trigger
- Test triggers before activating workflow
- Use descriptive labels for clarity

---

### 2. Message Node 💬

**Purpose**: Send WhatsApp messages to contacts

**Message Types**:
- **Custom Message**: Write your own message
- **Template**: Use saved message template

**Features**:
- **Personalization**: Use variables like `{{firstName}}`, `{{company}}`
- **Media Support**: Images, videos, documents, audio
- **Fallback Names**: Default name when contact name unavailable

**Configuration Example**:
```
Label: "Welcome Message"
Type: Custom Message
Content: "Hi {{firstName}}, welcome to {{company}}!"
Media: https://example.com/welcome.jpg
Use Contact Name: Yes
Fallback Name: "Friend"
```

**Variable Reference**:
- `{{firstName}}` - Contact first name
- `{{lastName}}` - Contact last name
- `{{company}}` - Company name
- `{{phone}}` - Phone number
- `{{email}}` - Email address
- `{{customField}}` - Any custom field

---

### 3. Delay Node ⏰

**Purpose**: Wait before continuing workflow

**Delay Units**:
- Minutes
- Hours
- Days
- Weeks

**Advanced Options**:
- **Business Hours Only**: Only count weekdays 9 AM - 5 PM
- **Skip Weekends**: Don't count Saturday/Sunday
- **Specific Time**: Send at exact time after delay

**Example**:
```
Label: "Wait 24 Hours"
Amount: 1
Unit: Days
Business Hours Only: Yes
Send at: 9:00 AM
```

**Use Cases**:
- Follow-up sequences (wait 2 days after signup)
- Reminder campaigns (7 days before expiration)
- Drip content delivery (spread over weeks)

---

### 4. Condition Node 🔀

**Purpose**: Branch workflow based on contact data

**Operators**:
- `equals` - Exact match
- `not_equals` - Does not match
- `contains` - Contains substring
- `not_contains` - Doesn't contain
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison
- `is_empty` - Field has no value
- `is_not_empty` - Field has value

**Multiple Conditions**:
- Combine with **AND** (all must be true)
- Combine with **OR** (any must be true)

**Example**:
```
Primary Condition:
  Field: Tag
  Operator: Equals
  Value: "premium"

Additional Condition:
  AND Field: Last Message Date
  Operator: Less Than
  Value: "30 days ago"
```

**Two Output Paths**:
- **True Branch**: Condition met
- **False Branch**: Condition not met

---

### 5. Action Node ⚡

**Purpose**: Perform actions on contacts

**Action Types**:

1. **Add Tag**
   - Add one or more tags to contact
   - Example: "customer", "trial", "vip"

2. **Remove Tag**
   - Remove tags from contact
   - Example: Remove "prospect" when converted

3. **Update Field**
   - Modify custom field value
   - Example: Set status to "active"

4. **Add to List**
   - Add contact to mailing list
   - Example: Newsletter subscribers

5. **Remove from List**
   - Remove contact from list
   - Example: Unsubscribe

6. **Send Notification**
   - Email notification to admin
   - Example: Alert when high-value lead

**Configuration**:
```
Label: "Add Premium Tag"
Action Type: Add Tag
Tags: ["premium", "verified"]
```

---

### 6. Wait Until Node ⏸️

**Purpose**: Pause until specific event occurs

**Event Types**:
- **Tag Applied**: Wait for tag to be added
- **Field Changed**: Wait for field update
- **Message Received**: Wait for contact reply
- **Specific Date**: Wait until date/time
- **Webhook**: Wait for external trigger

**Timeout Configuration**:
- Enable timeout to avoid infinite wait
- Set maximum wait time
- Define fallback action

**Example**:
```
Label: "Wait for Response"
Event: Message Received
Timeout: Yes
Timeout Amount: 7
Timeout Unit: Days
```

---

### 7. Split Node 🎲

**Purpose**: A/B testing and traffic distribution

**Split Types**:

1. **Random/Percentage**
   - Distribute contacts randomly
   - Example: 50% Branch A, 50% Branch B

2. **Field-Based**
   - Route based on field value
   - Example: Premium vs Free users

**Configuration**:
```
Label: "Message Variant Test"
Split Type: Percentage

Branch A: 50%
Branch B: 50%
```

**Multiple Branches**:
- Add up to 10 branches
- Percentages must total 100%
- Use "Distribute Evenly" button

**Best Practices**:
- Run tests for at least 100 contacts
- Monitor conversion rates
- Declare winner when statistically significant

---

### 8. Webhook Node 🔗

**Purpose**: Call external APIs and services

**HTTP Methods**:
- GET - Retrieve data
- POST - Create data
- PUT - Update data
- PATCH - Partial update
- DELETE - Remove data

**Authentication Types**:
1. **None**: Public endpoints
2. **Bearer Token**: API key in header
3. **Basic Auth**: Username + password
4. **API Key**: Custom header

**Response Handling**:
- Save response to workflow context
- Use response data in later nodes
- Retry on failure (configurable)

**Example**:
```
Label: "Update CRM"
URL: https://crm.example.com/api/contacts
Method: POST
Auth Type: Bearer Token
Token: abc123xyz

Request Body:
{
  "contact_id": "{{contactId}}",
  "status": "active"
}

Save Response: Yes
Response Field: crm_response
```

---

### 9. AI Node 🤖

**Purpose**: AI-powered intelligent actions

**AI Actions**:

1. **Sentiment Analysis**
   - Analyze message sentiment
   - Outputs: positive, negative, neutral

2. **Categorize**
   - Classify into categories
   - Example: Support, Sales, Billing

3. **Extract Information**
   - Pull structured data from text
   - Example: Extract order number, issue

4. **Generate Response**
   - AI-generated replies
   - Context-aware responses

5. **Translate**
   - Language translation
   - Supports major languages

**Model Options**:
- **GPT-3.5 Turbo**: Fast and cheap
- **GPT-4**: Most capable
- **Claude 3 Sonnet**: Balanced performance

**Configuration**:
```
Label: "Analyze Sentiment"
Action: Sentiment Analysis
Model: GPT-3.5 Turbo
Temperature: 0.7
Max Tokens: 500
Save Result To: sentiment_score
```

**Use Cases**:
- Auto-route urgent messages
- Generate personalized responses
- Translate multilingual support
- Extract customer data

---

### 10. Goal Node 🎯

**Purpose**: Track conversions and success metrics

**Goal Types**:
- **Conversion**: General conversion tracking
- **Engagement**: Interaction metrics
- **Revenue**: Sales and revenue
- **Custom**: Custom metrics

**Configuration**:
```
Label: "Trial Signup"
Goal Type: Conversion
Goal Name: "Free Trial Started"
Track in Analytics: Yes
Notify on Completion: Yes
Notification Email: admin@example.com
```

**Revenue Tracking**:
```
Goal Type: Revenue
Amount: 99.00
Currency: USD
```

**Analytics Integration**:
- Automatically tracked in dashboard
- Conversion funnel visualization
- A/B test winner determination

---

## Building Workflows

### Step-by-Step Process

#### 1. Plan Your Workflow
- Define objective (e.g., "Convert trial users to paid")
- Map customer journey
- Identify key decision points
- Sketch workflow on paper

#### 2. Add Nodes
- Start with **Trigger Node** (required)
- Drag nodes from sidebar to canvas
- Position nodes logically (top to bottom)
- Use grid for alignment

#### 3. Connect Nodes
- Drag from output handle (bottom of node)
- Connect to input handle (top of next node)
- Condition nodes have 2 outputs (True/False)
- Split nodes have multiple outputs

#### 4. Configure Nodes
- Click settings icon on each node
- Fill in required fields
- Test configurations
- Save changes

#### 5. Validate Workflow
- Check validation panel
- Fix all errors (red)
- Address warnings (yellow)
- Ensure workflow is complete

#### 6. Test Workflow
- Use test mode (if available)
- Run with mock data
- Verify each step executes correctly
- Check variable substitution

#### 7. Activate Workflow
- Save final version
- Click "Activate" or "Deploy"
- Monitor first executions
- Watch analytics dashboard

### Best Practices

#### Workflow Design
✅ **DO**:
- Keep workflows simple and focused
- Use descriptive node labels
- Add comments/descriptions
- Test thoroughly before activating
- Monitor performance regularly

❌ **DON'T**:
- Create overly complex workflows
- Skip validation
- Use vague labels like "Node 1"
- Deploy without testing
- Ignore analytics data

#### Performance
- Limit workflow depth (< 20 nodes ideal)
- Use delays wisely (don't spam)
- Respect business hours
- Monitor error rates
- Optimize slow nodes

#### Maintenance
- Review workflows quarterly
- Update templates regularly
- Archive unused workflows
- Document changes
- Version control important workflows

---

## Configuration

### Node Configuration Details

Each node type has specific configuration requirements. Here's what you need to know:

#### Required vs Optional Fields
- **Required** fields marked with red asterisk (*)
- **Optional** fields enhance functionality
- Validation shows missing required fields

#### Variable Substitution
Use `{{variableName}}` syntax in:
- Message content
- Webhook URLs
- AI prompts
- Custom field values

**Available Variables**:
```javascript
{{contactId}}       // Unique contact ID
{{firstName}}       // Contact first name
{{lastName}}        // Contact last name
{{email}}           // Email address
{{phone}}           // Phone number
{{company}}         // Company name
{{tags}}            // Contact tags (array)
{{createdAt}}       // Account creation date
{{lastMessageDate}} // Last interaction
{{customField_X}}   // Any custom field
```

#### Conditional Logic
Build complex conditions:
```
IF (
  tag equals "premium"
  AND
  last_message_date > "30 days ago"
) THEN
  Send re-engagement message
ELSE
  Continue normal flow
```

---

## Analytics

### Analytics Dashboard

Access: **Workflows → [Workflow Name] → Analytics**

#### Overview Metrics

1. **Total Executions**
   - Number of contacts who entered workflow
   - Trend: Week over week change

2. **Success Rate**
   - Percentage of completed executions
   - Excludes failed/cancelled

3. **Average Completion Time**
   - How long from start to finish
   - Accounts for delays

4. **Conversion Rate**
   - Percentage reaching goal node
   - Primary success metric

5. **Active Executions**
   - Currently in-progress workflows
   - Real-time count

#### Execution Trend Chart
- Daily execution volume
- Conversion overlay
- 7-day, 30-day, 90-day views
- Export to CSV

#### Conversion Funnel
Shows drop-off at each stage:
```
Started: 1,247 (100%)
  ↓
Message Sent: 1,199 (96.2%)
  ↓
Response Received: 856 (68.7%)
  ↓
Converted: 293 (23.5%)
```

#### Node Performance Table
| Node | Executions | Avg Time | Error Rate |
|------|------------|----------|------------|
| Trigger | 1,247 | 0s | 0% |
| Welcome Msg | 1,247 | 2.3s | 0.4% |
| Wait 24h | 1,199 | 24h | 0% |
| Check Response | 1,199 | 0.1s | 0% |

#### A/B Test Results
Compare split test performance:
- Variant A: 24.8% conversion (612 executions)
- Variant B: 22.2% conversion (635 executions)
- **Winner: Variant A** (+2.6% lift)

### Optimization Tips

1. **Identify Drop-off Points**
   - Look for large funnel drops
   - Investigate why contacts exit
   - Test alternative messaging

2. **Monitor Error Rates**
   - Nodes with >1% errors need attention
   - Check webhook endpoints
   - Verify AI prompts

3. **Analyze Timing**
   - Slow nodes indicate problems
   - Webhook timeouts
   - AI processing delays

4. **A/B Testing**
   - Test one variable at a time
   - Run until statistically significant
   - Implement winner, test next variable

---

## Best Practices

### Workflow Organization

#### Naming Conventions
```
[Type] - [Purpose] - [Status]

Examples:
"Drip - Trial Onboarding - Active"
"Broadcast - Product Launch - Draft"
"Automation - Re-engagement - Testing"
```

#### Folder Structure
```
Workflows/
├── Active/
│   ├── Customer Onboarding
│   ├── Sales Nurture
│   └── Support Automation
├── Templates/
│   ├── Welcome Series
│   ├── Abandoned Cart
│   └── Win-back Campaign
└── Archive/
    └── Old Campaigns
```

### Error Handling

#### Common Errors

1. **Validation Errors**
   - Missing required fields
   - Orphaned nodes
   - Circular dependencies

2. **Execution Errors**
   - Webhook failures
   - AI API limits
   - Invalid variables

3. **Configuration Errors**
   - Wrong trigger type
   - Invalid percentages (split)
   - Malformed webhook URLs

#### Error Prevention
```javascript
// ✅ Good: Validate URLs
if (webhookUrl.startsWith('https://')) {
  // Valid
}

// ✅ Good: Test variables
Use {{firstName|default:"Friend"}}

// ✅ Good: Add timeout to waits
Timeout: 7 days (don't wait forever)
```

### Testing Strategies

#### Test Mode
1. Enable test mode
2. Select mock contact
3. Step through execution
4. Verify each node output
5. Check variable values

#### Staging Workflow
- Clone production workflow
- Test in staging environment
- Verify with real but limited data
- Deploy to production when confirmed

#### Gradual Rollout
1. Start with 10% of contacts
2. Monitor for 24 hours
3. Increase to 50% if successful
4. Full rollout after 48 hours

---

## Troubleshooting

### Common Issues

#### Issue: "Workflow must have a trigger node"
**Cause**: No trigger node in workflow

**Solution**:
1. Add trigger node from sidebar
2. Configure trigger type
3. Save workflow

---

#### Issue: "Circular dependency detected"
**Cause**: Nodes connected in loop

**Solution**:
1. Check validation panel
2. Find circular connection
3. Remove one edge to break loop
4. Redesign flow if needed

---

#### Issue: "Node is not connected"
**Cause**: Orphaned node (no connections)

**Solution**:
1. Connect node to workflow
2. Or delete unused node
3. Validate again

---

#### Issue: "Webhook failed: Invalid URL"
**Cause**: Malformed webhook URL

**Solution**:
```
❌ Bad:  example.com/webhook
✅ Good: https://example.com/webhook
```

---

#### Issue: "Split percentages don't add to 100%"
**Cause**: Branch percentages incorrect

**Solution**:
1. Check all branch percentages
2. Click "Distribute Evenly" button
3. Or manually adjust to total 100%

---

#### Issue: "Variable not found: {{firstName}}"
**Cause**: Contact missing that field

**Solution**:
```
Use fallback syntax:
{{firstName|default:"Friend"}}

Or add condition to check:
IF firstName is_not_empty THEN
  Use {{firstName}}
ELSE
  Use generic greeting
```

---

### Performance Issues

#### Slow Execution
**Symptoms**:
- Workflows taking too long
- Timeouts
- Contact complaints

**Diagnosis**:
1. Check node performance table
2. Identify slow nodes
3. Review webhook response times
4. Check AI processing time

**Solutions**:
- Optimize webhook endpoints
- Reduce AI max tokens
- Add caching
- Use faster AI models (GPT-3.5 vs GPT-4)

---

#### High Error Rates
**Symptoms**:
- >5% error rate on nodes
- Failed executions
- Support tickets

**Diagnosis**:
1. Check error logs
2. Review failed executions
3. Test problematic nodes
4. Verify external services

**Solutions**:
- Enable retry on webhooks
- Add error handling
- Validate input data
- Monitor external service status

---

## API Reference

### Workflow API Endpoints

#### GET /api/workflows
List all workflows

**Response**:
```json
{
  "workflows": [
    {
      "id": "workflow_123",
      "name": "Welcome Series",
      "status": "active",
      "stats": {
        "totalExecutions": 1247,
        "successRate": 87.3
      }
    }
  ]
}
```

---

#### POST /api/workflows
Create new workflow

**Request**:
```json
{
  "name": "My Workflow",
  "type": "automation",
  "nodes": [...],
  "edges": [...]
}
```

---

#### GET /api/workflows/{id}
Get workflow details

**Response**:
```json
{
  "id": "workflow_123",
  "name": "Welcome Series",
  "nodes": [...],
  "edges": [...],
  "settings": {...}
}
```

---

#### PUT /api/workflows/{id}
Update workflow

**Request**:
```json
{
  "name": "Updated Name",
  "nodes": [...],
  "edges": [...]
}
```

---

#### POST /api/workflows/{id}/execute
Manually execute workflow

**Request**:
```json
{
  "contactId": "contact_456"
}
```

**Response**:
```json
{
  "executionId": "exec_789",
  "status": "running"
}
```

---

#### GET /api/workflows/{id}/analytics
Get analytics data

**Query Parameters**:
- `startDate`: ISO date
- `endDate`: ISO date
- `metrics`: Comma-separated metrics

**Response**:
```json
{
  "overview": {
    "totalExecutions": 1247,
    "successRate": 87.3,
    "conversionRate": 23.5
  },
  "timeSeries": [...],
  "nodePerformance": [...]
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` or `Backspace` | Delete selected node |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` or `Ctrl + Shift + Z` | Redo |
| `Ctrl + S` | Save workflow |
| `Ctrl + D` | Duplicate node |
| `Esc` | Deselect all |
| `+` or `Ctrl + =` | Zoom in |
| `-` or `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Fit view |
| `Space + Drag` | Pan canvas |

---

## Support

### Getting Help

- **Documentation**: This guide
- **Video Tutorials**: [Coming soon]
- **Community Forum**: [Link]
- **Email Support**: support@adsapp.com

### Reporting Issues

When reporting bugs, include:
1. Workflow ID
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots
5. Error messages

### Feature Requests

Submit feature requests with:
- Use case description
- Problem being solved
- Proposed solution
- Priority level

---

## Changelog

### Version 2.0 (Current)
- ✨ Added 10 node types
- ✨ Visual workflow builder
- ✨ Real-time validation
- ✨ Analytics dashboard
- ✨ A/B testing
- ✨ AI integration
- ✨ Template library

### Version 1.0
- 🎉 Initial release
- Basic workflow support
- Trigger and message nodes

---

## License

© 2024 ADSapp. All rights reserved.

---

**Last Updated**: November 2024
**Version**: 2.0
**Author**: ADSapp Team
