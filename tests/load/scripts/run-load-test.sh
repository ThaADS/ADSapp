#!/bin/bash

###############################################################################
# ADSapp Load Test Execution Script
# Comprehensive load testing for 2000+ concurrent users
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV="${TEST_ENV:-staging}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_RUN_ID="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="tests/load/reports/${TEST_RUN_ID}"

# Test stages
RUN_BASELINE="${RUN_BASELINE:-true}"
RUN_RAMPUP="${RUN_RAMPUP:-true}"
RUN_SUSTAINED="${RUN_SUSTAINED:-true}"
RUN_SPIKE="${RUN_SPIKE:-true}"
RUN_PEAK="${RUN_PEAK:-true}"
RUN_STRESS="${RUN_STRESS:-true}"
RUN_SOAK="${RUN_SOAK:-false}" # Soak test is optional

# Tool selection
USE_K6="${USE_K6:-true}"
USE_ARTILLERY="${USE_ARTILLERY:-true}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                 ADSapp Load Test Suite                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check if k6 is installed
    if [ "$USE_K6" = "true" ]; then
        if ! command -v k6 &> /dev/null; then
            print_error "k6 is not installed. Install from: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
        print_success "k6 is installed: $(k6 version)"
    fi

    # Check if artillery is installed
    if [ "$USE_ARTILLERY" = "true" ]; then
        if ! command -v artillery &> /dev/null; then
            print_error "Artillery is not installed. Run: npm install -g artillery"
            exit 1
        fi
        print_success "Artillery is installed: $(artillery -V)"
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js is installed: $(node -v)"

    # Check if application is running
    print_info "Checking if application is running at ${BASE_URL}..."
    if curl -s -f "${BASE_URL}/api/health" > /dev/null; then
        print_success "Application is running"
    else
        print_error "Application is not responding at ${BASE_URL}"
        print_info "Please start the application and try again"
        exit 1
    fi
}

setup_test_environment() {
    print_section "Setting Up Test Environment"

    # Create report directory
    mkdir -p "${REPORT_DIR}"
    print_success "Report directory created: ${REPORT_DIR}"

    # Generate test data if not exists
    if [ ! -f "tests/load/data/test-users.json" ]; then
        print_info "Generating test data..."
        node tests/load/data/generate-test-data.js
        print_success "Test data generated"
    else
        print_info "Using existing test data"
    fi

    # Export environment variables
    export BASE_URL
    export TEST_ENV
    export TEST_RUN_ID

    print_info "Test Configuration:"
    echo "  • Environment: ${TEST_ENV}"
    echo "  • Base URL: ${BASE_URL}"
    echo "  • Test Run ID: ${TEST_RUN_ID}"
    echo "  • Report Directory: ${REPORT_DIR}"
}

start_monitoring() {
    print_section "Starting Metrics Collection"

    # Start metrics collector
    node tests/load/monitors/metrics-collector.js &
    METRICS_PID=$!

    print_success "Metrics collector started (PID: ${METRICS_PID})"

    # Save PID for cleanup
    echo "${METRICS_PID}" > "${REPORT_DIR}/metrics-collector.pid"
}

stop_monitoring() {
    print_section "Stopping Metrics Collection"

    if [ -f "${REPORT_DIR}/metrics-collector.pid" ]; then
        METRICS_PID=$(cat "${REPORT_DIR}/metrics-collector.pid")
        if ps -p "${METRICS_PID}" > /dev/null; then
            kill -SIGINT "${METRICS_PID}" 2>/dev/null || true
            wait "${METRICS_PID}" 2>/dev/null || true
            print_success "Metrics collector stopped"
        fi
        rm "${REPORT_DIR}/metrics-collector.pid"
    fi
}

run_k6_test() {
    print_section "Running k6 Load Test"

    local test_name="$1"
    local scenario_file="tests/load/k6-scenarios.js"

    print_info "Executing: ${test_name}"
    print_info "Scenario: ${scenario_file}"

    # Run k6 with custom output
    k6 run \
        --out json="${REPORT_DIR}/k6-${test_name}-results.json" \
        --summary-export="${REPORT_DIR}/k6-${test_name}-summary.json" \
        "${scenario_file}" \
        2>&1 | tee "${REPORT_DIR}/k6-${test_name}-output.log"

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        print_success "k6 test completed successfully"
    else
        print_error "k6 test failed with exit code: ${exit_code}"
        return 1
    fi
}

