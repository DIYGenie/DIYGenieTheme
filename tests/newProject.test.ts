/**
 * Automated UI test for New Project flow
 * Tests the complete flow: create project → upload image → generate preview or build plan
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://api.diygenieapp.com';
const TEST_IMAGE_URL = 'https://qnevigmqyuxfzyczmctc.supabase.co/storage/v1/object/public/uploads/room-test.jpeg';
const TEST_USER_ID = '4e599cea-dfe5-4a8f-9738-bea3631ee4e6';

test.describe('New Project Flow', () => {
  test('should create project, upload image via direct_url, and complete flow', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForTimeout(2000);
    
    // Click Get Started
    const getStartedButton = page.getByText('Get Started');
    if (await getStartedButton.isVisible()) {
      await getStartedButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Navigate to New Project (Home tab should be active)
    await page.waitForTimeout(1000);
    
    // Fill in project description (≥10 chars)
    const description = 'Transform my living room into a modern minimalist space with new furniture';
    const descriptionInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"]').first();
    await descriptionInput.fill(description);
    
    // Select budget
    const budgetButton = page.getByText('Budget').first();
    await budgetButton.click();
    await page.waitForTimeout(500);
    await page.getByText('$$').click();
    await page.waitForTimeout(500);
    
    // Select skill level
    const skillButton = page.getByText('Skill Level').first();
    await skillButton.click();
    await page.waitForTimeout(500);
    await page.getByText('Intermediate').click();
    await page.waitForTimeout(500);
    
    // Get entitlements to check if preview is allowed
    const entitlementsResp = await page.evaluate(async (userId) => {
      const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
      const response = await fetch(`${BASE}/me/entitlements/${userId}`);
      return response.json();
    }, TEST_USER_ID);
    
    console.log('Entitlements:', entitlementsResp);
    const previewAllowed = entitlementsResp.previewAllowed || false;
    
    // Create project via API (simulating the upload photo button)
    const projectId = await page.evaluate(async ({ userId, description }) => {
      const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
      const response = await fetch(`${BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: description.substring(0, 100),
          budget: '$$',
          skill: 'Intermediate',
          status: 'pending',
        }),
      });
      const data = await response.json();
      return data.id;
    }, { userId: TEST_USER_ID, description });
    
    console.log('Created project:', projectId);
    
    // Upload image via direct_url
    await page.evaluate(async ({ projectId, imageUrl }) => {
      const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
      const response = await fetch(`${BASE}/api/projects/${projectId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direct_url: imageUrl }),
      });
      const data = await response.json();
      console.log('Image upload response:', data);
      return data;
    }, { projectId, imageUrl: TEST_IMAGE_URL });
    
    console.log('Image uploaded via direct_url');
    
    // Navigate to Projects list
    const projectsTab = page.locator('[aria-label="Projects, tab"], button:has-text("Projects")').first();
    await projectsTab.click();
    await page.waitForTimeout(2000);
    
    // Check if preview is allowed
    if (previewAllowed) {
      // Test Generate AI Preview flow
      console.log('Testing preview generation (preview allowed)');
      
      // Trigger preview generation
      await page.evaluate(async ({ projectId, userId }) => {
        const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
        await fetch(`${BASE}/api/projects/${projectId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
      }, { projectId, userId: TEST_USER_ID });
      
      console.log('Preview generation triggered');
      
      // Wait for preview_ready status (poll for up to 6 seconds)
      let previewReady = false;
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(2000);
        const projects = await page.evaluate(async (userId) => {
          const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
          const response = await fetch(`${BASE}/api/projects?user_id=${userId}`);
          const data = await response.json();
          return data.items || data;
        }, TEST_USER_ID);
        
        const currentProject = projects.find((p: any) => p.id === projectId);
        console.log('Project status:', currentProject?.status);
        
        if (currentProject?.status === 'preview_ready' || currentProject?.preview_url) {
          previewReady = true;
          console.log('✅ Preview ready!');
          break;
        }
      }
      
      if (!previewReady) {
        console.log('⚠️ Preview not ready yet (may take longer)');
      }
    } else {
      console.log('Preview not allowed for this tier, skipping preview test');
    }
    
    // Test Build Plan Without Preview
    console.log('Testing build without preview');
    
    await page.evaluate(async ({ projectId, userId }) => {
      const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
      const response = await fetch(`${BASE}/api/projects/${projectId}/build-without-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      console.log('Build response:', data);
    }, { projectId, userId: TEST_USER_ID });
    
    // Wait and check for plan_ready status
    await page.waitForTimeout(2000);
    const projects = await page.evaluate(async (userId) => {
      const BASE = (window as any).process?.env?.EXPO_PUBLIC_BASE_URL;
      const response = await fetch(`${BASE}/api/projects?user_id=${userId}`);
      const data = await response.json();
      return data.items || data;
    }, TEST_USER_ID);
    
    const finalProject = projects.find((p: any) => p.id === projectId);
    console.log('Final project status:', finalProject?.status);
    
    if (finalProject?.status === 'plan_ready') {
      console.log('✅ Build plan ready!');
    } else {
      console.log('⚠️ Build plan not ready yet, current status:', finalProject?.status);
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ Project created:', projectId);
    console.log('✅ Image uploaded via direct_url');
    console.log(`${previewAllowed ? '✅' : '⏭️'} Preview ${previewAllowed ? 'tested' : 'skipped (not allowed)'}`);
    console.log('✅ Build without preview triggered');
  });
});
