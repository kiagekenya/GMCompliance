# Vendor Portal

A second, completely separate side of the app for vendors/contractors, alongside the existing Operator side (the compliance calendar dashboard). This document explains what it is, how someone gets into it, and exactly what it can and can't do.

## The short version

- **Operators** manage a compliance calendar and assign work to contacts (employees) or vendors (third parties).
- **Vendors** now get their own real login. Once they're in, they see a flat list of every task assigned to them — potentially across *multiple* operators, since the same contractor might do cathodic protection testing for five different small pipeline operators — and can attach evidence, add notes, and say when they did the work.
- A vendor **can never mark anything compliant**. That's still an admin-only action on the operator side. A vendor's submission just flags the item for the admin's review — exactly like the existing public upload link, just through a real, persistent login instead of a one-time token.

## How someone becomes a vendor user

There's no invite email or auto-detection. It's a choice made at the login screen:

1. Anyone signing in sees two buttons before Clerk's sign-in widget: **Continue as Operator** or **Continue as Vendor**.
2. The choice only matters the very first time that Clerk account is ever seen. A brand-new account gets either an `Operator` record or a `VendorUser` record created, matching what was clicked.
3. **A returning user's real, stored role always wins** over whatever they click next time. If someone accidentally clicks "Operator" on their second visit but they're actually a registered vendor, they still land in the vendor portal — the click is only ever a tiebreaker for a first-time account.

This means a vendor can sign up and log in **before any operator has ever heard of them**. Signing up doesn't automatically grant access to anything — it just creates their identity.

## How a vendor's login connects to actual work

This is the part that takes explaining, because it's the one genuinely new piece of architecture in this app: **everything else in this codebase is scoped to a single operator. The vendor portal is the first thing that's cross-operator.**

- Operators already have a "Vendors" list (Settings → Vendors, or the Vendors page) — plain contact entries: company name, person, email, phone, service scope. This has always existed.
- Each vendor entry now has a **"Grant portal access"** checkbox (previously a backend-only field that had no UI).
- When a vendor logs in, the backend takes their email and finds **every** `Vendor` entry, across **every** operator, where the email matches **and** portal access is checked. That's the full set of relationships they can see.
- A `ComplianceItem` (a task on some operator's calendar) becomes visible to a vendor the moment an admin assigns it to one of those matching `Vendor` entries (via the normal EDIT → assign owner → Vendor flow, unchanged).

So: an operator can add a vendor's contact info without granting portal access yet (still vetting them, say), and a vendor can have an account without seeing anything yet (no operator has granted access to their email). Both halves — account + granted relationship — have to line up before a task shows up in the portal.

## What a vendor can do

- See a list of every task assigned to them, grouped by which operator/pipeline it's for.
- Open a task to see the regulation, citation, and due date.
- Attach evidence files (photos, PDFs, etc. — the same real file storage the rest of the app uses, not just a filename).
- Add notes and the date they say they completed the work.
- View evidence they (or anyone else) already attached to that task.

## What a vendor cannot do

- Mark anything compliant. Submitting evidence only fills in the same "draft" fields the admin's EDIT panel already has — it flags the item for review (the same "needs review" notification built for the public upload link), but an admin still has to open it and click MARK COMPLIANT themselves.
- Reassign a task, remove it, or see anything about an operator's calendar beyond their own assigned tasks.
- See another operator's audit archive/completion log, or any task not assigned to them.
- Access anything before an operator has both added their email as a vendor **and** checked "Grant portal access."

## Where this lives in the code

**Backend**
- `models/VendorUser.js` — the vendor's own login identity (`clerkUserId`, `email`, `fullName`). Independent of any operator relationship.
- `middleware/vendorAuth.js` — `requireVendorAuth`, resolves a logged-in vendor's `req.vendorIds` (every matching, portal-access-granted `Vendor._id`, across all operators).
- `middleware/clerkAuth.js` — `verifyClerkToken` is the shared low-level token check both this and the operator's `requireAuth` build on.
- `routes/auth/identify.js` — `POST /api/auth/identify`, the "which role is this" decision described above. Mounted directly in `server.js`, deliberately outside the operator-only `/api/auth` router.
- `routes/vendorPortal/` — `GET /me`, `GET /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/evidence`. All cross-operator, all scoped to `req.vendorIds`.
- `routes/evidence/serveEvidence.js` — now serves both identities; ownership is checked against whichever one is logged in.

**Frontend**
- `App.js` — the role-choice screen and `RoleRouter` (calls `/api/auth/identify` once per sign-in, then renders the operator app or the vendor portal).
- `components/vendorportal/VendorPortal.jsx` + `.css` — the whole vendor-side UI: task list (grouped by operator) and task detail (evidence upload, notes, completion date — no compliance button).
- `components/settings/SettingsPage.jsx` and `components/dashboard/Dashboard.jsx`'s Vendors page — both now have the "Grant portal access" checkbox on the vendor add/edit forms.

## Manual test script

1. In one browser (or incognito window), sign up choosing **Vendor**. Confirm you land on an empty vendor portal ("No operator has granted you portal access yet").
2. In your normal operator session, go to Settings → Vendors (or the Vendors page), add or edit a vendor using **the same email** you just signed up with, and check "Grant portal access."
3. Assign a regulation to that vendor from a requirement's EDIT panel, same as always.
4. Back in the vendor session, reload — the task should now appear, listed under your company name.
5. As the vendor, open the task, attach a file, add a note, save. Confirm there is no way to mark it compliant.
6. Back on the operator side, open that requirement — confirm the "needs review" notification shows, review the evidence, and click MARK COMPLIANT.
7. Reload the vendor portal — confirm the task now shows the new status and next due date.
8. Sign out and back in as the vendor, this time clicking "Continue as Operator" by mistake — confirm you still land in the vendor portal (your stored identity wins).
