/**
 * Event Sourcing Type Definitions
 */

export type AggregateType = 'conversation' | 'message' | 'contact' | 'template' | 'organization'

export interface DomainEvent {
  id?: string
  aggregateId: string
  aggregateType: AggregateType
  eventType: string
  eventData: Record<string, any>
  metadata?: Record<string, any>
  version?: number
  organizationId: string
  createdBy?: string
  createdAt?: Date
}

export interface EventStoreRecord extends DomainEvent {
  id: string
  version: number
  createdAt: Date
}

export interface EventSnapshot {
  aggregateId: string
  aggregateType: AggregateType
  state: Record<string, any>
  version: number
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

// Conversation Events
export interface ConversationCreatedEvent extends DomainEvent {
  eventType: 'ConversationCreated'
  eventData: {
    contactId: string
    status: string
    priority?: string
    subject?: string
  }
}

export interface ConversationAssignedEvent extends DomainEvent {
  eventType: 'ConversationAssigned'
  eventData: {
    assignedTo: string
    assignedBy: string
    previousAssignee?: string
  }
}

export interface ConversationStatusChangedEvent extends DomainEvent {
  eventType: 'ConversationStatusChanged'
  eventData: {
    oldStatus: string
    newStatus: string
    reason?: string
  }
}

export interface ConversationTaggedEvent extends DomainEvent {
  eventType: 'ConversationTagged'
  eventData: {
    tags: string[]
    addedTags: string[]
    removedTags: string[]
  }
}

export interface ConversationArchivedEvent extends DomainEvent {
  eventType: 'ConversationArchived'
  eventData: {
    archivedBy: string
    reason?: string
  }
}

// Message Events
export interface MessageSentEvent extends DomainEvent {
  eventType: 'MessageSent'
  eventData: {
    conversationId: string
    content: string
    messageType: string
    sentBy: string
    mediaUrl?: string
  }
}

export interface MessageReceivedEvent extends DomainEvent {
  eventType: 'MessageReceived'
  eventData: {
    conversationId: string
    whatsappMessageId: string
    content: string
    messageType: string
    from: string
  }
}

export interface MessageDeliveredEvent extends DomainEvent {
  eventType: 'MessageDelivered'
  eventData: {
    whatsappMessageId: string
    deliveredAt: Date
  }
}

export interface MessageReadEvent extends DomainEvent {
  eventType: 'MessageRead'
  eventData: {
    whatsappMessageId: string
    readAt: Date
    readBy?: string
  }
}

export interface MessageFailedEvent extends DomainEvent {
  eventType: 'MessageFailed'
  eventData: {
    whatsappMessageId?: string
    error: string
    errorCode: string
  }
}

// Contact Events
export interface ContactCreatedEvent extends DomainEvent {
  eventType: 'ContactCreated'
  eventData: {
    whatsappId: string
    phoneNumber: string
    name?: string
    source?: string
  }
}

export interface ContactUpdatedEvent extends DomainEvent {
  eventType: 'ContactUpdated'
  eventData: {
    updatedFields: Record<string, any>
    updatedBy: string
  }
}

export interface ContactTaggedEvent extends DomainEvent {
  eventType: 'ContactTagged'
  eventData: {
    tags: string[]
    addedTags: string[]
    removedTags: string[]
  }
}

export interface ContactMergedEvent extends DomainEvent {
  eventType: 'ContactMerged'
  eventData: {
    sourceContactId: string
    targetContactId: string
    mergedBy: string
  }
}

export interface ContactDeletedEvent extends DomainEvent {
  eventType: 'ContactDeleted'
  eventData: {
    deletedBy: string
    reason?: string
  }
}

// Template Events
export interface TemplateCreatedEvent extends DomainEvent {
  eventType: 'TemplateCreated'
  eventData: {
    name: string
    content: string
    category?: string
    variables: string[]
  }
}

export interface TemplateUpdatedEvent extends DomainEvent {
  eventType: 'TemplateUpdated'
  eventData: {
    updatedFields: Record<string, any>
    updatedBy: string
  }
}

export interface TemplateDeletedEvent extends DomainEvent {
  eventType: 'TemplateDeleted'
  eventData: {
    deletedBy: string
  }
}

// Union type of all events
export type AllDomainEvents =
  | ConversationCreatedEvent
  | ConversationAssignedEvent
  | ConversationStatusChangedEvent
  | ConversationTaggedEvent
  | ConversationArchivedEvent
  | MessageSentEvent
  | MessageReceivedEvent
  | MessageDeliveredEvent
  | MessageReadEvent
  | MessageFailedEvent
  | ContactCreatedEvent
  | ContactUpdatedEvent
  | ContactTaggedEvent
  | ContactMergedEvent
  | ContactDeletedEvent
  | TemplateCreatedEvent
  | TemplateUpdatedEvent
  | TemplateDeletedEvent

// Event Handler
export type EventHandler = (event: DomainEvent) => Promise<void> | void

// Event Subscription
export interface EventSubscription {
  id: string
  organizationId: string
  name: string
  eventTypes: string[]
  webhookUrl: string
  webhookSecret: string
  enabled: boolean
  retryPolicy: {
    maxRetries: number
    retryDelaySeconds: number
    exponentialBackoff: boolean
  }
}
