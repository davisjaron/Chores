# Chore Chart — API Reference

All API routes are under `/api/`. Authentication is handled by NextAuth.js with JWT sessions.

## Authentication Overview

| Auth Level | Description |
|---|---|
| **None** | No authentication required |
| **requireAuth** | Any authenticated user (parent or kid) |
| **requireParent** | Authenticated parent only (403 for kids) |
| **Custom** | Endpoint-specific auth logic (see notes) |

### Middleware

All routes require a valid session token except these explicitly excluded paths:

- `/api/auth/*` — NextAuth handlers
- `/api/register` — Account registration (has its own auth logic)
- `/api/children/login-list` — Kid login screen data
- `/api/theme` — Public theme/mode config

Kids are additionally blocked from accessing the `/children`, `/chores`, `/settings`, and `/register` pages (UI-level only — API role enforcement is per-route).

---

## Auth

### `POST /api/auth/[...nextauth]`
**Auth:** None | NextAuth sign-in, sign-out, session, and callback handlers. Supports two credential providers: parent (email + password) and kid (childId + PIN).

### `POST /api/auth/change-password`
**Auth:** requireParent | Changes the logged-in parent's password.
- **Body:** `{ currentPassword, newPassword }` (min 4 characters)
- **Returns:** `{ success: true }` or error

### `POST /api/auth/migrate-admin`
**Auth:** Custom (NEXTAUTH_SECRET) | One-time migration utility. Migrates legacy `parent@family.com` account to `admin`, or creates an admin account if none exists.
- **Body:** `{ secret }` — must match `NEXTAUTH_SECRET` env var
- **Returns:** `{ success, message }` or 403

---

## Registration

### `POST /api/register`
**Auth:** Custom | Creates a new parent user account.
- **First user:** No auth required (allows initial setup)
- **Subsequent users:** Requires authenticated parent session
- **Body:** `{ email, password, name? }`
- **Returns:** `{ id, email }` or 400/403

---

## Theme

### `GET /api/theme`
**Auth:** None | Returns the app's theme color and mode for the login screen and global UI.
- **Returns:** `{ themeColor, mode }` (e.g., `"violet"`, `"claim"`)

---

## Dashboard

### `GET /api/dashboard`
**Auth:** requireAuth | Aggregated dashboard data.
- **Parents:** Includes all children, pending approval queues (claims + redemptions), balances for each child
- **Kids:** Scoped to own data only
- **Returns:** `{ settings, todayAssignments, upcomingAssignments, recentAssignments, recentClaims, pendingApprovals, pendingRedemptions, children, childBalances }`

---

## Settings

### `GET /api/settings`
**Auth:** requireAuth | Returns all schedule/app settings.
- **Returns:** Full `ScheduleSetting` object (mode, timezone, theme, cash per point, etc.)

### `PUT /api/settings`
**Auth:** requireParent | Updates app settings.
- **Body:** `{ startDate?, endDate?, allowSameDay?, mode?, cashPerPoint?, themeColor?, requireAssignedFirst?, timezone? }`
- **Returns:** Updated settings

### `POST /api/settings`
**Auth:** requireAuth | Calculates point/cash balances for a child.
- **Query:** `?action=balances` (required)
- **Body:** `{ childId? }` (kids use own ID automatically)
- **Returns:** `{ pointsBalance, cashBalance, accountBalance, cashPerPoint }`

### `POST /api/settings/reset`
**Auth:** requireParent | Wipes all transactional data (claims, assignments, ledger, cash transactions, redemptions, chore assignments). Does not delete children, chores, or rewards.
- **Returns:** `{ success: true }`

---

## Children

### `GET /api/children`
**Auth:** requireAuth | Lists all children with unavailable dates. PIN values are stripped (only `hasPin` boolean returned).
- **Returns:** Child array

### `POST /api/children`
**Auth:** requireParent | Creates a child.
- **Body:** `{ name, color?, emoji?, age?, active?, pin? }`
- **Returns:** Created child (PIN stripped)

### `GET /api/children/login-list`
**Auth:** None | Public list of active children for the kid login screen. Returns names, colors, emojis, and whether a PIN is set — no IDs leak beyond the CUID, and no PIN values are exposed.
- **Returns:** `[{ id, name, color, emoji, active, hasPin }]`

### `GET /api/children/:id`
**Auth:** requireAuth | Returns a single child with unavailable dates.

### `PUT /api/children/:id`
**Auth:** requireParent | Updates a child's profile, PIN, or active status.
- **Body:** `{ name?, color?, emoji?, age?, active?, pin?, clearPin? }`

### `DELETE /api/children/:id`
**Auth:** requireParent | Deletes a child and all related data (cascading).

### `POST /api/children/:id/unavailable`
**Auth:** requireParent | Marks a date as unavailable for a child (schedule mode).
- **Body:** `{ date, reason? }`

### `DELETE /api/children/:id/unavailable`
**Auth:** requireParent | Removes an unavailable date.
- **Query:** `?unavailableId=`

---

## Chores

### `GET /api/chores`
**Auth:** requireAuth | Lists all chores.

