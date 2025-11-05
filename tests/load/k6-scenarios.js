/**
 * ADSapp Load Testing - Main k6 Scenarios
 *
 * Comprehensive load testing for 2000+ concurrent users
 * Tests all user profiles: Active Agent, Moderate, Light User, Admin
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import ws from 'k6/ws';

// Custom Metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const dbQueryTime = new Trend('db_query_time');
const wsConnectionTime = new Trend('ws_connection_time');
const messagesSent = new Counter('messages_sent');
const messagesReceived = new Counter('messages_received');
const activeConnections = new Gauge('active_connections');
const cacheHitRate = new Rate('cache_hits');
const authFailures = new Counter('auth_failures');

// Test Configuration
export const options = {
  stages: [
    // Stage 1: Baseline (10 minutes)
    { duration: '10m', target: 100 },

    // Stage 2: Ramp Up (15 minutes)
    { duration: '5m', target: 200 },
    { duration: '5m', target: 350 },
    { duration: '5m', target: 500 },

    // Stage 3: Sustained Load (30 minutes)
    { duration: '30m', target: 500 },

    // Stage 4: Spike Test (5 minutes)
    { duration: '2m', target: 1000 },
    { duration: '1m', target: 1500 },
    { duration: '2m', target: 1500 },

    // Stage 5: Peak Load (20 minutes)
    { duration: '5m', target: 1800 },
    { duration: '10m', target: 2000 },
    { duration: '5m', target: 2000 },

    // Stage 6: Stress Test (10 minutes)
    { duration: '5m', target: 2500 },
    { duration: '5m', target: 3000 },

    // Ramp Down (5 minutes)
    { duration: '5m', target: 1000 },

    // Stage 7: Soak Test (2 hours)
    { duration: '2h', target: 1000 },
  ],

  thresholds: {
    // Overall thresholds
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    'http_req_failed': ['rate<0.01'], // Less than 1% errors
    'errors': ['rate<0.05'], // Less than 5% business logic errors

    // API endpoint specific thresholds
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:conversations}': ['p(95)<500'],
    'http_req_duration{endpoint:messages}': ['p(95)<800'],
    'http_req_duration{endpoint:contacts}': ['p(95)<400'],
    'http_req_duration{endpoint:analytics}': ['p(95)<1500'],

    // WebSocket thresholds
    'ws_connection_time': ['p(95)<1000'],

    // Database thresholds
    'db_query_time': ['p(95)<300'],

    // Business metrics
    'messages_sent': ['count>50000'], // At least 50k messages sent during test
    'cache_hits': ['rate>0.7'], // 70%+ cache hit rate
  },

  // Scenario distribution matching user profiles
  scenarios: {
    active_agent: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: options.stages,
      exec: 'activeAgentScenario',
      env: { PROFILE: 'active_agent' },
      tags: { profile: 'active_agent' },
    },

    moderate_user: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: options.stages.map(stage => ({
        duration: stage.duration,
        target: Math.floor(stage.target * 0.35 / 0.40)
      })),
      exec: 'moderateUserScenario',
      env: { PROFILE: 'moderate_user' },
      tags: { profile: 'moderate_user' },
    },

    light_user: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: options.stages.map(stage => ({
        duration: stage.duration,
        target: Math.floor(stage.target * 0.20 / 0.40)
      })),
      exec: 'lightUserScenario',
      env: { PROFILE: 'light_user' },
      tags: { profile: 'light_user' },
    },

    admin_user: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: options.stages.map(stage => ({
        duration: stage.duration,
        target: Math.floor(stage.target * 0.05 / 0.40)
      })),
      exec: 'adminUserScenario',
      env: { PROFILE: 'admin_user' },
      tags: { profile: 'admin_user' },
    },
  },

  // System resource limits
  maxVUs: 3500,

  // Test metadata
  tags: {
    test_type: 'load',
    environment: __ENV.TEST_ENV || 'staging',
    test_run_id: __ENV.TEST_RUN_ID || Date.now(),
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';
const API_VERSION = __ENV.API_VERSION || 'v1';

// Load test data
const testUsers = new SharedArray('users', function() {
  return JSON.parse(open('./data/test-users.json'));
});

const testConversations = new SharedArray('conversations', function() {
  return JSON.parse(open('./data/test-conversations.json'));
});

const messageTemplates = new SharedArray('templates', function() {
  return JSON.parse(open('./data/message-templates.json'));
});

// Helper Functions
function authenticate(email, password) {
  const startTime = Date.now();

  const response = http.post(`${BASE_URL}/api/auth/signin`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' },
    }
  );

  const success = check(response, {
    'auth successful': (r) => r.status === 200,
    'auth token received': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    authFailures.add(1);
    errorRate.add(1);
  }

  apiResponseTime.add(Date.now() - startTime, { endpoint: 'auth' });

  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return {
        token: body.token,
        userId: body.user.id,
        organizationId: body.user.organization_id,
      };
    } catch (e) {
      errorRate.add(1);
      return null;
    }
  }

  return null;
}

function makeAuthenticatedRequest(method, endpoint, authData, payload = null) {
  const startTime = Date.now();
  const url = `${BASE_URL}/api/${endpoint}`;

  const params = {
    headers: {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: endpoint.split('/')[0],
      method: method,
    },
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(payload), params);
  } else if (method === 'DELETE') {
    response = http.del(url, params);
  }

  const duration = Date.now() - startTime;
  apiResponseTime.add(duration, { endpoint: endpoint.split('/')[0] });

  const success = check(response, {
    [`${method} ${endpoint} successful`]: (r) => r.status >= 200 && r.status < 300,
    [`${method} ${endpoint} fast enough`]: (r) => duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
  }

  // Track cache hits if header present
  if (response.headers['X-Cache-Status']) {
    cacheHitRate.add(response.headers['X-Cache-Status'] === 'HIT' ? 1 : 0);
  }

  return response;
}

function connectWebSocket(authData) {
  const startTime = Date.now();
  const url = `${WS_URL}/api/realtime?token=${authData.token}`;

  const response = ws.connect(url, {
    tags: { type: 'websocket' },
  }, function(socket) {
    socket.on('open', () => {
      activeConnections.add(1);
      wsConnectionTime.add(Date.now() - startTime);

      // Subscribe to conversations
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'conversations',
        organizationId: authData.organizationId,
      }));
    });

    socket.on('message', (data) => {
      messagesReceived.add(1);

      try {
        const message = JSON.parse(data);
        check(message, {
          'valid message format': (m) => m.type !== undefined,
        });
      } catch (e) {
        errorRate.add(1);
      }
    });

    socket.on('close', () => {
      activeConnections.add(-1);
    });

    socket.on('error', (e) => {
      errorRate.add(1);
    });

    // Keep connection alive for realistic duration
    socket.setTimeout(() => {
      socket.close();
    }, Math.random() * 120000 + 60000); // 1-3 minutes
  });

  check(response, {
    'websocket connected': (r) => r && r.status === 101,
  });
}

// Scenario Implementations

/**
 * Profile A: Active Agent (40% of users)
 * - Login every 30 seconds
 * - Check inbox (10 req/min)
 * - Send messages (2 req/min)
 * - Update conversation status (1 req/min)
 * - Search contacts (0.5 req/min)
 */
