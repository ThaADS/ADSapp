#!/usr/bin/env node

/**
 * Route Audit Test Runner
 *
 * This script runs the comprehensive route audit tests and provides
 * a summary of the results.
 *
 * Usage:
 *   node run-route-audit.js [test-number]
 *
 * Examples:
 *   node run-route-audit.js           # Run all route audit tests
 *   node run-route-audit.js 11        # Run only owner tests
 *   node run-route-audit.js 15        # Run full audit
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const testFiles = {
  '11': '11-owner-complete-flow.spec.ts',
  '12': '12-admin-complete-flow.spec.ts',
  '13': '13-agent-complete-flow.spec.ts',
  '14': '14-route-404-checker.spec.ts',
  '15': '15-full-route-audit.spec.ts',
};

function printHeader(text) {
  const line = '='.repeat(80);
  console.log('\n' + line);
  console.log(text);
  console.log(line + '\n');
}

function printHelp() {
  printHeader('Route Audit Test Runner');
  console.log('Usage: node run-route-audit.js [test-number]\n');
  console.log('Available tests:');
  console.log('  11  - Owner Complete Flow (all owner-accessible routes)');
  console.log('  12  - Admin Complete Flow (admin routes + access control)');
  console.log('  13  - Agent Complete Flow (agent routes + restrictions)');
  console.log('  14  - Route 404 Checker (public/protected/invalid routes)');
  console.log('  15  - Full Route Audit (comprehensive audit with report generation)');
  console.log('\nExamples:');
  console.log('  node run-route-audit.js         # Run all tests');
  console.log('  node run-route-audit.js 11      # Run only owner tests');
  console.log('  node run-route-audit.js 15      # Run full audit\n');
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    printHeader(`Running Test: ${testFile}`);

    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const playwright = spawn(npx, [
      'playwright',
      'test',
      path.join('tests', 'e2e', testFile),
      '--project=chromium'
    ], {
      stdio: 'inherit',
      shell: true
    });

    playwright.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Test completed successfully: ${testFile}\n`);
        resolve();
      } else {
        console.log(`\n⚠️  Test completed with code ${code}: ${testFile}\n`);
        resolve(); // Still resolve to continue with other tests
      }
    });

    playwright.on('error', (error) => {
      console.error(`\n❌ Error running test ${testFile}:`, error.message, '\n');
      reject(error);
    });
  });
}

async function runAllTests() {
  const testNumbers = Object.keys(testFiles);

  printHeader('Running All Route Audit Tests');
  console.log(`Total tests to run: ${testNumbers.length}\n`);

  for (const testNumber of testNumbers) {
    await runTest(testFiles[testNumber]);
  }

  printFinalSummary();
}

function printFinalSummary() {
  printHeader('📊 ROUTE AUDIT COMPLETE');

  const reportPath = path.join(process.cwd(), 'test-results', 'route-audit.json');
  const mdReportPath = path.join(process.cwd(), 'test-results', 'ROUTE_AUDIT_REPORT.md');

  console.log('Generated Reports:\n');

  if (fs.existsSync(reportPath)) {
    console.log(`✅ JSON Report: ${reportPath}`);
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(`\nSummary from JSON report:`);
      console.log(`  Total Routes: ${report.summary.totalRoutes}`);
      console.log(`  Total Tests: ${report.summary.totalTests}`);
      console.log(`  ✅ Successful: ${report.summary.successfulTests}`);
      console.log(`  ❌ Failed: ${report.summary.failedTests}`);
      console.log(`  ⚠️  Security Issues: ${report.summary.securityIssues}`);
      console.log(`  Success Rate: ${((report.summary.successfulTests / report.summary.totalTests) * 100).toFixed(1)}%`);

      if (report.brokenRoutes.length > 0) {
        console.log(`\n❌ Broken Routes (${report.brokenRoutes.length}):`);
        report.brokenRoutes.slice(0, 5).forEach(route => console.log(`   - ${route}`));
        if (report.brokenRoutes.length > 5) {
          console.log(`   ... and ${report.brokenRoutes.length - 5} more`);
        }
      }

      if (report.securityIssues.length > 0) {
        console.log(`\n⚠️  Security Issues (${report.securityIssues.length}):`);
        report.securityIssues.forEach(issue =>
          console.log(`   - ${issue.role.toUpperCase()}: ${issue.issue}`)
        );
      }

      if (report.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        report.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
    } catch (error) {
      console.log(`⚠️  Could not parse JSON report: ${error.message}`);
    }
  } else {
    console.log(`⚠️  JSON report not found (may not have run test 15)`);
  }

  if (fs.existsSync(mdReportPath)) {
    console.log(`\n✅ Markdown Report: ${mdReportPath}`);
  }

  const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    console.log(`\n📸 Screenshots: ${screenshots.length} captured in ${screenshotsDir}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('For detailed results, check:');
  console.log('  - test-results/ROUTE_AUDIT_REPORT.md (full report)');
  console.log('  - test-results/route-audit.json (machine-readable)');
  console.log('  - test-results/screenshots/ (visual evidence)');
  console.log('  - playwright-report/index.html (HTML report - run: npx playwright show-report)');
  console.log('='.repeat(80) + '\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.length === 0) {
    // Run all tests
    await runAllTests();
  } else {
    const testNumber = args[0];
    if (testFiles[testNumber]) {
      await runTest(testFiles[testNumber]);
      if (testNumber === '15') {
        printFinalSummary();
      }
    } else {
      console.error(`❌ Unknown test number: ${testNumber}`);
      console.log('\nAvailable test numbers: ' + Object.keys(testFiles).join(', '));
      console.log('Run with -h or --help for more information\n');
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});