run_artillery_test() {
    print_section "Running Artillery WebSocket Test"

    local test_name="$1"
    local config_file="tests/load/artillery-config.yml"

    print_info "Executing: ${test_name}"
    print_info "Config: ${config_file}"

    # Run Artillery
    artillery run \
        --output "${REPORT_DIR}/artillery-${test_name}-results.json" \
        "${config_file}" \
        2>&1 | tee "${REPORT_DIR}/artillery-${test_name}-output.log"

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        print_success "Artillery test completed successfully"

        # Generate HTML report
        artillery report "${REPORT_DIR}/artillery-${test_name}-results.json" \
            --output "${REPORT_DIR}/artillery-${test_name}-report.html"

        print_success "Artillery HTML report generated"
    else
        print_error "Artillery test failed with exit code: ${exit_code}"
        return 1
    fi
}

analyze_results() {
    print_section "Analyzing Test Results"

    # Run analysis script
    if [ -f "tests/load/scripts/analyze-results.js" ]; then
        node tests/load/scripts/analyze-results.js "${REPORT_DIR}"
        print_success "Results analysis complete"
    else
        print_warning "Analysis script not found"
    fi

    # Print summary
    print_info "Test Reports Location: ${REPORT_DIR}"
    echo ""
    echo "Available reports:"
    ls -lh "${REPORT_DIR}"
}

generate_final_report() {
    print_section "Generating Final Report"

    # Create comprehensive report
    cat > "${REPORT_DIR}/LOAD_TEST_REPORT.md" << EOF
# ADSapp Load Test Report

## Test Execution Summary

- **Test Run ID**: ${TEST_RUN_ID}
- **Environment**: ${TEST_ENV}
- **Base URL**: ${BASE_URL}
- **Date**: $(date '+%Y-%m-%d %H:%M:%S')

## Test Configuration

### Stages Executed
- Baseline: ${RUN_BASELINE}
- Ramp Up: ${RUN_RAMPUP}
- Sustained Load: ${RUN_SUSTAINED}
- Spike Test: ${RUN_SPIKE}
- Peak Load: ${RUN_PEAK}
- Stress Test: ${RUN_STRESS}
- Soak Test: ${RUN_SOAK}

### Tools Used
- k6: ${USE_K6}
- Artillery: ${USE_ARTILLERY}

## Results

See detailed reports in this directory:
- k6 results: k6-*-results.json
- Artillery results: artillery-*-results.json
- Metrics: metrics-*.json
- HTML reports: *-report.html

## Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| API Response (p95) | <500ms | <1000ms | >2000ms |
| Database Query (p95) | <100ms | <300ms | >1000ms |
| Message Send | <2s | <5s | >10s |
| Page Load | <2s | <3s | >5s |
| Error Rate | <0.1% | <1% | >5% |
| Uptime | 99.9% | 99.5% | <99% |

## Next Steps

1. Review detailed metrics in JSON/HTML reports
2. Identify bottlenecks from performance data
3. Implement optimizations based on findings
4. Re-run tests to validate improvements

---

Generated by ADSapp Load Test Suite
EOF

    print_success "Final report generated: ${REPORT_DIR}/LOAD_TEST_REPORT.md"
}

cleanup() {
    print_section "Cleanup"

    # Stop monitoring
    stop_monitoring

    # Archive old reports (keep last 10)
    print_info "Archiving old test reports..."
    cd tests/load/reports
    ls -t | tail -n +11 | xargs -r rm -rf
    cd - > /dev/null

    print_success "Cleanup complete"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header

    # Trap errors and interrupts
    trap cleanup EXIT INT TERM

    # Pre-flight checks
    check_prerequisites
    setup_test_environment

    # Start monitoring
    start_monitoring

    # Run tests based on configuration
    local test_failed=false

    if [ "$USE_K6" = "true" ]; then
        run_k6_test "full-suite" || test_failed=true
    fi

    if [ "$USE_ARTILLERY" = "true" ]; then
        run_artillery_test "websocket-test" || test_failed=true
    fi

    # Stop monitoring
    stop_monitoring

    # Analyze and report
    analyze_results
    generate_final_report

    # Final status
    echo ""
    if [ "$test_failed" = true ]; then
        print_error "Some tests failed. Review the reports for details."
        exit 1
    else
        print_success "All load tests completed successfully!"
        print_info "Review reports at: ${REPORT_DIR}"
    fi
}

# Execute main function
main "$@"
