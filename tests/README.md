# Playwright Tests for DIY Genie

## Overview
This directory contains Playwright end-to-end tests for the DIY Genie application, specifically testing the inline photo picker functionality in the NewProject.tsx screen.

## Test Files
- `inline-photo-picker.spec.ts` - Comprehensive tests for the inline photo picker feature

## Setup

### Prerequisites
1. Node.js and npm installed
2. Playwright and dependencies installed (run `npm install`)
3. Playwright browsers installed

### Installing Playwright Browsers
```bash
# Install Chromium browser for Playwright
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

### System Dependencies (if needed)
On some systems, you may need to install additional dependencies:
```bash
# For Debian/Ubuntu-based systems
sudo npx playwright install-deps chromium
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in debug mode
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/inline-photo-picker.spec.ts
```

### Run tests in headed mode (visible browser)
```bash
npx playwright test --headed
```

## Test Coverage

### Inline Photo Picker Tests (`inline-photo-picker.spec.ts`)

#### Test 1: "should trigger inline file picker without navigation or API calls"
- **Purpose**: Verifies the complete flow of the inline photo picker
- **Steps**:
  1. Navigate to home page
  2. Click "Get Started" button
  3. Click "New Project" tab
  4. Fill in form fields (description, budget, skill level)
  5. Click Upload Photo button
  6. Verify file picker dialog opens
  7. Select a test image file
  8. Verify Smart Suggestions appear
- **Assertions**:
  - URL remains unchanged (no navigation)
  - No API calls to `/api/projects/:id/image`
  - File chooser dialog appears
  - Smart Suggestions card becomes visible

#### Test 2: "should handle photo selection and show change option"
- **Purpose**: Verifies photo selection and the ability to change the selected photo
- **Steps**:
  1. Complete form and upload a photo
  2. Verify "Change photo" button appears
  3. Click "Change photo" button
  4. Verify file picker opens again
- **Assertions**:
  - Change photo button becomes visible after selection
  - Clicking it triggers a new file picker

#### Test 3: "should not navigate when upload button is clicked"
- **Purpose**: Specifically tests that no navigation occurs
- **Steps**:
  1. Navigate to the form
  2. Fill form fields
  3. Click Upload Photo button
  4. Monitor navigation events
- **Assertions**:
  - URL remains the same before and after clicking
  - No navigation to NewProjectMedia screen

#### Test 4: "should verify no image upload API calls during photo selection"
- **Purpose**: Verifies no premature API calls are made
- **Steps**:
  1. Navigate to the form
  2. Fill form fields
  3. Monitor network requests
  4. Click Upload Photo button
  5. Verify no image upload API calls
- **Assertions**:
  - No POST/PUT/PATCH requests to `/api/projects/*/image` endpoint
  - Only legitimate API calls (if any) are made

## Configuration

The Playwright configuration is defined in `playwright.config.ts`:

- **Base URL**: `http://localhost:5000`
- **Test Directory**: `./tests`
- **Browser**: Chromium (headless mode)
- **Retries**: 2 retries in CI, 0 locally
- **Reporters**: HTML report
- **Web Server**: Automatically starts Expo web server on port 5000

### Special Configurations
The tests are configured to run in headless mode with the following browser flags for compatibility:
- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-dev-shm-usage`
- `--disable-gpu`

## Troubleshooting

### Tests fail to start the web server
**Issue**: The Expo web server doesn't start automatically
**Solution**: Make sure the web server is not already running on port 5000. Stop any existing servers and try again.

### File picker doesn't open in tests
**Issue**: The file chooser event doesn't trigger
**Solution**: This could be due to browser security settings or the way the component is implemented. Check that the button has the correct `testID="btn-upload-photo"` attribute.

### Tests time out
**Issue**: Tests take too long to complete
**Solution**: 
- Increase timeout values in the test configuration
- Check network connectivity
- Ensure the app is fully loaded before interacting

### Browser dependencies missing
**Issue**: Error about missing system dependencies
**Solution**: Run `npx playwright install-deps chromium` to install required system libraries.

## Environment-Specific Notes

### Replit Environment
When running tests in Replit, you may encounter system dependency issues. The tests are designed to work but may require additional setup:

1. Chromium and required libraries are installed via Nix
2. Tests run in headless mode by default
3. Some visual testing features may be limited

### Local Development
For the best testing experience, run tests on a local machine with full system access:
```bash
# Clone the repository
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests
npm test
```

## CI/CD Integration

To run these tests in a CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright Browsers
  run: npx playwright install chromium --with-deps
  
- name: Run Playwright tests
  run: npm test
  
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Data

The tests use minimal test data:
- **Description**: "Build floating shelves for living room"
- **Budget**: "$$"
- **Skill Level**: "Beginner"
- **Test Image**: Base64-encoded 1x1 pixel PNG (embedded in test)

## Expected Behavior

The inline photo picker should:
1. ✅ Trigger a file input/picker dialog when the Upload Photo button is clicked
2. ✅ NOT navigate to a different screen
3. ✅ NOT make API calls to upload the image immediately
4. ✅ Display Smart Suggestions after a photo is selected
5. ✅ Allow users to change the selected photo
6. ✅ Keep the user on the same form throughout the process

## Future Enhancements

Potential improvements for the test suite:
- Add visual regression testing
- Test different image formats and sizes
- Test error handling (invalid files, network errors)
- Add mobile/responsive testing
- Test keyboard navigation
- Add accessibility (a11y) tests
