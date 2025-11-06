/**
 * Metrics Collector for Load Testing
 * Collects real-time metrics during load tests
 */

const http = require('http')
const fs = require('fs')
const path = require('path')

class MetricsCollector {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000'
    this.interval = config.interval || 5000 // 5 seconds
    this.outputDir = config.outputDir || path.join(__dirname, '../reports')
    this.metrics = []
    this.isRunning = false
    this.intervalId = null
  }

  async start() {
    console.log('📊 Starting metrics collection...')
    this.isRunning = true
    this.startTime = Date.now()

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }

    // Start collecting metrics
    this.intervalId = setInterval(() => this.collect(), this.interval)

    // Initial collection
    await this.collect()

    console.log(`✅ Metrics collector started (interval: ${this.interval}ms)`)
  }

  async stop() {
    console.log('\n⏹️  Stopping metrics collection...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    // Save final metrics
    await this.saveMetrics()

    console.log('✅ Metrics collection stopped')
  }

  async collect() {
    if (!this.isRunning) return

    const timestamp = Date.now()
    const elapsed = Math.floor((timestamp - this.startTime) / 1000)

    try {
      const metric = {
        timestamp: new Date(timestamp).toISOString(),
        elapsed,
        health: await this.getHealthMetrics(),
        performance: await this.getPerformanceMetrics(),
        system: await this.getSystemMetrics(),
        database: await this.getDatabaseMetrics(),
      }

      this.metrics.push(metric)

      // Log real-time status
      this.logStatus(metric)

      // Save metrics every minute
      if (elapsed % 60 === 0) {
        await this.saveMetrics()
      }
    } catch (error) {
      console.error('Error collecting metrics:', error.message)
    }
  }

  async getHealthMetrics() {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/health`)
      const data = await response.json()

      return {
        status: data.status,
        uptime: data.uptime,
        services: {
          supabase: data.services.supabase?.status || 'unknown',
          redis: data.services.redis?.status || 'unknown',
          stripe: data.services.stripe?.status || 'unknown',
          whatsapp: data.services.whatsapp?.status || 'unknown',
        },
        memory: data.system?.memory || {},
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      }
    }
  }

  async getPerformanceMetrics() {
    try {
      // Make sample requests to measure response times
      const endpoints = ['/api/health', '/api/conversations?limit=10', '/api/contacts?limit=10']

      const results = await Promise.all(
        endpoints.map(async endpoint => {
          const start = Date.now()
          try {
            const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
              timeout: 5000,
            })
            const duration = Date.now() - start

            return {
              endpoint,
              status: response.status,
              duration,
              success: response.ok,
            }
          } catch (error) {
            return {
              endpoint,
              status: 0,
              duration: Date.now() - start,
              success: false,
              error: error.message,
            }
          }
        })
      )

      const successfulRequests = results.filter(r => r.success)
      const avgResponseTime =
        successfulRequests.length > 0
          ? successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length
          : 0

      return {
        avgResponseTime: Math.round(avgResponseTime),
        successRate: (successfulRequests.length / results.length) * 100,
        endpoints: results,
      }
    } catch (error) {
      return {
        error: error.message,
      }
    }
  }

  async getSystemMetrics() {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/health`)
      const data = await response.json()

      return {
        memory: data.system?.memory || {
          used: 0,
          total: 0,
          percentage: 0,
        },
        nodeVersion: data.system?.nodeVersion || 'unknown',
      }
    } catch (error) {
      return {
        error: error.message,
      }
    }
  }

  async getDatabaseMetrics() {
    try {
      // Measure database response time with a simple query
      const start = Date.now()
      const response = await this.fetch(`${this.baseUrl}/api/health`)
      await response.json()
      const duration = Date.now() - start

      return {
        responseTime: duration,
        status: response.ok ? 'healthy' : 'degraded',
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      }
    }
  }

  logStatus(metric) {
    const health = metric.health
    const perf = metric.performance

    // Clear console line and write status
    process.stdout.write('\r\x1b[K') // Clear line

    const statusEmoji =
      health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌'

    const memoryPct = health.memory?.percentage || 0
    const memoryEmoji = memoryPct < 70 ? '🟢' : memoryPct < 85 ? '🟡' : '🔴'

    process.stdout.write(
      `${statusEmoji} Status: ${health.status.padEnd(9)} | ` +
        `⏱️  Response: ${(perf.avgResponseTime || 0).toFixed(0)}ms | ` +
        `${memoryEmoji} Memory: ${memoryPct}% | ` +
        `⏰ Elapsed: ${formatTime(metric.elapsed)}`
    )
  }

  async saveMetrics() {
    const filename = `metrics-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`
    const filepath = path.join(this.outputDir, filename)

    try {
      fs.writeFileSync(
        filepath,
        JSON.stringify(
          {
            collectionStart: new Date(this.startTime).toISOString(),
            collectionEnd: new Date().toISOString(),
            duration: Math.floor((Date.now() - this.startTime) / 1000),
            dataPoints: this.metrics.length,
            metrics: this.metrics,
          },
          null,
          2
        )
      )

      // Also save latest as current
      const currentPath = path.join(this.outputDir, 'current-metrics.json')
      fs.writeFileSync(
        currentPath,
        JSON.stringify(
          {
            lastUpdate: new Date().toISOString(),
            latest: this.metrics[this.metrics.length - 1],
            summary: this.generateSummary(),
          },
          null,
          2
        )
      )
    } catch (error) {
      console.error('Error saving metrics:', error.message)
    }
  }

  generateSummary() {
    if (this.metrics.length === 0) return {}

    const healthyCount = this.metrics.filter(m => m.health?.status === 'healthy').length
    const responseTimes = this.metrics
      .map(m => m.performance?.avgResponseTime)
      .filter(t => t !== undefined)

    const memoryUsage = this.metrics
      .map(m => m.health?.memory?.percentage)
      .filter(p => p !== undefined)

    return {
      totalDataPoints: this.metrics.length,
      healthRate: ((healthyCount / this.metrics.length) * 100).toFixed(2) + '%',
      avgResponseTime:
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      avgMemoryUsage:
        memoryUsage.length > 0
          ? Math.round(memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length)
          : 0,
      peakMemoryUsage: memoryUsage.length > 0 ? Math.max(...memoryUsage) : 0,
    }
  }

  async fetch(url, options = {}) {
    const timeout = options.timeout || 10000

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, timeout)

      const urlObj = new URL(url)
      const client = urlObj.protocol === 'https:' ? require('https') : require('http')

      const req = client.get(url, res => {
        clearTimeout(timer)

        let data = ''
        res.on('data', chunk => {
          data += chunk
        })

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            headers: res.headers,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data),
          })
        })
      })

      req.on('error', error => {
        clearTimeout(timer)
        reject(error)
      })
    })
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// CLI interface
if (require.main === module) {
  const collector = new MetricsCollector({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    interval: parseInt(process.env.INTERVAL) || 5000,
  })

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n📊 Generating final report...')
    await collector.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await collector.stop()
    process.exit(0)
  })

  // Start collection
  collector.start().catch(error => {
    console.error('Failed to start collector:', error)
    process.exit(1)
  })
}

module.exports = MetricsCollector
