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
- Set up and edit their own **company profile** (services offered, service area, certifications, description) — see "The marketplace" below.
- Browse every operator on the platform and see their open compliance gaps, to identify who to pitch.
- Send a connection request to an operator, or accept/decline one an operator sent them.

## What a vendor cannot do

- Mark anything compliant. Submitting evidence only fills in the same "draft" fields the admin's EDIT panel already has — it flags the item for review (the same "needs review" notification built for the public upload link), but an admin still has to open it and click MARK COMPLIANT themselves.
- Reassign a task, remove it, or see anything about an operator's calendar beyond their own assigned tasks.
- See another operator's audit archive/completion log, or any task not assigned to them.
- Access assigned **tasks** for an operator before that operator has both added their email as a vendor **and** checked "Grant portal access." (Browsing the marketplace and sending requests doesn't require this — see below.)

## The marketplace — profiles, discovery, and connection requests

Everything above this section describes the *original* vendor portal: a task inbox that only ever showed data an operator typed in about the vendor. This section adds the other half — the vendor's own voice, and a way for either side to initiate a working relationship instead of only the operator adding a vendor by hand.

**A vendor's own profile.** Separate from the per-operator `Vendor` contact entry (which is what an *operator* fills in), each vendor now has one `VendorProfile` — company name, phone, website, services offered (checkboxes pulled from the same 6 regulatory categories used throughout the app), service area, years in business, certifications, and a description. **A brand-new vendor is required to fill this in before they see anything else** — first login after choosing "Vendor" lands on this setup form, not an empty task list. It's editable any time after that from "MY PROFILE" in the vendor portal's sidebar.

**Vendors can see every operator, by design.** "FIND OPERATORS" in the vendor portal lists every operator on the platform along with their current compliance gaps (anything `due` or `past_due`) — regulation, citation, due date, status. This is visible to every vendor automatically; there's no per-operator opt-in. It deliberately does **not** expose internal contact names, notes, or evidence files — only the compliance gap itself, which is what makes it useful for a vendor deciding who to reach out to.

**Operators can browse vendors too.** The Vendors page now has a "FIND VENDORS" section listing every vendor's profile (pulled from `VendorProfile`, independent of whether that vendor has ever been added as a contact by this operator). Existing per-operator vendor rows also get a "View Profile" button when that vendor's email matches a `VendorProfile` — opens a read-only panel with their self-reported info.

**Two-way connection requests.** Either side can reach out first:
- A vendor sends a request to an operator from "FIND OPERATORS" ("we can do X and Y for you").
- An operator sends a request to a vendor from "FIND VENDORS" ("we need this vendor for our compliance work").

Both land in a "REQUESTS" / "CONNECTION REQUESTS" inbox on the receiving side, where they can be accepted or declined. **Accepting either direction has the identical effect**: it creates (or updates) the operator's `Vendor` contact record for that vendor's email with **"Grant portal access" automatically checked** — the same outcome as an operator manually adding the vendor in Settings/Vendors, just triggered by the handshake instead of a form. Once accepted, the vendor shows up in that operator's Vendors list and can be assigned tasks exactly as before; nothing about task assignment or the two-step compliance principle changes.

## Where this lives in the code

**Backend**
- `models/VendorUser.js` — the vendor's own login identity (`clerkUserId`, `email`, `fullName`). Independent of any operator relationship.
- `models/VendorProfile.js` — the vendor's self-reported company info, one per `VendorUser`.
- `models/ConnectionRequest.js` — the two-way request/accept model (`initiatedBy: 'vendor' | 'operator'`).
- `utils/connectionRequests.js` — `acceptConnectionRequest`, shared by both accept endpoints: creates/updates the `Vendor` record with `hasPortalAccess: true`.
- `utils/serviceCategories.js` — the shared category list query, used by both sides' "services offered" pickers.
- `middleware/vendorAuth.js` — `requireVendorAuth`, resolves a logged-in vendor's `req.vendorIds` (every matching, portal-access-granted `Vendor._id`, across all operators).
- `middleware/clerkAuth.js` — `verifyClerkToken` is the shared low-level token check both this and the operator's `requireAuth` build on.
- `routes/auth/identify.js` — `POST /api/auth/identify`, the "which role is this" decision described above. Mounted directly in `server.js`, deliberately outside the operator-only `/api/auth` router.
- `routes/vendorPortal/` — `GET /me`, `GET /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/evidence`, plus the marketplace: `GET/PUT /profile`, `GET /service-categories`, `GET /operators`, `GET/POST /requests`, `PATCH /requests/:id`. All cross-operator, all scoped to the logged-in vendor.
- `routes/vendorDirectory/` — the operator's mirror half: `GET /` (vendor profiles), `GET/POST /requests`, `PATCH /requests/:id`. Mounted at `/api/vendor-directory`, behind the normal operator `requireAuth`.
- `routes/evidence/serveEvidence.js` — serves both identities; ownership is checked against whichever one is logged in.

**Frontend**
- `App.js` — the role-choice screen and `RoleRouter` (calls `/api/auth/identify` once per sign-in, then renders the operator app or the vendor portal).
- `components/vendorportal/VendorPortal.jsx` + `.css` — the vendor-side shell: task list, task detail, and the onboarding gate (renders `VendorOnboarding` full-screen when no `VendorProfile` exists yet).
- `components/vendorportal/VendorOnboarding.jsx` — the profile form, used both for first-time setup and later editing ("MY PROFILE").
- `components/vendorportal/MarketplacePage.jsx` — "FIND OPERATORS": every operator + their compliance gaps, with a send-request action.
- `components/vendorportal/RequestsPage.jsx` — "REQUESTS": sent/received connection requests, with accept/decline on received ones.
- `components/dashboard/Dashboard.jsx` — `VendorDirectoryTable` (existing vendor table + "View Profile"), `FindVendorsSection`, `ConnectionRequestsSection` — the operator's mirror of the three vendor-side additions, all rendered on the existing Vendors page.
- `components/settings/SettingsPage.jsx` and `components/dashboard/Dashboard.jsx`'s Vendors page — both have the "Grant portal access" checkbox on the vendor add/edit forms (settable directly, or automatically via an accepted connection request).

## Manual test script

1. In one browser (or incognito window), sign up choosing **Vendor**. Confirm you land on the **company profile setup form**, not an empty task list — fill it in and submit.
2. Confirm "MY TASKS" now shows "No operator has granted you portal access yet" (setup is done, but no relationship exists yet), and "MY PROFILE" shows what you just entered, editable.
3. In your normal operator session, go to Vendors → "FIND VENDORS" — confirm the vendor you just set up appears with their real profile info (not blank).
4. As the operator, send that vendor a connection request. As the vendor, check "REQUESTS" — confirm it shows up under "RECEIVED FROM OPERATORS," and accept it. Back on the operator side, confirm a `Vendor` row now exists for that email with Portal Access already "Granted" — no manual edit needed.
5. Reverse direction: as the vendor, go to "FIND OPERATORS" — confirm every operator shows up with their real open compliance gaps, and send one a request. As that operator, confirm it appears under Vendors → "CONNECTION REQUESTS" → "RECEIVED FROM VENDORS," and accept it — same auto-connect result.
6. Assign a regulation to that vendor from a requirement's EDIT panel, same as always.
7. Back in the vendor session, reload "MY TASKS" — the task should now appear, listed under the operator's company name.
8. As the vendor, open the task, attach a file, add a note, save. Confirm there is no way to mark it compliant.
9. Back on the operator side, open that requirement — confirm the "needs review" notification shows, review the evidence, and click MARK COMPLIANT.
10. Reload the vendor portal — confirm the task now shows the new status and next due date.
11. Back on the operator's Vendors page, click "View Profile" on that vendor's row — confirm it shows the same profile info they set up in step 1.
12. Sign out and back in as the vendor, this time clicking "Continue as Operator" by mistake — confirm you still land in the vendor portal (your stored identity wins).
