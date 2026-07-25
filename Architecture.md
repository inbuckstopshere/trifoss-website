# Trifoss — Website Architecture
### Document date: 24 July 2026 (updated)

## 1. Purpose

This document describes the Trifoss website: what it does, how it works, what is explicitly out of scope, and the risks involved. It is intended for anyone who needs to understand the system without prior context — moderators, developers, board members, or partners.

---

## 2. What We Are Building

A public website for Trifoss with the following sections:

- **About Trifoss**
- **Vision & Mission**
- **Membership Benefits**
- **Join Trifoss** — links to a Google Form for membership sign-up (requires admin approval, see Section 9)
- **Events** — lists approved, upcoming events; includes a "submit an event" link to a Google Form; a **Past Events** archive of events that have concluded
- **News & Blogs** — lists the most recent approved articles; includes a "submit a story" link to a Google Form; a full **News Archive** of every article ever published
- **Resources**
- **Leadership**
- **Photo Gallery** — browsable view of approved Events/News images, clickable (lightbox + link back to source)
- **Newsletter signup** — lightweight email opt-in via Mailchimp, separate from full membership
- **Donate** — separate action from Join; domestic (Razorpay) and international (Stripe) payment options; one-time only for now
- **Contact Us** — email and phone only (no contact form)
- **Privacy Policy**
- **Content Policy** — submission guidelines, linked from the Events and News forms
- **Social media links**

The public (not just members) can submit Events and News/Blog content. Every public submission passes through human moderation before it appears on the live site. Approved Events/News items each get their own page, with images, correct titles, and metadata for search engines and social sharing.

**Visual identity:** dark blue and sea green color palette, a serif display face paired with a clean sans body face, and a simple triad emblem (three overlapping arcs, referencing "Tri" in Trifoss) as a placeholder logo mark until a final logo is supplied.

---

## 3. What We Are Not Building (Out of Scope)

- **No member login / member portal.** No member directory, no gated content behind a login. If this is needed later, the recommendation is to buy an existing membership platform rather than build one.
- **No custom database or server-side application.** The entire site is static files; there is no traditional backend to maintain, patch, or scale.
- **No regional/chapter sub-sites.**
- **No site search at launch.**
- **No real-time/instant publishing.** New approved content can take up to ~1 hour to appear live (hourly build schedule).
- **No custom mobile app.**
- **No date-based expiration for News & Blogs content.** Unlike Events, news articles and blog posts do not go stale by date and are never automatically archived away from being linkable.
- **No recurring/monthly donations at this stage.** Donate is one-time only for now.
- **No public contact form.** Contact Us shows email and phone directly.

---

## 4. High-Level Architecture

**Frontend:** A static website (plain HTML/CSS/JS). **Hosting:** Free static hosting (GitHub Pages, or Cloudflare Pages). Code lives in a GitHub repository (`trifoss-website`). **Domain:** A custom domain, owned by the organisation; DNS mapping deferred to a later stage by choice.

**Content intake — four Google Forms:**

| Form | Purpose | Downstream |
|---|---|---|
| Join form | Membership sign-up | Membership Sheet — requires admin approval (Section 9) |
| Events form | Public event submissions | Title, description, date, time, location, image (JPG/PNG/WebP, max 1MB), submitter name/email, optional related-news link. Two-stage moderation (Section 5). |
| News & Blogs form | Public news/blog submissions | Title, body, author, category (fixed dropdown: Update, Achievement, Announcement, Opinion, Recap), image (JPG/PNG/WebP, max 1MB), submitter email, optional related-event reference. Two-stage moderation (Section 5). |
| Newsletter form | Email opt-in only | Subscribers list, synced to Mailchimp (Section 8) |

**Publishing pipeline:**
```
Public submits via Google Form
        -> Google Sheet (Pending)
        -> Moderator(s) review and approve
        -> GitHub Actions build runs (hourly schedule)
        -> Reads all Approved rows
        -> Downloads and permanently stores a copy of each approved image
        -> Generates a static HTML page per event/article
        -> Publishes the updated site to hosting (files committed to git)
```

Once built, generated HTML pages and image copies are committed directly into the GitHub repository — the live site is a self-contained snapshot in git and does not read from the Google Sheet at request time. The Sheet remains the permanent submission/moderation record.

**Images:** Native Google Forms file-upload (submitter must be signed into a Google account), restricted to **JPG/PNG/WebP, max 1MB each**. Once uploaded, the file is Drive-owned by the organisation, not the submitter. The build process makes its own permanent copy of each approved image.

**Account ownership:** Google services and GitHub are organisation-controlled (currently an interim Gmail account; Google Workspace Business Starter planned but deferred by choice), with two-factor authentication enabled.

---

## 5. Events & News & Blogs — Moderation, Lifecycle, and Content Model

### Two-stage moderation (Events and News & Blogs)

