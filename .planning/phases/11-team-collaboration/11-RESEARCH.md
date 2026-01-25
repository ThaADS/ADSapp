# Phase 11: Team Collaboration (@Mentions) - Research

**Researched:** 2026-01-25
**Domain:** Rich text editing, real-time notifications, accessibility
**Confidence:** HIGH

## Summary

Team collaboration through @mentions is a well-established pattern with mature libraries and clear best practices. The standard approach combines Tiptap editor for rich text with @mention extension, Supabase Realtime for instant notification delivery, and deferred email notifications via background job queues.

The existing codebase already has conversation notes stored in a JSONB array on the `conversations` table. This phase will migrate to a proper relational structure with a dedicated `conversation_notes` table and add a `mentions` table for tracking mention relationships. The Tiptap editor will replace the existing plain text input.

**Key findings:**
- Tiptap with @tiptap/extension-mention is the industry standard for @mention functionality in React
- WAI-ARIA combobox pattern with aria-activedescendant is required for accessibility
- Supabase Realtime postgres_changes subscriptions provide <2s notification delivery
- BullMQ with Redis is the standard for delayed email notifications (5-minute threshold)
- Store mentions as HTML with data attributes for reliable parsing and rendering

**Primary recommendation:** Use Tiptap editor + Supabase Realtime channels + BullMQ for email delays, with proper accessibility implementation from day one.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | 2.x | Rich text editor base | Industry standard for React rich text editing, ProseMirror-based |
| @tiptap/extension-mention | 2.x | @mention functionality | Official Tiptap extension with TypeScript support |
| @tiptap/suggestion | 2.x | Autocomplete dropdown | Peer dependency for mention suggestions (required since 2.0.0-beta.193) |
| @tiptap/starter-kit | 2.x | Basic editor features | Standard bundle (bold, italic, lists, etc.) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.x | Realtime subscriptions | Already in project, handles postgres_changes |
| BullMQ | 5.x | Background job queue | For delayed email notifications with Redis backend |
| ioredis | 5.x | Redis client | Required by BullMQ for job queue persistence |
| Resend | Already installed | Email delivery | Already in project for transactional emails |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Draft.js, Slate, Lexical | Tiptap has better TypeScript support and active maintenance in 2026 |
| BullMQ | node-cron, setTimeout | BullMQ provides persistence, retries, and distributed execution |
| Supabase Realtime | WebSocket library | Supabase provides authentication integration and RLS filtering |

**Installation:**
```bash
npm install @tiptap/react @tiptap/extension-mention @tiptap/suggestion @tiptap/starter-kit
npm install bullmq ioredis
```

## Architecture Patterns

### Recommended Database Structure
```sql
-- New table for conversation notes (migrate from JSONB array)
CREATE TABLE conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,              -- HTML with mention data attributes
  content_plain TEXT NOT NULL,        -- Plain text for search/preview
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- RLS policies will filter by organization_id
  CONSTRAINT conversation_notes_org_check
    FOREIGN KEY (conversation_id, organization_id)
    REFERENCES conversations(id, organization_id)
);

-- Mentions table for tracking and notifications
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES conversation_notes(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(note_id, mentioned_user_id)  -- One mention record per user per note
);

-- Indexes for performance
CREATE INDEX idx_conversation_notes_conversation ON conversation_notes(conversation_id);
CREATE INDEX idx_conversation_notes_org ON conversation_notes(organization_id);
CREATE INDEX idx_mentions_mentioned_user ON mentions(mentioned_user_id) WHERE viewed_at IS NULL;
CREATE INDEX idx_mentions_email_pending ON mentions(mentioned_user_id, created_at)
  WHERE email_sent_at IS NULL;

-- Enable Realtime for mentions table
ALTER PUBLICATION supabase_realtime ADD TABLE mentions;
```

### Pattern 1: Tiptap Mention Extension Configuration

**What:** Configure Tiptap editor with @mention autocomplete and suggestion dropdown
**When to use:** Any rich text input that needs @mention functionality

