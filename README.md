# Lead Extractor — Facebook Ads & Google Maps

> Extract phone numbers, emails, WhatsApp links, and contact information from Facebook Ads Library and Google Maps automatically.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-blue?logo=express&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Chromium-blue?logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

**Keywords:** `facebook-ads-scraper` `google-maps-scraper` `lead-extraction` `phone-number-extractor` `email-extractor` `whatsapp-scraper` `web-scraping` `lead-generation` `playwright` `nodejs` `excel-export` `real-time` `automation` `marketing-tools` `sales-leads` `business-directory` `cold-calling`

---

A powerful web-based tool that scrapes **Facebook Ads Library** and **Google Maps** to extract business contact information including phone numbers, emails, WhatsApp links, and website URLs. It automatically crawls discovered websites to find additional contact details.

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
  - [Facebook Ads Scraper](#facebook-ads-scraper)
  - [Google Maps Scraper](#google-maps-scraper)
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
| Facebook Ads Scraping | Extract business names, websites, phone numbers, emails, WhatsApp links & CTAs from Facebook Ads Library |
| Google Maps Scraping | Search by country, city & business type — extract names, addresses, phones, emails, ratings & websites |
| Email Extraction | Automatically extracts emails from Facebook ads, Google Maps listings, and business websites |
| Website Crawling | Auto-visit 13+ contact pages (`/contact`, `/about`, `/support`, etc.) for extra phones & emails |
| Real-Time Progress | WebSocket-powered live updates with progress bar & stats |
| Excel Export | Download styled `.xlsx` files — one row per phone/email/WhatsApp link |
| Smart Phone Extraction | E.164 normalization with Somali number support (`+252` prefix) |
| Anti-Detection | Custom user agent, disabled automation flags, CSP bypass |
| Login Wall Handling | Pauses up to 6 minutes for manual Facebook/Google login if needed |
| Tab-Based Dashboard | Switch between Facebook Ads and Google Maps scrapers seamlessly |
| Session History | Browse and re-export past extraction sessions |
| Dark Theme UI | Clean Bootstrap 5 dashboard with sortable tables, search & pagination |
| Zero API Keys | No API keys or tokens needed — works with browser automation |

---

## Screenshots

> Dashboard with dark theme, tab-based layout, real-time progress bar, stats cards, and sortable data table.

```
+----------------------------------------------------------+
|  Lead Extractor — Facebook Ads & Google Maps    [Connected] |
|                                                          |
|  [ Facebook Ads Library ]  [ Google Maps ]               |
|                                                          |
|  Country: [Somalia]  City: [Mogadishu]                   |
|  Business Type: [Hospital      ]  [Search]               |
|                                                          |
|  ████████████████████████░░░░░░░  75%                    |
|  Visiting website 12/16: www.hospital.so                  |
|                                                          |
|  [47 Biz] [23 Phones] [15 Emails] [18 With Phones] [0 Err] |
|                                                          |
|  | Business    | Website      | Emails     | Phones  |.. |
|  | City Hosp   | hosp.so      | info@hosp  | +25261..|.. |
|  | General Hos| general.so   |            | +25263..|.. |
+----------------------------------------------------------+
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
│   ├── index.html                  # Dashboard UI with tabs (Facebook + Google Maps)
│   ├── css/
│   │   └── style.css               # Custom dark theme styles
│   └── js/
│       └── app.js                  # Frontend logic (tabs, WebSocket, table, filters)
│
├── src/
│   ├── config/
│   │   └── index.js                # Centralized configuration
│   ├── routes/
│   │   └── api.js                  # REST API route definitions
│   ├── controllers/
│   │   └── extractController.js    # Request handlers
│   ├── services/
│   │   ├── scraperService.js       # Main orchestrator (FB + Google Maps)
│   │   ├── facebookAdsScraper.js   # Facebook Ads Library scraper
│   │   ├── googleMapsScraper.js    # Google Maps business scraper
│   │   ├── websiteScraper.js       # Website crawler (phones + emails)
│   │   └── exportService.js        # Excel export generator
│   └── utils/
│       ├── emailExtractor.js       # Email extraction utility
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

### Facebook Ads Scraper

1. Go to the [Facebook Ads Library](https://www.facebook.com/ads/library/) in your browser
2. Search for ads by **country**, **category**, or **keyword** and copy the URL
3. Open the **Facebook Ads Library** tab in the dashboard
4. Paste the URL and click **Start Extraction**
5. Watch the real-time progress as the tool:
   - Scrolls through all ads in the library
   - Extracts business names, websites, phone numbers, emails, and WhatsApp links
   - Crawls discovered websites for additional contact information
6. View results in the sortable, searchable data table
7. Click **Export Excel** to download the structured `.xlsx` file

### Google Maps Scraper

1. Open the **Google Maps** tab in the dashboard
2. Fill in the search form:
   - **Country** (required) — e.g., `Somalia`, `UAE`, `USA`
   - **City / Region** (optional) — e.g., `Mogadishu`, `Dubai`
   - **Business Type** (required) — e.g., `Hospital`, `Restaurant`, `Hotel`
3. Click **Search**
4. Watch the real-time progress as the tool:
   - Opens Google Maps and searches for the business type
   - Scrolls through all results to load every listing
   - Clicks each business card to extract details (name, address, phone, website, rating)
   - Crawls business websites for emails and additional phone numbers
5. View results in the sortable, searchable data table
6. Click **Export Excel** to download the structured `.xlsx` file

### Example Workflow

```
Facebook Ads:
  1. Open Facebook Ads Library → Filter by Country: Somalia
  2. Copy the URL from browser
  3. Paste into dashboard → Click Start Extraction
  4. Wait 2-5 minutes
  5. Export Excel → Get leads with phones, emails, WhatsApp

Google Maps:
  1. Open Google Maps tab
  2. Country: Somalia, City: Mogadishu, Type: Hospital
  3. Click Search
  4. Wait 3-8 minutes
  5. Export Excel → Get hospital leads with phones, emails, ratings
```

---

## How It Works

### Facebook Ads Pipeline

**Step 1 — Facebook Ads Library Scraping (0-40%)**
- Launches a headless Chromium browser via Playwright
- Navigates to the provided Ads Library URL
- Handles popups and login walls (waits up to 6 minutes for manual login)
- Scrolls the page up to 300 times to load all ads
- Parses the full page text, splitting on "See ad details" markers
- For each ad block, extracts: business name, website URL, phone numbers, emails, WhatsApp links, CTA, Library ID
- Deduplicates by business name

**Step 2 — Website Crawling (40-95%)**
- Collects all unique website URLs from extracted ads
- Crawls in batches of 3 with retry logic (2 retries, exponential backoff)
- For each website, fetches: homepage + 13 common contact pages
- Extracts phone numbers from `tel:` links and page text
- Extracts emails from `mailto:` links and page text
- Discovers internal links containing contact-related keywords
- Follows up to 10 additional internal links per website

**Step 3 — Data Merging & Export (95-100%)**
- Merges phone numbers and emails from ad text and website crawling
- Deduplicates all contacts
- Displays results in the dashboard with real-time stats
- Generates a styled Excel file for download

### Google Maps Pipeline

**Step 1 — Maps Scraping (0-40%)**
- Launches a headless Chromium browser via Playwright
- Navigates to `google.com/maps/search/{businessType}+in+{city}+{country}`
- Handles cookie consent dialogs
- Scrolls the results feed (`div[role="feed"]`) to load all listings
- Clicks each business card to open the detail panel
- Extracts: business name, address, phone, website, rating, reviews, category, hours
- Deduplicates by business name

**Step 2 — Website Crawling (40-95%)**
- Same as Facebook pipeline — crawls each business website for emails and phones

**Step 3 — Data Merging & Export (95-100%)**
- Merges phones/emails from Google Maps listing and website crawling
- Displays results with address, rating, and review count
- Generates Excel with Google Maps-specific columns

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/extract` | Start Facebook Ads extraction |
| `POST` | `/api/extract/google` | Start Google Maps extraction |
| `GET` | `/api/status/:sessionId` | Get session status & results |
| `GET` | `/api/export/:sessionId` | Download Excel file |
| `GET` | `/api/sessions` | List recent sessions |

### POST /api/extract (Facebook Ads)

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=SO"}'
```

**Response:**
```json
{
  "sessionId": "lxk5f2m1",
  "status": "idle",
  "message": "Session created"
}
```

### POST /api/extract/google (Google Maps)

```bash
curl -X POST http://localhost:3000/api/extract/google \
  -H "Content-Type: application/json" \
  -d '{"country": "Somalia", "city": "Mogadishu", "businessType": "Hospital"}'
```

**Response:**
```json
{
  "sessionId": "lxk5f2m2",
  "status": "idle",
  "message": "Google Maps extraction started"
}
```

### WebSocket Messages

```json
{
  "type": "progress",
  "sessionId": "string",
  "step": "facebook | facebook_done | maps_scroll | maps_extract | maps_done | crawling | completed | error",
  "progress": 0,
  "message": "Description of current step",
  "totalBusinesses": 0,
  "totalPhones": 0,
  "totalEmails": 0,
  "results": []
}
```

---

## Output Format

### Dashboard Table — Facebook Ads

| Column | Description |
|--------|-------------|
| Business | Advertiser name from the Facebook ad |
| Page | Facebook page name |
| Website | External website URL |
| CTA | Call-to-action (Shop Now, Book Now, etc.) |
| Emails | Extracted email addresses |
| Phones | Extracted phone numbers (E.164 format) |
| WhatsApp | WhatsApp chat links |
| Status | Contact info availability |

### Dashboard Table — Google Maps

| Column | Description |
|--------|-------------|
| Business | Business name from Google Maps |
| Address | Physical address |
| Category | Business category |
| Website | Business website URL |
| Emails | Extracted email addresses |
| Phones | Extracted phone numbers (E.164 format) |
| WhatsApp | WhatsApp chat links |
| Rating | Star rating + review count |
| Status | Contact info availability |

### Excel Export — Facebook Ads

| Column | Description |
|--------|-------------|
| Business Name | Advertiser name |
| Page Name | Facebook page name |
| Website URL | External website |
| Email | One email per row |
| Phone Number | One phone per row |
| WhatsApp Link | One link per row |
| CTA | Call-to-action text |
| Ad Link | Direct link to the Facebook ad |

### Excel Export — Google Maps

| Column | Description |
|--------|-------------|
| Business Name | Business name |
| Address | Physical address |
| Category | Business category |
| Website URL | Business website |
| Email | One email per row |
| Phone Number | One phone per row |
| WhatsApp Link | One link per row |
| Rating | Star rating |
| Reviews | Review count |
| Hours | Business hours |

---

## Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| **Server** |||
| `PORT` | `3000` | Server port |
| **Facebook Ads Scraper** |||
| `FB_SCROLL_DELAY` | `2000` | Delay between scrolls (ms) |
| `FB_SCROLL_TIMEOUT` | `120000` | Total scroll timeout (ms) |
| `FB_MAX_SCROLLS` | `300` | Maximum scroll attempts |
| `FB_HEADLESS` | `true` | Run browser headless (`false` to see browser) |
| `FB_WAIT_AFTER_LOAD` | `6000` | Wait time after page load (ms) |
| **Google Maps Scraper** |||
| `GM_SCROLL_DELAY` | `2000` | Delay between scrolls (ms) |
| `GM_MAX_SCROLLS` | `200` | Maximum scroll attempts |
| `GM_HEADLESS` | `true` | Run browser headless (`false` to see browser) |
| `GM_WAIT_AFTER_LOAD` | `5000` | Wait time after page load (ms) |
| `GM_MAX_CONCURRENT` | `3` | Max concurrent website crawls |
| `GM_MAX_RETRIES` | `2` | Retry count for failed crawls |
| **Website Crawler** |||
| `CRAWL_TIMEOUT` | `20000` | HTTP request timeout per page (ms) |
| `CRAWL_MAX_CONCURRENT` | `3` | Max concurrent website crawls |
| `CRAWL_MAX_RETRIES` | `2` | Retry count for failed crawls |
| `CRAWL_MAX_LINKS` | `25` | Max pages to crawl per website |

---

## Use Cases

- **Lead Generation** — Collect phone numbers, emails of businesses from Facebook ads or Google Maps
- **Market Research** — Analyze competitors' advertising activity and contact information
- **Sales Prospecting** — Build contact lists of potential clients by industry and region
- **WhatsApp Marketing** — Extract WhatsApp-enabled businesses for direct messaging campaigns
- **Email Marketing** — Build email lists from business websites for outreach campaigns
- **Business Directory** — Create databases of businesses in specific countries or categories
- **Cold Calling** — Get phone numbers of businesses running Facebook ads or listed on Google Maps
- **Freelancer Tools** — Find clients who are actively spending on Facebook advertising

---

## FAQ

**Q: Do I need any API keys?**
A: No. This tool uses browser automation (Playwright) for both Facebook Ads Library and Google Maps. No API keys or tokens required.

**Q: Does Google Maps scraping require login?**
A: Sometimes Google may show a login wall. The tool handles this by pausing and waiting for you to log in manually (up to 6 minutes).

**Q: How does email extraction work?**
A: Emails are extracted from three sources: (1) Facebook ad text, (2) Google Maps business pages, and (3) business websites (from `mailto:` links and page text).

**Q: What countries are supported?**
A: Any country supported by Facebook Ads Library and Google Maps. For Google Maps, just enter the country name in the search form.

**Q: How long does extraction take?**
A: Facebook Ads: typically 2-5 minutes. Google Maps: typically 3-8 minutes depending on the number of results. Website crawling adds additional time.

**Q: Can I customize the crawl paths?**
A: Yes. Edit the `CONTACT_PATHS` array in `src/utils/urlUtils.js` to add or remove website paths to check.

**Q: Is the data saved between sessions?**
A: No. Sessions are stored in memory and lost on server restart. Export your results to Excel before stopping the server.

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

`facebook-ads-scraper` `google-maps-scraper` `lead-extraction` `phone-number-extractor` `email-extractor` `whatsapp-scraper` `web-scraping` `lead-generation` `facebook-ads-library` `google-maps` `contact-extractor` `playwright-scraper` `nodejs-scraper` `excel-export` `real-time-progress` `automation-tool` `marketing-automation` `sales-leads` `business-leads` `cold-calling` `outreach-tool` `digital-marketing` `africa-business` `somalia` `dubai` `uae-business` `scraping-tool` `data-extraction` `email-marketing`
