import { requireOrganization } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { InboxLayout } from '@/components/inbox/inbox-layout'

export default async function InboxPage() {
  const profile = await requireOrganization()
  const supabase = await createClient()

  // Fetch conversations with contact details and unread counts
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      contact:contacts(*),
      assigned_agent:profiles(full_name, avatar_url),
      messages!inner(
        id,
        content,
        sender_type,
        is_read,
        created_at
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('last_message_at', { ascending: false })

  // Transform conversations with unread counts
  const conversationsWithUnread = conversations?.map(conv => ({
    ...conv,
    unread_count: conv.messages?.filter((msg: any) =>
      msg.sender_type === 'contact' && !msg.is_read
    ).length || 0,
    last_message: conv.messages?.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  })) || []

  return (
    <div className="h-[calc(100vh-4rem)]">
      <InboxLayout
        conversations={conversationsWithUnread}
        profile={profile}
      />
    </div>
  )
}