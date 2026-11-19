# Nadan POS

Offline-first shop sales and expense tracker with GST-inclusive quotations.
No account, no server: everything stays in the browser's localStorage on the device.

**Live:** https://pos.denelli.in/
Mirror: https://shamilhabeebnelli.github.io/nadan-pos/

## Features

- Log sales and expenses with category chips (TV, Fridge, AC, Mobile, Audio, Service, Other)
- Today's totals: sales, expenses, net, entry count
- Daily target with live progress bar
- 7-day sales vs expenses bar chart
- Full history grouped by day, with delete
- One-tap report text (WhatsApp-ready) and CSV export
- Quotation maker: staff and customer details, item rows with category and model, live 18% GST split, PDF download. Marked clearly as a quotation, not a tax invoice.
- Installable PWA, works fully offline after first load

## Tech

Plain HTML/CSS/JS, no dependencies. Quotation PDFs use pdfMake from a CDN,
so the first PDF download needs internet. Deployed to GitHub Pages by a
GitHub Actions workflow on every push.

Â© 2026 denelli Â· copyright strictly prohibited
