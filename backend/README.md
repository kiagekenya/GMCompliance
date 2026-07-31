# Galaxy Compliance Assistant — Backend (MERN / Express + MongoDB)

This implements the flow described in the project docs: an operator sets up
their pipeline profile, the applicability engine matches it against the
42-item regulatory catalog, the operator confirms their personal calendar,
and a scheduling engine tracks due dates and escalation status from there.

## Setup

```bash
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run seed              # loads the 42 regulatory requirements into Mongo
npm run dev                # starts the server with nodemon
```

## Folder map

```
config/db.js               Mongo connection
models/                    One file per collection (see below)
middleware/auth.js         JWT verification + role checks (admin/editor/viewer)
middleware/errorHandler.js Central error handler (must stay last in server.js)
utils/expressionEvaluator.js  Parses Smart Filter Codes like
                               "Is_Cathodically_Protected == True AND ..."
utils/dateMath.js          Due-date math, action window, status computation
utils/asyncHandler.js      Removes try/catch boilerplate from routes
services/applicabilityEngine.js  Matches profile -> catalog, resolves frequency
services/schedulingEngine.js     Initial schedule, daily recalculation, completion
routes/<feature>/          One function per file, index.js wires them into a router
seed/                       The 42-item catalog + the script that loads it
server.js                  Mounts every router, starts the daily status job
```

## Models -> what they're for

| Model | Purpose |
|---|---|
| `Operator` | The account that logs in (one per pipeline company) |
| `PipelineProfile` | Answers to all 20 Smart Onboarding Toggle questions |
| `RegulatoryRequirement` | The global, shared rulebook (42 docs, seeded once) |
| `ComplianceItem` | One operator's personal calendar entry for one requirement |
| `Contact` | Escalation ladder (escalationLevel 1 = notified first) |
| `Vendor` | Optional third-party contractors |
| `CompletionLog` | Permanent audit trail - never deleted |

## Routes -> what they do

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/signup`, `/login` | POST | Account creation / login, returns JWT |
| `/api/profile` | GET, POST | Read/save the pipeline profile (Step 1) |
| `/api/requirements/suggested` | GET | Runs the applicability engine, returns the filtered + frequency-resolved list to review |
| `/api/compliance-items/confirm` | POST | Operator confirms their reviewed list; rejects (422) any `operator_defined` item missing a value |
| `/api/compliance-items` | GET | The dashboard feed - fully pre-computed dates/status |
| `/api/compliance-items/:id` | PATCH | Mark started, remove a non-core item, reassign a vendor |
| `/api/compliance-items/:id/complete` | POST | Mark done, logs to `CompletionLog`, rolls to the next cycle |
| `/api/contacts` | GET, POST, PATCH, DELETE | Escalation ladder CRUD (2-10 contacts enforced) |
| `/api/vendors` | GET, POST, PATCH, DELETE | Vendor CRUD |

## The four frequency-resolution modes (see `services/applicabilityEngine.js`)

- **fixed** — one number, use it directly (35 of the 42 requirements)
- **variant_by_profile** — look up the right number from an embedded
  `frequencyVariants` array using one profile field (ROW patrolling by
  class location, welder re-qualification by chosen path)
- **variant_expand_all** — one catalog row spawns several compliance items
  (Public Awareness Messaging -> 4 separate audience items)
- **operator_defined** — no regulatory ceiling exists; `confirmItems.js`
  rejects the request with a 422 until the operator supplies their own value

## What's intentionally NOT built yet

- Actual notification delivery (email/SMS) - `schedulingEngine.js` computes
  `status` correctly, but wiring that to a notification provider (e.g.
  SendGrid, Twilio) is a follow-up task, not part of this pass.
- The Federal Register / TRRC scraper cron jobs mentioned in the original
  requirements doc - those update the catalog itself, which is a separate,
  lower-priority background service from the operator-facing API here.
- File upload handling for vendor evidence photos - `completedEvidenceUrl`
  and `evidenceUrl` fields exist and expect a URL string; wiring an actual
  upload endpoint (e.g. to S3) is a follow-up task.