export function activeAgentScenario() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const authData = authenticate(user.email, user.password);

  if (!authData) {
    sleep(5);
    return;
  }

  // Connect WebSocket for real-time updates
  connectWebSocket(authData);

  // Main activity loop - 30 seconds
  for (let i = 0; i < 30; i++) {
    group('Active Agent - Inbox Check', () => {
      // Check inbox (every 6 seconds = 10/min)
      if (i % 6 === 0) {
        makeAuthenticatedRequest('GET', 'conversations?status=open', authData);
      }

      // Send message (every 30 seconds = 2/min)
      if (i % 30 === 0) {
        const conversation = testConversations[Math.floor(Math.random() * testConversations.length)];
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

        const response = makeAuthenticatedRequest('POST',
          `conversations/${conversation.id}/messages`,
          authData,
          {
            content: template.content,
            type: 'text',
          }
        );

        if (response.status === 200) {
          messagesSent.add(1);
        }
      }

      // Update conversation status (every 60 seconds = 1/min)
      if (i % 60 === 0) {
        const conversation = testConversations[Math.floor(Math.random() * testConversations.length)];
        makeAuthenticatedRequest('PUT',
          `conversations/${conversation.id}`,
          authData,
          { status: Math.random() > 0.5 ? 'open' : 'resolved' }
        );
      }

      // Search contacts (every 120 seconds = 0.5/min)
      if (i % 120 === 0) {
        makeAuthenticatedRequest('GET',
          `contacts?search=${encodeURIComponent('test')}`,
          authData
        );
      }
    });

    sleep(1);
  }

  sleep(Math.random() * 10); // Random delay before next iteration
}

