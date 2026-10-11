import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const PHOTO = join(__dirname, 'fixtures', 'pothole.jpg');

async function signInAsDemo(page: Page, as: 'resident' | 'moderator' = 'resident') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Spot it. Snap it. Sorted.' })).toBeVisible();
  await page.getByTestId(as === 'resident' ? 'demo-login' : 'demo-moderator-login').click();
  await expect(page.getByTestId('report-card').first()).toBeVisible();
}

test('resident reports an issue, sees AI triage and duplicates, upvotes and comments', async ({
  page,
}) => {
  await signInAsDemo(page);

  // Seeded feed is visible.
  await expect(
    page.getByText('Deep pothole in the cycle lane on Tooley Street outside the station'),
  ).toBeVisible();

  // Create a report with a photo, description and the device location.
  await page.getByRole('tab', { name: /Report/ }).click();
  await expect(page.getByText('Pinned at your current location')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('choose-photo').click();
  await (await chooser).setFiles(PHOTO);
  await expect(page.getByRole('img', { name: 'Selected photo of the issue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
  await page
    .getByTestId('description-input')
    .fill(
      'Deep pothole on the Tooley Street cycle lane outside the station, bikes swerving round it',
    );
  await page.getByTestId('submit-report').click();

  // AI triage result (mock provider) and duplicate detection against seeded reports.
  const banner = page.getByTestId('created-banner');
  await expect(banner).toContainText('Roads & potholes');
  await expect(banner).toContainText('high severity');
  await expect(page.getByTestId('ai-provenance')).toContainText('offline heuristics');
  const duplicates = page.getByTestId('duplicate-notice');
  await expect(duplicates).toContainText('Is this the same as one of these?');
  await expect(duplicates).toContainText(
    'Deep pothole in the cycle lane on Tooley Street outside the station',
  );

  // Upvote (optimistic, then confirmed by the API).
  const upvote = page.getByTestId('upvote-button-large');
  await upvote.click();
  await expect(upvote).toHaveAttribute('aria-pressed', 'true');
  await expect(upvote).toContainText('1');

  // Comment.
  await page.getByTestId('comment-input').fill('Still there at 8am, a car hit it too.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByTestId('comment-list')).toContainText('Still there at 8am');
  await expect(page.getByText('Comments (1)')).toBeVisible();

  // The new report tops the feed after a reload (persisted in Firestore).
  await page.goto('/');
  const first = page.getByTestId('report-card').first();
  await expect(first).toContainText('Deep pothole on the Tooley Street cycle lane');
  await expect(first).toContainText('Possible duplicate');
});

test('moderator moves a report through the status workflow', async ({ page }) => {
  await signInAsDemo(page, 'moderator');
  await page.goto('/report/seed-04');
  const panel = page.getByTestId('moderator-panel');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Acknowledged' }).click();
  await panel.getByLabel('Note for residents (optional)').fill('Clearance booked for Friday.');
  await panel.getByRole('button', { name: 'Mark as acknowledged' }).click();
  await expect(page.getByText('Clearance booked for Friday.')).toBeVisible();
  await expect(page.getByLabel('Status: Acknowledged').first()).toBeVisible();
});
