const { test, expect } = require('@playwright/test');

const TEST_PASSWORD = 'lab-test-passphrase-2026';

async function unlockApp(page) {
  const gate = page.locator('#plbCryptoGate');
  if (await gate.count()) {
    await page.locator('#plbCryptoPassword').fill(TEST_PASSWORD);
    const confirm = page.locator('#plbCryptoConfirm');
    if (await confirm.count()) await confirm.fill(TEST_PASSWORD);
    await gate.getByRole('button', { name: /encrypt and continue|unlock data/i }).click();
    await expect(gate).toHaveCount(0, { timeout: 15000 });
  }
}

async function goToApp(page) {
  await page.goto('/');
  await unlockApp(page);
}

async function reloadApp(page) {
  await page.reload();
  await unlockApp(page);
}

async function openNewInvoice(page) {
  await goToApp(page);
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

test('migrates existing plaintext browser records into encrypted storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pathologyLabBilling_v1', JSON.stringify({
      profile: { name: 'Migrated Laboratory', subtitle: 'Legacy data' },
      tests: [], packages: [], patients: [], doctors: [],
      invoices: [{ id: 'legacy-invoice-1', no: 'LEGACY-001', date: '2026-11-03', patient: 'Legacy Patient', phone: '9000000000', total: 250, paid: 0, due: 250, items: [], status: 'active' }]
    }));
    localStorage.setItem('plb_audit_v2', JSON.stringify([{ action: 'Legacy audit entry' }]));
  });
  await goToApp(page);
  await expect(page.locator('#brand')).toHaveText('Migrated Laboratory');
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  await expect(page.locator('#billlist')).toContainText('LEGACY-001');
  const migration = await page.evaluate(() => {
    const rawGet = key => Storage.prototype.getItem.call(localStorage, key);
    return {
      envelope: rawGet('plb_secure_v1'),
      legacyData: rawGet('pathologyLabBilling_v1'),
      legacyAudit: rawGet('plb_audit_v2')
    };
  });
  expect(JSON.parse(migration.envelope).algorithm).toBe('AES-GCM');
  expect(migration.legacyData).toBeNull();
  expect(migration.legacyAudit).toBeNull();
});

test('encrypts browser storage and never stores the encryption password', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Encrypted Storage Sentinel');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  const stored = await page.evaluate(() => {
    const rawGet = (key) => Storage.prototype.getItem.call(localStorage, key);
    const envelope = rawGet('plb_secure_v1');
    return {
      envelope: envelope ? JSON.parse(envelope) : null,
      plaintext: rawGet('pathologyLabBilling_v1'),
      passwordInStorage: Object.keys(localStorage).some(k => k.toLowerCase().includes('password'))
    };
  });
  expect(stored.envelope.algorithm).toBe('AES-GCM');
  expect(stored.envelope.kdf).toBe('PBKDF2-SHA-256');
  expect(JSON.stringify(stored.envelope)).not.toContain('Encrypted Storage Sentinel');
  expect(stored.plaintext).toBeNull();
  expect(stored.passwordInStorage).toBeFalsy();
});

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
  await reloadApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restore').setInputFiles(filePath);
  await expect(page.locator('#main')).toContainText('Backup & restore');
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  await expect(page.locator('#billlist')).toContainText('Backup Test');
});

test('saves editable laboratory branding and preserves it after reload', async ({ page }) => {
  await goToApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#pf input[name="brandTitle"]').fill('CITY DIAGNOSTIC CENTRE');
  await page.locator('#pf input[name="brandSubtitle"]').fill('Accurate Reports, Trusted Care');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#brand')).toHaveText('CITY DIAGNOSTIC CENTRE');
  await reloadApp(page);
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
  await goToApp(page);
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
  await page.getByRole('button', { name: 'Permanently delete' }).click();
  await expect(page.locator('#patientRecords')).not.toContainText('Permanent Delete Patient');
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  await expect(page.locator('#billlist')).toContainText('Deleted patient');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('#mbody')).toContainText('Deleted patient');
  await expect(page.locator('#mbody')).not.toContainText('9876543210');
});


test('doctors support edit, soft delete, restore and permanent delete', async ({ page }) => {
  await goToApp(page);
  await page.getByRole('button', { name: 'Doctors', exact: true }).click();
  await page.getByRole('button', { name: /add doctor/i }).click();
  await page.locator('#ef input[name="name"]').fill('Dr. Example');
  await page.locator('#ef input[name="clinic"]').fill('City Clinic');
  await page.locator('#ef input[name="phone"]').fill('9000000001');
  await page.getByRole('button', { name: 'Save doctor' }).click();
  await expect(page.locator('#doctorlist')).toContainText('Dr. Example');
  await page.locator('#doctorlist [data-catalog-action="edit"]').click();
  await page.locator('#ef input[name="clinic"]').fill('Updated Clinic');
  await page.getByRole('button', { name: 'Save doctor' }).click();
  await expect(page.locator('#doctorlist')).toContainText('Updated Clinic');
  page.once('dialog', d => d.accept());
  await page.locator('#doctorlist [data-catalog-action="soft"]').click();
  await page.locator('#catalogStatusFilter').selectOption('deleted');
  await expect(page.locator('#doctorlist')).toContainText('Dr. Example');
  page.once('dialog', d => d.accept());
  await page.locator('#doctorlist [data-catalog-action="restore"]').click();
  await page.locator('#catalogStatusFilter').selectOption('active');
  await expect(page.locator('#doctorlist')).toContainText('Dr. Example');
  page.once('dialog', d => d.accept());
  await page.locator('#doctorlist [data-catalog-action="permanent"]').click();
  await expect(page.locator('#doctorlist')).not.toContainText('Dr. Example');
});

