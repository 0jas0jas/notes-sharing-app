# Notes Sharing App — COMP 307

A notes sharing platform for McGill students. Built with **Next.js** (frontend + API routes), **Supabase** (Postgres database + auth), and the **Microlink API** (link previews).

> This is our **dev setup guide**. The README.txt for the final submission (site URL, team table, the 30% list) is a separate file. See [Before we submit](#before-we-submit).

---

## 1. Install the tools

You need **Git** and **Bun**. Bun replaces npm/node for installing packages and running scripts.

### Install Bun

**macOS / Linux**
```bash
curl -fsSL https://bun.sh/install | bash
```
Then restart your terminal (or run `source ~/.zshrc` / `source ~/.bashrc`).

**Windows** (PowerShell)
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```
Then close and reopen PowerShell.

**Check it worked**
```bash
bun --version
```

### Install Git (if you don't have it)
- macOS: `xcode-select --install`
- Windows: https://git-scm.com/download/win
- Check: `git --version`

---

## 2. Get the code

We use **forks + feature branches**. Don't push straight to the main repo.

1. On GitHub, fork `0jas0jas/notes-sharing-app` to your own account.
2. Clone **your fork**:
   ```bash
   git clone https://github.com/<your-username>/notes-sharing-app.git
   cd notes-sharing-app
   ```
3. Link the main repo as `upstream` so you can pull everyone's changes:
   ```bash
   git remote add upstream https://github.com/0jas0jas/notes-sharing-app.git
   ```

---

## 3. Install dependencies

```bash
bun install
```

Run this again whenever someone adds a package (if `package.json` changed after you pulled).

---

## 4. Set up environment variables

Secrets live in `.env.local`, which is **gitignored. Never commit it.**

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```
   (Windows PowerShell: `Copy-Item .env.example .env.local`)
2. Fill in the values. Get them from the team chat, or from **Supabase Dashboard → Project Settings → API**.

```env
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>

# Microlink (optional: the free tier works without a key)
MICROLINK_API_KEY=
```

Notes:
- Anything starting with `NEXT_PUBLIC_` is visible in the browser. That's fine for the anon key, because Row Level Security protects the data.
- **Never** put the Supabase `service_role` / secret key in a `NEXT_PUBLIC_` variable, and never commit it.
- After changing `.env.local`, restart `bun dev`.

---

## 5. Run the project

```bash
bun dev
```

Open http://localhost:3000.

Other scripts:

| Command | What it does |
|---|---|
| `bun dev` | Start the dev server with hot reload |
| `bun run build` | Production build. Run this before opening a PR to catch errors |
| `bun start` | Run the production build locally |
| `bun run lint` | Check for lint errors |
| `bun add <pkg>` | Add a package (tell the team, it counts toward our 30%) |

---

## 6. Database

We manage the schema **through the Supabase dashboard SQL Editor**, but **every SQL statement we run is also saved in the repo**. The grader can only credit SQL that's in our source code, and it keeps everyone's database knowledge in sync.

```
dbSQLScripts/
  01_schema.sql     -- tables
  02_policies.sql   -- Row Level Security policies
  03_seed.sql       -- test data for the demo
```

**Workflow for any schema change:**
1. Write the SQL in the right `dbSQLScripts/` file, or in a new numbered file such as `04_add_tags.sql`.
2. Paste it into **Dashboard → SQL Editor** and run it.
3. Commit the file in the same PR as the code that uses it.
4. Post in the team chat that you changed the schema.

**Rules:**
- Use the **SQL Editor**, not the Table Editor. Click-to-add columns leave no SQL behind.
- Don't edit an old `create table` after it's been run. Add an `alter table ...` statement instead, so the files always match the real database.
- Every table needs RLS turned on, with policies.

---

## 7. Git workflow

```bash
# 1. Start from the latest main
git checkout main
git pull upstream main

# 2. Make a branch for your issue
git checkout -b feat/<short-name>      # e.g. feat/note-comments

# 3. Work, then commit
git add .
git commit -m "Add comments to note page"

# 4. Push to YOUR fork
git push origin feat/<short-name>
```

Then open a Pull Request on GitHub from your branch into `0jas0jas/notes-sharing-app` `main`, and link the issue (`Closes #12`).

**Keeping your branch up to date:**
```bash
git pull upstream main
```

---

## 8. Course rules we must follow

These affect our grade directly.

- **Put your name at the top of every file you write.** The grader greps for it.
  ```js
  // Author: Your Name
  ```
  If several people worked on a file, list everyone.
- **At least 70% of the code must be hand-written.** Templates, UI kits, copied snippets and AI-generated code all count toward the **30%**. Whenever you use any of these, add a line to `THIRD_PARTY.md` saying which file, what it is and where it came from. We need this list for the final README.txt.
- **Login must actually protect pages.** Private routes are checked on the server (middleware), not just hidden in the UI.
- **Only `@mail.mcgill.ca` emails can register.**

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `bun: command not found` | Restart your terminal. If it still fails, rerun the install command. |
| Supabase errors / `Invalid API key` | Check `.env.local` values, then restart `bun dev`. |
| Page loads but no data | Probably RLS. Check the policies for that table in `dbSQLScripts/02_policies.sql`. |
| Port 3000 in use | `bun dev -- -p 3001` |
| Weird errors after pulling | `bun install`, then restart `bun dev`. If it's still broken, delete `.next/` and try again. |

---

## Before we submit

The final submission needs a separate **README.txt** with:
- [ ] The URL of the running website
- [ ] A table with each teammate's name, student ID and the code they worked on
- [ ] A description of the 30% not coded by us (from `THIRD_PARTY.md`)

Deadlines: demo **Dec 2–4** (+3 bonus if before Dec 2), code on myCourses by **Dec 7** (+2 bonus if before Dec 4). **Each person submits.**
