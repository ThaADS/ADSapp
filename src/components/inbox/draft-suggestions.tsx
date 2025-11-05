'use client';

/**
 * Draft Suggestions Component
 * Display AI-generated response suggestions in the inbox
 */

import { useState } from 'react';
import type { DraftSuggestion } from '@/lib/ai/types';

interface DraftSuggestionsProps {
  conversationId: string;
  onSelectDraft: (content: string) => void;
  onClose: () => void;
}

export function DraftSuggestions({
  conversationId,
  onSelectDraft,
  onClose,
}: DraftSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvingIndex, setImprovingIndex] = useState<number | null>(null);
  const [improvementFeedback, setImprovementFeedback] = useState('');

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          count: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      console.error('Generate suggestions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const improveDraft = async (draft: string, feedback: string) => {
    try {
      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'improve',
          existingDraft: draft,
          feedback,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to improve draft');
      }

      // Replace the draft with improved version
      onSelectDraft(data.improvedDraft);
      setImprovingIndex(null);
      setImprovementFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve draft');
      console.error('Improve draft error:', err);
    }
  };

  // Auto-generate on mount
  useState(() => {
    generateSuggestions();
  });

  const getToneColor = (tone?: string) => {
    switch (tone) {
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'friendly':
        return 'bg-green-100 text-green-800';
      case 'empathetic':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            AI Concept Suggesties
          </h3>
          <p className="text-sm text-gray-600">
            Kies een suggestie of pas aan naar wens
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Sluiten"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-gray-600">AI genereert suggesties...</p>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              {/* Suggestion Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {suggestion.tone && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getToneColor(suggestion.tone)}`}>
                      {suggestion.tone === 'professional' ? 'Professioneel' :
                       suggestion.tone === 'friendly' ? 'Vriendelijk' :
                       suggestion.tone === 'empathetic' ? 'Empathisch' : suggestion.tone}
                    </span>
                  )}
                  <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                    {Math.round(suggestion.confidence * 100)}% vertrouwen
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setImprovingIndex(improvingIndex === index ? null : index)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                    title="Verbeteren"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onSelectDraft(suggestion.content)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Gebruiken
                  </button>
                </div>
              </div>

              {/* Suggestion Content */}
              <p className="text-gray-800 whitespace-pre-wrap mb-2">
                {suggestion.content}
              </p>

              {/* Reasoning */}
              {suggestion.reasoning && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">
                    Waarom deze suggestie?
                  </summary>
                  <p className="mt-2 pl-4 border-l-2 border-gray-200">
                    {suggestion.reasoning}
                  </p>
                </details>
              )}

              {/* Improvement Panel */}
              {improvingIndex === index && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hoe wil je deze suggestie verbeteren?
                  </label>
                  <textarea
                    value={improvementFeedback}
                    onChange={(e) => setImprovementFeedback(e.target.value)}
                    placeholder="Bijv: 'Maak het formeler' of 'Voeg een kortingsaanbieding toe'"
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setImprovingIndex(null);
                        setImprovementFeedback('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => improveDraft(suggestion.content, improvementFeedback)}
                      disabled={!improvementFeedback.trim()}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Verbeteren
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && !error && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen suggesties</h3>
          <p className="mt-1 text-sm text-gray-500">
            Kon geen concept suggesties genereren voor dit gesprek.
          </p>
          <button
            onClick={generateSuggestions}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Opnieuw proberen
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {!loading && suggestions.length > 0 && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={generateSuggestions}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Nieuwe Suggesties
          </button>
        </div>
      )}
    </div>
  );
}
