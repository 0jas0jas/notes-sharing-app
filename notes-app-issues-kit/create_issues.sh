#!/usr/bin/env bash
# Creates labels, milestones and the MVP issues for 0jas0jas/notes-sharing-app.
#
# Before running:
#   1. Install the GitHub CLI (https://cli.github.com) and run `gh auth login`.
# Then run from anywhere:  bash create_issues.sh
set -euo pipefail

REPO="0jas0jas/notes-sharing-app"

declare -A NUM   # issue key -> issue number, filled in as issues are created

# ---------------------------------------------------------------- labels
echo "Creating labels..."
mk_label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
mk_label "setup"      "c5def5" "Project setup and housekeeping"
mk_label "frontend"   "1d76db" "Pages, components, styling"
mk_label "backend"    "5319e7" "API routes, database, auth"
mk_label "feature"    "0e8a16" "Counts toward the required feature total (need 5)"
mk_label "polish"     "fbca04" "Edge cases, responsiveness, demo prep"
mk_label "discussion" "d876e3" "Needs a team decision"

# ------------------------------------------------------------ milestones
echo "Creating milestones..."
mk_ms() {
  gh api "repos/$REPO/milestones" -f title="$1" -f due_on="$2" -f description="$3" >/dev/null 2>&1 \
    || echo "  (milestone '$1' may already exist, skipping)"
}
mk_ms "Setup"    "2026-11-17T04:59:59Z" "Workflow, decisions, API contract, schema, layout. Unblocks everyone."
mk_ms "Frontend" "2026-11-21T04:59:59Z" "Every page working on mock data by Nov 20."
mk_ms "Backend"  "2026-11-28T04:59:59Z" "Real API + DB, frontend switched off mocks by Nov 27."
mk_ms "Polish"   "2026-12-02T04:59:59Z" "Edge cases, mobile, demo-ready before Dec 2 (bonus points)."

