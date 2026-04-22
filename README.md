# BoostMySkills

Next.js reproduction of [BoostMySkills.eu](https://boostmyskills.eu/) with authentication. Vercel + Supabase.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma (with Supabase JS fallback)
- **Auth**: Custom JWT sessions (httpOnly cookies, bcrypt hashing)
- **Deployment**: Vercel

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-migration.sql` in the SQL Editor
3. Copy your project URL and keys

### 2. Environment Variables
Copy `.env` and fill in your values:
```
DATABASE_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Prisma
```bash
npx prisma generate
npx prisma db push
```

### 4. Run
```bash
npm run dev
```

### 5. Deploy
```bash
npx vercel
```
Set env vars in Vercel dashboard. `vercel.json` runs `prisma generate` before build.

## Security
- bcrypt (12 rounds), JWT httpOnly/Secure/SameSite cookies
- Rate limiting (10/15min), timing-attack-resistant login
- Input validation server+client, security headers via middleware
- Password policy: 8+ chars, upper, lower, number
