# Pathology Lab Billing

A free static pathology billing application built with vanilla HTML, CSS and JavaScript.

## GitHub Pages deployment
1. Open repository **Settings → Pages**.
2. Under Build and deployment, choose **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`.
4. Save and wait for GitHub Pages to publish.
5. Visit https://shreebalaji767.github.io/Pathology-Lab-Billing/

## Features
- Editable laboratory name, subtitle, address, contact, registration, invoice title, prefix, footer, signatory and currency.
- Patient directory and invoice history.
- Editable pathology test catalogue and prices.
- Test packages.
- Referring doctor directory.
- Invoice creation, editing, search and payment recording.
- Daily collection summary and CSV export.
- Browser print / Save as PDF and 80mm thermal receipt layout.
- Code 39 barcode for invoice number.
- Full JSON backup and restore.
- Responsive desktop, tablet and mobile layout.

## Storage
All data is stored in the current browser's localStorage. There is no backend, hosted database, account, cloud sync, paid API or external service. Data does not synchronize between devices or browsers. Export backups regularly.

## Important
This is a lightweight local billing tool, not a complete laboratory information management system (LIMS). It does not handle test results, sample tracking, quality control or regulatory reporting. Protect the device and follow applicable patient privacy and record-retention requirements. Browser print is used for PDF creation; thermal output depends on the printer and browser.
