import { createClient } from '@/lib/supabase/server'

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  dateRange: {
    start: string
    end: string
  }
  metrics: string[]
  organizationId: string
}

export class AnalyticsExporter {
  private supabase = createClient()

  async exportData(options: ExportOptions) {
    const { format, dateRange, metrics, organizationId } = options

    // Fetch analytics data
    const data = await this.fetchAnalyticsData(organizationId, dateRange, metrics)

    switch (format) {
      case 'csv':
        return this.exportToCSV(data)
      case 'excel':
        return this.exportToExcel(data)
      case 'pdf':
        return this.exportToPDF(data)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  private async fetchAnalyticsData(organizationId: string, dateRange: any, metrics: string[]) {
    const queries = []

    if (metrics.includes('messages')) {
      queries.push(
        this.supabase
          .from('messages')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      )
    }

    if (metrics.includes('conversations')) {
      queries.push(
        this.supabase
          .from('conversations')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      )
    }

    if (metrics.includes('contacts')) {
      queries.push(
        this.supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      )
    }

    const results = await Promise.all(queries)
    return this.aggregateData(results, metrics)
  }

  private aggregateData(results: any[], metrics: string[]) {
    const aggregated: any = {}

    metrics.forEach((metric, index) => {
      if (results[index]?.data) {
        aggregated[metric] = results[index].data
      }
    })

    return aggregated
  }

  private exportToCSV(data: any) {
    const csvRows = []
    
    // Add headers
    const headers = Object.keys(data).join(',')
    csvRows.push(headers)

    // Add data rows
    const maxLength = Math.max(...Object.values(data).map((arr: any) => arr.length))
    
    for (let i = 0; i < maxLength; i++) {
      const row = Object.keys(data).map(key => {
        const item = data[key][i]
        return item ? JSON.stringify(item) : ''
      }).join(',')
      csvRows.push(row)
    }

    return {
      content: csvRows.join('\n'),
      filename: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    }
  }

  private exportToExcel(data: any) {
    // For now, return CSV format with Excel MIME type
    // In production, you'd use a library like xlsx
    const csvData = this.exportToCSV(data)
    
    return {
      content: csvData.content,
      filename: `analytics-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  private exportToPDF(data: any) {
    // Basic PDF export - in production, use a library like jsPDF
    const content = `
      Analytics Export Report
      Generated: ${new Date().toISOString()}
      
      ${Object.entries(data).map(([key, value]) => 
        `${key.toUpperCase()}: ${Array.isArray(value) ? value.length : 0} items`
      ).join('\n')}
    `

    return {
      content,
      filename: `analytics-export-${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf'
    }
  }
}
