# BigQuery Release Notes Explorer 🚀

A modern, premium web application built with **Python Flask** and **Vanilla HTML, JavaScript, and CSS** that fetches, parses, indexes, and shares Google BigQuery release notes.

This application splits daily releases into individual granular notes (Features, Issues, Changes, Deprecations) and offers robust filters, real-time search, a stats dashboard, theme switching, and tools to tweet summaries to X (Twitter).

---

## 🌟 Key Features

* **Granular Feed Parsing**: Downloads the official [Google Cloud BigQuery XML feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) and splits composite entries by `<h3>` tags, exposing individual updates.
* **Server Caching**: Features a built-in server-side cache with a **5-minute TTL** to ensure fast load times and minimize traffic to Google's feeds.
* **Dashboard Stats**: Displays live metrics (total, features, issues, others) that double as quick filters for the feed.
* **Advanced Client-Side Filtering**: Supports interactive search, sorting (Newest/Oldest first), and tab filters.
* **Single & Combined Tweeting**:
  * **Card Action**: Share any single release note.
  * **Bulk Selection**: Select multiple release notes using checkboxes to create a bulleted summary tweet.
  * **Composer Modal**: An interactive modal to preview/edit the tweet text, view a live character count (with a 280-character budget validation), and post via Twitter/X Web Intent.
* **Premium UI**: Adaptive Light/Dark modes, glassmorphic styles, responsive timeline layout, and shimmer loading skeletons.

---

## 📁 Project Structure

```
bq-releases-notes/
├── .venv/                     # Python Virtual Environment
├── .gitignore                 # Files excluded from git
├── requirements.txt           # Python backend dependencies
├── app.py                     # Flask backend server & parsing script
├── README.md                  # Project documentation (this file)
├── templates/
│   └── index.html             # Main interface layout
└── static/
    ├── css/
    │   └── style.css          # Design system & styles (light/dark themes)
    └── js/
        └── app.js             # Reactivity, state management, & sharing logic
```

---

## 🛠️ Tech Stack

* **Backend**: Python 3.11+, Flask 3.x, BeautifulSoup 4.x, Requests 2.x
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom variables, Keyframes), Vanilla ES6 JavaScript
* **Authentication & Tooling**: Git, GitHub CLI (`gh`), Homebrew

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and navigate to the project directory:
```bash
git clone https://github.com/TimurMZh/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Setup Virtual Environment
Create a virtual environment and install dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Running Locally
Start the Flask development server:
```bash
python app.py
```
By default, the server runs on: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 📡 API Endpoints

### `GET /api/releases`
Fetches and returns the parsed list of release notes.

* **Query Parameters**:
  * `refresh` (string): Set to `true` to force a cache bypass and fetch the newest notes directly from Google.
* **Response Format**:
  ```json
  {
    "success": true,
    "count": 68,
    "last_fetched": 1718568600.0,
    "data": [
      {
        "id": "tag:google.com,2016:bigquery-release-notes#June_15_2026#0",
        "date": "June 15, 2026",
        "updated": "2026-06-15T00:00:00-07:00",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
        "type": "Feature",
        "html": "<p>Use Gemini Cloud Assist...</p>",
        "text": "Use Gemini Cloud Assist to analyze your SQL queries..."
      }
    ]
  }
  ```

---

## 💻 How to Use the UI

1. **Category Tabs & Metrics**: Click any statistic card (e.g. "Features" or "Issues") or use the navigation pills to filter the notes.
2. **Search Bar**: Type any phrase to instantly filter notes by keyword, date, or category.
3. **Theme Switch**: Click the top-right button (Sun/Moon icon) to switch between Dark and Light mode.
4. **Refreshing**: Click the **Refresh** button next to the theme toggle. A loading skeleton will appear, and the server will query Google's feed for the latest updates.
5. **Tweeting**:
   * **Individual**: Click the **Tweet** button at the bottom of any card.
   * **Multiple**: Check the boxes on multiple cards. A bar will slide up from the bottom showing `Tweet Combined Summary`.
   * **Posting**: Review and customize the text in the modal. Make sure the count is under **280 characters** (indicated in green), and click **Post to X / Twitter** to open X's draft page.
