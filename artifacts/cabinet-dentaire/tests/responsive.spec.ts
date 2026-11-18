import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'small-phone', width: 320, height: 740 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'large-phone', width: 402, height: 874 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

const routes = [
  '/',
  '/contact',
  '/faq',
  '/arm',
];

for (const viewport of viewports) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('public and admin screens render without overflow or runtime exceptions', async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      for (const route of routes) {
        const response = await page.goto(route, { waitUntil: 'commit' });
        expect(response?.status(), `${route} should load successfully`).toBe(200);
        await expect(page.locator('#root > *').first()).toBeVisible();

        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));

        expect(
          dimensions.document,
          `${route} should not create horizontal page scrolling`,
        ).toBeLessThanOrEqual(dimensions.viewport + 1);
        expect(
          dimensions.body,
          `${route} content should stay within the viewport`,
        ).toBeLessThanOrEqual(dimensions.viewport + 1);
      }

      expect(pageErrors, 'No uncaught browser errors should occur').toEqual([]);
    });
  });
}
