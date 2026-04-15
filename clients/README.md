# Clients

This folder holds everything for every client. Each client gets their own folder with the same set of sub-folders inside — so the system always works the same way no matter who the client is.

---

## Client Index

Add one row here for every client you sign. This table is your at-a-glance dashboard.

| Client Name | Category | Start Date | Status | Monthly Rate | Folder |
|---|---|---|---|---|---|
| _(example) Valley Burger Co._ | Restaurant | 2026-05-01 | Active | $1,200 | `clients/valley-burger-co/` |

**Status options:** Active · Paused · Churned

---

## Starting With a New Client — Step by Step

> If you've never done this before, follow every step below in order. Don't skip ahead.

---

### Step 1 — Create the client's folder

Open your Terminal (on Mac, press `Command + Space`, type `Terminal`, hit Enter).

Copy and paste this command, but replace `business-name` with the client's actual business name — all lowercase, words separated by hyphens (dashes), no spaces:

```bash
cp -r clients/_template clients/business-name
```

**Example:**
```bash
cp -r clients/_template clients/valley-burger-co
```

> What this does: it copies the blank template folder and creates a fresh version for your new client. You now have all the right folders ready to fill in.

---

### Step 2 — Send the client their questionnaire

Before your discovery call, send the client the questionnaire so they come prepared.

Open it here:
```
_templates/onboarding-questionnaire.md
```

Copy the questions and paste them into an email, Google Doc, or however you communicate with the client. Ask them to fill it out before your first call.

> This gives you all the info you need to build their brand guide and content plan.

---

### Step 3 — Fill out the onboarding doc

After the client responds or you complete your discovery call, open:
```
clients/business-name/00-onboarding/README.md
```

Fill in:
- Their name, contact info, and who to reach day-to-day
- Their social media usernames and how you'll access them (login or admin)
- Check off the onboarding checklist as you complete each task

> Don't move to the next step until you have account access.

---

### Step 4 — Build the brand guide

Open:
```
clients/business-name/01-brand/README.md
```

Fill this in based on the questionnaire answers and discovery call. This is the most important document — it defines how every piece of content will look and sound.

Key things to fill out:
- Brand voice (how they talk — casual? professional? bold?)
- Who their ideal customer is
- What makes them different from competitors
- Colors, fonts, and logo info

> You'll refer back to this every time you write a caption or plan a video.

---

### Step 5 — Build the content strategy

Open:
```
clients/business-name/02-strategy/README.md
```

This is where you decide:
- Which platforms to post on and how often
- What 3–5 content themes (pillars) you'll rotate through
- What hooks and CTAs work for this type of business

> Not sure what to put here? Open the matching category playbook first:
> ```
> categories/restaurants/README.md
> categories/retail/README.md
> categories/health-wellness/README.md
> categories/contractors/README.md
> categories/real-estate/README.md
> ```
> Each one has proven hooks, CTAs, and content ideas for that business type.

---

### Step 6 — Plan the first month of content

Open:
```
clients/business-name/03-content-calendar/README.md
```

Create a posting plan for the month. Fill in each row with:
- What date it posts
- Which platform (Instagram, Facebook, TikTok)
- What format (Reel, photo, Story)
- The hook and caption idea
- The CTA at the end
- Status (Idea → Scripted → Shot → Edited → Scheduled → Posted)

---

### Step 7 — Add the client to the index

Come back to this file and add a row to the Client Index table at the top with the client's name, category, start date, and monthly rate.

---

## What's Inside Every Client Folder

When you open any client's folder, you'll see these sub-folders. Here's what each one is for:

| Folder | What Goes Here |
|---|---|
| `00-onboarding/` | Contacts, social media logins, signed contract status |
| `01-brand/` | Brand voice, audience, colors, competitor notes |
| `02-strategy/` | Content pillars, hooks, CTAs, weekly posting schedule |
| `03-content-calendar/` | Month-by-month plan of every post |
| `04-assets/` | All video and photo files — raw → edited → posted |
| `05-analytics/` | Monthly numbers and what you learned from them |
| `06-deliverables/` | Log of everything delivered + case study notes |

**Always work through them in number order** — each one builds on the one before it.

---

## Common Questions

**Q: What's the `_template` folder?**
It's the blank master copy. Never fill it in. Always copy it first.

**Q: What format should the folder name be in?**
All lowercase, words separated by hyphens, no spaces or special characters.
- `valley-burger-co` ✓
- `Valley Burger Co` ✗
- `valley_burger_co` ✗

**Q: When do I move a file from `edited/` to `posted/`?**
As soon as it goes live. Rename it to include the date it was posted so you always know when content ran.

**Q: What if a client churns?**
Change their status in the index table to `Churned` and leave the folder as-is. Their analytics and case study material are still valuable.

