# Carbon Footprint Tracker

**Hackathon ID:** `AZIS-B98TSA`

**Track:** Climate Tech — Carbon Footprint Tracker

A web application that helps users track their daily carbon footprint by logging activities, calculating CO₂ emissions, monitoring a weekly target, and reviewing their activity history.

No authentication or signup is required. All features are accessible directly from the application.

---

## Live Demo

- **App URL:** `PASTE_YOUR_DEPLOYED_URL_HERE`
- **Test Credentials:** Not applicable — no authentication is implemented.

---

## Standard API

**No — this application is designed to be graded through the user interface.**

The application does expose REST JSON endpoints internally for communication between the frontend and backend.

All five required features are accessible directly through the web UI without authentication.

---

## Features

### 1. Log an Activity

Users can record their daily activities by selecting an activity type, entering the quantity, and choosing a date.

Supported activities:

- Car travel
- Bus travel
- Flight
- Electricity
- Veg meal
- Non-veg meal

Example:

> Car travel → 10 km

---

### 2. Automatic CO₂ Calculation

The application automatically calculates the carbon footprint using the fixed emission factors provided in the hackathon brief.

| Activity | Factor |
|---|---:|
| Car travel | 0.20 kg CO₂ / km |
| Bus travel | 0.08 kg CO₂ / km |
| Flight | 0.25 kg CO₂ / km |
| Electricity | 0.80 kg CO₂ / kWh |
| Veg meal | 0.5 kg CO₂ / meal |
| Non-veg meal | 2.0 kg CO₂ / meal |

The calculated CO₂ value is stored with each activity.

---

### 3. Dashboard

The dashboard provides:

- Total CO₂ footprint for the current week
- Total all-time CO₂ footprint
- Per-category CO₂ breakdown
- Visual category bars
- Weekly progress information

---

### 4. Weekly Target

Users can set a weekly CO₂ target.

The application:

- Defines the week as Monday–Sunday
- Displays weekly progress
- Shows progress through the current day
- Flags the user when the weekly target is exceeded
- Provides a supportive nudge instead of blocking the user

Example:

> You're at 120% of your weekly target. Try swapping a car trip for a bus ride to bring it back down.

---

### 5. History & Filtering

Users can view their previously logged activities.

History can be filtered by:

- Activity type
- Start date
- End date

Users can also delete individual activity records.

---

## Decision Points

The application's design decisions are documented in [`DECISIONS.md`](DECISIONS.md).

### DP1 — The Nudge

When the weekly target is exceeded, the application displays a supportive warning and actionable suggestion rather than blocking the user or using a shaming message.

### DP2 — Absurd Input

Extremely large activity quantities are treated as suspicious rather than automatically rejected. The application asks the user to confirm the value and shows the estimated CO₂ impact before saving it.

### DP3 — The Week

The application defines a week as Monday through Sunday. Weekly progress is calculated from Monday through the current day, so future days do not affect the current progress.

---

## Tech Stack

### Backend

- Node.js
- Express.js

### Database

- SQLite
- better-sqlite3

The database is file-based and does not require a separate database server.

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

No frontend framework or build system is required.

---

## Project Structure

```text
carbon-tracker/
│
├── server.js
├── db.js
├── package.json
├── package-lock.json
├── README.md
├── DECISIONS.md
│
└── public/
    ├── index.html
    ├── style.css
    └── app.js