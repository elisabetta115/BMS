# BoostMySkills

A Next.js platform for managing and delivering micro-credentials and micro-programmes. Learners can browse the catalogue, enrol in courses, track their progress, download certificates, and manage their profile. Admins can create and manage all content from a dedicated panel.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
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
│       ├── profile/              # Get & update user profile
│       └── units/                # Unit completion tracking
├── components/
│   ├── Header.tsx                # Sticky nav with auth-aware dropdowns
│   └── Footer.tsx                # Public pages footer
└── lib/
    ├── auth.ts                   # JWT, bcrypt, session helpers
    ├── db.ts                     # Database access layer (Prisma + Supabase fallback)
    └── prisma.ts                 # Prisma client singleton
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-migration.sql` in the SQL Editor
3. Copy your project URL and keys

### 2. Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

### 3. Prisma

```bash
npx prisma generate
npx prisma db push
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create the first admin user

Register a normal account, then run this in the Supabase SQL Editor (or psql):

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

### 6. Deploy to AWS Amplify

1. Push this repo to GitHub
2. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify) (eu-north-1)
3. Click **New app → Host web app** and connect your GitHub repo
4. Add all environment variables from step 2 in the Amplify environment settings
5. Amplify builds and deploys automatically on every push to `main`
