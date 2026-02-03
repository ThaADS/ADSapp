import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { MentionList, MentionListRef } from './mention-list'
import type { MentionSuggestion } from '@/types/mentions'

/**
 * Tiptap suggestion configuration for @mentions
 * Fetches team members from API and displays in accessible dropdown
 */
export const suggestion: Omit<SuggestionOptions<MentionSuggestion>, 'editor'> = {
  char: '@',
  allowSpaces: false,

  items: async ({ query }): Promise<MentionSuggestion[]> => {
    try {
      // Fetch team members from API
      const response = await fetch(`/api/team/members?search=${encodeURIComponent(query)}`)
      if (!response.ok) {
        console.error('Failed to fetch team members')
        return []
      }

      const data = await response.json()
      const members: MentionSuggestion[] = (data.data?.members || data.members || []).map(
        (member: any) => ({
          id: member.id,
          full_name: member.full_name,
          email: member.email,
          avatar_url: member.avatar_url,
          role: member.role || 'Team Member',
        })
      )

      // Filter by query (case-insensitive)
      if (query) {
        const lowerQuery = query.toLowerCase()
        return members
          .filter(
            (m) =>
              m.full_name?.toLowerCase().includes(lowerQuery) ||
              m.email?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 5)
      }

      return members.slice(0, 5)
    } catch (error) {
      console.error('Error fetching team members:', error)
      return []
    }
  },

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null
    let popup: TippyInstance[] | null = null

    return {
      onStart: (props: SuggestionProps<MentionSuggestion>) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          maxWidth: '320px',
        })
      },

      onUpdate: (props: SuggestionProps<MentionSuggestion>) => {
        component?.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        })
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }

        return component?.ref?.onKeyDown(props) ?? false
      },

      onExit: () => {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  },
}
