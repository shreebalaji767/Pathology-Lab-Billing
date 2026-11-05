# Pathology Lab Billing

A free, browser-based pathology laboratory billing and invoice management application. It is built with **vanilla HTML, CSS and JavaScript** and can be hosted as a static website with GitHub Pages.

- **Live application:** https://shreebalaji767.github.io/Pathology-Lab-Billing/
- **Source repository:** https://github.com/shreebalaji767/Pathology-Lab-Billing
- **Default branch:** `main`

## Contents

- [Overview](#overview)
- [Features](#features)
- [Getting started](#getting-started)
- [GitHub Pages deployment](#github-pages-deployment)
- [Data storage, backups and privacy](#data-storage-backups-and-privacy)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Limitations and safe use](#limitations-and-safe-use)
- [Troubleshooting](#troubleshooting)

## Overview

The application helps a laboratory maintain patient and billing information, configure tests and packages, create invoices, record payments, and review financial activity from a browser. It is designed for static hosting: there is no application server or database service to provision.

## Features

### Laboratory setup and catalogues
- Editable laboratory identity, address, contact details, registration details, invoice title, invoice prefix, numbering sequence, currency and footer.
- Patient records and referring-doctor details.
- Configurable test catalogue and test packages.

### Invoices and collections
- Create invoices with multiple test or service line items.
- Quantities, rates, discounts, additional charges and automatically calculated totals.
- Amount received, outstanding balance and partial-payment history.
- Searchable invoice history and date/status filtering.
- Invoice cancellation with a reason; cancelled invoices remain in history.
- Print-friendly A4 invoices, browser Save as PDF and 80 mm thermal receipt layout.
- Invoice barcode support.

### Billing and accounts
- Payment records with date, method, reference and cashier/operator details.
- Patient/customer ledger and account statements.
- Advance deposits, refunds and credit notes.
- Corporate/customer accounts and configurable price lists and discount limits.
- Quotations and conversion of quotations into invoices.
- Cash register sessions, cash entries and expense records.
- Financial summaries, reports, CSV exports and audit history.
- Accounting-period locking.

### Record recovery and data portability
- Soft deletion and a recycle-bin workflow for supported records.
- Restore soft-deleted records; permanent deletion is a separate action for records in the recycle bin.
- JSON backup and restore.
- CSV export for supported billing and accounting data.

### User experience
- Responsive layout for desktop, tablet and mobile screens.
- Browser-based printing; no separate desktop installation is required.

> Available actions can vary by record type and screen. Review the interface and verify the workflow with sample data before using it operationally.

## Getting started

### Use the hosted application

Open the [Pathology Lab Billing application](https://shreebalaji767.github.io/Pathology-Lab-Billing/) in a modern browser.

### Run locally

No build step or application server is required for the static app.

1. Clone the repository:
   ```bash
   git clone https://github.com/shreebalaji767/Pathology-Lab-Billing.git
   cd Pathology-Lab-Billing
   ```
2. Open `index.html` in a modern browser, or serve the folder with any static file server.
3. Enter sample laboratory details and create test records and invoices to explore the workflow.

For local end-to-end tests, install the development dependency as described under [Testing](#testing).

## GitHub Pages deployment

This repository is intended for GitHub Pages deployment from the root of `main`.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**.
4. Save the settings and wait for the Pages deployment workflow to complete.
5. Open https://shreebalaji767.github.io/Pathology-Lab-Billing/.

The repository also contains a GitHub Actions workflow for browser tests. Check the **Actions** tab for the latest test and deployment results.

## Data storage, backups and privacy

- Application records are stored in the browser's **localStorage** on the device and browser where the app is used.
- There is no hosted application database, cloud synchronization or automatic transfer of records between devices.
- Clearing browser data, using a different browser/profile, or losing access to the device can make locally stored records unavailable.
- Export JSON backups regularly and store backup copies securely in a separate location.
- Test the restore process with a backup copy before relying on it.
- CSV exports are useful for supported tabular records; use a full JSON backup for application-data portability.

**Patient and financial records are sensitive.** Restrict access to the device and browser profile, use device-level security, and protect exported backups. Do not place real patient data in public issues, screenshots, test fixtures or source-control commits.

## Testing

The repository uses Playwright for end-to-end browser tests.

Requirements: a supported Node.js installation and npm.

```bash
npm install
npx playwright install
npm run test:e2e
```

The test command is configured in `package.json` and runs the suite in `tests/`. CI results are available in the repository's **Actions** tab.

A passing syntax check or CI run does not replace operational validation. Before using the app with real records, test invoice creation, partial payments, printing, backup/restore, soft delete, restore and permanent deletion using non-production sample data.

## Project structure

```text
.
├── .github/
│   └── workflows/
│       └── invoice-tests.yml
├── tests/
│   └── billing.spec.js
├── favicon.svg
├── index.html
├── package.json
├── playwright.config.js
└── README.md
```

The main application interface and client-side logic are currently contained in `index.html`.

## Limitations and safe use

- This is a **billing and invoice utility**, not a full laboratory information management system (LIMS).
- It does not replace validated laboratory equipment interfaces, sample tracking, clinical result verification, report authorization or medical record systems.
- Browser localStorage is not a secure, centralized, multi-user medical-record database. It does not provide server-side access control, role enforcement across devices, centralized audit guarantees or managed disaster recovery.
- Printing and PDF output depend on the browser and printer configuration.
- The project does not itself establish compliance with local medical, privacy, tax or accounting regulations. The laboratory is responsible for reviewing applicable requirements and validating its own workflows.

Use realistic operational controls and obtain appropriate professional review before relying on this software for business-critical or patient-related records.

## Troubleshooting

- **Changes do not appear after deployment:** wait for the latest Pages workflow to finish, then hard-refresh the browser (`Ctrl + Shift + R`).
- **Records appear missing:** check that you are using the same browser and browser profile where the records were entered. Restore from a known-good JSON backup if needed.
- **Printing is misaligned:** check the browser print preview, paper size, margins and printer settings.
- **Tests fail locally:** install dependencies with `npm install`, install the Playwright browser with `npx playwright install`, then rerun `npm run test:e2e`.

## License

No license terms are stated here. Unless a license file is added to the repository, do not assume that the source code is licensed for reuse or redistribution.
