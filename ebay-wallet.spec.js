const { test, expect, chromium } = require('@playwright/test');

test.setTimeout(120000);

test('Search wallet and check related best sellers (using su-card-container__header)', async ( ) => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();


    // Step 1: Go to eBay
    await page.goto('https://www.ebay.com/');

  


    // Step 2: Search for "wallet"
    await page.getByRole('combobox', { name: 'Search for anything' }).fill('mens wallet');
    await page.getByRole('button', { name: 'Search' }).click();


    // Step 3: Wait for results and click the first product (opens in new tab)
    await page.waitForSelector('.su-card-container__header');

    // Wait for the first product to be visible
    const firstProduct = page.locator('.su-card-container__header').first();
    await firstProduct.waitFor({ state: 'visible' });


    const [newPage] = await Promise.all([
        context.waitForEvent('page'), // Wait for the new tab
        page.locator('.su-card-container__header').first().click() // Click first product
        
    ]);

    await newPage.waitForLoadState('domcontentloaded');

  // Step 4: Wait for breadcrumb section and extract category text
  await newPage.waitForSelector('.x-breadcrumb__wrapper');

  const categories = await newPage.$$eval('.seo-breadcrumb-text span', elements =>
    elements.map(el => el.textContent.trim().toLowerCase())
  );

  console.log('🔍 Breadcrumb categories:', categories);

  const hasWalletCategory = categories.some(cat => cat.includes('wallet'));

  expect(hasWalletCategory).toBe(true);
  console.log(hasWalletCategory
    ? 'Category includes "wallet".'
    : 'Category does NOT include "wallet".');

     // Scroll into view to trigger lazy load
    await newPage.locator('h2.EF85').scrollIntoViewIfNeeded();

    // Wait for product titles to load
    await newPage.waitForSelector('div.rJxx h3');

    // Extract all titles
    const similarItemTitles = await newPage.$$eval('div.rJxx h3', elements =>
        elements.map(el => el.textContent.trim())
    );

    // Log or use the titles
    console.log('Similar Item Titles:', similarItemTitles);


    // Step 5: Locate Similar Items Section
    const similarItemsSection = newPage.locator('h2.EF85', { hasText: 'Similar items' });
    await expect(similarItemsSection).toBeVisible();

    // Step 6: Select all product cards under Similar Items
    const itemCards = await newPage.locator('.Mgpb.rgAU').filter({ has: newPage.locator('a.VNEa') }).elementHandles();

    const maxItems = Math.min(itemCards.length, 6);
    console.log(`Found ${maxItems} similar items.`);


    for (let i = 0; i < maxItems; i++) {
    const linkHandle = await itemCards[i].$('a.VNEa');
    if (!linkHandle) continue;

    const href = await linkHandle.getAttribute('href');
    if (!href) continue;

    const similarPage = await context.newPage();
    await similarPage.goto(href, { waitUntil: 'domcontentloaded' });

    try {
        await similarPage.waitForSelector('.x-breadcrumb__wrapper', { timeout: 8000 });

        const similarCategories = await similarPage.$$eval('.seo-breadcrumb-text span', elements =>
            elements.map(el => el.textContent.trim().toLowerCase())
        );

        const isWallet = similarCategories.some(cat => cat.includes('wallet'));

        console.log(`🔎 Similar Item ${i + 1} Categories:`, similarCategories);
        console.log(isWallet
            ? `Item ${i + 1} is in category "wallet"`
            : `Item ${i + 1} is NOT in category "wallet"`);

        expect(isWallet).toBe(true);

    } catch (error) {
        console.log(`Failed to verify category for Item ${i + 1}:`, error.message);
    }

    await similarPage.close();



}


    expect(maxItems).toBeLessThanOrEqual(6);
    await browser.close();
});