### `POST /api/chores`
**Auth:** requireParent | Creates a chore.
- **Body:** `{ name, description?, emoji?, photo?, active?, allowConcurrent?, minAge?, maxAge?, points?, cashValue?, maxClaimsPerDay?, maxClaimsPerWeek?, maxConsecutivePerKid?, maxTotalPerDay?, maxTotalPerWeek? }`

### `PUT /api/chores/:id`
**Auth:** requireParent | Updates a chore. Same body fields as POST.

### `DELETE /api/chores/:id`
**Auth:** requireParent | Deletes a chore (cascading — removes related claims and assignments).

---

## Chore Assignments (Claim Mode)

Parent-assigned chores in Claim & Earn mode (distinct from schedule-generated assignments).

### `GET /api/chore-assignments`
**Auth:** requireAuth | Lists parent-assigned chores.
- **Query:** `?childId=`, `?status=`

### `POST /api/chore-assignments`
**Auth:** requireParent | Assigns a specific chore to a child.
- **Body:** `{ childId, choreId, points?, cashValue? }`

### `DELETE /api/chore-assignments/:id`
**Auth:** requireParent | Removes a chore assignment.

---

## Assignments (Schedule Mode)

Auto-generated schedule assignments for Assigned Schedule mode.

### `GET /api/assignments`
**Auth:** requireAuth | Lists assignments within a date range.
- **Query:** `?start=`, `?end=`, `?childId=`
- **Note:** Kids are automatically filtered to their own assignments

### `POST /api/assignments`
**Auth:** requireParent | Creates a single assignment.
- **Body:** `{ date, childId, choreId, status? }`

### `PUT /api/assignments/:id`
**Auth:** requireAuth | Updates an assignment.
- **Kids:** Can only update `status` on their own assignments
- **Parents:** Can update all fields (`date`, `childId`, `choreId`, `status`)

### `DELETE /api/assignments/:id`
**Auth:** requireParent | Deletes an assignment.

### `POST /api/assignments/generate`
**Auth:** requireParent | Generates a full schedule. Deletes existing assignments in the date range and bulk-creates new ones using the rotation algorithm.
- **Body:** `{ startDate, endDate, allowSameDay? }`
- **Returns:** `{ count }` (number created)

### `GET /api/assignments/export-ics`
**Auth:** requireAuth | Exports all assignments as an `.ics` calendar file.
- **Query:** `?includeCompleted=` (default true), `?includeSkipped=` (default false)
- **Returns:** `text/calendar` file download

---

## Claims

### `GET /api/claims`
**Auth:** requireAuth | Lists chore claims.
- **Query:** `?childId=`
- **Note:** Kids see only their own claims

### `POST /api/claims`
**Auth:** requireAuth | Claims a chore. Validates age restrictions, rate limits (per-kid and total), and assignment rules.
- **Body:** `{ choreId, childId?, claimedDate?, choreAssignmentId? }`
- **Note:** Kids use their own `childId` automatically

### `PUT /api/claims/:id`
**Auth:** requireAuth | Transitions a claim through its lifecycle.
- **Body:** `{ status }` — one of:
  - `pending_approval` — Kid submits completed chore for review (kid-only, from `claimed`)
  - `approved` — Parent approves; awards points and cash (parent-only)
  - `rejected` — Parent rejects; resets to `claimed` (parent-only)
  - `complete` — Parent: auto-approves. Kid: submits for approval
  - `unapproved` — Parent revokes approval; reverses ledger entry (parent-only)
  - `abandoned` — Deletes the claim entirely
- **Note:** Kids can only modify their own claims

### `DELETE /api/claims/:id`
**Auth:** requireAuth | Deletes a claim.
- **Kids:** Own claims only; cannot delete `approved` or `complete` claims
- **Parents:** Can delete any claim

---

## Rewards

### `GET /api/rewards`
**Auth:** requireAuth | Lists all rewards sorted by point cost.

### `POST /api/rewards`
**Auth:** requireParent | Creates a reward.
- **Body:** `{ name, description?, pointCost, emoji?, active? }`

### `PUT /api/rewards/:id`
**Auth:** requireParent | Updates a reward. Same body fields as POST.

### `DELETE /api/rewards/:id`
**Auth:** requireParent | Deletes a reward (cascading).

---

## Redemptions

### `GET /api/redemptions`
**Auth:** requireAuth | Lists reward redemptions.
- **Query:** `?childId=`, `?status=`
- **Note:** Kids see only their own redemptions

### `POST /api/redemptions`
**Auth:** requireAuth | Requests a reward redemption. Validates sufficient points balance. Created with `status: "pending_approval"`.
- **Body:** `{ rewardId, childId? }`

### `PUT /api/redemptions/:id`
**Auth:** requireAuth | Approves or rejects a redemption.
- **Body:** `{ status }` — `approved` or `rejected` (parent-only)
- **Note:** Rejection deletes the redemption record

### `DELETE /api/redemptions/:id`
**Auth:** requireParent | Hard-deletes a redemption.

---

## Reward Suggestions

