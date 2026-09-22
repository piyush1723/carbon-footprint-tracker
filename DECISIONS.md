# Decision Points

## DP1 · The nudge

**Choice: Encourage, never block or shame.**

When the weekly target is crossed, the dashboard shows a persistent (but dismiss-free, non-blocking) banner stating the percentage over target and 1–2 concrete, low-effort suggestions (e.g. "swap a car trip for the bus"), rather than a warning icon alone or a guilt-driven message. Logging remains fully functional regardless of how far over target the user is.

We chose this because the app's goal is accurate, sustained self-tracking — blocking actions (like refusing to log further activities) punishes the very behavior the app depends on and would push users to simply stop logging or under-report. Shaming language is known to reduce engagement and can make people disengage entirely rather than change behavior. A calm, informative nudge with a specific next action keeps the user in the app and gives them agency, which is more likely to produce a real behavior change over an underestimate-and-avoid pattern.

## DP2 · Absurd input

**Choice: Flag and require confirmation, don't silently reject or silently accept.**

Each activity type has a sanity ceiling (e.g. car/bus > 1,000 km/day, flight > 20,000 km/day, electricity > 500 kWh/day, meals > 10/day). If a submitted quantity exceeds that ceiling, the entry is **not saved immediately** — the API responds with `needsConfirmation: true` and a human-readable message, the UI shows a confirmation modal, and only a second, explicitly confirmed submission (`confirm: true`) saves the entry. Confirmed outlier entries are still saved but marked `flagged` and shown with a visible badge in history.

We chose this over a hard reject because some large numbers are real (a long-haul flight can legitimately be 15,000+ km), and silently discarding user input is bad UX and hides genuine data. We chose this over silent acceptance because unchecked, an obvious typo (500,000 km by car) would badly distort the dashboard and weekly target math. Requiring one extra confirmation click catches most fat-finger errors while still letting genuine edge cases through, and keeping a `flagged` marker preserves transparency about which numbers were unusual.

## DP3 · The week

**Choice: Calendar week, Monday–Sunday. Mid-week progress shown as a 7-segment day bar filled up to today.**

The dashboard's weekly total is always calculated for the current Monday–Sunday window, and a horizontal bar with one segment per day of the week is filled in up to (and highlighting) the current day, alongside the numeric progress-vs-target percentage.

We chose Monday–Sunday because it's the most common calendar-week convention and requires no extra explanation to the user (versus a rolling 7-day window, which is more "accurate" moment-to-moment but harder to reason about — "why did Tuesday's number change because of what I logged last Tuesday?"). We show mid-week progress as filled day-segments rather than just a raw number so a user glancing at the dashboard on, say, Wednesday immediately understands they're at "3/7 days in" and can mentally pace their remaining budget, rather than only seeing an isolated percentage with no time context.