- **Two separate Google Sheets** (Stage 1, Stage 2), each shared only with the relevant moderator(s) — real access separation, not just a filter view.
- A **handoff script** copies an item from Stage 1 to Stage 2 only once Stage 1 approves it, carrying forward the comment and timestamp.
- **Approved By / Decision Timestamp fields are auto-filled by the script**, not typed manually.
- **Rejection is final at either stage** (no loop-back); the submitter is automatically emailed the specific reason, with an invitation to revise and resubmit (a fresh form submission — public Forms have no "edit" concept). An optional "is this a resubmission?" field gives moderators context.
- **Claimed By column + script-level conflict check** prevents two moderators acting on the same item; a claim auto-releases after 48 hours if left untouched, and claimed-but-undecided items still appear in the digest, clearly marked, rather than being hidden.
- **Segregation of duties enforced by the handoff script**: the same person cannot be listed as both a Stage 1 and Stage 2 moderator.
- **Daily digest email** per stage: one combined email containing the full text of every pending item (not an excerpt), images embedded inline (compressed), an age indicator, and a specific urgency flag for Events whose date is close but still undecided. Skipped entirely on days with nothing pending.

### Events lifecycle

| Timing | Where it appears | Behavior |
|---|---|---|
| Upcoming | Main Events section, soonest first | Normal display |
| Immediate (today) | Same section, "Happening today" badge | Highlighted |
| Passed, within ~2 weeks | "Recently held" row, marked as past | Still easy to find |
| Passed, beyond ~2 weeks | Removed from homepage; moved to a **discoverable** Past Events archive page | Own page stays live at its permalink |

Computed automatically at build time from the Date field.

### News & Blogs model

- Homepage shows the most recent articles (**currently 6**, adjustable later).
- "View all articles" link leads to a full **News Archive** — nothing ever removed by date; pagination is about volume, not lifecycle.
- **Visual layout: card-grid style, matching Events** (a featured + list hybrid was explored and mocked up, but reverted to card-grid for consistency between the two sections).

### Cross-linking Events and News & Blogs

- The News & Blogs form includes an optional field: "Is this about a specific past event? Paste the event's page link here."
- At build time, the article page shows a "Related event" link and the event page shows a "Read the recap ->" link back — generated automatically from that one reference, including once the event is archived.

### Photo Gallery

- Populated automatically from the same images already downloaded during the Events/News build — no separate upload step.
- Clicking a photo opens a **lightbox** (enlarged view) with a caption **linking back to the source Event or article**.

---

## 6. SEO & Discoverability