### `GET /api/reward-suggestions`
**Auth:** requireAuth | Lists reward suggestions.
- **Parents:** Grouped by name with counts and child names
- **Kids:** Own suggestions only

### `POST /api/reward-suggestions`
**Auth:** requireAuth | Submits a reward suggestion.
- **Body:** `{ name, childId? }`
- **Returns:** 201 Created or 409 Conflict (duplicate)

### `DELETE /api/reward-suggestions`
**Auth:** requireParent | Deletes all suggestions matching a name.
- **Query:** `?name=`

---

## Ledger (Cash Transactions)

### `GET /api/ledger`
**Auth:** requireAuth | Lists ledger entries (deposits, withdrawals, chore earnings).
- **Query:** `?childId=`
- **Note:** Kids see only their own entries

### `POST /api/ledger`
**Auth:** requireParent | Creates a ledger entry.
- **Body:** `{ childId, kind, amount, note?, date? }` — `kind`: `deposit`, `withdrawal`, `chore_earning`

### `PUT /api/ledger/:id`
**Auth:** requireParent | Edits a ledger entry (date, amount, note).
- **Body:** `{ date?, amount?, note? }`

### `DELETE /api/ledger/:id`
**Auth:** requireParent | Deletes a ledger entry.

---

## Cash Transactions

### `GET /api/cash-transactions`
**Auth:** requireAuth | Lists cash transactions (cashouts, payments, adjustments).
- **Query:** `?childId=`
- **Note:** Kids see only their own transactions

### `POST /api/cash-transactions`
**Auth:** requireAuth | Creates a cash transaction.
- **Body:** `{ kind, childId?, points?, amount?, note? }`
- **Kinds:**
  - `cashout` — Converts points to cash. Any user (kids restricted to own account). Validates balance.
  - `payment` — Records cash paid out. **Parent-only.**
  - `adjustment` — Manual points/cash adjustment. **Parent-only.**

### `DELETE /api/cash-transactions/:id`
**Auth:** requireParent | Deletes a cash transaction.

---

## Points History

### `GET /api/points-history`
**Auth:** requireAuth | Unified points timeline aggregated from claims, redemptions, and cash transactions.
- **Query:** `?childId=` (required for parents)
- **Returns:** `[{ id, date, kind, source, points, note }]`
  - `kind`: `chore_earned`, `reward_redeemed`, `cashout`, `adjustment`
  - `source`: `claim`, `redemption`, `cashTransaction` (indicates which table to target for edits)

### `PUT /api/points-history/:id`
**Auth:** requireParent | Edits a points event. Routes to the correct table based on `source`.
- **Body:** `{ source, date?, points?, note? }`

### `DELETE /api/points-history/:id`
**Auth:** requireParent | Deletes a points event by source table.
- **Query:** `?source=` — `claim`, `redemption`, `cashTransaction`

---

## Leaderboard

### `GET /api/leaderboard`
**Auth:** requireAuth | Rankings by points, cash earned, and chore count.
- **Query:** `?period=` — `daily`, `weekly` (default), `monthly`, `yearly`
- **Returns:** `{ period, startDate, byPoints, byCash, byChores }`

---

## Upload

### `POST /api/upload`
**Auth:** requireParent | Uploads an image, compresses to WebP (max 800x800), stores on disk.
- **Body:** FormData with `file` field
- **Returns:** `{ path: "/api/upload/{uuid}.webp" }`

### `GET /api/upload/:filename`
**Auth:** Session required (via middleware) | Serves an uploaded image.
- **Security:** Path traversal blocked (`..` and `/` rejected in filename)
- **Returns:** `image/webp` with immutable cache headers

---

## File Structure

```
src/app/api/
├── assignments/
│   ├── route.ts              GET, POST
│   ├── [id]/route.ts         PUT, DELETE
│   ├── generate/route.ts     POST
│   └── export-ics/route.ts   GET
├── auth/
│   ├── [...nextauth]/route.ts
│   ├── change-password/route.ts  POST
│   └── migrate-admin/route.ts    POST
├── cash-transactions/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         DELETE
├── children/
│   ├── route.ts              GET, POST
│   ├── login-list/route.ts   GET
│   ├── [id]/route.ts         GET, PUT, DELETE
│   └── [id]/unavailable/route.ts  POST, DELETE
├── chore-assignments/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         DELETE
├── chores/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         PUT, DELETE
├── claims/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         PUT, DELETE
├── dashboard/route.ts        GET
├── leaderboard/route.ts      GET
├── ledger/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         PUT, DELETE
├── points-history/
│   ├── route.ts              GET
│   └── [id]/route.ts         PUT, DELETE
├── redemptions/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         PUT, DELETE
├── register/route.ts         POST
├── reward-suggestions/route.ts  GET, POST, DELETE
├── rewards/
│   ├── route.ts              GET, POST
│   └── [id]/route.ts         PUT, DELETE
├── settings/
│   ├── route.ts              GET, PUT, POST
│   └── reset/route.ts        POST
├── theme/route.ts            GET
└── upload/
    ├── route.ts              POST
    └── [filename]/route.ts   GET
```
