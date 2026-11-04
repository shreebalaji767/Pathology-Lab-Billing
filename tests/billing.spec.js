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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restore').setInputFiles(filePath);
  await expect(page.locator('#main')).toContainText('Backup & restore');
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  await expect(page.locator('#billlist')).toContainText('Backup Test');
});

test('saves editable laboratory branding and preserves it after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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
  await page.locator('#mbody').getByRole('button', { name: 'Edit', exact: true }).click();
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


test('shows a transparent favicon and prints a bill directly from the invoice list', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Direct Print Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Invoices' }).click();
  await expect(page.getByRole('button', { name: 'Print bill' })).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print bill' }).click();
  const popup = await popupPromise;
  await expect(popup.locator('body')).toContainText('Direct Print Test');
  await expect(popup.locator('body')).toContainText('Complete Blood Count');

  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(favicon).toContain('favicon.svg');
  const response = await page.request.get(new URL(favicon, page.url()).toString());
  expect(response.ok()).toBeTruthy();
  const svg = await response.text();
  expect(svg).toContain('<svg');
  expect(svg).not.toMatch(/<rect[^>]+fill=["'](?:#fff|white)["']/i);
});


test('responsive layout fits phone, tablet, laptop and desktop viewports', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 360, 390, 430, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.locator('.layout')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      main: document.querySelector('main').getBoundingClientRect().width
    }));
    expect(metrics.document, `document overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.body, `body overflow at ${width}px: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.main).toBeGreaterThan(0);
  }
});


test('soft-deletes a patient and allows restoring the patient record', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Soft Delete Patient');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Patients', exact: true }).click();
  await expect(page.locator('#patientRecords')).toContainText('Soft Delete Patient');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Soft delete' }).click();
  await expect(page.locator('#patientRecords')).not.toContainText('Soft Delete Patient');
  await page.locator('#patientStatusFilter').selectOption('deleted');
  await expect(page.locator('#patientRecords')).toContainText('Soft Delete Patient');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.locator('#patientStatusFilter').selectOption('active');
  await expect(page.locator('#patientRecords')).toContainText('Soft Delete Patient');
});

test('permanently deletes patient details and anonymizes linked invoices', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Permanent Delete Patient');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Patients', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Permanently delete' }).click();
  await expect(page.locator('#patientRecords')).not.toContainText('Permanent Delete Patient');
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  await expect(page.locator('#billlist')).toContainText('Deleted patient');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('#mbody')).toContainText('Deleted patient');
  await expect(page.locator('#mbody')).not.toContainText('9876543210');
});