**Example:**
```typescript
// Source: https://tiptap.dev/docs/editor/extensions/nodes/mention
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { suggestion } from './suggestion'  // Separate file for clarity

interface MentionEditorProps {
  onSubmit: (content: string) => void
  organizationId: string
}

export function MentionEditor({ onSubmit, organizationId }: MentionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
          'data-type': 'mention',
        },
        suggestion,  // See suggestion configuration below
        renderText({ node }) {
          return `@${node.attrs.label}`
        },
      }),
    ],
    immediatelyRender: false,  // CRITICAL for Next.js SSR
    content: '',
  })

  const handleSubmit = () => {
    if (!editor) return
    const html = editor.getHTML()
    const plainText = editor.getText()
    onSubmit(html)
    editor.commands.clearContent()
  }

  return (
    <div className="mention-editor">
      <EditorContent editor={editor} />
      <button onClick={handleSubmit}>Add Note</button>
    </div>
  )
}
```

**Suggestion configuration (separate file for maintainability):**
```typescript
// Source: https://tiptap.dev/docs/editor/api/utilities/suggestion
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { MentionList } from './MentionList'
import type { MentionOptions } from '@tiptap/extension-mention'
import type { SuggestionProps } from '@tiptap/suggestion'

export const suggestion: MentionOptions['suggestion'] = {
  items: async ({ query, editor }) => {
    // Fetch team members from API
    const response = await fetch(
      `/api/organizations/${organizationId}/members?search=${query}`
    )
    const { data } = await response.json()

    return data
      .filter((user: any) =>
        user.full_name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5)  // Limit to 5 suggestions
  },

  render: () => {
    let component: ReactRenderer
    let popup: any

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: SuggestionProps) {
        component.updateProps(props)
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
```

### Pattern 2: Accessible Mention Dropdown (WAI-ARIA Combobox)

**What:** Keyboard-navigable, screen-reader accessible suggestion dropdown
**When to use:** Required for MENT-05 accessibility requirement

**Example:**
```typescript
// Source: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionProps } from '@tiptap/suggestion'

interface MentionListProps extends SuggestionProps {
  items: Array<{ id: string; full_name: string; avatar_url?: string; role: string }>
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({
        id: item.id,
        label: item.full_name
      })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  return (
    <div
      className="mention-dropdown"
      role="listbox"
      aria-label="Mention suggestions"
    >
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            role="option"
            aria-selected={index === selectedIndex}
            id={`mention-option-${index}`}
            className={index === selectedIndex ? 'is-selected' : ''}
            onClick={() => selectItem(index)}
          >
            {item.avatar_url && (
              <img
                src={item.avatar_url}
                alt=""
                className="mention-avatar"
              />
            )}
            <div className="mention-info">
              <span className="mention-name">{item.full_name}</span>
              <span className="mention-role">{item.role}</span>
            </div>
          </button>
        ))
      ) : (
        <div className="mention-empty">No team members found</div>
      )}
    </div>
  )
})
```

**Critical accessibility attributes:**
- `role="listbox"` on container
- `role="option"` on each suggestion item
- `aria-selected` on currently highlighted item
- `aria-label` for screen reader context
- Keyboard handlers for ArrowUp, ArrowDown, Enter, Escape

### Pattern 3: Supabase Realtime Mention Notifications

**What:** Real-time notification delivery when user is mentioned
**When to use:** MENT-02 real-time in-app notification requirement

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/stores/notifications'

export function MentionNotificationSubscriber({ userId }: { userId: string }) {
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new mentions for this user
    const channel = supabase
      .channel('user-mentions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions',
          filter: `mentioned_user_id=eq.${userId}`,
        },
        async (payload) => {
          const mention = payload.new

          // Fetch conversation and note details
          const { data: note } = await supabase
            .from('conversation_notes')
            .select(`
              id,
              content_plain,
              conversation_id,
              created_by,
              profiles:created_by (full_name, avatar_url)
            `)
            .eq('id', mention.note_id)
            .single()

          if (note) {
            addNotification({
              id: mention.id,
              type: 'mention',
              title: `${note.profiles.full_name} mentioned you`,
              message: note.content_plain.slice(0, 100),
              conversation_id: note.conversation_id,
              created_at: mention.created_at,
              viewed: false,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, addNotification])

  return null  // No visual component, just subscription
}
```

**Key considerations:**
- Filter subscriptions by `mentioned_user_id` for efficiency
- Use channel per user to avoid receiving irrelevant mentions
- Clean up subscription on unmount with `removeChannel`
- Fetch related data (note content, author) after receiving mention
- Update notification badge counter in Zustand store

### Pattern 4: Delayed Email Notifications with BullMQ

**What:** Send email notification if mention not viewed within 5 minutes
**When to use:** MENT-03 delayed email notification requirement

**Example:**
```typescript
// Source: https://bullmq.io/
// lib/queues/email-queue.ts
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { Resend } from 'resend'

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
})

