import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DemoSessionManager } from '@/lib/demo'
import {
  SimulateMessageRequest,
  SimulateMessageResponse,
  BusinessScenario
} from '@/types/demo'

/**
 * Simulate incoming WhatsApp messages for demo sessions
 * POST /api/demo/simulate-message
 */
export async function POST(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header'
        } as SimulateMessageResponse,
        { status: 401 }
      )
    }

    // Parse request body
    const body: SimulateMessageRequest = await request.json()

    // Validate required fields
    if (!body.contact_phone || !body.content || !body.message_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'contact_phone, content, and message_type are required'
        } as SimulateMessageResponse,
        { status: 400 }
      )
    }

    // Validate message type
    const validMessageTypes = ['text', 'image', 'document']
    if (!validMessageTypes.includes(body.message_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid message_type. Must be one of: text, image, document'
        } as SimulateMessageResponse,
        { status: 400 }
      )
    }

    // Validate sender type
    const validSenderTypes = ['contact', 'agent']
    if (!validSenderTypes.includes(body.sender_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid sender_type. Must be either contact or agent'
        } as SimulateMessageResponse,
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error'
        } as SimulateMessageResponse,
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session'
        } as SimulateMessageResponse,
        { status: 401 }
      )
    }

    const organizationId = sessionResult.session.organization_id

    // Find or create contact
    let contact = await findOrCreateContact(supabase, organizationId, body.contact_phone, sessionResult.session.business_scenario)

    // Find or create conversation
    let conversation = await findOrCreateConversation(supabase, organizationId, contact.id)

    // Apply delay if specified
    if (body.delay_seconds && body.delay_seconds > 0) {
      await new Promise(resolve => setTimeout(resolve, body.delay_seconds * 1000))
    }

    // Create message
    const messageData = {
      conversation_id: conversation.id,
      sender_type: body.sender_type,
      sender_id: body.sender_type === 'agent' ? null : null, // In demo, we don't have actual agent IDs
      content: body.content,
      message_type: body.message_type,
      media_url: body.message_type !== 'text' ? generateDemoMediaUrl(body.message_type) : null,
      media_mime_type: body.message_type !== 'text' ? getDemoMimeType(body.message_type) : null,
      is_read: body.sender_type === 'agent', // Agent messages are marked as read
      whatsapp_message_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) {
      console.error('Error creating demo message:', messageError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create message'
        } as SimulateMessageResponse,
        { status: 500 }
      )
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)

    // Update contact last_message_at
    await supabase
      .from('contacts')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', contact.id)

    // Trigger automation if requested
    if (body.trigger_automation) {
      await triggerDemoAutomation(sessionResult.session, contact, message, body.content)
    }

    // Track simulation event
    await sessionManager.trackEvent(sessionResult.session.id, {
      event_type: 'feature_interaction',
      action: 'message_simulated',
      category: 'demo',
      label: `${body.sender_type}_${body.message_type}`,
      metadata: {
        contact_phone: body.contact_phone,
        message_length: body.content.length,
        has_delay: !!body.delay_seconds,
        trigger_automation: !!body.trigger_automation
      }
    })

    // Update session progress
    await sessionManager.updateProgress(
      sessionToken,
      'message_simulation',
      'simulate_whatsapp_message',
      {
        message_type: body.message_type,
        sender_type: body.sender_type
      }
    )

    const response: SimulateMessageResponse = {
      success: true,
      data: {
        message_id: message.id,
        conversation_id: conversation.id,
        processed_at: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error simulating message:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to simulate message. Please try again.'
      } as SimulateMessageResponse,
      { status: 500 }
    )
  }
}

/**
 * Get available simulation options for a demo session
 * GET /api/demo/simulate-message
 */
