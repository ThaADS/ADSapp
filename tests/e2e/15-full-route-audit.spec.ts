import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserCredentials {
  email: string;
  password: string;
  role: string;
}

interface RouteTest {
  route: string;
  status: 'success' | '404' | 'redirect' | 'error' | 'blocked';
  finalUrl?: string;
  error?: string;
}

interface RoleTestResults {
  role: string;
  email: string;
  accessibleRoutes: RouteTest[];
  restrictedRoutes: RouteTest[];
  timestamp: string;
}

interface AuditReport {
  generatedAt: string;
  summary: {
    totalRoutes: number;
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    securityIssues: number;
  };
  roleResults: RoleTestResults[];
  brokenRoutes: string[];
  securityIssues: Array<{ role: string; route: string; issue: string }>;
  recommendations: string[];
}

test.describe('Full Route Audit - All Roles', () => {
  const users: Record<string, UserCredentials> = {
    owner: {
      email: 'owner@demo-company.com',
      password: 'Demo2024!Owner',
      role: 'owner'
    },
    admin: {
      email: 'admin@demo-company.com',
      password: 'Demo2024!Admin',
      role: 'admin'
    },
    agent: {
      email: 'agent@demo-company.com',
      password: 'Demo2024!Agent',
      role: 'agent'
    }
  };

  const roleAccessMap = {
    owner: {
      accessible: [
        '/dashboard',
        '/dashboard/inbox',
        '/dashboard/conversations',
        '/dashboard/contacts',
        '/dashboard/templates',
        '/dashboard/automation',
        '/dashboard/analytics',
        '/dashboard/settings',
        '/dashboard/settings/profile',
        '/dashboard/settings/organization',
        '/dashboard/settings/team',
        '/dashboard/settings/billing',
        '/dashboard/settings/integrations',
        '/dashboard/settings/whatsapp',
      ],
      restricted: []
    },
    admin: {
      accessible: [
        '/dashboard',
        '/dashboard/inbox',
        '/dashboard/conversations',
        '/dashboard/contacts',
        '/dashboard/templates',
        '/dashboard/automation',
        '/dashboard/analytics',
        '/dashboard/settings',
        '/dashboard/settings/profile',
        '/dashboard/settings/organization',
        '/dashboard/settings/team',
        '/dashboard/settings/integrations',
        '/dashboard/settings/whatsapp',
      ],
      restricted: [
        '/dashboard/settings/billing',
      ]
    },
    agent: {
      accessible: [
        '/dashboard',
        '/dashboard/inbox',
        '/dashboard/conversations',
        '/dashboard/contacts',
        '/dashboard/settings',
        '/dashboard/settings/profile',
      ],
      restricted: [
        '/dashboard/templates',
        '/dashboard/automation',
        '/dashboard/analytics',
        '/dashboard/settings/organization',
        '/dashboard/settings/team',
        '/dashboard/settings/billing',
        '/dashboard/settings/integrations',
        '/dashboard/settings/whatsapp',
      ]
    }
  };

  async function loginUser(page: any, credentials: UserCredentials): Promise<boolean> {
    try {
      await page.goto('http://localhost:3001/auth/signin');
      await page.fill('input[type="email"]', credentials.email);
      await page.fill('input[type="password"]', credentials.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      const url = page.url();
      return url.includes('/dashboard');
    } catch (error) {
      console.error(`Failed to login as ${credentials.email}:`, error);
      return false;
    }
  }

  async function testRoute(page: any, route: string): Promise<RouteTest> {
    try {
      await page.goto(`http://localhost:3001${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      await page.waitForTimeout(1000);

      const url = page.url();
      const content = await page.content();

      if (content.includes('404') ||
          content.includes('Not Found') ||
          content.includes('Page not found')) {
        return { route, status: '404', finalUrl: url };
      } else if (!url.includes(route.split('?')[0])) {
        if (content.includes('permission') ||
            content.includes('unauthorized') ||
            content.includes('access denied')) {
          return { route, status: 'blocked', finalUrl: url };
        }
        return { route, status: 'redirect', finalUrl: url };
      } else {
        return { route, status: 'success', finalUrl: url };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { route, status: 'error', error: errorMessage };
    }
  }

  test('should perform complete route audit for all roles', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 STARTING COMPREHENSIVE ROUTE AUDIT');
    console.log('='.repeat(80) + '\n');

    const auditResults: RoleTestResults[] = [];
    const allBrokenRoutes: Set<string> = new Set();
    const securityIssues: Array<{ role: string; route: string; issue: string }> = [];

    // Test each role
    for (const [roleName, credentials] of Object.entries(users)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing Role: ${roleName.toUpperCase()} (${credentials.email})`);
      console.log('='.repeat(80) + '\n');

      const loginSuccess = await loginUser(page, credentials);
      if (!loginSuccess) {
        console.error(`❌ Failed to login as ${roleName}\n`);
        continue;
      }

      const accessibleRoutes: RouteTest[] = [];
      const restrictedRoutes: RouteTest[] = [];

      const roleKey = roleName as keyof typeof roleAccessMap;
      const { accessible, restricted } = roleAccessMap[roleKey];

      // Test accessible routes
      console.log(`📋 Testing ${accessible.length} accessible routes for ${roleName}...\n`);
      for (const route of accessible) {
        const result = await testRoute(page, route);
        accessibleRoutes.push(result);

        if (result.status === 'success') {
          console.log(`  ✅ ${route}`);
        } else if (result.status === '404') {
          console.log(`  ❌ 404: ${route}`);
          allBrokenRoutes.add(route);
        } else if (result.status === 'redirect') {
          console.log(`  ↪️  ${route} → ${result.finalUrl}`);
        } else if (result.status === 'error') {
          console.log(`  ⚠️  Error: ${route}`);
        }
      }

      // Test restricted routes
      if (restricted.length > 0) {
        console.log(`\n🔒 Testing ${restricted.length} restricted routes for ${roleName}...\n`);
        for (const route of restricted) {
          const result = await testRoute(page, route);
          restrictedRoutes.push(result);

          if (result.status === 'blocked' || result.status === 'redirect') {
            console.log(`  ✅ Properly blocked: ${route}`);
          } else if (result.status === 'success') {
            console.log(`  ⚠️  SECURITY ISSUE: ${route} is accessible`);
            securityIssues.push({
              role: roleName,
              route,
              issue: `${roleName} should not have access to ${route}`
            });
          } else if (result.status === '404') {
            console.log(`  ℹ️  404: ${route}`);
            allBrokenRoutes.add(route);
          }
        }
      }

      // Store results for this role
      auditResults.push({
        role: roleName,
        email: credentials.email,
        accessibleRoutes,
        restrictedRoutes,
        timestamp: new Date().toISOString()
      });

      // Summary for this role
      const successCount = accessibleRoutes.filter(r => r.status === 'success').length;
      const notFoundCount = accessibleRoutes.filter(r => r.status === '404').length;
      const blockedCount = restrictedRoutes.filter(r => r.status === 'blocked' || r.status === 'redirect').length;
      const securityIssueCount = restrictedRoutes.filter(r => r.status === 'success').length;

      console.log(`\n📊 ${roleName.toUpperCase()} Summary:`);
      console.log(`  ✅ Working Routes: ${successCount}/${accessible.length}`);
      console.log(`  ❌ 404 Errors: ${notFoundCount}`);
      console.log(`  🔒 Properly Blocked: ${blockedCount}/${restricted.length}`);
      console.log(`  ⚠️  Security Issues: ${securityIssueCount}`);
    }

    // Generate final report
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 FINAL AUDIT REPORT');
    console.log('='.repeat(80) + '\n');

    const totalTests = auditResults.reduce((sum, role) =>
      sum + role.accessibleRoutes.length + role.restrictedRoutes.length, 0
    );

    const successfulTests = auditResults.reduce((sum, role) =>
      sum + role.accessibleRoutes.filter(r => r.status === 'success').length +
      role.restrictedRoutes.filter(r => r.status === 'blocked' || r.status === 'redirect').length, 0
    );

    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRoutes: [...new Set([
          ...roleAccessMap.owner.accessible,
          ...roleAccessMap.admin.accessible,
          ...roleAccessMap.admin.restricted,
          ...roleAccessMap.agent.accessible,
          ...roleAccessMap.agent.restricted,
        ])].length,
        totalTests,
        successfulTests,
        failedTests: totalTests - successfulTests,
        securityIssues: securityIssues.length
      },
      roleResults: auditResults,
      brokenRoutes: Array.from(allBrokenRoutes),
      securityIssues,
      recommendations: []
    };

    // Generate recommendations
    if (report.brokenRoutes.length > 0) {
      report.recommendations.push(
        `Fix ${report.brokenRoutes.length} broken routes that return 404 errors`
      );
    }
    if (report.securityIssues.length > 0) {
      report.recommendations.push(
        `Address ${report.securityIssues.length} security issues with role-based access control`
      );
    }
    if (report.summary.failedTests === 0 && report.securityIssues.length === 0) {
      report.recommendations.push('All routes are working correctly with proper access control!');
    }

    // Print summary
    console.log(`Total Routes: ${report.summary.totalRoutes}`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Successful: ${report.summary.successfulTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`⚠️  Security Issues: ${report.summary.securityIssues}`);
    console.log(`\nSuccess Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%\n`);

    if (report.brokenRoutes.length > 0) {
      console.log('❌ BROKEN ROUTES (404 Errors):');
      report.brokenRoutes.forEach(route => console.log(`   - ${route}`));
      console.log('');
    }

    if (report.securityIssues.length > 0) {
      console.log('⚠️  SECURITY ISSUES:');
      report.securityIssues.forEach(issue =>
        console.log(`   - ${issue.role.toUpperCase()}: ${issue.issue}`)
      );
      console.log('');
    }

    console.log('💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    console.log('');

    // Save JSON report
    const jsonReportPath = path.join(process.cwd(), 'test-results', 'route-audit.json');
    fs.mkdirSync(path.dirname(jsonReportPath), { recursive: true });
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved: ${jsonReportPath}`);

    // Generate Markdown report
    const markdown = generateMarkdownReport(report);
    const mdReportPath = path.join(process.cwd(), 'test-results', 'ROUTE_AUDIT_REPORT.md');
    fs.writeFileSync(mdReportPath, markdown);
    console.log(`📄 Markdown report saved: ${mdReportPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ AUDIT COMPLETE');
    console.log('='.repeat(80) + '\n');

    // Assertions
    expect(report.summary.securityIssues,
      'Security issues found with role-based access control'
    ).toBe(0);

    const successRate = (successfulTests / totalTests) * 100;
    expect(successRate,
      `Success rate ${successRate.toFixed(1)}% is below 90%`
    ).toBeGreaterThanOrEqual(90);
  });
});

function generateMarkdownReport(report: AuditReport): string {
  const date = new Date(report.generatedAt).toLocaleString();

  let md = `# Route Audit Report\n\n`;
  md += `**Generated:** ${date}\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Unique Routes | ${report.summary.totalRoutes} |\n`;
  md += `| Total Tests Performed | ${report.summary.totalTests} |\n`;
  md += `| ✅ Successful Tests | ${report.summary.successfulTests} |\n`;
  md += `| ❌ Failed Tests | ${report.summary.failedTests} |\n`;
  md += `| ⚠️ Security Issues | ${report.summary.securityIssues} |\n`;
  md += `| Success Rate | ${((report.summary.successfulTests / report.summary.totalTests) * 100).toFixed(1)}% |\n\n`;

  // Role Results
  md += `## Role-Based Access Testing\n\n`;
  for (const role of report.roleResults) {
    md += `### ${role.role.toUpperCase()} (${role.email})\n\n`;

    const successCount = role.accessibleRoutes.filter(r => r.status === 'success').length;
    const notFoundCount = role.accessibleRoutes.filter(r => r.status === '404').length;
    const blockedCount = role.restrictedRoutes.filter(r =>
      r.status === 'blocked' || r.status === 'redirect'
    ).length;

    md += `**Accessible Routes:** ${successCount}/${role.accessibleRoutes.length} working\n\n`;

    if (notFoundCount > 0) {
      md += `**❌ 404 Errors in Accessible Routes:**\n\n`;
      role.accessibleRoutes
        .filter(r => r.status === '404')
        .forEach(r => md += `- \`${r.route}\`\n`);
      md += `\n`;
    }

    if (role.restrictedRoutes.length > 0) {
      md += `**Restricted Routes:** ${blockedCount}/${role.restrictedRoutes.length} properly blocked\n\n`;

      const securityIssues = role.restrictedRoutes.filter(r => r.status === 'success');
      if (securityIssues.length > 0) {
        md += `**⚠️ Security Issues (Accessible but should be blocked):**\n\n`;
        securityIssues.forEach(r => md += `- \`${r.route}\`\n`);
        md += `\n`;
      }
    }
  }

  // Broken Routes
  if (report.brokenRoutes.length > 0) {
    md += `## ❌ Broken Routes (404 Errors)\n\n`;
    md += `The following routes return 404 errors and need to be fixed:\n\n`;
    report.brokenRoutes.forEach(route => md += `- \`${route}\`\n`);
    md += `\n`;
  }

  // Security Issues
  if (report.securityIssues.length > 0) {
    md += `## ⚠️ Security Issues\n\n`;
    md += `The following routes have access control issues:\n\n`;
    md += `| Role | Route | Issue |\n`;
    md += `|------|-------|-------|\n`;
    report.securityIssues.forEach(issue => {
      md += `| ${issue.role} | \`${issue.route}\` | ${issue.issue} |\n`;
    });
    md += `\n`;
  }

  // Recommendations
  md += `## 💡 Recommendations\n\n`;
  if (report.recommendations.length > 0) {
    report.recommendations.forEach(rec => md += `- ${rec}\n`);
  } else {
    md += `- No issues found. All routes are working correctly!\n`;
  }
  md += `\n`;

  // Footer
  md += `---\n\n`;
  md += `*This report was automatically generated by the Playwright E2E test suite.*\n`;

  return md;
}