const resend = new Resend(process.env.RESEND_API_KEY)

// Queue for delayed email jobs
export const emailQueue = new Queue('mention-emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

// Worker processes delayed jobs
export const emailWorker = new Worker(
  'mention-emails',
  async (job) => {
    const { mentionId, userId, conversationId, noteContent, authorName } = job.data

    // Check if mention has been viewed
    const { data: mention } = await supabase
      .from('mentions')
      .select('viewed_at, email_sent_at')
      .eq('id', mentionId)
      .single()

    // Skip if already viewed or email already sent
    if (mention?.viewed_at || mention?.email_sent_at) {
      return { skipped: true, reason: 'viewed or sent' }
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (!profile?.email) {
      return { skipped: true, reason: 'no email' }
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'notifications@yourdomain.com',
      to: profile.email,
      subject: `${authorName} mentioned you in a conversation`,
      html: `
        <p>Hi ${profile.full_name},</p>
        <p>${authorName} mentioned you in a conversation:</p>
        <blockquote>${noteContent}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inbox/${conversationId}">
          View conversation
        </a></p>
      `,
    })

    if (error) throw error

    // Mark email as sent
    await supabase
      .from('mentions')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', mentionId)

    return { sent: true, messageId: data?.id }
  },
  { connection }
)

// Add delayed email job when mention created
export async function scheduleMentionEmail(
  mentionId: string,
  userId: string,
  conversationId: string,
  noteContent: string,
  authorName: string
) {
  // Schedule email for 5 minutes from now
  await emailQueue.add(
    'mention-email',
    {
      mentionId,
      userId,
      conversationId,
      noteContent: noteContent.slice(0, 200),  // Truncate for email
      authorName,
    },
    {
      delay: 5 * 60 * 1000,  // 5 minutes in milliseconds
      jobId: `mention-${mentionId}`,  // Prevent duplicates
    }
  )
}
```

**API route integration:**
```typescript
// app/api/conversations/[id]/notes/route.ts (POST endpoint)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ... existing auth and validation ...

  // Parse mentions from HTML content
  const mentionedUserIds = extractMentionIds(content)  // Parse data-id attributes

  // Insert note
  const { data: note, error: noteError } = await supabase
    .from('conversation_notes')
    .insert({
      conversation_id: id,
      organization_id: organizationId,
      content,
      content_plain: stripHtml(content),
      created_by: user.id,
    })
    .select()
    .single()

  if (noteError) throw noteError

  // Create mention records and schedule emails
  for (const mentionedUserId of mentionedUserIds) {
    // Insert mention record
    const { data: mention } = await supabase
      .from('mentions')
      .insert({
        note_id: note.id,
        conversation_id: id,
        organization_id: organizationId,
        mentioned_user_id: mentionedUserId,
        mentioning_user_id: user.id,
      })
      .select()
      .single()

    // Schedule delayed email (will check viewed status before sending)
    if (mention) {
      await scheduleMentionEmail(
        mention.id,
        mentionedUserId,
        id,
        note.content_plain,
        userOrg.full_name || user.email
      )
    }
  }

  return createSuccessResponse({ note }, 201)
}
```

### Anti-Patterns to Avoid

- **Don't use setTimeout for email delays**: Server restarts lose scheduled emails, use persistent queue
- **Don't store mentions in JSONB**: Use relational table for querying unviewed mentions efficiently
- **Don't move DOM focus into suggestion dropdown**: Use aria-activedescendant pattern instead
- **Don't forget immediatelyRender: false**: Tiptap will break SSR in Next.js without this
- **Don't enable Realtime on all tables**: Only add tables you need to `supabase_realtime` publication
- **Don't parse mentions with regex**: Use proper HTML parsing or store mention IDs in separate array

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contenteditable wrapper | Tiptap/ProseMirror | Handles cursor position, selection, undo/redo, browser inconsistencies |
| Autocomplete dropdown | DIY dropdown with filtering | Tiptap Suggestion utility | Handles positioning, keyboard nav, async loading, edge cases |
| Email queue/retries | setTimeout + manual retry logic | BullMQ | Persistence, distributed execution, built-in retries, monitoring UI |
| Mention parsing | Regex matching of @ symbols | HTML data attributes | Handles edge cases (email addresses, code blocks, escaped characters) |
| Real-time notifications | Long polling or custom WebSocket | Supabase Realtime | Authentication, RLS filtering, reconnection, channel management |
| Accessible combobox | Custom keyboard handlers | WAI-ARIA pattern implementation | Screen reader support, focus management, WCAG compliance |

**Key insight:** Rich text editing and real-time features have complex edge cases (browser inconsistencies, network failures, race conditions). Mature libraries have solved these problems through years of production usage.

## Common Pitfalls

### Pitfall 1: Tiptap Breaks Server-Side Rendering (SSR)

**What goes wrong:** Tiptap tries to access `document` during server rendering, causing hydration errors in Next.js

**Why it happens:** ProseMirror (Tiptap's foundation) requires browser APIs not available on server

**How to avoid:**
```typescript
// REQUIRED for Next.js App Router
const editor = useEditor({
  extensions: [/* ... */],
  immediatelyRender: false,  // Prevents SSR rendering
})
```

**Warning signs:** "document is not defined" errors, hydration mismatches

**Source:** https://github.com/ueberdosis/tiptap/issues/6644

---

### Pitfall 2: Suggestion Dropdown Opens for All Users in Collaborative Editing

**What goes wrong:** When one user types `@`, suggestion dropdown opens for all connected users

**Why it happens:** Tiptap Collaboration syncs document changes, triggering suggestion logic on all clients

**How to avoid:**
```typescript
// Configure suggestion to only show for user who typed trigger
import { isChangeOrigin } from '@tiptap/extension-collaboration'