# ---------------------------------------------------------------- issues
# usage: issue KEY "Title" "labels" "Milestone" <<'EOF' ...body... EOF
# In bodies, @KEY@ becomes a link to that issue (must be created earlier).
issue() {
  local key=$1 title=$2 labels=$3 ms=$4 body url k
  body=$(cat)
  for k in "${!NUM[@]}"; do body=${body//@$k@/#${NUM[$k]}}; done
  url=$(gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$ms" --body "$body")
  NUM[$key]=${url##*/}
  echo "  #${NUM[$key]}  $title"
}

echo "Creating issues..."

# =============================== SETUP ===============================

issue WORK "📌 How we work (read first)" "setup" "Setup" <<'EOF'
How we split and merge work so nobody steps on anyone else.

**Workflow**
1. Fork the repo (or branch in it if you have write access).
2. Assign yourself an issue before starting it, so two people don't build the same thing.
3. One branch per issue, named `<issue-number>-short-name`, e.g. `12-dashboard`.
4. Only edit the files listed under **Files** in your issue. If you need to touch someone else's file, comment on their issue first.
5. Open a PR with `Closes #<number>` in the description so the issue closes on merge.
6. One teammate reviews and merges. Don't merge your own PR.
7. Pull `main` into your branch at least once a day.

**Mock data**
Until the backend lands, frontend pages read from `lib/mock-data.ts`. It must match the API contract issue exactly, so swapping to the real API later is a one-line change.

**Course rules we're tracking**
- At least 70% of the code must be hand-written *by each person*. Template code (the Supabase starter), libraries and anything LLM-generated count toward the other 30% and must be listed in the README. If you use generated code, add it to the README issue.
- 5 features minimum (4 members + 1). Each missing feature costs 3 points at the demo. Our features are tagged `feature` (F1–F6).
- Demo is Dec 2–4 with our TA; demoing before Dec 2 earns 3 bonus points.

**Glossary**
- **RLS (row-level security):** Postgres rules that decide which rows a logged-in user can read or change, so the database itself blocks e.g. deleting someone else's post.
- **Unique constraint:** a database rule that a combination (like user + resource) can only appear once. That's how we stop double-voting.
- **Middleware:** code that runs before every page/API request. Ours (`proxy.ts`) sends logged-out users to the login page.
EOF
gh issue pin "${NUM[WORK]}" --repo "$REPO" >/dev/null 2>&1 || echo "  (couldn't pin; pin it by hand)"

issue DECIDE "Decisions needed before we build" "setup,discussion" "Setup" <<'EOF'
Things the meeting and the A3 wireframes don't agree on, or that we haven't decided. Let's settle these in the next meeting and edit this issue with the answers.

**Scope**
- [ ] **Dashboard layout.** The A3 dashboard wireframe is one table of resources with a course filter. In the meeting we talked about organizing *courses* on the dashboard.
  - A: keep the wireframe — one page, filter by course / my courses, sort. (Recommended: fewer pages, it's what the dashboard issue assumes.)
  - B: course grid → click into a separate course board page. Adds a page and an issue.
- [ ] **Bookmarks / My Library, comments, Report link issue.** All appear in the A3 storyboard and resource details wireframe but not in the meeting's MVP list. In, out, or "after MVP if time"? Any of them would be an extra feature beyond F1–F6.
- [ ] **Likes/dislikes display.** Show both counts, or one net score? Does "Most liked" sort by likes or by net score?
- [ ] **Courses to seed.** Full McGill catalogue (storyboard says "all courses") or a demo set of ~30–50? Where does the list come from?
- [ ] **Name.** Wireframes say *CourseNotes*. Keep it?

**Technical**
- [ ] **Email confirmation.** Keep Supabase's confirmation email on? Without it, anyone can register with a made-up `@mail.mcgill.ca` address, so the McGill lock is just a text check.
- [ ] **TypeScript or JavaScript.** A3 says JavaScript; the starter repo is TypeScript. Pick one for our own files.
- [ ] **Counting likes/views for sorting.** Recommended: a Postgres view (`resources_with_stats`) that joins the counts, rather than storing counts in columns that can drift.
- [ ] **Where the demo runs.** Mimi or a hosted deploy (Vercel)? Ask our TA what they expect.
EOF

issue API "API contract (agree on this before building pages)" "setup,backend,frontend" "Setup" <<'EOF'
The exact requests and JSON responses for every endpoint. The frontend builds against these shapes using `lib/mock-data.ts`; the backend must return exactly these shapes. Change this issue (and tell the team) before changing a shape in code.

**Done when:** the whole team has 👍'd this issue and `lib/mock-data.ts` exists with sample data in these shapes.
**Depends on:** @DECIDE@ (dashboard layout, like/dislike display).
**Files:** `lib/mock-data.ts`, `lib/types.ts`

**General rules**
- All endpoints need a logged-in session (Supabase cookie). Not logged in → `401`.
- Errors always look like `{ "error": "Human-readable message" }` with status `400` (bad input), `401` (not logged in), `403` (not yours), `404` (doesn't exist).
- Dates are ISO strings in UTC.

**Courses**
```
GET /api/courses?q=comp&mine=true
200 {
  "courses": [
    { "id": 1, "code": "COMP 307", "title": "Principles of Web Development", "following": true }
  ]
}

POST   /api/enrollments   { "courseId": 1 }  → 201 { "courseId": 1, "following": true }
DELETE /api/enrollments   { "courseId": 1 }  → 200 { "courseId": 1, "following": false }
```

**Resources**
```
GET /api/resources?courseId=1&mine=true&q=forms&sort=recent      (sort: recent | likes | views)
200 {
  "resources": [
    {
      "id": 12,
      "title": "HTTP & HTML Forms",
      "fileType": "PDF",                       // PDF | DOCX | PPTX | ZIP | IMAGE | FOLDER | OTHER
      "course":   { "id": 1, "code": "COMP 307" },
      "uploader": { "id": "uuid", "name": "Maya Chen" },
      "createdAt": "2026-11-20T15:04:00Z",
      "likes": 14, "dislikes": 2, "views": 88,
      "myVote": 1,                              // 1, -1, or 0 if not voted
      "previewImage": "https://…"               // from Microlink, may be null
    }
  ]
}

GET /api/resources/12
200 { "resource": { …same fields as above…,
      "description": "A concise overview of…",
      "url": "https://drive.google.com/file/d/ABC123/view",
      "previewTitle": "HTTP Forms.pdf - Google Drive",   // may be null
      "isMine": false } }

POST /api/resources
     { "courseId": 1, "title": "…", "fileType": "PDF", "url": "https://…", "description": "…" }
201  { "resource": { …full resource… } }

DELETE /api/resources/12          → 204 (only the uploader; otherwise 403)
```

**Votes and views**
```
POST /api/resources/12/vote   { "value": 1 }      (1 like, -1 dislike, 0 remove)
200  { "likes": 15, "dislikes": 2, "myVote": 1 }

POST /api/resources/12/view
200  { "views": 89 }
```
EOF

issue SCHEMA "Database schema + row-level security" "setup,backend" "Setup" <<'EOF'
The tables everything else reads and writes. Every API issue is blocked on this.

**Done when:** `supabase/schema.sql` is in the repo, running it on a fresh Supabase project creates everything below, and a logged-in test user can read all resources but can't edit someone else's.
**Depends on:** @API@ (field names), @DECIDE@ (counting approach, courses to seed).
**Files:** `supabase/schema.sql`, `supabase/seed.sql`

- [ ] `profiles` — id (→ auth.users), display_name, created_at
- [ ] `courses` — id, code (`COMP 307`), title, subject
- [ ] `enrollments` — user_id, course_id; unique (user_id, course_id)
- [ ] `resources` — id, course_id, uploader_id, title, description, url, file_type, preview_title, preview_image, created_at
- [ ] `votes` — user_id, resource_id, value (1 / -1); unique (user_id, resource_id)
- [ ] `views` — user_id, resource_id, created_at; unique (user_id, resource_id)
- [ ] View `resources_with_stats` adding likes, dislikes, views counts (if that's what @DECIDE@ picks)
- [ ] RLS: logged-in users can read everything; insert/update/delete only rows where they are the owner
- [ ] Auto-create a `profiles` row when someone signs up (trigger)
- [ ] Seed courses
EOF

issue LAYOUT "Remove starter demo code + shared layout and navbar" "setup,frontend" "Setup" <<'EOF'
Clears out the Supabase starter's demo pieces and sets up the frame every page sits in.

**Done when:** no starter tutorial/demo UI is left, every logged-in page shows the same navbar, and colours/fonts come from shared tokens.
**Files:** `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `components/navbar.tsx`; delete `components/tutorial/*`, `deploy-button.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `app/protected/*`

- [ ] Delete the starter demo files listed above
- [ ] Logged-in navbar: logo, Dashboard, Share, (My Library only if @DECIDE@ says yes), user name, Log out
- [ ] Public header for landing/login: logo, How it works, Log in, Create account
- [ ] Colour and type tokens matching the wireframes (navy primary, white background)
EOF

issue README "README.txt: setup steps + code attribution" "setup" "Setup" <<'EOF'
The course requires a README.txt and fails the submission without one. It must say where the non-hand-written 30% of the code lives.

**Done when:** a teammate can clone the repo and run it using only the README, and every template/library/generated file is listed.
**Files:** `README.txt` (keep the starter's `README.md` or delete it, but the graded file is `.txt`)

- [ ] Team members and what each person built
- [ ] How to run locally: env vars (`NEXT_PUBLIC_SUPABASE_URL`, key), `npm install`, `npm run dev`, loading `schema.sql`
- [ ] Template code kept from the Supabase starter: `components/login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`, `components/ui/*` (shadcn), `lib/supabase/*`, `app/auth/*`
- [ ] Libraries and the external API (Microlink)
- [ ] Any LLM-generated code, by file
- [ ] Keep updated until submission
EOF

# ============================== FRONTEND ==============================
# Pages use lib/mock-data.ts until the "connect" issue.

issue LANDING "Landing page (/)" "frontend" "Frontend" <<'EOF'
The public front door. Required by the spec: it must introduce the site and lead to login.

**Done when:** `/` matches the wireframe, both buttons go to the right pages, and it looks right on a phone.
**Depends on:** @LAYOUT@
**Files:** `app/page.tsx`, `components/landing/*`

- [ ] Hero: headline, one-line pitch, Create account + Log in buttons
- [ ] Sample resource card illustration
- [ ] "How it works" three steps
- [ ] Footer
- [ ] Logged-in visitors get redirected to `/dashboard`
EOF

issue LOGIN "Login + registration pages" "frontend" "Frontend" <<'EOF'
Restyle the starter auth forms to match our design.

**Done when:** both pages match the wireframe, errors show inline, and a successful login lands on `/dashboard`.
**Depends on:** @LAYOUT@
**Files:** `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx`, `components/login-form.tsx`, `components/sign-up-form.tsx`

- [ ] Two-column layout with illustration, as in the wireframe
- [ ] Password show/hide toggle
- [ ] Clear message when a non-McGill email is used ("Use your @mail.mcgill.ca email")
- [ ] Links between login and sign-up
- [ ] Remember: these forms are starter-template code, so they're listed in the README
EOF

issue DASH "Dashboard: resource table, course filter, search, sort, follow" "frontend" "Frontend" <<'EOF'
The main page after login. Built as in the wireframe (option A in @DECIDE@). If the team picks option B, this issue gets split.

**Done when:** on mock data you can filter by a course or "My courses", search, change the sort, follow/unfollow a course, and click through to a resource.
**Depends on:** @LAYOUT@, @API@
**Files:** `app/dashboard/page.tsx`, `components/dashboard/*`

- [ ] Course dropdown: All courses / My courses / each course
- [ ] Follow / Unfollow button when a single course is selected
- [ ] Search box (title or topic)
- [ ] Sort dropdown: Most recent (default) / Most liked / Most viewed
- [ ] Table: file-type icon, course, title, shared by, likes, views, View details button
- [ ] Share resource button → `/share`
- [ ] Empty states: no results, following no courses
EOF

issue EMBED "Google Drive embed component" "frontend" "Frontend" <<'EOF'
Shows a Drive file inside our page instead of only linking out. Its own component so it doesn't conflict with the resource page.

**Done when:** given any Drive/Docs URL, the component shows the file inline; for anything it can't embed, it shows the preview card + Open button.
**Depends on:** nothing (pure frontend)
**Files:** `components/drive-embed.tsx`, `lib/drive.ts`

- [ ] `lib/drive.ts`: turn a share URL into an embed URL
  - `drive.google.com/file/d/<ID>/view` and `open?id=<ID>` → `https://drive.google.com/file/d/<ID>/preview`
  - `docs.google.com/document|presentation|spreadsheets/d/<ID>/…` → same URL ending in `/preview`
  - folders, other sites → `null`
- [ ] `<DriveEmbed url previewImage previewTitle />`: iframe when there's an embed URL, otherwise a preview card
- [ ] Always show an "Open in Google Drive" button (private files show Google's access screen in the iframe)
- [ ] Iframe scales on mobile
EOF

issue DETAILS "Resource details page (/resources/[id])" "frontend" "Frontend" <<'EOF'
Where someone actually reads a shared resource.

**Done when:** on mock data the page matches the wireframe, shows the embed, and like/dislike buttons update their counts.
**Depends on:** @LAYOUT@, @API@, @EMBED@
**Files:** `app/resources/[id]/page.tsx`, `components/resource/*` (not `drive-embed.tsx`)

- [ ] Header: course code, title, "by <uploader>"
- [ ] "Resource access" panel using `<DriveEmbed />`
- [ ] Like / dislike buttons with counts, highlighted when it's your vote
- [ ] View count
- [ ] "About this resource" description and "Shared by" sidebar
- [ ] Delete button only when `isMine`
- [ ] Back to dashboard link
- [ ] Bookmark / Report / Comments from the wireframe: only if @DECIDE@ keeps them
EOF

issue SHARE "Share-a-resource page (/share)" "frontend" "Frontend" <<'EOF'
The form for posting a Drive (or other cloud) link.

**Done when:** on mock data the form validates, shows a preview card after a link is pasted, and redirects to the new resource on submit.
**Depends on:** @LAYOUT@, @API@
**Files:** `app/share/page.tsx`, `components/share/*`

- [ ] Fields: course, title, file type, sharing link, description
- [ ] Pre-select the course when opened from a filtered dashboard (`/share?courseId=1`)
- [ ] "Before you share" sidebar: upload to your own Drive, set sharing to *Anyone with the link → Viewer*, paste the link
- [ ] Inline errors: missing fields, not a URL
- [ ] Cancel → back to dashboard
EOF

# =============================== BACKEND ===============================

issue F1 "F1: McGill-only sign-up + protected routes" "backend,feature" "Backend" <<'EOF'
Only McGill students can join, and nothing private is reachable without logging in. The spec says a "clever user" must not get around this, so the check has to happen on the server.

**Done when:** signing up with a non-McGill email fails even if you bypass the form (e.g. calling Supabase directly), and every private page and `/api/*` route rejects logged-out requests.
**Depends on:** @SCHEMA@, @DECIDE@ (email confirmation)
**Files:** `proxy.ts`, `lib/supabase/proxy.ts`, `app/api/auth/*` if needed, Supabase auth settings

- [ ] Allow only emails ending in `@mail.mcgill.ca` or `@mcgill.ca`, enforced server-side (API route or Supabase auth hook)
- [ ] Email confirmation on/off as decided
- [ ] Middleware redirects logged-out users from `/dashboard`, `/share`, `/resources/*` to `/auth/login`
- [ ] `/api/*` returns `401` JSON when logged out (not a redirect)
- [ ] Test each private route in a private window
EOF

issue F2 "F2: Courses + follow API" "backend,feature" "Backend" <<'EOF'
Lets students find courses and follow the ones they take.

**Done when:** the endpoints return exactly the shapes in @API@, and following/unfollowing twice in a row doesn't error or duplicate.
**Depends on:** @SCHEMA@, @API@
**Files:** `app/api/courses/route.ts`, `app/api/enrollments/route.ts`

- [ ] `GET /api/courses?q=&mine=` with `following` per course
- [ ] `POST /api/enrollments`, `DELETE /api/enrollments`
- [ ] 400 for a missing/invalid courseId, 404 for a course that doesn't exist
EOF

issue F3 "F3: Resources API" "backend,feature" "Backend" <<'EOF'
Create, list, read and delete shared resources.

**Done when:** all four endpoints match @API@, sorting and filters work together (e.g. My courses + Most liked), and deleting someone else's resource returns 403.
**Depends on:** @SCHEMA@, @API@
**Files:** `app/api/resources/route.ts`, `app/api/resources/[id]/route.ts`

- [ ] `GET /api/resources` with `courseId`, `mine`, `q`, `sort`
- [ ] `GET /api/resources/[id]` including `myVote` and `isMine`
- [ ] `POST /api/resources`: check required fields, URL starts with `http(s)://`, title ≤ 120 chars, course exists; calls F4 for the preview
- [ ] `DELETE /api/resources/[id]`: uploader only
EOF

issue F4 "F4: Microlink link previews (external API)" "backend,feature" "Backend" <<'EOF'
Our required external API call. When a link is shared, ask Microlink for its title and thumbnail and save them.

**Done when:** sharing a Drive link stores a preview title/image, and if Microlink is down or slow the resource still saves (with nulls) within a few seconds.
**Depends on:** @SCHEMA@
**Files:** `lib/microlink.ts`

- [ ] `getPreview(url)` → `{ title, image }` using `https://api.microlink.io?url=…`
- [ ] 3–5 second timeout; return nulls on any failure
- [ ] Used by `POST /api/resources` (F3)
- [ ] Optional: `GET /api/preview?url=` so the share page can show the card before submitting
EOF

issue F5 "F5: Like / dislike API" "backend,feature" "Backend" <<'EOF'
One vote per student per resource; changing your mind updates the vote.

**Done when:** voting matches @API@, clicking like twice doesn't count twice, and switching like → dislike updates both counts.
**Depends on:** @SCHEMA@, @API@
**Files:** `app/api/resources/[id]/vote/route.ts`

- [ ] `value` 1 / -1 upserts the vote; 0 deletes it
- [ ] Reject any other value with 400
- [ ] Return new likes, dislikes and myVote
EOF

issue F6 "F6: View count API" "backend,feature" "Backend" <<'EOF'
Counts how many students opened a resource.

**Done when:** opening a resource increases its view count once per student (refreshing doesn't inflate it), and the count shows in list and detail responses.
**Depends on:** @SCHEMA@, @API@
**Files:** `app/api/resources/[id]/view/route.ts`

- [ ] Insert into `views`, ignoring duplicates
- [ ] Return the new total
- [ ] Resource page calls it once on load
EOF

issue CONNECT "Switch the frontend from mock data to the real API" "frontend,backend" "Backend" <<'EOF'
Where everything gets wired together. Small if the contract was followed.

**Done when:** `lib/mock-data.ts` is no longer imported anywhere, and the full flow works against Supabase: register → follow a course → share a link → see it on the dashboard → open it → like it → view count goes up.
**Depends on:** @DASH@, @DETAILS@, @SHARE@, @F1@, @F2@, @F3@, @F4@, @F5@, @F6@
**Files:** `lib/api.ts` (fetch helpers), plus the import lines in each page

- [ ] Fetch helpers for each endpoint in @API@
- [ ] Loading and error states on each page
- [ ] Walk through the full flow above with two different accounts
EOF

# =============================== POLISH ===============================

issue EDGE "Edge-case pass" "polish" "Polish" <<'EOF'
The grader's tryout gives 25 points for "features run well (completion, bugs, speed, edge cases)" and uses the site without us explaining anything.

**Done when:** every item below behaves sensibly with no crashes or blank screens.
**Depends on:** @CONNECT@

- [ ] Empty, malformed and non-Drive URLs; very long titles and descriptions
- [ ] Sharing the same link twice
- [ ] Private Drive file (not "anyone with the link")
- [ ] Deleting someone else's resource via the API directly
- [ ] Nonexistent course/resource IDs → proper 404 page
- [ ] Every private page and API route while logged out
- [ ] Double-clicking like/submit buttons
- [ ] Microlink down
EOF

issue MOBILE "Mobile responsiveness pass" "polish,frontend" "Polish" <<'EOF'
The grading includes "responsive" under appearance.

**Done when:** every page is usable at 375px (phone) and 768px (tablet) wide with no sideways scrolling.
**Depends on:** @CONNECT@

- [ ] Navbar collapses into a menu
- [ ] Dashboard table becomes cards on small screens
- [ ] Drive embed and forms fit the width
EOF

issue DEMO "Demo setup and booking" "polish" "Polish" <<'EOF'
**Done when:** the app runs where we'll demo it, we've rehearsed, and the appointment is booked.
**Depends on:** @DECIDE@ (where it runs), @EDGE@

- [ ] Deploy/run on the chosen platform and test the full flow there
- [ ] Demo accounts and seeded resources ready
- [ ] 5-minute walkthrough script covering all six features
- [ ] Book the grader (Prof and TA Coordinates sheet on myCourses), aiming before Dec 2 for the bonus
- [ ] README.txt final check before code submission
EOF

echo
echo "Done. Created ${#NUM[@]} issues. Pinned: #${NUM[WORK]}"
