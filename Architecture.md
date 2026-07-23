# Organisation X — Website Architecture

## 1. Purpose

This document describes the website being built for Organisation X: what it does, how it works, what is explicitly out of scope, and the risks involved. It is intended for anyone who needs to understand the system without needing prior context — moderators, future developers, board members, or partners.

---

## 2. What We Are Building

A public website for Organisation X with the following sections:

- **About Organisation X**
- **Vision & Mission**
- **Membership Benefits**
- **Join Organisation X** — links to a Google Form for membership sign-up
- **Events** — lists approved events; includes a "submit an event" link to a Google Form
- **News & Blogs** — lists approved articles; includes a "submit a story" link to a Google Form
- **Resources**
- **Leadership**
- **Contact Us**
- **Donate** — separate action from Join; domestic and international payment options
- **Newsletter signup** — lightweight email opt-in, separate from full membership
- **Photo gallery** — browsable view of approved Events/News images
- **Privacy Policy**
- **Social media links**

The public (not just members) can submit Events and News/Blog content. Every public submission passes through human moderation before it appears on the live site. Approved Events/News items each get their own page, with images, correct titles, and metadata for search engines and social sharing.

---

## 3. What We Are Not Building (Out of Scope)

- **No member login / member portal.** No dues billing, no member directory, no gated content behind a login. If this is needed later, the recommendation is to buy an existing membership platform (e.g. the kind used by comparable Rotary Action Group sites) rather than build one — it requires real authentication and a backend, which is a fundamentally different system from what's described here.
- **No custom database or server-side application.** The entire site is static files; there is no traditional backend to maintain, patch, or scale.
- **No regional/chapter sub-sites.** Not part of the current organisational structure; can be added later if needed.
- **No site search at launch.** Deferred until the News/Resources archive is large enough to need it.
- **No real-time/instant publishing.** New approved content can take up to ~1 hour to appear live (see Section 6).
- **No custom mobile app.** The website is responsive and works on mobile browsers; no native app is planned.

---

## 4. High-Level Architecture

**Frontend:** A static website (plain HTML/CSS/JS) — no application framework, no server-rendered pages at request time.

**Hosting:** Free static hosting (GitHub Pages or, preferably, Cloudflare Pages for unlimited bandwidth). Code lives in a GitHub repository.

**Domain:** A custom domain, already owned by the organisation, pointed at the hosting provider via DNS.

**Content intake:** Three Google Forms, each writing to its own Google Sheet:
| Form | Purpose | Downstream |
|---|---|---|
| Join form | Membership sign-up | Feeds a private membership Sheet only. Never published to the site. |
| Events form | Public event submissions | Title, description, date, location, image (native Google Forms upload), submitter contact. Feeds the moderation pipeline. |
| News & Blogs form | Public news/blog submissions | Title, body, author, image (native Google Forms upload), category. Feeds the moderation pipeline. |

**Moderation:** Each submission lands in a Google Sheet with a **Status** column (Pending / Approved / Rejected). A moderator reviews content directly in the Sheet. Two additional columns — **Approved By** and **Decision Timestamp** — are recorded automatically at the point of decision, forming a permanent audit trail of who approved or rejected each item and when.

**Publishing pipeline:**
```
Public submits via Google Form
        → Google Sheet (Pending)
        → Moderator reviews and sets Status = Approved
        → GitHub Actions build runs (hourly schedule)
        → Reads all Approved rows
        → Downloads and permanently stores a copy of each approved image
        → Generates a static HTML page per event/article (own URL, title, description, social preview image)
        → Publishes the updated site to hosting
```

Nothing goes live without passing through the Status = Approved step. The build is fully automated once approval happens; no one manually publishes pages.

**Images:** Submitted via Google Forms' native file-upload, which requires the submitter to be signed into a Google account. This has a specific safety benefit: once uploaded, the file is owned by the organisation's Google Drive, not the submitter — so a submitter cannot alter or remove an image after it has been approved and published. The build process additionally makes its own permanent copy of each approved image, fully decoupling the live site from the original Drive file.

**Donations:** Two separate, clearly labeled donate options:
- **Razorpay** for domestic (India) donations.
- **Stripe** for international donations.

Both use hosted, no-code checkout pages — no custom payment backend is built. Payment confirmation is handled entirely by the gateway (bank/card network authorization, typically within seconds); no manual confirmation step exists. Both gateways can send the donor an automatic email receipt immediately on successful payment (a dashboard configuration, not custom code). For the organisation's own donation records, a lightweight webhook listener (a small Apps Script or Cloudflare Worker function) receives the gateway's success event and logs the donation — amount, donor email, date, gateway, transaction ID — to a dedicated Sheet, forming the donation audit trail.

**Content policy:** A short, plain-language policy is linked on both submission forms, covering: no defamatory, hateful, or illegal content; submitter confirms they own or have rights to any image they upload; the organisation may edit, reject, or remove any submission; approved content becomes part of the organisation's public site.

