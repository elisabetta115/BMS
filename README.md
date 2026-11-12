# BoostMySkills

A Next.js platform for managing and delivering micro-credentials and micro-programmes. Learners can browse the catalogue, enrol in courses, track their progress, download certificates, and manage their profile. Admins can create and manage all content from a dedicated panel.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Amazon RDS for PostgreSQL (eu-north-1)
- **ORM**: Prisma (via `@prisma/adapter-pg`)
- **Auth**: Custom JWT sessions (httpOnly cookies, bcrypt hashing)
- **PDF generation**: pdf-lib (certificate stamping)
- **Deployment**: AWS Amplify (eu-north-1)

## Features

### Public catalogue
- Browse all micro-credentials (`/courses`) and micro-programmes (`/programs`)
- Filter by Project, Organisation, and Programme; free-text search
- Card height equalisation across grid rows
- Footer hidden when logged in

### Learner dashboard
- **My Micro-programmes** — enrolled programmes with progress, status badges, certificate download, filter by Project and Status (Completed / In progress / Not started)
- **My Micro-credentials** — enrolled credentials with grade, status badges, certificate download, filter by Project, Organisation, Programme, and Status
- **My Profile** — update full name, email, country (dropdown of all countries), and password; current password required for any change

### Admin panel (`/admin`)
- Create, edit, and delete micro-credentials and micro-programmes
- Build course structure: sections → subsections → units (video, quiz, exam, presentation)
- Upload PPTX/PDF slide decks and images
- Configure and preview certificate templates per project (drag name/title position, font sizes)
- Manage user enrolments

### Certificates
- PDF certificate generated server-side with pdf-lib
- Learner name and credential/programme title stamped at configurable positions
- Download available from dashboard once a learner passes

### Analytics API (`/api/analytics`)
Read-only, aggregate figures about learners, programmes and micro-credentials, built so an
AI agent can use them later. No endpoint returns learners' names, emails or ids; site admins are
left out of every figure.

| Endpoint | What it returns |
| --- | --- |
| `GET /api/analytics` | The catalogue: every endpoint with a description and a JSON Schema of its inputs (ready to turn into agent tools), plus how each metric is defined |
| `GET /api/analytics/overview?from=&to=` | All-time totals and what happened in a period (default: last 30 days) |
| `GET /api/analytics/timeseries?metric=&interval=&from=&to=` | One metric per day / week / month: `new_learners`, `programme_enrolments`, `credential_enrolments`, `unit_completions`, `active_learners` (optional `credentialId` / `programmeId`) |
| `GET /api/analytics/credentials?project=&from=&to=` | Every micro-credential: enrolled, started, passed, rates, average grade |
| `GET /api/analytics/credentials/{id}` | One micro-credential: grade spread, completion of each unit, how hard each quiz question is |
| `GET /api/analytics/programmes?project=&from=&to=` | Every micro-programme: enrolled, started, completed |
| `GET /api/analytics/learners?from=&to=` | Learners by country, gender, verified email and number of enrolments |