test('tests support edit, soft delete, restore and permanent delete', async ({ page }) => {
  await goToApp(page);
  await page.getByRole('button', { name: 'Test catalogue', exact: true }).click();
  await page.getByRole('button', { name: 'Add test', exact: true }).click();
  await page.locator('#ef input[name="name"]').fill('Custom CBC');
  await page.locator('#ef input[name="category"]').fill('Haematology');
  await page.locator('#ef input[name="price"]').fill('450');
  await page.getByRole('button', { name: 'Save test' }).click();
  await expect(page.locator('#testlist')).toContainText('Custom CBC');
  await page.locator('#testlist [data-catalog-action="edit"]').click();
  await page.locator('#ef input[name="price"]').fill('500');
  await page.getByRole('button', { name: 'Save test' }).click();
  await expect(page.locator('#testlist')).toContainText('₹500.00');
  page.once('dialog', d => d.accept());
  await page.locator('#testlist [data-catalog-action="soft"]').click();
  await page.locator('#catalogStatusFilter').selectOption('deleted');
  await expect(page.locator('#testlist')).toContainText('Custom CBC');
  page.once('dialog', d => d.accept());
  await page.locator('#testlist [data-catalog-action="restore"]').click();
  await page.locator('#catalogStatusFilter').selectOption('active');
  await expect(page.locator('#testlist')).toContainText('Custom CBC');
  page.once('dialog', d => d.accept());
  await page.locator('#testlist [data-catalog-action="permanent"]').click();
  await expect(page.locator('#testlist')).not.toContainText('Custom CBC');
});

test('packages support edit, soft delete, restore and permanent delete', async ({ page }) => {
  await goToApp(page);
  await page.getByRole('button', { name: 'Test catalogue', exact: true }).click();
  await page.getByRole('button', { name: 'Add test', exact: true }).click();
  await page.locator('#ef input[name="name"]').fill('Package Test');
  await page.locator('#ef input[name="category"]').fill('General');
  await page.locator('#ef input[name="price"]').fill('100');
  await page.getByRole('button', { name: 'Save test' }).click();
  await page.getByRole('button', { name: 'Test packages', exact: true }).click();
  await page.getByRole('button', { name: 'Add package', exact: true }).click();
  await page.locator('#ef input[name="name"]').fill('Basic Health Package');
  await page.locator('#ef input[name="price"]').fill('350');
  await page.locator('#ef input[name="tests"]').check();
  await page.getByRole('button', { name: 'Save package' }).click();
  await expect(page.locator('#packagelist')).toContainText('Basic Health Package');
  await page.locator('#packagelist [data-catalog-action="edit"]').click();
  await page.locator('#ef input[name="price"]').fill('400');
  await page.getByRole('button', { name: 'Save package' }).click();
  await expect(page.locator('#packagelist')).toContainText('₹400.00');
  page.once('dialog', d => d.accept());
  await page.locator('#packagelist [data-catalog-action="soft"]').click();
  await page.locator('#catalogStatusFilter').selectOption('deleted');
  await expect(page.locator('#packagelist')).toContainText('Basic Health Package');
  page.once('dialog', d => d.accept());
  await page.locator('#packagelist [data-catalog-action="restore"]').click();
  await page.locator('#catalogStatusFilter').selectOption('active');
  await expect(page.locator('#packagelist')).toContainText('Basic Health Package');
  page.once('dialog', d => d.accept());
  await page.locator('#packagelist [data-catalog-action="permanent"]').click();
  await expect(page.locator('#packagelist')).not.toContainText('Basic Health Package');
});

test('invoices support soft delete, restore and permanent delete', async ({ page }) => {
  await openNewInvoice(page);
  await fillInvoice(page, 'Invoice Lifecycle Test');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Invoices', exact: true }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Soft delete' }).click();
  await expect(page.locator('#billlist')).not.toContainText('Invoice Lifecycle Test');
  await page.locator('#status').selectOption('deleted');
  await expect(page.locator('#billlist')).toContainText('Invoice Lifecycle Test');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.locator('#status').selectOption('');
  await expect(page.locator('#billlist')).toContainText('Invoice Lifecycle Test');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Permanent delete' }).click();
  await expect(page.locator('#billlist')).not.toContainText('Invoice Lifecycle Test');
});