/**
 * Profile B: Moderately Active (35% of users)
 * - Login every 2 minutes
 * - Check inbox (5 req/min)
 * - Send messages (1 req/min)
 * - View analytics (0.2 req/min)
 */
export function moderateUserScenario() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const authData = authenticate(user.email, user.password);

  if (!authData) {
    sleep(5);
    return;
  }

  // Activity loop - 2 minutes
  for (let i = 0; i < 120; i++) {
    group('Moderate User - Activity', () => {
      // Check inbox (every 12 seconds = 5/min)
      if (i % 12 === 0) {
        makeAuthenticatedRequest('GET', 'conversations?status=open', authData);
      }

      // Send message (every 60 seconds = 1/min)
      if (i % 60 === 0) {
        const conversation = testConversations[Math.floor(Math.random() * testConversations.length)];
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

        const response = makeAuthenticatedRequest('POST',
          `conversations/${conversation.id}/messages`,
          authData,
          { content: template.content, type: 'text' }
        );

        if (response.status === 200) {
          messagesSent.add(1);
        }
      }

      // View analytics (every 5 minutes = 0.2/min)
      if (i % 300 === 0) {
        makeAuthenticatedRequest('GET', 'analytics/dashboard', authData);
      }
    });

    sleep(1);
  }

  sleep(Math.random() * 30);
}

/**
 * Profile C: Light User (20% of users)
 * - Login every 10 minutes
 * - Check inbox (2 req/min)
 * - Send occasional message (0.5 req/min)
 */
export function lightUserScenario() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const authData = authenticate(user.email, user.password);

  if (!authData) {
    sleep(5);
    return;
  }

  // Activity loop - 10 minutes
  for (let i = 0; i < 600; i++) {
    group('Light User - Activity', () => {
      // Check inbox (every 30 seconds = 2/min)
      if (i % 30 === 0) {
        makeAuthenticatedRequest('GET', 'conversations?status=open', authData);
      }

      // Send message (every 2 minutes = 0.5/min)
      if (i % 120 === 0) {
        const conversation = testConversations[Math.floor(Math.random() * testConversations.length)];
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

        const response = makeAuthenticatedRequest('POST',
          `conversations/${conversation.id}/messages`,
          authData,
          { content: template.content, type: 'text' }
        );

        if (response.status === 200) {
          messagesSent.add(1);
        }
      }
    });

    sleep(1);
  }

  sleep(Math.random() * 60);
}

/**
 * Profile D: Admin (5% of users)
 * - Login every 5 minutes
 * - View dashboards (3 req/min)
 * - Manage settings (0.5 req/min)
 * - Export reports (0.1 req/min)
 */
export function adminUserScenario() {
  const user = testUsers.find(u => u.role === 'admin') || testUsers[0];
  const authData = authenticate(user.email, user.password);

  if (!authData) {
    sleep(5);
    return;
  }

  // Activity loop - 5 minutes
  for (let i = 0; i < 300; i++) {
    group('Admin - Activity', () => {
      // View dashboards (every 20 seconds = 3/min)
      if (i % 20 === 0) {
        makeAuthenticatedRequest('GET', 'admin/dashboard', authData);
        makeAuthenticatedRequest('GET', 'analytics/dashboard', authData);
      }

      // Manage settings (every 2 minutes = 0.5/min)
      if (i % 120 === 0) {
        makeAuthenticatedRequest('GET', 'admin/settings', authData);
      }

      // Export reports (every 10 minutes = 0.1/min)
      if (i % 600 === 0) {
        makeAuthenticatedRequest('POST',
          'analytics/export',
          authData,
          { format: 'csv', dateRange: 'last_7_days' }
        );
      }

      // View audit logs
      if (i % 60 === 0) {
        makeAuthenticatedRequest('GET', 'admin/audit-logs', authData);
      }
    });

    sleep(1);
  }

  sleep(Math.random() * 60);
}

