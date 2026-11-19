#!/usr/bin/env bash
# Creates labels, milestones and MVP issues for the notes-sharing-app repo.
# Needs the GitHub CLI (https://cli.github.com) logged in: run `gh auth login` first.
# Usage: bash create_issues.sh
set -euo pipefail

REPO="0jas0jas/notes-sharing-app"

echo "Creating labels..."
mk_label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
mk_label "setup"    "c5def5" "Project setup and housekeeping"
mk_label "frontend" "1d76db" "Pages, components, styling"
mk_label "backend"  "5319e7" "API routes, database, auth"
mk_label "feature"  "0e8a16" "Counts toward the required feature total"
mk_label "polish"   "fbca04" "Edge cases, responsiveness, demo prep"

echo "Creating milestones..."
mk_milestone() {
  gh api "repos/$REPO/milestones" -f title="$1" -f due_on="$2" -f description="$3" >/dev/null 2>&1 \
    || echo "  (milestone '$1' may already exist, skipping)"
}
mk_milestone "Setup"    "2026-11-17T04:59:59Z" "Schema, layout, README. Unblocks everyone."
mk_milestone "Frontend" "2026-11-21T04:59:59Z" "Functional UI on mock data by Nov 20."
mk_milestone "Backend"  "2026-11-28T04:59:59Z" "Working API + DB by Nov 27."
mk_milestone "Polish"   "2026-12-02T04:59:59Z" "Edge cases, mobile, demo-ready before Dec 2 (bonus)."

echo "Creating issues..."
issue() { # title, labels, milestone, body
  gh issue create --repo "$REPO" --title "$1" --label "$2" --milestone "$3" --body "$4" >/dev/null
  echo "  + $1"
}

# ---------- Setup ----------
issue "Database schema + row-level security" "setup,backend" "Setup" \
"Everything else depends on this, so it goes first.

