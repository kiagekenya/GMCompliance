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

**Adding a vendor is now a one-click pick, not a form.** The old "ADD VENDOR" form (an operator typing in a vendor's company name, email, phone, etc. by hand) is gone. It created a second, disconnected copy of a vendor's info that could drift out of sync with what the vendor themselves said on their profile — confusing, and pointless now that real vendors self-register. Instead, the Vendors page has a "FIND VENDORS" section listing every real `VendorProfile` on the platform. Click **ADD VENDOR** on a vendor's card and it directly creates (or updates) that operator's `Vendor` contact record, filled in from the vendor's own profile — company name, phone, services — with **portal access granted automatically**. A vendor already on your list shows "✓ Added to your vendors" instead of the button, so it's never ambiguous whether you've already added someone.

**Vendors can still reach out first.** A vendor can send a request to an operator from "FIND OPERATORS," offering to help with one specific regulation (see "Offer to help" below). These land in the operator's Vendors page under "REQUESTS FROM VENDORS," where accepting has the identical effect as clicking ADD VENDOR — same `Vendor` record, same automatic portal access. This is the one remaining request/accept handshake; operators no longer send requests the other way since they can just add a vendor directly.

**Per-regulation outreach.** On "FIND OPERATORS," a vendor sees each operator's actual list of compliance regulations (not just a bare operator name), and can click **"Offer to help"** on a specific one — the request that lands in the operator's inbox is tagged with that exact regulation ("RE: O&M Manual Review (49 CFR §192.605(a))"), so the operator knows exactly what's being pitched. A general inquiry (not tied to one regulation) is still available below the list for a broader pitch.

**Ending a collaboration.** Every row in the operator's "VENDOR DIRECTORY" table now has two actions: **Revoke Access** (shown only when access is currently granted) immediately cuts that vendor off from this operator's data/tasks while keeping the contact on file — click ADD VENDOR on their card in "FIND VENDORS" again later to re-grant it, no duplicate created. **Remove** (trash icon) deletes the contact entirely; the backend automatically unassigns any tasks pointing at that vendor first, so nothing is left dangling.

**A real landing page, not a blank one.** A vendor who hasn't been connected to any operator yet (or has no tasks assigned yet) no longer sees a bare sentence on white — "MY TASKS" shows a proper empty state with an icon, a clear explanation of what to do next, and buttons straight to "FIND OPERATORS" and their own profile.

## Where this lives in the code

**Backend**
- `models/VendorUser.js` — the vendor's own login identity (`clerkUserId`, `email`, `fullName`). Independent of any operator relationship.
- `models/VendorProfile.js` — the vendor's self-reported company info, one per `VendorUser`.
- `models/ConnectionRequest.js` — the two-way request/accept model (`initiatedBy: 'vendor' | 'operator'`).
- `utils/vendorLinking.js` — `linkVendorToOperator`, the shared logic that creates/updates a `Vendor` record from a vendor's real profile and grants portal access. Used by both a direct add (`routes/vendorDirectory/addVendor.js`) and an accepted connection request.
- `utils/connectionRequests.js` — `acceptConnectionRequest`, thin wrapper around `linkVendorToOperator` that also marks the request accepted.
- `utils/serviceCategories.js` — the shared category list query, used by both sides' "services offered" pickers.
- `middleware/vendorAuth.js` — `requireVendorAuth`, resolves a logged-in vendor's `req.vendorIds` (every matching, portal-access-granted `Vendor._id`, across all operators).
- `middleware/clerkAuth.js` — `verifyClerkToken` is the shared low-level token check both this and the operator's `requireAuth` build on.
- `routes/auth/identify.js` — `POST /api/auth/identify`, the "which role is this" decision described above. Mounted directly in `server.js`, deliberately outside the operator-only `/api/auth` router.
- `routes/vendorPortal/` — `GET /me`, `GET /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/evidence`, plus the marketplace: `GET/PUT /profile`, `GET /service-categories`, `GET /operators`, `GET/POST /requests`, `PATCH /requests/:id`. All cross-operator, all scoped to the logged-in vendor.
- `routes/vendorDirectory/` — the operator's half: `GET /` (vendor profiles), `POST /:vendorUserId/add` (direct add), `GET/POST /requests`, `PATCH /requests/:id`. Mounted at `/api/vendor-directory`, behind the normal operator `requireAuth`.
- `routes/evidence/serveEvidence.js` — serves both identities; ownership is checked against whichever one is logged in.

**Frontend**
- `App.js` — the role-choice screen and `RoleRouter` (calls `/api/auth/identify` once per sign-in, then renders the operator app or the vendor portal).
- `components/vendorportal/VendorPortal.jsx` + `.css` — the vendor-side shell: task list, task detail, and the onboarding gate (renders `VendorOnboarding` full-screen when no `VendorProfile` exists yet).
- `components/vendorportal/VendorOnboarding.jsx` — the profile form, used both for first-time setup and later editing ("MY PROFILE").
- `components/vendorportal/MarketplacePage.jsx` — "FIND OPERATORS": every operator + their full regulation list, with a per-regulation "Offer to help" action plus a general inquiry option.
- `components/vendorportal/RequestsPage.jsx` — "REQUESTS": sent/received connection requests (each showing which regulation it's about, if any), with accept/decline on received ones.
- `components/dashboard/Dashboard.jsx` — `VendorDirectoryTable` (existing vendor table + "View Profile"), `FindVendorsSection` (the real directory, with the direct `AddVendorButton` per vendor), `ConnectionRequestsSection` (received-only now). The old manual `AddVendorForm` is gone.
- `components/settings/SettingsPage.jsx` still has the "Grant portal access" checkbox on its vendor edit rows, for toggling access on an already-added vendor.

## Manual test script

1. In one browser (or incognito window), sign up choosing **Vendor**. Confirm you land on the **company profile setup form**, not an empty task list — fill it in and submit.
2. Confirm "MY TASKS" now shows the redesigned empty state ("You're set up - now let's get you found," with a FIND OPERATORS button) instead of a bare sentence, and "MY PROFILE" shows what you just entered, editable.
3. In your normal operator session, go to Vendors → "FIND VENDORS" — confirm the vendor you just set up appears with their real profile info (not blank), and click **ADD VENDOR** on their card. Confirm the button becomes "✓ Added to your vendors," and the vendor now appears in the "VENDOR DIRECTORY" table above with Portal Access already "Granted" — no form, no manual edit.
4. Reverse direction: as the vendor, go to "FIND OPERATORS" — confirm every operator shows up with their actual regulation list (not just an operator name), and click "Offer to help" on one specific regulation. As that operator, confirm it appears under Vendors → "REQUESTS FROM VENDORS," tagged with that exact regulation, and accept it — same auto-connect result as the direct add above.
5. Assign a regulation to that vendor from a requirement's EDIT panel, same as always.
6. Back in the vendor session, reload "MY TASKS" — the task should now appear, listed under the operator's company name.
7. As the vendor, open the task, attach a file, add a note, save. Confirm there is no way to mark it compliant.
8. Back on the operator side, open that requirement — confirm the "needs review" notification shows, review the evidence, and click MARK COMPLIANT.
9. Reload the vendor portal — confirm the task now shows the new status and next due date.
10. Back on the operator's Vendors page, click "View Profile" on that vendor's row — confirm it shows the same profile info they set up in step 1.
11. Sign out and back in as the vendor, this time clicking "Continue as Operator" by mistake — confirm you still land in the vendor portal (your stored identity wins).
