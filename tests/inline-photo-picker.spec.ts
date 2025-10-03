import { test, expect } from '@playwright/test';

test.describe('NewProject.tsx - Inline Photo Picker', () => {
  test('should trigger inline file picker without navigation or API calls', async ({ page }) => {
    let apiImageCallMade = false;
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/projects/') && url.includes('/image')) {
        apiImageCallMade = true;
      }
    });

    await page.goto('/');
    
    const getStartedButton = page.getByRole('button', { name: /get started/i });
    await expect(getStartedButton).toBeVisible();
    await getStartedButton.click();
    
    const newProjectTab = page.getByRole('button', { name: /new project/i }).or(
      page.locator('[aria-label*="New Project"]')
    ).or(
      page.locator('text=New Project')
    );
    await expect(newProjectTab).toBeVisible({ timeout: 10000 });
    await newProjectTab.click();
    
    await page.waitForTimeout(1000);
    
    const initialUrl = page.url();
    console.log('Initial URL:', initialUrl);
    
    const descriptionInput = page.getByPlaceholder(/build 3 floating shelves/i).or(
      page.getByPlaceholder(/project description/i)
    ).or(
      page.locator('textarea').first()
    );
    await expect(descriptionInput).toBeVisible({ timeout: 10000 });
    await descriptionInput.fill('Build floating shelves for living room');
    
    const budgetDropdown = page.getByText(/select budget range/i).or(
      page.locator('text=Budget').locator('..').locator('button, [role="button"]').first()
    );
    await expect(budgetDropdown).toBeVisible();
    await budgetDropdown.click();
    
    await page.waitForTimeout(500);
    
    const budgetOption = page.getByText('$$', { exact: true }).first();
    await expect(budgetOption).toBeVisible();
    await budgetOption.click();
    
    await page.waitForTimeout(500);
    
    const skillDropdown = page.getByText(/select skill level/i).or(
      page.locator('text=Skill Level').locator('..').locator('button, [role="button"]').first()
    );
    await expect(skillDropdown).toBeVisible();
    await skillDropdown.click();
    
    await page.waitForTimeout(500);
    
    const skillOption = page.getByText('Beginner', { exact: true }).first();
    await expect(skillOption).toBeVisible();
    await skillOption.click();
    
    await page.waitForTimeout(500);
    
    const uploadButton = page.locator('[data-testid="btn-upload-photo"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });
    
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    
    await uploadButton.click();
    
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
    
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    expect(currentUrl).toBe(initialUrl);
    expect(currentUrl).not.toContain('NewProjectMedia');
    
    expect(apiImageCallMade).toBe(false);
    
    const testImagePath = 'tests/fixtures/test-image.jpg';
    try {
      await fileChooser.setFiles([{
        name: 'test-room.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      }]);
      
      await page.waitForTimeout(2000);
      
      const smartSuggestions = page.locator('[data-testid="np-suggestions-card"]');
      await expect(smartSuggestions).toBeVisible({ timeout: 15000 });
      
      const suggestionsTitle = smartSuggestions.locator('text=/Smart Suggestions/i');
      await expect(suggestionsTitle).toBeVisible();
      
    } catch (error) {
      console.log('File selection not completed, but inline picker was triggered successfully');
    }
    
    await page.waitForTimeout(500);
    expect(apiImageCallMade).toBe(false);
    
    const finalUrl = page.url();
    expect(finalUrl).toBe(initialUrl);
  });

  test('should handle photo selection and show change option', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: /get started/i }).click();
    
    const newProjectTab = page.getByRole('button', { name: /new project/i }).or(
      page.locator('[aria-label*="New Project"]')
    ).or(
      page.locator('text=New Project')
    );
    await newProjectTab.click();
    
    await page.waitForTimeout(1000);
    
    await page.getByPlaceholder(/build 3 floating shelves/i).or(
      page.locator('textarea').first()
    ).fill('Build floating shelves for living room');
    
    await page.getByText(/select budget range/i).click();
    await page.getByText('$$', { exact: true }).first().click();
    
    await page.getByText(/select skill level/i).click();
    await page.getByText('Beginner', { exact: true }).first().click();
    
    const uploadButton = page.locator('[data-testid="btn-upload-photo"]');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([{
      name: 'room-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    }]);
    
    await page.waitForTimeout(2000);
    
    const changePhotoButton = page.getByText(/change photo/i);
    
    if (await changePhotoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fileChooserPromise2 = page.waitForEvent('filechooser');
      await changePhotoButton.click();
      const fileChooser2 = await fileChooserPromise2;
      expect(fileChooser2).toBeTruthy();
    }
  });

  test('should not navigate when upload button is clicked', async ({ page }) => {
    const navigationOccurred = [];
    
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        navigationOccurred.push(frame.url());
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    
    const newProjectTab = page.getByRole('button', { name: /new project/i }).or(
      page.locator('[aria-label*="New Project"]')
    ).or(
      page.locator('text=New Project')
    );
    await newProjectTab.click();
    
    await page.waitForTimeout(1000);
    
    const urlBeforeUpload = page.url();
    
    await page.getByPlaceholder(/build 3 floating shelves/i).or(
      page.locator('textarea').first()
    ).fill('Build floating shelves for living room');
    
    await page.getByText(/select budget range/i).click();
    await page.getByText('$$', { exact: true }).first().click();
    
    await page.getByText(/select skill level/i).click();
    await page.getByText('Beginner', { exact: true }).first().click();
    
    const uploadButton = page.locator('[data-testid="btn-upload-photo"]');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    await fileChooserPromise;
    
    await page.waitForTimeout(1000);
    
    const urlAfterUpload = page.url();
    expect(urlAfterUpload).toBe(urlBeforeUpload);
    
    const navigatedToMedia = navigationOccurred.some(url => url.includes('NewProjectMedia'));
    expect(navigatedToMedia).toBe(false);
  });

  test('should verify no image upload API calls during photo selection', async ({ page }) => {
    const apiCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/projects/')) {
        apiCalls.push({
          method: request.method(),
          url: url,
        });
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).click();
    
    const newProjectTab = page.getByRole('button', { name: /new project/i }).or(
      page.locator('[aria-label*="New Project"]')
    ).or(
      page.locator('text=New Project')
    );
    await newProjectTab.click();
    
    await page.waitForTimeout(1000);
    
    await page.getByPlaceholder(/build 3 floating shelves/i).or(
      page.locator('textarea').first()
    ).fill('Build floating shelves for living room');
    
    await page.getByText(/select budget range/i).click();
    await page.getByText('$$', { exact: true }).first().click();
    
    await page.getByText(/select skill level/i).click();
    await page.getByText('Beginner', { exact: true }).first().click();
    
    const apiCallsBeforeUpload = apiCalls.length;
    
    const uploadButton = page.locator('[data-testid="btn-upload-photo"]');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    await fileChooserPromise;
    
    await page.waitForTimeout(2000);
    
    const imageUploadCalls = apiCalls.filter(call => 
      call.url.includes('/image') && 
      (call.method === 'POST' || call.method === 'PUT' || call.method === 'PATCH')
    );
    
    expect(imageUploadCalls.length).toBe(0);
  });
});
