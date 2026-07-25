# Trifoss Website

Static site for Trifoss. See `Architecture.md` in this repo for the full system design, scope, and risks.

## Structure

```
index.html                  Homepage — all sections in one page, anchor-linked
privacy-policy.html         Privacy policy
content-policy.html         Submission content policy (linked from Events/News forms)
assets/
  css/styles.css            Design tokens + all styling
  js/main.js                Mobile nav toggle
  images/                   logo.svg, favicon.svg (placeholders — replace with real logo)
events/
  past-events.html          Past Events archive (placeholder list — populated at build time)
  (generated event pages land here once the build pipeline is live)
news/
  archive.html              Full News Archive (placeholder list — populated at build time)
  (generated news/blog pages land here once the build pipeline is live)
scripts/build.js            Placeholder build script — see comments inside for what it will do
.github/workflows/          GitHub Actions workflow (currently manual-trigger only; see comments)
```

## How content actually gets published (once live)

Events and News & Blogs share a **two-stage** moderation pipeline: each content type has a Stage 1 and a Stage 2 Google Sheet, shared only with the relevant moderator(s), with a handoff script copying an item to Stage 2 only after Stage 1 approves it. The hourly build reads only from Stage 2. Membership sign-up is reviewed separately, **single-stage**, via an Approvers Sheet with one-click approve/reject email links; approval triggers a payment link, and membership only becomes Active once payment is confirmed via webhook. Every donation and membership payment is logged to one shared Payments Sheet by the same webhook. Newsletter signups stay on a Google Form for consistency but are synced to Mailchimp, which does the actual sending. See `Architecture.md` for the full picture.

## Current status: scaffold

This is a first-pass scaffold with **placeholder content** — anything in `[BRACKETS]` or flagged with an `<!-- TODO -->` comment needs to be replaced with real content:

- Organisation name/logo (currently a placeholder triad emblem)
- About / Vision / Mission / Membership Benefits copy
- Leadership names, titles, bios, photos
- Resources list
- Contact details and social links
- Google Form links for Join (ABC1), Events (ABC2), News & Blogs (ABC3), and Newsletter
- Razorpay and Stripe payment links (Donate section)

## Not yet built

- Google Forms, the Stage 1/Stage 2 Sheets and handoff script for Events/News, the Approvers Sheet for Membership, and the shared Payments Sheet webhook
- The Apps Script Web App / Cloudflare Worker that the build script will read from
- The real build script that generates static Event/News pages and downloads images
- The scheduled (hourly) GitHub Actions run — currently manual-only so it can be tested safely
- DNS/custom domain pointing (deferred by request)

## How to preview locally

Just open `index.html` in a browser — no build step required for the current scaffold.

## How this gets published

Once GitHub Pages is turned on for this repo (Settings → Pages → deploy from the `main` branch), the site becomes publicly reachable at the GitHub Pages URL, and later at the custom domain once DNS is pointed at it.