export async function GET(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header'
        },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session'
        },
        { status: 401 }
      )
    }

    // Get available contacts for this demo session
    const { data: contacts } = await supabase
      .from('contacts')
      .select('phone_number, name, tags')
      .eq('organization_id', sessionResult.session.organization_id)
      .order('created_at', { ascending: true })

    // Get scenario-specific message templates
    const messageTemplates = getScenarioMessageTemplates(sessionResult.session.business_scenario)

    return NextResponse.json({
      success: true,
      data: {
        session_info: {
          scenario: sessionResult.session.business_scenario,
          organization_id: sessionResult.session.organization_id
        },
        available_contacts: contacts || [],
        message_types: ['text', 'image', 'document'],
        sender_types: ['contact', 'agent'],
        max_delay_seconds: 30,
        message_templates: messageTemplates,
        automation_available: true
      }
    })

  } catch (error) {
    console.error('Error getting simulation options:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get simulation options'
      },
      { status: 500 }
    )
  }
}

/**
 * Batch simulate multiple messages
 * POST /api/demo/simulate-message/batch
 */
export async function PUT(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session token required in Authorization header'
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { messages, scenario_name } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'messages array is required and must not be empty'
        },
        { status: 400 }
      )
    }

    if (messages.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 20 messages allowed per batch'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(sessionToken)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session'
        },
        { status: 401 }
      )
    }

    const results = []
    const errors = []

    // Process messages with delays between them
    for (let i = 0; i < messages.length; i++) {
      const messageData = messages[i]

      try {
        // Validate message data
        if (!messageData.contact_phone || !messageData.content || !messageData.message_type) {
          errors.push({
            index: i,
            error: 'Missing required fields: contact_phone, content, message_type'
          })
          continue
        }

        // Simulate message by calling the main logic
        const result = await simulateSingleMessage(
          supabase,
          sessionResult.session.organization_id,
          messageData,
          sessionResult.session.business_scenario
        )

        results.push({
          index: i,
          message_id: result.message_id,
          conversation_id: result.conversation_id
        })

        // Add delay between messages to make it more realistic
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
        }

      } catch (error) {
        console.error(`Error processing message ${i}:`, error)
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Track batch simulation event
    await sessionManager.trackEvent(sessionResult.session.id, {
      event_type: 'feature_interaction',
      action: 'batch_messages_simulated',
      category: 'demo',
      label: scenario_name || 'custom_batch',
      value: results.length,
      metadata: {
        total_messages: messages.length,
        successful: results.length,
        failed: errors.length
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        processed_at: new Date().toISOString(),
        total_messages: messages.length,
        successful: results.length,
        failed: errors.length,
        results: results,
        errors: errors.length > 0 ? errors : undefined
      }
    })

  } catch (error) {
    console.error('Error in batch message simulation:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process batch messages'
      },
      { status: 500 }
    )
  }
}

// Helper functions

async function findOrCreateContact(supabase: any, organizationId: string, phoneNumber: string, scenario: BusinessScenario) {
  // Try to find existing contact
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('phone_number', phoneNumber)
    .single()

  if (existingContact) {
    return existingContact
  }

  // Create new contact
  const contactData = {
    organization_id: organizationId,
    whatsapp_id: `demo_${phoneNumber.replace('+', '')}_${Date.now()}`,
    phone_number: phoneNumber,
    name: generateDemoContactName(phoneNumber, scenario),
    tags: getScenarioTags(scenario),
    notes: `Demo contact for ${scenario} scenario`,
    is_blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create contact: ${error.message}`)
  }

  return newContact
}

async function findOrCreateConversation(supabase: any, organizationId: string, contactId: string) {
  // Try to find existing conversation
  const { data: existingConversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .eq('status', 'open')
    .single()

  if (existingConversation) {
    return existingConversation
  }

  // Create new conversation
  const conversationData = {
    organization_id: organizationId,
    contact_id: contactId,
    status: 'open',
    priority: 'medium',
    subject: 'Demo conversation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: newConversation, error } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`)
  }

  return newConversation
}