suggestion: {
  shouldShow: ({ editor, state }) => {
    // Only show if change originated from this client
    return isChangeOrigin(editor.extensionManager.extensions)
  },
  // ... rest of config
}
```

**Warning signs:** Users report seeing autocomplete when they didn't type anything

**Source:** https://tiptap.dev/docs/editor/api/utilities/suggestion

---

### Pitfall 3: Realtime Subscription Performance Degradation at Scale

**What goes wrong:** Real-time notifications become slow or fail with many concurrent users

**Why it happens:** Each mention INSERT triggers RLS policy evaluation for every subscribed user (100 users = 100 RLS checks per insert)

**How to avoid:**
- Use targeted filters: `filter: 'mentioned_user_id=eq.{userId}'` instead of subscribing to all mentions
- Consider Supabase Broadcast channels for high-scale scenarios (doesn't enforce RLS)
- Use proper indexes on filter columns
- Monitor with: `EXPLAIN ANALYZE` on RLS policies

**Warning signs:** Delayed notification delivery (>2s), database CPU spikes during mention creation

**Source:** https://supabase.com/docs/guides/realtime/postgres-changes

---

### Pitfall 4: Email Spam from Mention Storms

**What goes wrong:** User gets bombarded with 20+ emails when mentioned multiple times in rapid succession

**Why it happens:** Each mention schedules independent email job with 5-minute delay

**How to avoid:**
```typescript
// Batch mentions by conversation + user
await emailQueue.add(
  'mention-digest',
  {
    userId: mentionedUserId,
    conversationId: id,
    // Group all mentions from last 5 minutes
  },
  {
    delay: 5 * 60 * 1000,
    jobId: `digest-${userId}-${conversationId}`,  // Deduplicates multiple mentions
  }
)
```

**Alternative:** Use BullMQ's rate limiter to max 1 email per conversation per hour per user

**Warning signs:** User complaints about notification overload

---

### Pitfall 5: Lost Mention Context After Note Edit

**What goes wrong:** User edits note, removes @mention, but mention record persists in database

**Why it happens:** Mentions created on insert, not updated on note edit

**How to avoid:**
- Make mentions immutable (don't allow note editing, only deletion)
- OR: On note update, diff old vs new HTML, delete removed mentions, insert new ones
- OR: Add `deleted_at` field to mentions and soft-delete when mention removed from note

**Recommended:** Immutable notes (industry standard for audit trails)

**Warning signs:** Users see notifications for mentions that were removed

---

### Pitfall 6: Mention Parsing Fails on Edge Cases

**What goes wrong:** Email addresses (john@example.com) or code blocks get parsed as mentions

**Why it happens:** Simple regex like `/@\w+/g` matches anything starting with @

**How to avoid:**
```typescript
// Store mentions as HTML with data attributes
<span class="mention" data-type="mention" data-id="user-123" data-label="John Doe">
  @John Doe
