/**
 * E2E Test: Creating Lifecycle-Enhanced Workflow
 */

import { test, expect } from '@playwright/test'

test.describe('Lifecycle-Enhanced Workflow Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should create workflow with lifecycle stages', async ({ page }) => {
    // Open BPMN editor
    await page.click('[data-testid="new-workflow"]')

    // Wait for editor to load
    await page.waitForSelector('.bpmn-canvas')

    // Add a user task
    await page.click('[data-palette-entry="create.user-task"]')
    await page.click('.bpmn-canvas', { position: { x: 300, y: 200 } })

    // Select the task
    await page.click('[data-element-id*="UserTask"]')

    // Open properties panel
    await page.click('[data-testid="properties-panel"]')

    // Find lifecycle properties section
    await page.click('text=Lifecycle Operations')

    // Select lifecycle stage
    await page.selectOption('[data-property="lifecycleStage"]', 'Acquisition')

    // Verify stage is selected
    const selectedStage = await page.inputValue('[data-property="lifecycleStage"]')
    expect(selectedStage).toBe('Acquisition')

    // Add user segments
    await page.fill('[data-property="userSegments"]', 'new_users, trial_users')

    // Add triggers
    await page.fill('[data-property="triggers"]', 'user_signup')

    // Verify lifecycle badge is visible on canvas
    const badge = await page.locator('.lifecycle-badge')
    await expect(badge).toBeVisible()

    // Save workflow
    await page.click('[data-testid="save-workflow"]')

    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible()
  })

  test('should visualize lifecycle stages on canvas', async ({ page }) => {
    // Load existing workflow with lifecycle data
    await page.click('[data-testid="open-workflow"]')
    await page.click('[data-workflow="lifecycle-example"]')

    // Wait for workflow to load
    await page.waitForSelector('.bpmn-canvas')

    // Check for lifecycle badges
    const badges = await page.locator('.lifecycle-badge')
    const count = await badges.count()
    expect(count).toBeGreaterThan(0)

    // Verify different stage colors
    const acquisitionBadge = await page.locator('.lifecycle-badge[data-stage="Acquisition"]')
    if (await acquisitionBadge.count() > 0) {
      const color = await acquisitionBadge.evaluate(el =>
        window.getComputedStyle(el.querySelector('circle')!).fill
      )
      expect(color).toBeTruthy()
    }
  })

  test('should filter workflow by lifecycle stage', async ({ page }) => {
    await page.goto('/workflows')

    // Use lifecycle stage filter
    await page.selectOption('[data-filter="lifecycle-stage"]', 'Retention')

    // Verify filtered results
    await page.waitForSelector('[data-workflow-stage="Retention"]')

    const workflows = await page.locator('[data-workflow-stage]')
    const count = await workflows.count()

    // All visible workflows should be Retention stage
    for (let i = 0; i < count; i++) {
      const stage = await workflows.nth(i).getAttribute('data-workflow-stage')
      expect(stage).toBe('Retention')
    }
  })

  test('should export workflow with lifecycle metadata', async ({ page }) => {
    await page.click('[data-testid="open-workflow"]')
    await page.click('[data-workflow="lifecycle-example"]')

    // Export workflow
    await page.click('[data-testid="export-workflow"]')

    // Wait for download
    const download = await page.waitForEvent('download')
    const path = await download.path()

    expect(path).toBeTruthy()

    // Verify file contains lifecycle metadata
    const fs = require('fs')
    const content = fs.readFileSync(path!, 'utf8')
    expect(content).toContain('xflow:Lifecycle')
    expect(content).toContain('stage')
  })
})
