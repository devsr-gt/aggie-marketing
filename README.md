# Aggie Marketing
### Social Media Content That Converts — Built for Carson Valley Businesses

> We create scroll-stopping video content and social media strategy that turns local viewers into paying customers and builds brands that Carson Valley recognizes and trusts.

---

## The Mission

Most local businesses post content and hope something sticks. Aggie Marketing does it differently.

We build content with one purpose: **drive sales and build a brand people remember.** Every video, caption, and post we create is designed to move someone from stranger to customer — while making your business the name that comes to mind first in Carson Valley.

---

## What We Do

### Short-Form Video Content
Video is the highest-converting format on social media. We create content built to perform.
- Reels, TikToks, and Facebook Videos shot and edited for maximum retention
- Hook-driven storytelling that grabs attention in the first 2 seconds
- Every video ends with a clear call-to-action tied to a real business outcome (call, DM, visit, buy)
- Consistent posting cadence that keeps your brand in front of local customers daily

### Social Media Management
Your presence handled end-to-end so you can focus on your business.
- Platform strategy, scheduling, and publishing (Instagram, Facebook, TikTok)
- Community management — responding to comments and DMs to drive conversion
- Monthly analytics review: what's working, what's not, and what's next

### Brand Identity & Positioning
Before content converts, people have to recognize and trust you.
- Define your brand voice, visual style, and core message
- Position your business as the obvious choice in your category in Carson Valley
- Build a brand that's consistent across every post, story, and reel

---

## Who We Work With

Any local business in Carson Valley that wants more customers and a stronger brand.

- Restaurants, cafes, and food businesses
- Retail shops and boutiques
- Health, wellness, and fitness studios
- Contractors, trades, and home services
- Real estate professionals
- Service businesses of all kinds

If you're local and serious about growth — we're your team.

---

## How It Works

### 1. Discovery
We learn your business inside and out — your best customers, your biggest competitors, what makes you different, and what results you actually need from social media.

### 2. Content Strategy
We build a month-by-month content plan designed around two goals: **maximum visibility** and **direct conversion**. Every piece of content has a purpose before we ever hit record.

### 3. Create & Publish
We shoot, edit, caption, and post your content consistently. Professional quality, local feel, built for the algorithm and for real people scrolling in Carson Valley.

### 4. Measure & Optimize
We track the metrics that matter — views, watch-through rate, engagement, leads, and sales impact. Every month we refine the strategy based on what the data tells us.

---

## Goals

Content that gets views but not customers is just entertainment. These goals keep everything focused on the one outcome that matters: **growth.**

---

### Phase 1 — Build Visibility (Days 1–60)
Get the right people watching.

- [ ] Produce **3+ short-form videos per week** per client across Instagram, Facebook, and TikTok
- [ ] Hit **10,000 total video views** across client accounts within 60 days
- [ ] Achieve **50%+ average watch-through rate** on videos under 30 seconds
- [ ] Get at least **1 video per client per month to break 1,000 organic views**
- [ ] Test **3–5 different content hooks monthly** to find what stops the scroll in this market
- [ ] Feature Carson Valley locations, landmarks, and community moments to anchor content locally

**What drives this:** irresistible 2-second hooks, local authenticity, trending audio, and relentless consistency

---

### Phase 2 — Build Brand Recognition (Days 30–90)
Make your business the name people know.

- [ ] Maintain a **5%+ engagement rate** on all video content (likes, comments, shares, saves)
- [ ] Grow each client's audience by **100+ targeted local followers per month**
- [ ] Drive **10+ shares or saves per video** — the signals that tell the algorithm to push content further
- [ ] Publish **1 community-rooted video per month** that connects the brand to Carson Valley culture
- [ ] Develop a clear **visual and verbal brand identity** that makes every post instantly recognizable
- [ ] Establish the client as the trusted authority in their category through consistent, valuable content

**What drives this:** strong brand voice, community storytelling, cross-promotion with other local businesses, reply to every comment in the first hour

---

### Phase 3 — Convert Views Into Sales (Ongoing)
Turn attention into revenue.

- [ ] Achieve a **2%+ conversion rate** from video views to DMs, calls, or link-in-bio clicks
- [ ] Generate **5+ qualified leads per client per month** directly from social content
- [ ] Create **exclusive social-only offers** that give followers a direct reason to buy now
- [ ] Build **1 documented case study per client** tracking the full path from content → lead → sale
- [ ] Land **Aggie Marketing's first 3 clients** using this system as proof of concept
- [ ] Scale to **10 active monthly clients** by demonstrating measurable sales impact

**What drives this:** strong end-of-video CTAs, pinned lead-capture posts, DM automation, limited-time local offers

---

### North Star Metrics — Review Monthly

| Metric | Target |
|---|---|
| Total video views across all clients | 50,000+ / month |
| Average watch-through rate | 50%+ |
| Average engagement rate | 5%+ |
| Leads generated per client | 5+ / month |
| Client revenue attributed to content | Documented & growing |
| Client retention rate | 90%+ |

---

## Content Principles

Every piece of content we create is held to these standards:

1. **Hook first** — if the first 2 seconds don't stop the scroll, nothing else matters
2. **Local always** — Carson Valley people, places, and stories make content feel real and trustworthy
3. **One clear CTA** — every post tells the viewer exactly what to do next
4. **Consistency over perfection** — showing up daily beats one perfect post a month
5. **Data drives decisions** — we look at the numbers every month and adjust without ego

---

## Project Structure