**Account ownership:** All Google services (Forms, Sheets, Drive) and the GitHub account should be organisation-owned, not tied to one individual's personal account, with two-factor authentication enabled. A Google Workspace (Business Starter tier) account is planned but not yet active; Forms/Sheets/Drive will migrate to it once set up.

---

## 5. SEO & Discoverability

Content is not rendered client-side from an API — every approved event or article becomes a real, individually addressable static HTML page at build time, with its own title tag, meta description, and social preview (Open Graph) image. This ensures:
- Search engines can reliably index each page.
- Links shared on WhatsApp, Facebook, LinkedIn, or X show a proper title, description, and image preview (these platforms don't execute JavaScript, so content that only existed as a client-side API call would show a blank preview).

---

## 6. Publishing Cadence

The site rebuilds on an **hourly schedule** via GitHub Actions. This means:
- Approved content can take up to one hour to appear live.
- No manual "publish" step or webhook is required for this v1 — simple, predictable, and free to run.

---

## 7. Costs

| Item | Cost |
|---|---|
| Hosting (Cloudflare Pages / GitHub Pages) | $0 |
| HTTPS/SSL | $0 |
| Google Forms, Sheets, Apps Script | $0 |
| Google Drive storage (images) | $0 up to the free tier (~15GB); more with Workspace |
| Custom domain | ~$10–15/year (already owned) |
| Google Workspace (Business Starter, per user) | ~$7–9/month on annual billing (~$80–110/year); deferred, not yet active |
| Razorpay (domestic donations) | ~2% + 18% GST per transaction (~2.36% effective), no setup/monthly fee |
| Stripe (international donations) | ~2.9% + $0.30 domestic-card equivalent, +1.5% international card, +1% currency conversion (~4.4–5.4% effective on cross-border payments) |
| **Total fixed cost** | **~$0–110/year**, plus small per-transaction fees only on actual donations received |

Paid hosting is not expected to be necessary at this organisation's scale; free-tier bandwidth limits are well above realistic traffic for a static site of this kind. If ever needed, Netlify/Vercel Pro run roughly $19–20/month.

---

## 8. Risks

**Hosting**
- Free GitHub Pages typically requires a public repository — site code and committed content (including images) are publicly visible. Submitter contact information must never be committed into the repo or build output.
- No uptime SLA on free-tier hosting; outages are rare but possible.
- Soft bandwidth limits on GitHub Pages specifically (mitigated by using Cloudflare Pages).

**Accounts**
- Until Google Workspace is active, Forms/Sheets/Drive sit on a personal Google account — a single point of failure. Two-factor authentication should be enabled immediately.
- Migrating ownership to Workspace later may require updating file references used by the build script.
- Google Drive storage is finite and will need monitoring as image volume grows.
- The GitHub account and domain registration should be organisation-owned, not tied to one individual, to avoid a single point of failure.

**Moderation**
- A single moderator is a bottleneck and single point of failure.
- Manual review means inappropriate, spam, or rights-infringing content could occasionally slip through.
- Mitigated by the audit trail (Approved By, Decision Timestamp) and the published content policy.

**Public submissions**
- The forms are open to spam/bot submissions over time; moderation is the primary defense, alongside Google Forms' basic built-in abuse detection.
- Legal exposure exists if inappropriate content is approved and published; the content policy and moderator review are the mitigations, not guarantees.

**Build pipeline**
- A bug in the build script can silently stop new content from publishing; basic monitoring/alerting is recommended once built.
- Any credentials the build uses to read the Sheet must be stored as encrypted GitHub secrets, configured carefully to avoid leaking into logs.
- All user-submitted text must be sanitized before being inserted into generated HTML, to prevent script injection or broken page markup.

**Payments**
- Payment gateway fees are variable and should be reconfirmed against each provider's current pricing before launch.
- The webhook listener that logs donations is a small but real piece of infrastructure that needs to stay running and correctly configured; if it fails silently, the org's donation log could miss entries even though the donor was still charged and received their receipt (the donor-facing flow is unaffected either way).

**Domain**
- An expired domain registration can take the site offline or allow the domain to be re-registered by someone else. Auto-renewal and registrar lock should be enabled, on an organisation-owned account.

---

## 9. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Moderator | Reviews Events/News submissions in the Sheet; sets Status to Approved or Rejected; decision is logged automatically |
| Site/technical admin | Maintains the GitHub repository, build script, and hosting configuration; monitors for build failures |
| Org account owner | Holds the organisation-owned Google, GitHub, domain registrar, and payment gateway accounts; ensures 2FA and renewal settings are correct |

---

## 10. Summary

This is a low-cost, low-maintenance system built almost entirely on free tools (Google Forms/Sheets/Drive, GitHub Actions, static hosting), with a single manual step — moderation — gating everything that gets published. It is intentionally not a full membership or database-backed platform; that tradeoff keeps costs near zero and the system simple to run, at the cost of not (yet) supporting features like member login or dues billing, which can be added later via an off-the-shelf platform if the organisation grows to need them.
