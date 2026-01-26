import { TranslationProvider } from '@/components/providers/translation-provider'
import { getServerLocale } from '@/lib/i18n/server'
import { getDictionary } from '@/lib/i18n/dictionaries'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Load translations for the current locale
  const locale = await getServerLocale()
  const translations = await getDictionary(locale)

  return (
    <TranslationProvider locale={locale} translations={translations}>
      {children}
    </TranslationProvider>
  )
}
