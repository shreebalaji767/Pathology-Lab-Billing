# Pathology Lab Invoice Generator

A free, professional, invoice-only billing application built with vanilla HTML, CSS and JavaScript for GitHub Pages.

## Deploy
1. Open **Settings → Pages** in this repository.
2. Select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`.
4. Save, then visit https://shreebalaji767.github.io/Pathology-Lab-Billing/.

## Invoice and billing features
- Editable laboratory identity, address, contact details, registration, invoice title, prefix, sequence, currency and footer.
- Patient details and referring-doctor selection.
- Test catalogue and configurable packages.
- Multiple invoice line items, quantities, rates, discounts and additional charges.
- Automatic totals, amount received and outstanding balance.
- Unique invoice numbering that checks existing invoice numbers.
- Invoice history with patient / invoice search and date filters.
- Partial payments with a dated payment history, method and reference note.
- Invoice cancellation with a required reason; cancelled records remain in history and are excluded from daily collection totals.
- A4 browser printing / Save as PDF and 80mm thermal receipt layout.
- Barcode on the invoice.
- Daily collection summary and CSV export.
- JSON backup and restore.
- Responsive desktop, tablet and mobile layout.

## Storage and privacy
All records are stored in the current browser's localStorage. No backend, database, cloud sync, paid API, account or external service is used. Data does not synchronize between browsers or devices. Export backups regularly and protect access to the device.

## Scope
This repository is for invoice generation and billing only. It is not a laboratory information management system and does not manage samples, test results or clinical report approval. Browser storage is not a secure multi-user medical-record system. Validate local legal, accounting and privacy requirements before operational use.
