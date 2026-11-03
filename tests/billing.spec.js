const { test, expect } = require('@playwright/test');

async function openNewInvoice(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /new invoice/i }).first().click();
  await expect(page.locator('#bf')).toBeVisible();
}

async function fillInvoice(page, patient = 'Test Patient') {
  await page.locator('#bf input[name="patient"]').fill(patient);
  await page.locator('#bf input[name="age"]').fill('32');
  await page.locator('#bf input[name="phone"]').fill('9876543210');
  await page.locator('#bf input[name="date"]').fill('2026-11-03');
  await page.locator('#bf input[aria-label="Test name"]').first().fill('Complete Blood Count');
  await page.locator('#bf input[aria-label="Test price"]').first().fill('500');
  await page.locator('#bf input[name="paid"]').fill('200');
}

test('creates invoice, calculates balance, and opens printable invoice', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page);
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.locator('#mbody')).toContainText('Complete Blood Count');
  await expect(page.locator('#mbody')).toContainText('₹500.00');
  await expect(page.locator('#mbody')).toContainText('₹200.00');
  await expect(page.locator('#mbody')).toContainText('₹300.00');
  await expect(page.locator('#mbody svg#barcode')).toBeVisible();
});

test('records partial payment and updates outstanding balance', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Payment Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.locator('#pay input[name="amount"]').fill('100');
  await page.locator('#pay select[name="method"]').selectOption('UPI');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.locator('#mbody')).toContainText('₹300.00');
  await expect(page.locator('#mbody')).toContainText('₹200.00');
});

test('duplicates an invoice as a fresh unpaid invoice', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Duplicate Source');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Duplicate invoice' }).click();
  await expect(page.locator('#bf')).toBeVisible();
  await expect(page.locator('#bf input[name="paid"]')).toHaveValue('0');
  await expect(page.locator('#bf input[name="patient"]')).toHaveValue('Duplicate Source');
});

test('cancels invoice only after a reason is entered', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Cancellation Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  page.once('dialog', dialog => dialog.accept('Entered by mistake'));
  await page.getByRole('button', { name: 'Cancel invoice' }).click();
  await expect(page.locator('#billlist')).toContainText('Cancellation Test');
  await expect(page.locator('#billlist')).toContainText('Cancelled');
});

test('exports and restores a JSON backup', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Backup Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restore').setInputFiles(filePath);
  await expect(page.locator('#main')).toContainText('Backup & restore');
  await page.getByRole('button', { name: 'Invoices' }).click();
  await expect(page.locator('#billlist')).toContainText('Backup Test');
});

test('saves editable laboratory branding and preserves it after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#pf input[name="brandTitle"]').fill('CITY DIAGNOSTIC CENTRE');
  await page.locator('#pf input[name="brandSubtitle"]').fill('Accurate Reports, Trusted Care');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#brand')).toHaveText('CITY DIAGNOSTIC CENTRE');
  await page.reload();
  await expect(page.locator('#brand')).toHaveText('CITY DIAGNOSTIC CENTRE');
  await expect(page.locator('#brandSubtitle')).toHaveText('Accurate Reports, Trusted Care');
});

test('edits an existing invoice without losing its recorded payment', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Edit Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#bf input[aria-label="Test price"]').first().fill('600');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.locator('#mbody')).toContainText('₹600.00');
  await expect(page.locator('#mbody')).toContainText('₹200.00');
  await expect(page.locator('#mbody')).toContainText('₹400.00');
});

test('exports a date-filtered CSV report', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'CSV Export Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Collection reports' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('pathology-invoices-');
});
