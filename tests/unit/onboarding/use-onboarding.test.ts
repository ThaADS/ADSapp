/**
 * @jest-environment jsdom
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { renderHook, waitFor } from '@testing-library/react';
import { useOnboarding } from '@/hooks/use-onboarding';

// Mock fetch
global.fetch = jest.fn();

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('fetches onboarding progress on mount', async () => {
    const mockProgress = {
      id: '123',
      user_id: 'user-1',
      organization_id: 'org-1',
      completion_percentage: 50,
      welcome_screen_completed: true,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProgress }),
    });

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.progress).toEqual(mockProgress);
    expect(result.current.error).toBeNull();
  });

  it('updates progress successfully', async () => {
    const mockProgress = {
      id: '123',
      completion_percentage: 50,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProgress }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockProgress, welcome_screen_completed: true },
        }),
      });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updateProgress({ welcome_screen_completed: true });

    await waitFor(() => {
      expect(result.current.progress?.welcome_screen_completed).toBe(true);
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized', message: 'Authentication required' }),
    });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.progress).toBeNull();
  });

  it('completes milestone successfully', async () => {
    const mockProgress = { id: '123', total_milestones_achieved: 0 };
    const mockMilestone = {
      id: 'milestone-1',
      milestone_type: 'welcome_completed',
      milestone_name: 'Welcome Complete',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProgress }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockMilestone }),
      });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.completeMilestone({
      milestone_type: 'welcome_completed',
      milestone_name: 'Welcome Complete',
    });

    await waitFor(() => {
      expect(result.current.progress?.total_milestones_achieved).toBe(1);
    });
  });

  it('skips onboarding successfully', async () => {
    const mockProgress = { id: '123', tour_skipped: false };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProgress }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockProgress, tour_skipped: true },
        }),
      });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.skipOnboarding('User requested');

    await waitFor(() => {
      expect(result.current.progress?.tour_skipped).toBe(true);
    });
  });
});