Tables:
- [ ] \`profiles\` (id → auth.users, display name, created_at)
- [ ] \`courses\` (code e.g. COMP 307, title, faculty/subject)
- [ ] \`enrollments\` (user_id, course_id) — which courses a user follows
- [ ] \`resources\` (id, course_id, uploader_id, title, description, url, link_type, preview_title, preview_image, created_at)
- [ ] \`votes\` (user_id, resource_id, value ±1) — unique on (user_id, resource_id)
- [ ] \`views\` (user_id, resource_id) — unique on (user_id, resource_id)
- [ ] RLS: anyone logged in can read; users can only insert/update/delete their own rows
- [ ] Seed a starter set of McGill courses (enough to demo)
- [ ] Commit the SQL to the repo (e.g. \`supabase/schema.sql\`) so everyone can recreate it"

issue "Clean out starter template + shared layout and navbar" "setup,frontend" "Setup" \
"- [ ] Remove \`components/tutorial/*\`, deploy button, Next/Supabase logos, \`/protected\` demo page
- [ ] Shared layout with navbar (logo, Dashboard, Share, profile/logout)
- [ ] Colour + type tokens in \`globals.css\` / Tailwind config so pages look consistent"

issue "README: setup steps + template/library attribution" "setup" "Setup" \
"Course requires README.txt and listing where the non-hand-written code lives.
- [ ] How to run locally (env vars, \`npm install\`, \`npm run dev\`)
- [ ] List starter-template files we kept (auth forms, \`components/ui/*\`, \`lib/supabase/*\`)
- [ ] List libraries and the external API (Microlink)
- [ ] Keep updated as we go"

# ---------- Frontend (mock data OK until backend lands) ----------
issue "Landing page (/)" "frontend" "Frontend" \
"Public page that introduces the site and links to login/register (required by spec).
- [ ] Hero + short pitch, how it works, CTA to sign up
- [ ] Responsive"

issue "Restyle login + register pages" "frontend" "Frontend" \
"Build on the starter forms in \`components/login-form.tsx\` and \`sign-up-form.tsx\`.
- [ ] Match site styling
- [ ] Show a clear error when a non-McGill email is used"

issue "Dashboard: course catalog, search, My courses toggle, follow" "frontend" "Frontend" \
"- [ ] Course grid/list
- [ ] Search box (code or title)
- [ ] Toggle: My courses / All courses
- [ ] Follow / unfollow button on each course
- [ ] Empty state when following nothing"

issue "Course board page (/courses/[code])" "frontend" "Frontend" \
"- [ ] List of resource cards (title, uploader, date, likes, views, preview thumbnail)
- [ ] Sort dropdown: Most recent (default) / Most liked / Most viewed
- [ ] Share-a-resource button for this course
- [ ] Empty state"

issue "Resource page (/resources/[id])" "frontend" "Frontend" \
"- [ ] Title, description, uploader, date
- [ ] Embedded Drive preview (see Drive embed issue) or link preview card
- [ ] Like / dislike buttons with counts
- [ ] View count
- [ ] Open-original link"

issue "Share-a-resource page (/share)" "frontend" "Frontend" \
"Links only for now (Google Drive and other cloud links).
- [ ] Fields: title, course (picker), link URL, short description
- [ ] Show preview card after the link is pasted
- [ ] Hint telling users to set Drive sharing to 'Anyone with the link'
- [ ] Inline validation errors"

# ---------- Backend features ----------
issue "F1: McGill-only sign-up + protected routes" "backend,feature" "Backend" \
"- [ ] Server-side check that email ends in @mail.mcgill.ca or @mcgill.ca (not just in the form)
- [ ] Decide: keep Supabase confirmation email on (otherwise anyone can type a fake McGill address)
- [ ] Middleware (\`proxy.ts\`) redirects logged-out users away from every private page and API route
- [ ] Test: hitting /dashboard or /api/* while logged out fails"

issue "F2: Courses + enrollments API" "backend,feature" "Backend" \
"- [ ] \`GET /api/courses?q=&mine=true\`
- [ ] \`POST /api/enrollments\` (follow), \`DELETE /api/enrollments\` (unfollow)
- [ ] JSON responses, proper status codes"

issue "F3: Resources API" "backend,feature" "Backend" \
"- [ ] \`GET /api/courses/[code]/resources?sort=recent|likes|views\`
- [ ] \`GET /api/resources/[id]\`
- [ ] \`POST /api/resources\` — validate URL (http/https, sane length), course exists
- [ ] \`DELETE /api/resources/[id]\` — only the uploader"

issue "F4: Microlink preview on link submit" "backend,feature" "Backend" \
"External API requirement.
- [ ] On POST, call Microlink for the URL, save title + thumbnail to the resource row
- [ ] If Microlink fails or times out, still save the resource with a fallback card"

issue "Google Drive embed on resource page" "frontend,feature" "Backend" \
"- [ ] Parse Drive file IDs from \`drive.google.com/file/d/<ID>/...\` and \`open?id=<ID>\` links
- [ ] Render \`https://drive.google.com/file/d/<ID>/preview\` in an iframe
- [ ] Docs/Slides/Sheets links: use their \`/preview\` URLs too
- [ ] Folders and non-Drive links: fall back to the Microlink card + 'Open' button
- [ ] Private files show Google's access screen — always show an 'Open in Drive' button too"

issue "F5: Like / dislike" "backend,feature" "Backend" \
"- [ ] \`POST /api/resources/[id]/vote\` with value 1 / -1 / 0 (remove)
- [ ] One vote per user (unique constraint), switching vote updates it
- [ ] Return new totals"

issue "F6: View count" "backend,feature" "Backend" \
"- [ ] Record a view when a logged-in user opens a resource
- [ ] Count each user once per resource (unique constraint)
- [ ] Expose count in resource list + detail responses"

# ---------- Polish ----------
issue "Edge-case pass" "polish" "Polish" \
"Graders test edge cases in the tryout (25 pts).
- [ ] Bad/empty URLs, very long titles, duplicate submissions
- [ ] Deleting or editing someone else's resource
- [ ] Nonexistent course/resource → 404 page
- [ ] API errors show friendly messages, not crashes
- [ ] Logged-out access to every private route"

issue "Mobile responsiveness pass" "polish,frontend" "Polish" \
"- [ ] Check every page at phone and tablet widths
- [ ] Navbar collapses, cards stack, iframe scales"

issue "Decide where the demo runs and test it there" "polish" "Polish" \
"- [ ] Mimi vs hosted deploy (check with TA)
- [ ] Full run-through on the demo machine/URL
- [ ] Book the grader appointment (bonus if before Dec 2)"

echo "Done."