// Test lifecycle hooks
export function setup() {
  console.log('🚀 Starting ADSapp Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Environment: ${__ENV.TEST_ENV || 'staging'}`);
  console.log(`Max VUs: ${options.maxVUs}`);
  console.log(`Test Duration: ~4 hours`);

  // Health check before starting
  const healthCheck = http.get(`${BASE_URL}/api/health`);

  if (healthCheck.status !== 200) {
    throw new Error('System health check failed before test start');
  }

  console.log('✅ Health check passed');

  return {
    startTime: Date.now(),
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`\n📊 Load Test Complete`);
  console.log(`Duration: ${duration.toFixed(2)} minutes`);
  console.log(`See detailed reports in tests/load/reports/`);
}

// Handle test interruption
export function handleSummary(data) {
  return {
    'tests/load/reports/summary.json': JSON.stringify(data, null, 2),
    'tests/load/reports/summary.html': generateHTMLReport(data),
    stdout: generateConsoleReport(data),
  };
}

function generateConsoleReport(data) {
  const metrics = data.metrics;

  return `
╔════════════════════════════════════════════════════════════════╗
║                 ADSapp Load Test Results                       ║
╚════════════════════════════════════════════════════════════════╝

📊 Overall Performance:
  ├─ Total Requests: ${metrics.http_reqs.values.count}
  ├─ Request Rate: ${metrics.http_reqs.values.rate.toFixed(2)} req/s
  ├─ Error Rate: ${((metrics.http_req_failed.values.rate || 0) * 100).toFixed(2)}%
  └─ Data Transferred: ${(metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB

⏱️  Response Times:
  ├─ Average: ${metrics.http_req_duration.values.avg.toFixed(2)}ms
  ├─ P95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  ├─ P99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  └─ Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms

🎯 Business Metrics:
  ├─ Messages Sent: ${metrics.messages_sent?.values.count || 0}
  ├─ Messages Received: ${metrics.messages_received?.values.count || 0}
  ├─ Cache Hit Rate: ${((metrics.cache_hits?.values.rate || 0) * 100).toFixed(2)}%
  └─ Auth Failures: ${metrics.auth_failures?.values.count || 0}

🌐 WebSocket Performance:
  ├─ Connection Time (avg): ${(metrics.ws_connection_time?.values.avg || 0).toFixed(2)}ms
  └─ Active Connections (peak): ${metrics.active_connections?.values.max || 0}

${generateThresholdReport(data)}
`;
}

function generateThresholdReport(data) {
  let report = '\n✅ Threshold Results:\n';

  for (const [threshold, passed] of Object.entries(data.thresholds || {})) {
    const status = passed ? '✅' : '❌';
    report += `  ${status} ${threshold}\n`;
  }

  return report;
}

function generateHTMLReport(data) {
  // Basic HTML report template
  return `<!DOCTYPE html>
<html>
<head>
  <title>ADSapp Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .metric { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #4CAF50; }
    .metric h3 { margin: 0 0 10px 0; color: #555; }
    .metric p { margin: 5px 0; color: #666; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ADSapp Load Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="metric">
      <h3>📊 Overall Performance</h3>
      <p>Total Requests: ${data.metrics.http_reqs.values.count}</p>
      <p>Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s</p>
      <p>Error Rate: ${((data.metrics.http_req_failed.values.rate || 0) * 100).toFixed(2)}%</p>
    </div>

    <div class="metric">
      <h3>⏱️ Response Times</h3>
      <p>Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</p>
      <p>P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</p>
      <p>P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</p>
    </div>

    <div class="metric">
      <h3>✅ Thresholds</h3>
      ${Object.entries(data.thresholds || {})
        .map(([threshold, passed]) =>
          `<p class="${passed ? 'pass' : 'fail'}">${passed ? '✅' : '❌'} ${threshold}</p>`
        )
        .join('')}
    </div>
  </div>
</body>
</html>`;
}