```
aggie-marketing/
│
├── clients/                        # One folder per client
│   ├── README.md                   # Client index + onboarding instructions
│   └── _template/                  # Copy this for every new client
│       ├── 00-onboarding/          # Contacts, access, checklist
│       ├── 01-brand/               # Brand voice, visuals, audience, USP
│       ├── 02-strategy/            # Content pillars, hooks, CTAs, schedule
│       ├── 03-content-calendar/    # Month-by-month post planning
│       ├── 04-assets/              # raw/ → edited/ → posted/
│       ├── 05-analytics/           # Monthly metrics and learnings
│       └── 06-deliverables/        # Delivery log and case study material
│
├── categories/                     # Business-type playbooks (reusable)
│   ├── restaurants/
│   ├── retail/
│   ├── health-wellness/
│   ├── contractors/
│   └── real-estate/
│
├── _templates/                     # Reusable documents across all clients
│   ├── onboarding-questionnaire.md
│   └── monthly-report-template.md
│
└── internal/                       # Business operations (not client-facing)
    ├── processes/                  # SOPs: onboarding, content workflow, shoot day
    ├── finances/                   # Client billing, pricing, expenses
    └── tools/                      # Software and tools used
```

### Adding a New Client
Duplicate the template folder and rename it:
```bash
cp -r clients/_template clients/business-name
```
Then work through each numbered folder in order — onboarding → brand → strategy → content.

---

## Running This System

### First Time Setup

Clone the repo and open it in your editor:
```bash
git clone https://github.com/devsr-gt/aggie-marketing.git
cd aggie-marketing
```

---

### Starting the Web App (Docker — Recommended)

Docker runs the tool in a completely isolated container — it cannot read your home directory, cannot access your network, and is killed cleanly when you're done.

**One-time setup** — install [Docker Desktop](https://www.docker.com/products/docker-desktop/) then install the daily security check:

```bash
cd aggie-marketing
./scripts/install-daily-check.sh   # runs at 8 AM every day automatically
```

**Start the app** (runs a security check first, then launches the container):
```bash
./scripts/start.sh
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

**Stop it when you're done:**
```bash
./scripts/start.sh --stop
```

**Check logs if something looks wrong:**
```bash
docker compose logs -f
```

**Run the security check manually at any time:**
```bash
./scripts/security-check.sh
# or from the app folder:
# npm run security:check
```

Security logs are saved to `logs/security/YYYY-MM-DD.log`.

> The container only mounts `clients/`, `categories/`, and `_templates/` — nothing else on your Mac is visible to it. Port 3000 is bound to `127.0.0.1` only, so it's unreachable from other devices on your network.

---

### Releasing a New Version

Every meaningful change gets a version number so you can roll back if needed.

```bash
# Bug fix or small change
./scripts/version-and-push.sh patch    # 1.0.0 → 1.0.1

# New feature added
./scripts/version-and-push.sh minor    # 1.0.0 → 1.1.0

# Major rebuild or breaking change
./scripts/version-and-push.sh major    # 1.0.0 → 2.0.0
```

This automatically:
1. Bumps the version in `app/package.json`
2. Creates a git commit: `chore: release vX.X.X`
3. Creates a git tag: `vX.X.X`
4. Pushes the commit and tag to GitHub

You can also run from inside the `app/` folder:
```bash
cd app && npm run release:patch
```

---

### Starting a New Client

**Step 1 — Create the client folder**
```bash
cp -r clients/_template clients/business-name
```

**Step 2 — Send the onboarding questionnaire**
```bash
open _templates/onboarding-questionnaire.md
```
Fill in the client's name at the top, then send the content to the client via email or copy-paste.

**Step 3 — Pull the right category playbook**
```bash
open categories/restaurants/README.md
# or: retail / health-wellness / contractors / real-estate
```
Use this to inform the brand guide and strategy doc before the discovery call.

**Step 4 — Fill out client docs in order**
```bash
open clients/business-name/00-onboarding/README.md   # contacts + access
open clients/business-name/01-brand/README.md         # brand voice + audience
open clients/business-name/02-strategy/README.md      # pillars + hooks + CTAs
```

**Step 5 — Add the client to the index**
```bash
open clients/README.md
```
Add a row to the client table.

---

### Monthly Content Workflow

**Week 1 — Plan**
```bash
open clients/business-name/03-content-calendar/README.md
```
Create a new file for the month (e.g., `2026-05-may.md`) and fill out the content schedule.

**Week 2 — Shoot**

Capture all footage. Transfer raw files immediately:
```bash
open clients/business-name/04-assets/
# Drop footage into raw/
```

**Week 3 — Edit & Prepare**

Move finished files to `edited/` and rename using the convention:
```
YYYY-MM-DD_platform_format_description.mp4
# Example: 2026-05-10_IG_reel_spring-menu-launch.mp4
```

**Week 4 — Schedule, Report & Archive**
```bash
open clients/business-name/05-analytics/README.md       # log monthly metrics
open _templates/monthly-report-template.md               # write client report
```
Move posted content from `edited/` to `posted/` with the posted date in the filename.

---

### Checking the North Star Metrics

Open the analytics folder for any client and review against the targets in this README:

```bash
open clients/business-name/05-analytics/README.md
```

Target benchmarks (from the Goals section above):
- Video views: 50,000+ / month across all clients
- Watch-through rate: 50%+
- Engagement rate: 5%+
- Leads per client: 5+ / month

---

**Carson Valley, Nevada** — Gardnerville, Minden, Genoa, and surrounding communities.

---

## Get in Touch

Ready to turn your social media into a sales engine? Let's talk.

- **Email:** agata@agatareillycreative.com
- **Phone:** 310-277-1110

