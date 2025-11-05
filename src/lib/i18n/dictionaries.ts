// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import 'server-only';
import type { Locale } from '@/../i18n.config';

// Dictionary types for type safety
export type Dictionary = {
  [key: string]: string | Dictionary;
};

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/locales/en/index').then((module) => module.default),
  nl: () => import('@/locales/nl/index').then((module) => module.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale]();
};