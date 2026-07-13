# Facebook Ads Lead Extractor

> Extract phone numbers, WhatsApp links, and contact information from Facebook Ads Library automatically.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-blue?logo=express&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Chromium-blue?logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

**Keywords:** `facebook-ads-scraper` `lead-extraction` `phone-number-extractor` `whatsapp-scraper` `web-scraping` `lead-generation` `facebook-ads-library` `contact-extractor` `playwright` `nodejs` `excel-export` `real-time` `automation` `marketing-tools` `sales-leads` `business-directory` `somalia` `africa`

---

A powerful web-based tool that scrapes the [Facebook Ads Library](https://www.facebook.com/ads/library/) to extract business contact information including phone numbers, WhatsApp links, and website URLs. It automatically crawls discovered websites to find additional contact details.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Output Format](#output-format)
- [Configuration](#configuration)
- [Use Cases](#use-cases)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| Facebook Ads Scraping | Extract business names, websites, phone numbers, WhatsApp links & CTAs from Facebook Ads Library |
| Website Crawling | Auto-visit 13+ contact pages (`/contact`, `/about`, `/support`, etc.) for extra phone numbers |
| Real-Time Progress | WebSocket-powered live updates with progress bar & stats |
| Excel Export | Download styled `.xlsx` files — one row per phone/WhatsApp link |
| Smart Phone Extraction | E.164 normalization with Somali number support (`+252` prefix) |
| Anti-Detection | Custom user agent, disabled automation flags, CSP bypass |
| Login Wall Handling | Pauses up to 6 minutes for manual Facebook login if needed |
| Session History | Browse and re-export past extraction sessions |
| Dark Theme UI | Clean Bootstrap 5 dashboard with sortable tables, search & pagination |
| Zero API Keys | No Facebook API keys or tokens needed — works with browser automation |

---

## Screenshots

> Dashboard with dark theme, real-time progress bar, stats cards, and sortable data table.

```
+--------------------------------------------------+
|  Facebook Ads Lead Extractor                     |
|  [Enter Facebook Ads Library URL...]  [Extract]  |
|  ████████████████████░░░░░░░  72%                |
|  Scrolling Facebook Ads Library...               |
|                                                  |
|  [47 Businesses] [23 Phones] [18 With Phones]    |
|                                                  |
|  | Business      | Phone        | WhatsApp | ... |
|  | Shop Somalia  | +25261123... | wa.me/.. | ... |
|  | Dubai Mall    | +97150123... |          | ... |
+--------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Server** | Express 5 |
| **Real-Time** | WebSocket (`ws`) |
| **Browser Automation** | Playwright (Chromium) |
| **HTTP Client** | Axios |
| **HTML Parsing** | Cheerio |
| **Phone Validation** | libphonenumber-js |
| **Excel Generation** | ExcelJS |
| **Frontend** | HTML5, Bootstrap 5, Vanilla JS |
| **Config** | dotenv |

---

## Project Structure

```
facebook-library-scrapper/
├── server.js                       # Entry point — Express + WebSocket server
├── package.json                    # Dependencies and scripts
├── .env                            # Environment configuration
├── .gitignore
│
├── public/                         # Frontend (static files)
│   ├── index.html                  # Dashboard UI (Bootstrap 5 dark theme)
│   ├── css/
│   │   └── style.css               # Custom dark theme styles
│   └── js/
│       └── app.js                  # Frontend logic (WebSocket, table, filters)
│
├── src/
│   ├── config/
│   │   └── index.js                # Centralized configuration
│   ├── routes/
│   │   └── api.js                  # REST API route definitions
│   ├── controllers/
│   │   └── extractController.js    # Request handlers
│   ├── services/
│   │   ├── scraperService.js       # Main orchestrator
│   │   ├── facebookAdsScraper.js   # Facebook Ads Library scraper
│   │   ├── websiteScraper.js       # Website crawler
│   │   └── exportService.js        # Excel export generator
│   └── utils/
│       ├── phoneExtractor.js       # Phone & WhatsApp extraction logic
│       ├── urlUtils.js             # URL normalization utilities
│       └── validators.js           # Input validation
│
└── temp/                           # Exported files & debug screenshots
    ├── leads-*.xlsx
    └── debug/
```

---

## Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **Chromium** (auto-installed via Playwright during `npm install`)

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jubba02020202-tech/facebook-library-scrapper.git
   cd facebook-library-scrapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   > Chromium will be installed automatically via Playwright's `postinstall` hook.

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open the dashboard**
   ```
   http://localhost:3000
   ```

---

## Quick Start

```bash
git clone https://github.com/jubba02020202-tech/facebook-library-scrapper.git
cd facebook-library-scrapper
npm install
npm start
# Open http://localhost:3000
```

---

## Usage

1. Go to the [Facebook Ads Library](https://www.facebook.com/ads/library/) in your browser
2. Search for ads by **country**, **category**, or **keyword** and copy the URL
3. Paste the URL into the dashboard input field and click **Extract**
4. Watch the real-time progress as the tool:
   - Scrolls through all ads in the library
   - Extracts business names, websites, phone numbers, and WhatsApp links
   - Crawls discovered websites for additional contact information
5. View results in the sortable, searchable data table
6. Click **Export Excel** to download the structured `.xlsx` file

### Example Workflow

```
1. Open Facebook Ads Library → Filter by Country: Somalia
2. Copy the URL from browser
3. Paste into dashboard → Click Extract
4. Wait 2-5 minutes (depends on number of ads)
5. Export Excel → Get leads with phone numbers
6. Use for cold calling, WhatsApp marketing, outreach
```

---

## How It Works

### Step 1 — Facebook Ads Library Scraping (0-40%)

- Launches a headless Chromium browser via Playwright
- Navigates to the provided Ads Library URL
- Handles popups and login walls (waits up to 6 minutes for manual login)
- Scrolls the page up to 300 times to load all ads
- Parses the full page text, splitting on "See ad details" markers
- For each ad block, extracts:
  - Business name (text before "Sponsored")
  - Website URL (excluding Facebook/WhatsApp domains)
  - Phone numbers (regex + E.164 normalization)
  - WhatsApp links (`wa.me` / `whatsapp.com`)
  - Call-to-action button text
  - Library ID (for constructing the ad detail link)
- Deduplicates by business name

### Step 2 — Website Crawling (40-95%)

- Collects all unique website URLs from extracted ads
- Crawls in batches of 3 with retry logic (2 retries, exponential backoff)
- For each website, fetches:
  - The homepage
  - 13 common contact paths (`/contact`, `/about`, `/support`, `/help`, `/location`, `/store`, etc.)
- Extracts phone numbers from `tel:` links and page text
- Discovers internal links containing contact-related keywords
- Follows up to 10 additional internal links per website

### Step 3 — Data Merging & Export (95-100%)

- Merges phone numbers from Facebook ad text and website crawling
- Deduplicates all phone numbers
- Displays results in the dashboard with real-time stats
- Generates a styled Excel file for download

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/extract` | Start extraction |
| `GET` | `/api/status/:sessionId` | Get session status & results |
| `GET` | `/api/export/:sessionId` | Download Excel file |
| `GET` | `/api/sessions` | List recent sessions |

### POST /api/extract

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=SO"}'
```

**Response:**
```json
{
  "sessionId": "1720000000000",
  "status": "started",
  "message": "Extraction started"
}
```

### WebSocket Messages

```json
{
  "type": "progress",
  "sessionId": "string",
  "step": "facebook | facebook_done | crawling | completed | error",
  "progress": 0,
  "message": "Description of current step",
  "adsFound": 0,
  "totalBusinesses": 0,
  "totalPhones": 0,
  "results": []
}
```

---

## Output Format

### Dashboard Table

| Column | Description |
|--------|-------------|
| Business | Advertiser name from the Facebook ad |
| Page | Facebook page name |
| Website | External website URL |
| CTA | Call-to-action (Shop Now, Book Now, etc.) |
| Phones | Extracted phone numbers (E.164 format) |
| WhatsApp | WhatsApp chat links |
| Status | Contact info availability |

### Excel Export

| Column | Description |
|--------|-------------|
| Business Name | Advertiser name |
| Page Name | Facebook page name |
| Website URL | External website |
| Phone Number | One phone per row |
| WhatsApp Link | One link per row |
| CTA | Call-to-action text |
| Ad Link | Direct link to the Facebook ad |

---

## Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `FB_SCROLL_DELAY` | `2000` | Delay between scrolls (ms) |
| `FB_SCROLL_TIMEOUT` | `120000` | Total scroll timeout (ms) |
| `FB_MAX_SCROLLS` | `300` | Maximum scroll attempts |
| `FB_HEADLESS` | `true` | Run browser headless (`false` to see browser) |
| `FB_WAIT_AFTER_LOAD` | `6000` | Wait time after page load (ms) |
| `CRAWL_TIMEOUT` | `20000` | HTTP request timeout per page (ms) |
| `CRAWL_MAX_CONCURRENT` | `3` | Max concurrent website crawls |
| `CRAWL_MAX_RETRIES` | `2` | Retry count for failed crawls |
| `CRAWL_MAX_LINKS` | `25` | Max pages to crawl per website |

---

## Use Cases

- **Lead Generation** — Collect phone numbers of businesses running Facebook ads for cold outreach
- **Market Research** — Analyze competitors' advertising activity and contact information
- **Sales Prospecting** — Build contact lists of potential clients by industry and region
- **WhatsApp Marketing** — Extract WhatsApp-enabled businesses for direct messaging campaigns
- **Business Directory** — Create databases of businesses in specific countries or categories
- **Freelancer Tools** — Find clients who are actively spending on Facebook advertising

---

## FAQ

**Q: Do I need a Facebook API key?**
A: No. This tool uses browser automation (Playwright) to scrape the publicly accessible Facebook Ads Library. No API keys or tokens required.

**Q: Does it work with private Facebook pages?**
A: It works with any ads that appear in the Facebook Ads Library, which is publicly accessible regardless of page privacy settings.

**Q: What countries are supported?**
A: Any country supported by Facebook Ads Library. Just filter by country in the URL.

**Q: How long does extraction take?**
A: Depends on the number of ads. Typically 2-5 minutes for most searches. The tool scrolls automatically to load all results.

**Q: Can I customize the crawl paths?**
A: Yes. Edit the `CONTACT_PATHS` array in `src/utils/urlUtils.js` to add or remove website paths to check.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Support

If you find this project useful, please give it a star on GitHub — it helps others discover it!

- Open an [Issue](https://github.com/jubba02020202-tech/facebook-library-scrapper/issues) for bug reports
- Submit a [Pull Request](https://github.com/jubba02020202-tech/facebook-library-scrapper/pulls) for improvements

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Topics / Tags

`facebook-ads-scraper` `lead-extraction` `phone-number-extractor` `whatsapp-scraper` `web-scraping` `lead-generation` `facebook-ads-library` `contact-extractor` `playwright-scraper` `nodejs-scraper` `excel-export` `real-time-progress` `automation-tool` `marketing-automation` `sales-leads` `business-leads` `cold-calling` `outreach-tool` `digital-marketing` `africa-business` `somalia` `dubai` `uae-business` `scraping-tool` `data-extraction`
