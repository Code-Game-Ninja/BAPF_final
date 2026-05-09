/**
 * Test Runner for Monitoring System
 * Runs all monitoring tests and generates a report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

async function runTests(): Promise<void> {
  console.log('🧪 Running Monitoring System Tests...\n');

  const testFiles = [
    'tests/monitoring/enhanced-error-tracker.test.ts',
    'tests/monitoring/api-middleware.test.ts',
    'tests/monitoring/integration.test.ts',
  ];

  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const testFile of testFiles) {
    const suiteName = path.basename(testFile, '.test.ts');
    console.log(`\n📝 Running ${suiteName}...`);

    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(`npx vitest run ${testFile} --reporter=json`);
      const duration = Date.now() - startTime;

      // Parse test results
      const result: TestResult = {
        suite: suiteName,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration,
        errors: [],
      };

      // Count results from output
      const passedMatch = stdout.match(/(\d+) passed/);
      const failedMatch = stdout.match(/(\d+) failed/);
      const skippedMatch = stdout.match(/(\d+) skipped/);

      if (passedMatch) result.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.failed = parseInt(failedMatch[1]);
      if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

      if (stderr) {
        result.errors.push(stderr);
      }

      results.push(result);

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalSkipped += result.skipped;
      totalDuration += result.duration;

      // Print result
      if (result.failed === 0) {
        console.log(`✅ ${suiteName}: ${result.passed} passed (${duration}ms)`);
      } else {
        console.log(`❌ ${suiteName}: ${result.passed} passed, ${result.failed} failed (${duration}ms)`);
      }
    } catch (error: any) {
      console.error(`❌ ${suiteName}: Failed to run tests`);
      console.error(error.message);

      results.push({
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error.message],
      });

      totalFailed++;
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⏭️  Skipped: ${totalSkipped}`);
  console.log(`⏱️  Duration: ${totalDuration}ms`);
  console.log('='.repeat(60));

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalPassed + totalFailed + totalSkipped,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
    },
    suites: results,
  };

  // Save report
  const reportPath = path.join(process.cwd(), 'test-results', 'monitoring-tests.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Exit with error code if tests failed
  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