Dates are `YYYY-MM-DD` (UTC) and both `from` and `to` are included. Access: a signed-in site
admin, or `Authorization: Bearer $ANALYTICS_API_KEY` (at least 32 characters; key access is off
while it's unset). Grades are worked out as in `src/lib/grading.ts`.

```bash
curl -H "Authorization: Bearer $ANALYTICS_API_KEY" https://YOUR-SITE/api/analytics/overview
```

### Content API (`/api/content`)
Lets an AI agent (or a script) enter micro-credentials: read them, create them with all their
content, update drafts, and upload lesson files. It saves through the same code as the admin editor
(`src/lib/credential-sync.ts`), so learners keep their progress. It can't publish or delete anything.

| Endpoint | What it does |
| --- | --- |
| `GET /api/content` | The catalogue: every endpoint with a description and a JSON Schema of its inputs, plus the rules |
| `GET /api/content/micro-credentials?search=&project=` | The micro-credentials, and the project names in use (with or without a certificate template) |
| `GET /api/content/micro-credentials/{id}` | One micro-credential with all its content, ids and right answers, in the exact shape update takes |
| `POST /api/content/micro-credentials` | Create one with all its content (optional `programmeId`) |
| `PATCH /api/content/micro-credentials/{id}` | Change it: only the fields sent; `sections` replaces the content (parts keep their ids) |
| `GET /api/content/micro-programmes` | The micro-programmes and their micro-credentials |
| `POST /api/content/uploads` | A 5-minute link to PUT one lesson file (PDF, PPTX, PPT, XLSX, XLS) to S3, giving its `fileKey` |

- `?dryRun=true` on create/update checks everything and reports what would happen, without saving.
- Every problem in the input comes back at once, with where it is (`sections[0]...units[2].weight: ...`).
- Creating a micro-credential with the same title and code as an existing one is refused (409) unless `?allowDuplicate=true`.
- An update that would delete units or questions learners have worked on is refused (409) unless `?allowProgressLoss=true`.
- What it creates is a **draft**: learners don't see it until an admin ticks **Published** in the
  admin panel. It can only change drafts: an update to a published micro-credential is refused
  (409), so every change learners see goes through an admin.

Access: a signed-in site admin, or `Authorization: Bearer $CONTENT_API_KEY` (at least 32
characters). It's a different key from `ANALYTICS_API_KEY`, so the read-only key can't change courses.

### Draft micro-credentials
A micro-credential can be a draft (`micro_credentials.published = false`): only the people who can
edit it see it (site admins, and programme admins of a programme it's in), with a **Draft** badge in
the admin panel. Everyone else gets it as if it didn't exist: it's left out of the catalogue and of
programme pages, nobody can enrol, and it doesn't count towards a programme's completion or
certificate. Learners already enrolled in a course that goes back to draft keep access to it.
The **Published** checkbox in the micro-credential editor switches it; courses made in the admin
panel are published by default.

### Authentication & security
- Register, login, logout
- bcrypt password hashing (12 rounds)
- JWT stored in httpOnly / Secure / SameSite cookies (7-day expiry)
- Rate limiting (10 requests / 15 min on auth endpoints)
- Password policy: 8+ characters, uppercase, lowercase, number
- Input validation on both client and server
- Security headers via Next.js middleware

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Homepage
│   ├── courses/                  # Micro-credentials catalogue
│   ├── programs/                 # Micro-programmes catalogue
│   ├── credentials/[id]/         # Public credential detail
│   ├── programs/[id]/            # Public programme detail
│   ├── dashboard/
│   │   ├── page.tsx              # Learner dashboard home
│   │   ├── my-credentials/       # Enrolled credentials list
│   │   ├── my-programmes/        # Enrolled programmes list
│   │   ├── profile/              # Edit personal info & password
│   │   ├── credentials/[id]/     # Credential learning view
│   │   └── programmes/[id]/      # Programme learning view
│   ├── admin/                    # Admin panel
│   ├── login/                    # Sign in
│   ├── register/                 # Create account
│   ├── about/
│   ├── tos/
│   ├── privacy/
│   ├── cookie_policy/
│   └── api/
│       ├── auth/                 # login, logout, register, session
│       ├── micro-credentials/    # CRUD + progress
│       ├── micro-programmes/     # CRUD
│       ├── enrollments/          # Enrol & list
│       ├── certificates/         # Generate & download PDFs
│       ├── images/               # Serve credential/programme images
│       ├── analytics/            # Read-only analytics for admins / an AI agent
│       ├── content/              # Enter micro-credentials (for an AI agent or a script)
│       ├── profile/              # Get & update user profile
│       └── units/                # Unit completion tracking
├── components/
│   ├── Header.tsx                # Sticky nav with auth-aware dropdowns
│   └── Footer.tsx                # Public pages footer
└── lib/
    ├── auth.ts                   # JWT, bcrypt, session helpers
    ├── db.ts                     # Database access layer (Prisma)
    └── prisma.ts                 # Prisma client singleton (pg adapter)
```

## Setup

### 1. Database — Amazon RDS for PostgreSQL

1. RDS console → Create database → **PostgreSQL**, Free tier / `db.t4g.micro`, single-AZ,
   20 GiB gp3, **Public access: Yes**, initial database name `bms`.
2. Security group inbound: allow port `5432` from your IP (and `0.0.0.0/0` for Amplify).
3. Note the endpoint (`*.rds.amazonaws.com`) and master password.

### 2. Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@YOUR-ENDPOINT.eu-north-1.rds.amazonaws.com:5432/bms"
DIRECT_URL="postgresql://postgres:PASSWORD@YOUR-ENDPOINT.eu-north-1.rds.amazonaws.com:5432/bms"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
# Optional: lets an agent or a script call /api/analytics/* (run: openssl rand -base64 32)
ANALYTICS_API_KEY=""
# Optional: lets an agent or a script enter micro-credentials via /api/content/* (a different key)
CONTENT_API_KEY=""
```

RDS has no separate pooled port, so `DATABASE_URL` and `DIRECT_URL` are identical.
TLS is handled in code (`src/lib/prisma.ts`, `prisma/seed.mjs`) — don't add `?sslmode=`,
it conflicts with the driver's SSL config.

### 3. Prisma

```bash
npx prisma generate
npx prisma db push          # creates the 12 tables (or: psql "$DATABASE_URL" -f prisma/init.sql)
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create the first admin user

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='YourStrongPass1' ADMIN_NAME='You' npx prisma db seed
```

Or register a normal account, then promote it:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

### 6. Deploy to AWS Amplify

1. Push this repo to GitHub
2. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify) (eu-north-1)
3. Click **New app → Host web app** and connect your GitHub repo
4. Add all environment variables from step 2 in the Amplify environment settings
5. Amplify builds and deploys automatically on every push to `main`
