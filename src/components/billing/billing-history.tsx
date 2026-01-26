'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'

// Simple date formatter
function formatDate(date: Date) {
  return date.toLocaleDateString()
}

interface BillingHistoryProps {
  organizationId: string
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  hosted_invoice_url: string
  invoice_pdf: string
}

export function BillingHistory({ organizationId }: BillingHistoryProps) {
  const t = useTranslations('billing')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/billing/invoices')

        if (response.ok) {
          const data = await response.json()
          setInvoices(data.invoices || [])
        } else {
          console.error('Failed to fetch invoices')
          setInvoices([])
        }
      } catch (error) {
        console.error('Error fetching invoices:', error)
        setInvoices([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [organizationId])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return t('paid')
      case 'open':
        return t('open')
      case 'pending':
        return t('pending')
      case 'failed':
        return t('failed')
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className='rounded-lg bg-white shadow'>
        <div className='border-b border-gray-200 px-6 py-4'>
          <h2 className='text-lg font-medium text-gray-900'>{t('billingHistory')}</h2>
        </div>
        <div className='p-6'>
          <div className='animate-pulse space-y-4'>
            <div className='h-4 w-3/4 rounded bg-gray-200'></div>
            <div className='h-4 w-1/2 rounded bg-gray-200'></div>
            <div className='h-4 w-2/3 rounded bg-gray-200'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='rounded-lg bg-white shadow'>
      <div className='border-b border-gray-200 px-6 py-4'>
        <h2 className='text-lg font-medium text-gray-900'>{t('billingHistory')}</h2>
        <p className='text-sm text-gray-500'>{t('billingHistoryDescription')}</p>
      </div>
      <div className='p-6'>
        {invoices.length === 0 ? (
          <div className='py-8 text-center'>
            <svg
              className='mx-auto h-12 w-12 text-gray-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900'>{t('noInvoices')}</h3>
            <p className='mt-1 text-sm text-gray-500'>
              {t('noInvoicesDescription')}
            </p>
          </div>
        ) : (
          <div className='overflow-hidden'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    {t('date')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    {t('amount')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    {t('status')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    {t('invoice')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {formatDate(new Date(invoice.created * 1000))}
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      <div className='flex space-x-2'>
                        <a
                          href={invoice.hosted_invoice_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-green-600 hover:text-green-900'
                        >
                          {t('view')}
                        </a>
                        <a
                          href={invoice.invoice_pdf}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-green-600 hover:text-green-900'
                        >
                          {t('downloadPdf')}
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
