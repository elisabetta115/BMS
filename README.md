# BoostMySkills

Next.js platform for micro-credentials and learning programmes. AWS Amplify + Supabase.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **Auth**: Custom JWT sessions (httpOnly cookies, bcrypt hashing)
- **Deployment**: AWS Amplify (eu-north-1)

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-migration.sql` in the SQL Editor
3. Copy your project URL and keys

### 2. Environment Variables
Create a `.env` file with:
```
DIRECT_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
JWT_SECRET="run: openssl rand -base64 32"
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

### 5. Deploy to AWS Amplify
1. Push this repo to GitHub
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify) (eu-north-1)
3. Click **New app → Host web app** and connect your GitHub repo
4. Add all environment variables from step 2 in the Amplify environment settings
5. Amplify will build and deploy automatically on every push to `main`

## Security
- bcrypt (12 rounds), JWT httpOnly/Secure/SameSite cookies
- Rate limiting (10/15min), timing-attack-resistant login
- Input validation server+client, security headers via middleware
- Password policy: 8+ chars, upper, lower, number