</span>

// Parse with DOM APIs, not regex
function extractMentionIds(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const mentions = doc.querySelectorAll('span[data-type="mention"]')
  return Array.from(mentions).map(el => el.getAttribute('data-id')).filter(Boolean)
}
```

**Warning signs:** False positive mentions, users getting notified incorrectly

---

### Pitfall 7: Race Condition: Email Sent Before Mention Viewed

**What goes wrong:** User clicks notification at 4:59, email still sends at 5:00

**Why it happens:** Email job checks `viewed_at` when it runs, but brief delay between view and check

**How to avoid:**
```typescript
// In email worker, cancel job when mention viewed
export async function markMentionViewed(mentionId: string) {
  await supabase
    .from('mentions')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', mentionId)

  // Cancel pending email job
  await emailQueue.remove(`mention-${mentionId}`)
}
```

**Warning signs:** Users report getting emails for mentions they already viewed

## Code Examples

### Complete Mention Flow (API Route)

```typescript
// Source: Synthesized from Tiptap + Supabase best practices
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scheduleMentionEmail } from '@/lib/queues/email-queue'
import { requireAuthenticatedUser, getUserOrganization } from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)

    const body = await request.json()
    const { content } = body  // HTML from Tiptap editor

    if (!content?.trim()) {
      return Response.json({ error: 'Content required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify conversation access
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', userOrg.organization_id)
      .single()

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Extract mention IDs from HTML
    const mentionedUserIds = extractMentionIds(content)

    // Insert note
    const { data: note, error: noteError } = await supabase
      .from('conversation_notes')
      .insert({
        conversation_id: conversationId,
        organization_id: userOrg.organization_id,
        content,
        content_plain: stripHtml(content),
        created_by: user.id,
      })
      .select()
      .single()

    if (noteError) throw noteError

    // Create mention records and schedule notifications
    const mentionPromises = mentionedUserIds.map(async (mentionedUserId) => {
      // Skip self-mentions
      if (mentionedUserId === user.id) return null

      // Insert mention
      const { data: mention, error } = await supabase
        .from('mentions')
        .insert({
          note_id: note.id,
          conversation_id: conversationId,
          organization_id: userOrg.organization_id,
          mentioned_user_id: mentionedUserId,
          mentioning_user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create mention:', error)
        return null
      }

      // Schedule delayed email (5 minutes)
      await scheduleMentionEmail(
        mention.id,
        mentionedUserId,
        conversationId,
        note.content_plain,
        userOrg.full_name || user.email
      )

      return mention
    })

    await Promise.all(mentionPromises)

    return Response.json({ success: true, note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note with mentions:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper: Extract mention user IDs from Tiptap HTML
function extractMentionIds(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const mentions = doc.querySelectorAll('span[data-type="mention"][data-id]')
  return Array.from(mentions)
    .map(el => el.getAttribute('data-id'))
    .filter((id): id is string => !!id)
}

// Helper: Strip HTML tags for plain text preview
function stripHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
```

### Notification Badge with Real-time Updates

```typescript
// Source: https://mui.com/material-ui/react-badge/
'use client'
import { Badge } from '@/components/ui/badge'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function NotificationBadge({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    // Initial count
    supabase
      .from('mentions')
      .select('id', { count: 'exact', head: true })
      .eq('mentioned_user_id', userId)
      .is('viewed_at', null)
      .then(({ count }) => setUnreadCount(count || 0))

    // Subscribe to new mentions
    const channel = supabase
      .channel('mention-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions',
          filter: `mentioned_user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mentions',
          filter: `mentioned_user_id=eq.${userId}`,
        },
        (payload) => {
          // Decrement when viewed
          if (payload.new.viewed_at && !payload.old.viewed_at) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <Badge
      count={unreadCount}
      max={99}
      aria-live="polite"
      aria-label={`${unreadCount} unread mentions`}
    >
      <Bell className="h-5 w-5" />
    </Badge>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Draft.js | Tiptap (ProseMirror) | 2022-2023 | Better TypeScript support, active maintenance, smaller bundle |
| Manual WebSocket | Supabase Realtime | 2021-2022 | Integrated authentication, RLS filtering, managed infrastructure |
| setInterval polling | postgres_changes subscription | 2021 | Sub-2s latency, reduced server load, battery-friendly |
| node-cron | BullMQ with Redis | 2020-2021 | Persistence across restarts, distributed execution, monitoring |
| tippy.js dependency | Built-in positioning | 2024 | Tiptap v3 removed Tippy dependency, use native positioning |

**Deprecated/outdated:**
- **Tippy.js with Tiptap mentions**: Tiptap v3 no longer includes Tippy, use custom positioning or Floating UI
- **@tiptap/suggestion bundled**: Now a peer dependency, must install separately (since 2.0.0-beta.193)
- **Supabase Realtime v1 API**: Deprecated in favor of Channels API (channel().on() instead of from().on())

## Open Questions

### 1. Redis Infrastructure for BullMQ

**What we know:** BullMQ requires Redis for job persistence and distributed execution
**What's unclear:** Does the project have Redis available? If not, is it acceptable to add Redis dependency?
**Recommendation:**
- **If Redis available:** Use BullMQ pattern as documented
- **If no Redis:** Use Supabase Edge Functions with pg_cron for scheduled checks (less robust but no new infrastructure)
- **Alternative:** Vercel Cron Jobs for serverless environments (check viewed status every minute)

---

### 2. Migration Strategy for Existing Notes

**What we know:** Notes currently stored as JSONB array in `conversations.notes` column
**What's unclear:** Should migration preserve existing note IDs and timestamps exactly?
**Recommendation:**
- Create migration script that copies JSONB notes to `conversation_notes` table
- Preserve `created_at` timestamps from JSONB
- Generate new UUIDs (old string IDs won't work as foreign keys)
- Keep JSONB column temporarily for rollback safety
- Add `migrated_at` flag to track migration progress

---

### 3. Mention Notification Aggregation Strategy

**What we know:** Users can receive multiple mentions in short time periods
**What's unclear:** Should multiple mentions in same conversation be grouped into single notification?
**Recommendation:**
- **Real-time badge:** Show individual count (simpler, clearer)
- **Email notifications:** Group by conversation (prevent spam)
- **Implementation:** Use BullMQ `jobId` deduplication: `mention-digest-${conversationId}-${userId}`

## Sources

### Primary (HIGH confidence)

- [Tiptap Mention Extension Docs](https://tiptap.dev/docs/editor/extensions/nodes/mention) - Official API reference
- [Tiptap Suggestion Utility](https://tiptap.dev/docs/editor/api/utilities/suggestion) - Configuration patterns
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - Accessibility requirements
- [WAI-ARIA Combobox Examples](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/) - Reference implementation
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) - Event subscription API
- [Supabase Realtime Getting Started](https://supabase.com/docs/guides/realtime/getting_started) - Channel setup
- [BullMQ Documentation](https://bullmq.io/) - Job queue patterns

### Secondary (MEDIUM confidence)

- [Tiptap Best Practices (Liveblocks)](https://liveblocks.io/docs/guides/tiptap-best-practices-and-tips) - Production patterns
- [Building Real-time Notifications with Supabase and Next.js](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) - Tutorial
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) - Performance data
- [Material-UI Badge Component](https://mui.com/material-ui/react-badge/) - Accessible badge patterns
- [Building Job Queue with Node.js and BullMQ](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - Email queue patterns

### Tertiary (LOW confidence)

- [Tiptap TypeScript Discussion](https://github.com/ueberdosis/tiptap/discussions/2274) - Community TypeScript patterns
- [Medium: Creating Tiptap Extension](https://medium.com/@Aribaskar-jb/creating-a-tiptap-extension-best-practices-and-common-pitfalls-67c93b5a10b9) - Common pitfalls
- [LogRocket: Rate Limiting in Node.js](https://blog.logrocket.com/rate-limiting-node-js/) - Rate limiting patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Tiptap and Supabase Realtime are well-documented industry standards
- Architecture: HIGH - Database patterns verified with official Supabase docs
- Pitfalls: MEDIUM - Mix of official docs and community experience
- Email queuing: MEDIUM - BullMQ is standard but Redis requirement needs project context

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stack is stable, major changes unlikely)
