-- BoostMySkills — full schema DDL
-- Generated from prisma/schema.prisma with:
--   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- Safe to run once against an empty database:
--   psql "postgresql://USER:PASS@your-rds-endpoint:5432/bms?sslmode=require" -f init.sql

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('VIDEO', 'QUIZ', 'EXAM', 'PRESENTATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "country" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_credentials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "description" TEXT,
    "overview" TEXT,
    "objectives" TEXT,
    "image" TEXT,
    "image_data" BYTEA,
    "image_mime" TEXT,
    "developed_by" TEXT,
    "pass_grade" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_sections" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_subsections" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_subsections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_units" (
    "id" TEXT NOT NULL,
    "subsection_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "video_url" TEXT,
    "file_data" BYTEA,
    "file_mime" TEXT,
    "file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_questions" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correct_index" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_programmes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "image_data" BYTEA,
    "image_mime" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_credentials" (
    "programme_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "programme_credentials_pkey" PRIMARY KEY ("programme_id","credential_id")
);

-- CreateTable
CREATE TABLE "programme_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programme_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_certificates" (
    "id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "pdf_data" BYTEA NOT NULL,
    "pdf_mime" TEXT NOT NULL DEFAULT 'application/pdf',
    "pdf_name" TEXT NOT NULL,
    "name_x" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "name_y" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "title_x" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "title_y" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "font_size" INTEGER NOT NULL DEFAULT 24,
    "name_font_size" INTEGER NOT NULL DEFAULT 28,
    "title_font_size" INTEGER NOT NULL DEFAULT 21,
    "name_max_width" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "title_max_width" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "micro_credentials_slug_key" ON "micro_credentials"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "unit_completions_user_id_unit_id_key" ON "unit_completions"("user_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "micro_programmes_slug_key" ON "micro_programmes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "programme_enrollments_user_id_programme_id_key" ON "programme_enrollments"("user_id", "programme_id");

-- CreateIndex
CREATE UNIQUE INDEX "credential_enrollments_user_id_credential_id_key" ON "credential_enrollments"("user_id", "credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_certificates_project_key" ON "project_certificates"("project");

-- AddForeignKey
ALTER TABLE "credential_sections" ADD CONSTRAINT "credential_sections_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "micro_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_subsections" ADD CONSTRAINT "credential_subsections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "credential_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_units" ADD CONSTRAINT "credential_units_subsection_id_fkey" FOREIGN KEY ("subsection_id") REFERENCES "credential_subsections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_completions" ADD CONSTRAINT "unit_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_completions" ADD CONSTRAINT "unit_completions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "credential_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_questions" ADD CONSTRAINT "unit_questions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "credential_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_credentials" ADD CONSTRAINT "programme_credentials_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "micro_programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_credentials" ADD CONSTRAINT "programme_credentials_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "micro_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_enrollments" ADD CONSTRAINT "programme_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_enrollments" ADD CONSTRAINT "programme_enrollments_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "micro_programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_enrollments" ADD CONSTRAINT "credential_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_enrollments" ADD CONSTRAINT "credential_enrollments_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "micro_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
