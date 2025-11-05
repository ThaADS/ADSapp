@echo off
REM =================================================================
REM ADSapp E2E Test Runner for Windows
REM =================================================================
REM
REM This script automates the complete E2E testing workflow:
REM 1. Checks environment configuration
REM 2. Builds production application (if needed)
REM 3. Starts production server
REM 4. Runs Playwright E2E tests
REM 5. Generates test reports
REM 6. Cleans up processes
REM
REM Usage:
REM   run-e2e-tests.bat [options]
REM
REM Options:
REM   dev          Run tests against development server
REM   chromium     Run tests only on Chromium
REM   headed       Run tests with browser visible
REM   ui           Run tests with Playwright UI
REM   debug        Run tests in debug mode
REM
REM =================================================================

setlocal enabledelayedexpansion

REM Configuration
set "BASE_URL=http://localhost:3000"
set "TEST_MODE=production"
set "BROWSER_PROJECT=chromium"
set "HEADED_MODE="
set "UI_MODE="
set "DEBUG_MODE="

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="dev" (
    set "TEST_MODE=development"
    shift
    goto :parse_args
)
if /i "%~1"=="chromium" (
    set "BROWSER_PROJECT=chromium"
    shift
    goto :parse_args
)
if /i "%~1"=="firefox" (
    set "BROWSER_PROJECT=firefox"
    shift
    goto :parse_args
)
if /i "%~1"=="webkit" (
    set "BROWSER_PROJECT=webkit"
    shift
    goto :parse_args
)
if /i "%~1"=="headed" (
    set "HEADED_MODE=--headed"
    shift
    goto :parse_args
)
if /i "%~1"=="ui" (
    set "UI_MODE=--ui"
    shift
    goto :parse_args
)
if /i "%~1"=="debug" (
    set "DEBUG_MODE=--debug"
    shift
    goto :parse_args
)
shift
goto :parse_args
:args_done

echo.
echo =================================================================
echo   ADSapp E2E Test Runner
echo =================================================================
echo.
echo Configuration:
echo   - Test Mode: %TEST_MODE%
echo   - Base URL: %BASE_URL%
echo   - Browser: %BROWSER_PROJECT%
if defined HEADED_MODE echo   - Headed Mode: Enabled
if defined UI_MODE echo   - UI Mode: Enabled
if defined DEBUG_MODE echo   - Debug Mode: Enabled
echo.
echo =================================================================
echo.

REM Set environment variables
set "PLAYWRIGHT_BASE_URL=%BASE_URL%"
set "PLAYWRIGHT_TEST_MODE=%TEST_MODE%"

REM Step 1: Check Node.js and npm
echo [Step 1/6] Checking prerequisites...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    exit /b 1
)
echo   - Node.js: FOUND
echo   - npm: FOUND
echo.

REM Step 2: Check if .env file exists
echo [Step 2/6] Checking environment configuration...
if not exist ".env" (
    echo WARNING: .env file not found
    echo Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   - Created .env from .env.example
    ) else (
        echo ERROR: .env.example not found
        exit /b 1
    )
) else (
    echo   - .env file: FOUND
)
echo.

REM Step 3: Install dependencies if needed
echo [Step 3/6] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        exit /b 1
    )
) else (
    echo   - Dependencies: INSTALLED
)
echo.

REM Step 4: Build or start server based on test mode
if "%TEST_MODE%"=="production" (
    echo [Step 4/6] Building production application...

    REM Check if build exists
    if not exist ".next\build-manifest.json" (
        echo Building application (this may take several minutes^)...
        call npm run build
        if errorlevel 1 (
            echo ERROR: Production build failed
            exit /b 1
        )
        echo   - Build: COMPLETED
    ) else (
        echo   - Build: EXISTS (using cached build^)
    )
    echo.

    echo Starting production server...
    start /b cmd /c "npm run start > server.log 2>&1"
    set "SERVER_PID=!ERRORLEVEL!"

) else (
    echo [Step 4/6] Starting development server...
    start /b cmd /c "npm run dev > server.log 2>&1"
    set "SERVER_PID=!ERRORLEVEL!"
)

REM Wait for server to be ready
echo Waiting for server to be ready...
set "RETRY_COUNT=0"
set "MAX_RETRIES=60"

:wait_server
timeout /t 2 /nobreak >nul
set /a RETRY_COUNT+=1

REM Check if server is responding
curl -s -o nul -w "%%{http_code}" %BASE_URL% | findstr "200 302 307" >nul
if errorlevel 1 (
    if !RETRY_COUNT! lss %MAX_RETRIES% (
        echo   Attempt !RETRY_COUNT!/%MAX_RETRIES% - waiting...
        goto :wait_server
    ) else (
        echo ERROR: Server failed to start within timeout period
        goto :cleanup
    )
)

echo   - Server: READY
echo.

REM Step 5: Run Playwright tests
echo [Step 5/6] Running E2E tests...
echo.

set "TEST_COMMAND=npx playwright test"

REM Add project filter
if defined BROWSER_PROJECT (
    set "TEST_COMMAND=!TEST_COMMAND! --project=%BROWSER_PROJECT%"
)

REM Add headed mode
if defined HEADED_MODE (
    set "TEST_COMMAND=!TEST_COMMAND! %HEADED_MODE%"
)

REM Add UI mode
if defined UI_MODE (
    set "TEST_COMMAND=!TEST_COMMAND! %UI_MODE%"
)

REM Add debug mode
if defined DEBUG_MODE (
    set "TEST_COMMAND=!TEST_COMMAND! %DEBUG_MODE%"
)

REM Run tests
call !TEST_COMMAND!
set "TEST_EXIT_CODE=!ERRORLEVEL!"

echo.
echo Tests completed with exit code: !TEST_EXIT_CODE!
echo.

REM Step 6: Generate report
echo [Step 6/6] Generating test report...
if exist "test-results\results.json" (
    echo   - Test results: test-results\results.json
)
if exist "playwright-report" (
    echo   - HTML report: playwright-report\index.html
    echo.
    echo Opening HTML report in browser...
    timeout /t 2 /nobreak >nul
    start "" "playwright-report\index.html"
)
echo.

REM Cleanup
:cleanup
echo =================================================================
echo   Cleanup
echo =================================================================
echo.
echo Stopping server...

REM Kill all node processes (be careful - this kills all node processes)
taskkill /F /IM node.exe >nul 2>&1
echo   - Server processes terminated
echo.

REM Show test summary
echo =================================================================
echo   Test Summary
echo =================================================================
echo.
if exist "test-results\results.json" (
    echo Test results available in: test-results\
    echo HTML report available in: playwright-report\
) else (
    echo No test results generated
)
echo.

if %TEST_EXIT_CODE% equ 0 (
    echo STATUS: ALL TESTS PASSED
    echo.
    exit /b 0
) else (
    echo STATUS: SOME TESTS FAILED
    echo.
    echo Review the report for details:
    echo   playwright-report\index.html
    echo.
    exit /b %TEST_EXIT_CODE%
)

endlocal