Every approved event or article becomes a real, individually addressable static HTML page at build time, with its own title tag, meta description, and Open Graph image — reliably indexable and correctly previewed when shared on WhatsApp, Facebook, LinkedIn, or X (platforms that don't execute JavaScript).

---

## 7. Publishing Cadence

Hourly scheduled rebuild via GitHub Actions. Approved content can take up to one hour to appear live.

---

## 8. Newsletter (Mailchimp)

The Google Form remains the front-end for consistency; a script syncs new signups to **Mailchimp** via its API, which handles actual sending, compliant unsubscribe links, and bounce management. A Mailchimp webhook keeps the Subscribers Sheet's status in sync (unsubscribed/bounced) so it doesn't go stale.

**Note:** Mailchimp's free plan (as of 2026) allows only 250 contacts and 500 sends/month — worth monitoring as the list grows; paid tiers start around $13/month, with a 15% nonprofit discount available if Trifoss has (or obtains) nonprofit registration.

**Guardrails:** duplicate signups update rather than duplicate a row; unsubscribes are marked, never deleted; this Sheet has tightly restricted access (pure PII, no other content).

---

## 9. Membership (Join)

Joining requires **admin approval** — not automatic. There is a membership fee and multiple tiers (e.g. Regular, Associate, Lifetime).

**Review structure:** **single-stage** (unlike the two-stage Events/News process). An **Approvers Sheet** (Name, Email) lists who can review — editable anytime without any code changes, supports multiple approvers.

**Daily digest:** one combined email to all listed approvers, showing every pending application in full (with days-pending count), including **one-click Approve/Reject links**.

**Collision safety for one-click links:** each link checks whether the application is *still* Pending at the moment it's clicked. If yes, it processes the decision (auto-filling Reviewed By / Decision Timestamp) — an Approve triggers the payment-link email (see below); if the item was already decided by someone else, the click shows a plain "already processed by [name] on [date]" page instead of double-processing. Reject opens one small follow-up page to capture a reason before finalizing; Approve is a true single click.

**Sequencing — approval before payment:** applicant submits → approved by an approver → a payment link (Razorpay/Stripe, same pattern as Donations) is emailed → membership becomes **Active** only once payment is confirmed via webhook. This avoids refund complications for rejected applicants.

**Still parked, not yet decided:** exact renewal period for Regular/Associate tiers; exact fields on the Join form beyond the basics.

---

## 10. Donations & Payments

Two separate, clearly labeled donate options — **Razorpay** (domestic/India) and **Stripe** (international) — via hosted, no-code checkout pages. **One-time donations only** for now; recurring/monthly giving not supported at this stage.

**Confirmation:** handled entirely by the gateway (bank/card authorization), no manual step. **Receipt to payer:** automatic, instant email from the gateway (dashboard setting). **Organisation's record:** a webhook listener logs each payment to a shared **Payments Sheet** (Type column distinguishes Donation vs. Membership Dues, since both use the identical gateway/webhook mechanism).

**Post-payment experience:** a single shared **Thank You page** for both Donations and Membership Dues (still to be built).

**Formal tax-deductible receipts** (e.g. 80G in India), separate from the automatic gateway email receipt: **not yet decided** — parked.

**Guardrails:** never delete a row even on refund (mark Refunded, keep history); webhook script must be idempotent (gateways occasionally resend events); tightest access restriction of any Sheet (financial data + payer PII).

**Approximate fees** (confirm current rates before launch): Razorpay ~2% + 18% GST (~2.36% effective), no setup/monthly fee. Stripe ~2.9% + $0.30 domestic-card equivalent, +1.5% international card, +1% currency conversion (~4.4-5.4% effective on cross-border payments).

---

## 11. Costs

| Item | Cost |
|---|---|
| Hosting (Cloudflare Pages / GitHub Pages) | $0 |
| HTTPS/SSL | $0 |
| Google Forms, Sheets, Apps Script | $0 |
| Google Drive storage (images) | $0 up to the free tier (~15GB); more with Workspace |
| Custom domain | ~$10-15/year (already owned) |
| Google Workspace (Business Starter, per user) | ~$7-9/month on annual billing (~$80-110/year); deferred, not yet active |
| Mailchimp | Free up to 250 contacts / 500 sends per month; ~$13/month+ beyond that (15% nonprofit discount available) |
| Razorpay (domestic donations/dues) | ~2% + 18% GST per transaction |
| Stripe (international donations/dues) | ~2.9-5.4% effective per transaction depending on currency/geography |
| **Total fixed cost** | **~$0-110/year**, plus small per-transaction fees only on actual payments received |

---

## 12. Risks

**Hosting:** free GitHub Pages requires a public repository — submitter contact information must never be committed into the repo or build output; no uptime SLA; soft bandwidth limits (mitigated by Cloudflare Pages).

**Accounts:** interim Gmail account is a single point of failure until Workspace is active (2FA should be enabled); migrating to Workspace later may require updating file references used by the build script; Drive storage is finite; GitHub account and domain registration should remain organisation-owned.

**Moderation:** even with two stages, manual review means inappropriate/spam/rights-infringing content could occasionally slip through — mitigated by the audit trail and content policy, not eliminated. Collision risk between simultaneous reviewers is mitigated (Claimed By + conflict checks for Events/News; live-status checks for Membership's one-click links) but relies on the automation scripts working correctly.

**Public submissions:** spam/bot submissions are likely over time; legal exposure exists if inappropriate content is approved and published.

**Build pipeline:** a bug in the build script can silently stop new content from publishing; Sheet-read credentials must be stored as encrypted GitHub secrets; all user-submitted text must be sanitized before insertion into generated HTML; the Events-News cross-linking depends on correct manual data entry (a missing/malformed link simply shows no cross-link, not a build failure).

**Payments:** fees are variable and should be reconfirmed before launch; the webhook listener is a small but real piece of infrastructure — if it fails silently, the organisation's payment log could miss entries even though the payer was still charged and received their receipt.

**Newsletter:** Mailchimp's free tier (250 contacts/500 sends per month) is easy to outgrow for even a small organisation; worth monitoring and budgeting for the jump to a paid tier.

**Domain:** an expired registration can take the site offline or allow re-registration by someone else; auto-renewal and registrar lock should be enabled on an organisation-owned account.

---

## 13. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Stage 1 / Stage 2 Moderators (Events, News) | Review submissions in their respective Sheet; decisions logged automatically |
| Membership Approvers | Review Join applications via daily digest or Sheet; one-click or manual decision |
| Site/technical admin | Maintains the GitHub repository, build script, hosting configuration, webhook listeners |
| Org account owner | Holds the organisation-owned Google, GitHub, domain registrar, and payment gateway accounts; ensures 2FA and renewal settings are correct |

---

## 14. Summary

This is a low-cost, low-maintenance system built almost entirely on free tools (Google Forms/Sheets/Drive, GitHub Actions, static hosting, Mailchimp), gated by human moderation at every public-facing entry point: two-stage review for Events and News & Blogs, single-stage approver review for Membership, and automated gateway confirmation for payments. Events and News & Blogs share intake and moderation mechanics but differ in lifecycle — Events expire and archive by date, News & Blogs accumulate indefinitely. The system is intentionally not a full membership or database-backed platform; that tradeoff keeps costs near zero and the system simple to run.
