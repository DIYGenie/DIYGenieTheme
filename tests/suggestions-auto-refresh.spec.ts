import { test, expect } from '@playwright/test';

test.describe('Smart Suggestions Auto-Refresh', () => {
  test('should auto-refresh suggestions with debounce when description changes', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');
    
    // 2. Click "Get Started" to enter the app
    await page.getByRole('button', { name: /get started/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // 3. Navigate to New Project screen (Home tab - second tab)
    // Look for the Home tab or New Project navigation
    const homeTab = page.locator('text=/Home|New Project/i').first();
    if (await homeTab.isVisible()) {
      await homeTab.click();
      await page.waitForTimeout(500);
    }
    
    // Verify we're on the New Project screen
    await expect(page.locator('text=/Create New Project|Project Description/i')).toBeVisible({ timeout: 10000 });
    
    // 4. Enter a project description of at least 10 characters (shelves)
    const descriptionInput = page.locator('textarea, input').filter({ hasText: '' }).first();
    const projectDescInput = page.getByPlaceholder(/Build 3 floating shelves|Project Description|e\.g\./i).or(
      page.locator('textarea').first()
    );
    
    console.log('Step 4: Entering shelf description...');
    await projectDescInput.fill('Build floating shelves for living room');
    
    // 5. Wait ~0.5 seconds and verify the SuggestionsBox updates with shelf-specific suggestions
    await page.waitForTimeout(600); // Wait for debounce (500ms) + buffer
    
    // Check for shelf-specific suggestions
    console.log('Step 5: Checking for shelf-specific suggestions...');
    const shelfSuggestion1 = page.locator('text=/shelf width|bracket|spacing between shelves/i');
    const shelfSuggestion2 = page.locator('text=/hidden.*visible|bracket style/i');
    
    // At least one shelf-specific suggestion should be visible
    await expect(shelfSuggestion1.or(shelfSuggestion2).first()).toBeVisible({ timeout: 3000 });
    console.log('✓ Shelf-specific suggestions loaded');
    
    // 6. Change the description to something different (bench)
    console.log('Step 6: Changing to bench description...');
    await projectDescInput.clear();
    await projectDescInput.fill('Build storage bench for entryway');
    
    // 7. Wait ~0.5 seconds and verify suggestions update with bench-specific tips
    await page.waitForTimeout(600); // Wait for debounce (500ms) + buffer
    
    console.log('Step 7: Checking for bench-specific suggestions...');
    const benchSuggestion1 = page.locator('text=/seat height|max length|bench/i');
    const benchSuggestion2 = page.locator('text=/storage type|cubbies|drawers/i');
    
    // At least one bench-specific suggestion should be visible
    await expect(benchSuggestion1.or(benchSuggestion2).first()).toBeVisible({ timeout: 3000 });
    console.log('✓ Bench-specific suggestions loaded');
    
    // 8. Fill in budget and skill level to enable photo picker
    console.log('Step 8: Filling budget and skill level...');
    
    // Find and click budget dropdown
    const budgetDropdown = page.locator('text=/Select budget range/i').or(
      page.locator('button, div').filter({ hasText: /Budget|\$/ }).first()
    );
    if (await budgetDropdown.isVisible()) {
      await budgetDropdown.click();
      await page.waitForTimeout(300);
      // Select $$ option
      await page.locator('text="$$"').first().click();
    }
    
    // Find and click skill level dropdown
    const skillDropdown = page.locator('text=/Select skill level/i').or(
      page.locator('button, div').filter({ hasText: /Skill Level|Beginner|Intermediate/ }).first()
    );
    if (await skillDropdown.isVisible()) {
      await skillDropdown.click();
      await page.waitForTimeout(300);
      // Select Intermediate
      await page.locator('text=/Intermediate/i').first().click();
    }
    
    console.log('Step 8: Looking for photo picker...');
    // Note: Photo picker testing is complex in Playwright due to file input handling
    // We'll verify the UI is ready for photo upload
    const photoButton = page.locator('button, div').filter({ hasText: /Upload Photo|Add Photo|Select Photo/i }).first();
    
    if (await photoButton.isVisible({ timeout: 2000 })) {
      console.log('✓ Photo picker is available');
      
      // Take a screenshot showing the current state with bench suggestions
      await page.screenshot({ 
        path: 'tests/screenshots/bench-suggestions.png',
        fullPage: true 
      });
      console.log('✓ Screenshot saved: bench-suggestions.png');
    } else {
      console.log('⚠ Photo picker not visible, skipping photo test');
    }
    
    // 10. Check browser console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('DevTools') && 
      !err.includes('deprecated') &&
      !err.includes('pointerEvents')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Console errors detected:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
    
    // 11. Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/final-state.png',
      fullPage: true 
    });
    console.log('✓ Final screenshot saved');
    
    console.log('✓ Test completed successfully');
  });
  
  test('should debounce API calls and not spam on every keystroke', async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/suggestions-smart')) {
        apiCalls.push(new Date().toISOString());
        console.log(`API call ${apiCalls.length}: ${request.url()}`);
      }
    });
    
    // Navigate to app
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Navigate to New Project screen
    const homeTab = page.locator('text=/Home|New Project/i').first();
    if (await homeTab.isVisible()) {
      await homeTab.click();
      await page.waitForTimeout(500);
    }
    
    // Find description input
    const projectDescInput = page.getByPlaceholder(/Build 3 floating shelves|Project Description|e\.g\./i).or(
      page.locator('textarea').first()
    );
    
    // Type slowly to trigger debounce
    const text = 'Build a storage bench';
    const initialCallCount = apiCalls.length;
    
    console.log('Starting to type text character by character...');
    for (let i = 0; i < text.length; i++) {
      await projectDescInput.press(text[i]);
      await page.waitForTimeout(50); // Fast typing
    }
    
    console.log('Finished typing, waiting for debounce...');
    
    // Wait for debounce to settle
    await page.waitForTimeout(800);
    
    const finalCallCount = apiCalls.length - initialCallCount;
    
    console.log(`API calls made: ${finalCallCount}`);
    console.log(`Expected: 1-2 calls (due to debouncing)`);
    console.log(`Actual call count: ${finalCallCount}`);
    
    // Debouncing should result in only 1-2 API calls, not 20+ (one per character)
    // Allow some tolerance for edge cases
    expect(finalCallCount).toBeLessThanOrEqual(3);
    expect(finalCallCount).toBeGreaterThanOrEqual(1);
    
    console.log('✓ Debouncing is working correctly');
  });
});