async function simulateSingleMessage(supabase: any, organizationId: string, messageData: any, scenario: BusinessScenario) {
  const contact = await findOrCreateContact(supabase, organizationId, messageData.contact_phone, scenario)
  const conversation = await findOrCreateConversation(supabase, organizationId, contact.id)

  const message = {
    conversation_id: conversation.id,
    sender_type: messageData.sender_type || 'contact',
    content: messageData.content,
    message_type: messageData.message_type || 'text',
    media_url: messageData.message_type !== 'text' ? generateDemoMediaUrl(messageData.message_type) : null,
    is_read: messageData.sender_type === 'agent',
    whatsapp_message_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  }

  const { data: newMessage, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) {
    throw error
  }

  // Update timestamps
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id)

  await supabase
    .from('contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id)

  return {
    message_id: newMessage.id,
    conversation_id: conversation.id
  }
}

function generateDemoContactName(phoneNumber: string, scenario: BusinessScenario): string {
  const names = {
    retail: ['Fashion Lover', 'Style Seeker', 'Trendy Customer'],
    restaurant: ['Food Enthusiast', 'Regular Diner', 'Hungry Customer'],
    real_estate: ['Home Buyer', 'Property Investor', 'House Hunter'],
    healthcare: ['Patient', 'Health Conscious', 'Wellness Seeker'],
    education: ['Student', 'Learner', 'Knowledge Seeker'],
    ecommerce: ['Online Shopper', 'Tech Buyer', 'Deal Hunter'],
    automotive: ['Car Buyer', 'Auto Enthusiast', 'Driver'],
    travel: ['Traveler', 'Adventure Seeker', 'Tourist'],
    fitness: ['Fitness Enthusiast', 'Gym Member', 'Health Conscious'],
    generic: ['Demo User', 'Customer', 'Client']
  }

  const scenarioNames = names[scenario] || names.generic
  const hash = phoneNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return scenarioNames[hash % scenarioNames.length]
}

function getScenarioTags(scenario: BusinessScenario): string[] {
  const tags = {
    retail: ['customer', 'fashion'],
    restaurant: ['diner', 'food-lover'],
    real_estate: ['buyer', 'property-interest'],
    healthcare: ['patient', 'health'],
    education: ['student', 'learning'],
    ecommerce: ['shopper', 'online'],
    automotive: ['buyer', 'automotive'],
    travel: ['traveler', 'tourism'],
    fitness: ['member', 'fitness'],
    generic: ['demo', 'customer']
  }

  return tags[scenario] || tags.generic
}

function generateDemoMediaUrl(messageType: string): string {
  const baseUrl = 'https://picsum.photos'

  switch (messageType) {
    case 'image':
      return `${baseUrl}/400/300?random=${Math.random()}`
    case 'document':
      return `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
    default:
      return ''
  }
}

function getDemoMimeType(messageType: string): string {
  switch (messageType) {
    case 'image':
      return 'image/jpeg'
    case 'document':
      return 'application/pdf'
    default:
      return 'text/plain'
  }
}

function getScenarioMessageTemplates(scenario: BusinessScenario) {
  const templates = {
    retail: [
      { sender: 'contact', content: 'Hi! Do you have this item in stock?', type: 'text' },
      { sender: 'contact', content: 'What are your store hours?', type: 'text' },
      { sender: 'agent', content: 'Hello! Yes, we have that item available. Would you like me to reserve it for you?', type: 'text' }
    ],
    restaurant: [
      { sender: 'contact', content: 'I\'d like to make a reservation for tonight', type: 'text' },
      { sender: 'contact', content: 'Do you have any vegan options?', type: 'text' },
      { sender: 'agent', content: 'Of course! What time would you prefer for your reservation?', type: 'text' }
    ],
    // Add more scenarios as needed
    generic: [
      { sender: 'contact', content: 'Hello, I have a question', type: 'text' },
      { sender: 'agent', content: 'Hi! How can I help you today?', type: 'text' }
    ]
  }

  return templates[scenario] || templates.generic
}

async function triggerDemoAutomation(session: any, contact: any, message: any, content: string) {
  // Simulate automation triggers based on message content
  console.log('Demo automation triggered for:', content)

  // This would trigger actual automation rules in a real system
  // For demo purposes, we just log the trigger
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}