import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "./prisma";

// Supabase fallback client (used when Prisma isn't generated yet)
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("[YOUR-PROJECT-REF]")) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  country: string | null;
  role: "USER" | "ADMIN";
}

export interface DBMicroCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  developedBy: string | null;
  passGrade: number;
}

export interface DBMicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  credentials?: DBMicroCredential[];
}

// ─── User queries ───────────────────────────────────────────

export async function findUserByEmail(
  email: string
): Promise<DBUser | null> {
  if (prisma) {
    return prisma.user.findUnique({ where: { email } });
  }
  const supabase = getSupabase();
  if (!supabase)
    throw new Error(
      "No database configured. Set DATABASE_URL or SUPABASE env vars."
    );
  const { data } = await supabase
    .from("users")
    .select("id, name, email, password_hash, country, role")
    .eq("email", email)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    passwordHash: data.password_hash,
    country: data.country,
    role: data.role || "USER",
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  country: string | null;
}): Promise<DBUser> {
  if (prisma) {
    return prisma.user.create({ data: input });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("users")
    .insert({
      name: input.name,
      email: input.email,
      password_hash: input.passwordHash,
      country: input.country,
    })
    .select("id, name, email, password_hash, country, role")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    passwordHash: data.password_hash,
    country: data.country,
    role: data.role || "USER",
  };
}

// ─── Micro-credential queries ───────────────────────────────

export async function getAllMicroCredentials(): Promise<DBMicroCredential[]> {
  if (prisma) {
    return prisma.microCredential.findMany({ orderBy: { code: "asc" } });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("micro_credentials")
    .select("id, title, slug, code, project, description, image, developed_by, pass_grade")
    .order("code");
  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    code: d.code,
    project: d.project,
    description: d.description,
    image: d.image,
    developedBy: d.developed_by,
    passGrade: d.pass_grade,
  }));
}

export async function getMicroCredentialById(
  id: string
): Promise<DBMicroCredential | null> {
  if (prisma) {
    return prisma.microCredential.findUnique({ where: { id } });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data } = await supabase
    .from("micro_credentials")
    .select("id, title, slug, code, project, description, image, developed_by, pass_grade")
    .eq("id", id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
    developedBy: data.developed_by,
    passGrade: data.pass_grade,
  };
}

export async function createMicroCredential(input: {
  title: string;
  slug: string;
  code: string;
  project: string;
  description?: string;
  image?: string;
  developedBy?: string;
  passGrade?: number;
}): Promise<DBMicroCredential> {
  if (prisma) {
    return prisma.microCredential.create({ data: input });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("micro_credentials")
    .insert({
      title: input.title,
      slug: input.slug,
      code: input.code,
      project: input.project,
      description: input.description || null,
      image: input.image || null,
      developed_by: input.developedBy || null,
      pass_grade: input.passGrade ?? 50,
    })
    .select("id, title, slug, code, project, description, image, developed_by, pass_grade")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
    developedBy: data.developed_by,
    passGrade: data.pass_grade,
  };
}

export async function updateMicroCredential(
  id: string,
  input: Partial<{
    title: string;
    slug: string;
    code: string;
    project: string;
    description: string;
    image: string;
    developedBy: string;
    passGrade: number;
  }>
): Promise<DBMicroCredential> {
  if (prisma) {
    return prisma.microCredential.update({ where: { id }, data: input });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const mapped: any = { ...input };
  if (input.developedBy !== undefined) {
    mapped.developed_by = input.developedBy;
    delete mapped.developedBy;
  }
  if (input.passGrade !== undefined) {
    mapped.pass_grade = input.passGrade;
    delete mapped.passGrade;
  }
  const { data, error } = await supabase
    .from("micro_credentials")
    .update(mapped)
    .eq("id", id)
    .select("id, title, slug, code, project, description, image, developed_by, pass_grade")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
    developedBy: data.developed_by,
    passGrade: data.pass_grade,
  };
}

export async function deleteMicroCredential(id: string): Promise<void> {
  if (prisma) {
    await prisma.microCredential.delete({ where: { id } });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { error } = await supabase.from("micro_credentials").delete().eq("id", id);
  if (error) throw error;
}

// ─── Micro-programme queries ────────────────────────────────

export async function getAllMicroProgrammes(): Promise<DBMicroProgramme[]> {
  if (prisma) {
    return prisma.microProgramme.findMany({
      orderBy: { code: "asc" },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: { credential: true },
        },
      },
    }).then((programmes: any[]) =>
      programmes.map((p: any) => ({
        ...p,
        credentials: p.credentials.map((pc: any) => pc.credential),
      }))
    );
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("micro_programmes")
    .select("id, title, slug, code, project, description, image")
    .order("code");
  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    code: d.code,
    project: d.project,
    description: d.description,
    image: d.image,
  }));
}

export async function getMicroProgrammeById(
  id: string
): Promise<DBMicroProgramme | null> {
  if (prisma) {
    const p = await prisma.microProgramme.findUnique({
      where: { id },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: { credential: true },
        },
      },
    });
    if (!p) return null;
    return {
      ...p,
      credentials: p.credentials.map((pc: any) => pc.credential),
    };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data } = await supabase
    .from("micro_programmes")
    .select("id, title, slug, code, project, description, image")
    .eq("id", id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
  };
}

export async function createMicroProgramme(input: {
  title: string;
  slug: string;
  code: string;
  project: string;
  description?: string;
  image?: string;
}): Promise<DBMicroProgramme> {
  if (prisma) {
    return prisma.microProgramme.create({ data: input });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("micro_programmes")
    .insert({
      title: input.title,
      slug: input.slug,
      code: input.code,
      project: input.project,
      description: input.description || null,
      image: input.image || null,
    })
    .select("id, title, slug, code, project, description, image")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
  };
}

export async function updateMicroProgramme(
  id: string,
  input: Partial<{
    title: string;
    slug: string;
    code: string;
    project: string;
    description: string;
    image: string;
  }>
): Promise<DBMicroProgramme> {
  if (prisma) {
    return prisma.microProgramme.update({ where: { id }, data: input });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("micro_programmes")
    .update(input)
    .eq("id", id)
    .select("id, title, slug, code, project, description, image")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    code: data.code,
    project: data.project,
    description: data.description,
    image: data.image,
  };
}

export async function deleteMicroProgramme(id: string): Promise<void> {
  if (prisma) {
    await prisma.microProgramme.delete({ where: { id } });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { error } = await supabase.from("micro_programmes").delete().eq("id", id);
  if (error) throw error;
}

// ─── Programme-Credential link ──────────────────────────────

export async function linkCredentialToProgramme(
  programmeId: string,
  credentialId: string,
  order: number = 0
): Promise<void> {
  if (prisma) {
    await prisma.programmeCredential.upsert({
      where: { programmeId_credentialId: { programmeId, credentialId } },
      update: { order },
      create: { programmeId, credentialId, order },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase.from("programme_credentials").upsert({
    programme_id: programmeId,
    credential_id: credentialId,
    order,
  });
}

export async function unlinkCredentialFromProgramme(
  programmeId: string,
  credentialId: string
): Promise<void> {
  if (prisma) {
    await prisma.programmeCredential.delete({
      where: { programmeId_credentialId: { programmeId, credentialId } },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase
    .from("programme_credentials")
    .delete()
    .eq("programme_id", programmeId)
    .eq("credential_id", credentialId);
}

// ─── Enrollment queries ─────────────────────────────────────

export async function getUserEnrolledProgrammes(userId: string): Promise<DBMicroProgramme[]> {
  if (prisma) {
    const enrollments = await prisma.programmeEnrollment.findMany({
      where: { userId },
      include: {
        programme: {
          include: {
            credentials: {
              orderBy: { order: "asc" },
              include: { credential: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e: any) => ({
      ...e.programme,
      credentials: e.programme.credentials.map((pc: any) => pc.credential),
    }));
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("programme_enrollments")
    .select("programme_id, micro_programmes(id, title, slug, code, project, description, image)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => d.micro_programmes);
}

export async function getUserEnrolledCredentials(userId: string): Promise<DBMicroCredential[]> {
  if (prisma) {
    const enrollments = await prisma.credentialEnrollment.findMany({
      where: { userId },
      include: { credential: true },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e: any) => e.credential);
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  const { data, error } = await supabase
    .from("credential_enrollments")
    .select("credential_id, micro_credentials(id, title, slug, code, project, description, image, developed_by, pass_grade)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => ({
    ...d.micro_credentials,
    developedBy: d.micro_credentials.developed_by,
    passGrade: d.micro_credentials.pass_grade,
  }));
}

export async function enrollUserInProgramme(userId: string, programmeId: string): Promise<void> {
  if (prisma) {
    await prisma.programmeEnrollment.upsert({
      where: { userId_programmeId: { userId, programmeId } },
      update: {},
      create: { userId, programmeId },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase.from("programme_enrollments").upsert({
    user_id: userId,
    programme_id: programmeId,
  });
}

export async function enrollUserInCredential(userId: string, credentialId: string): Promise<void> {
  if (prisma) {
    await prisma.credentialEnrollment.upsert({
      where: { userId_credentialId: { userId, credentialId } },
      update: {},
      create: { userId, credentialId },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase.from("credential_enrollments").upsert({
    user_id: userId,
    credential_id: credentialId,
  });
}

export async function unenrollUserFromProgramme(userId: string, programmeId: string): Promise<void> {
  if (prisma) {
    await prisma.programmeEnrollment.delete({
      where: { userId_programmeId: { userId, programmeId } },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase
    .from("programme_enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("programme_id", programmeId);
}

export async function unenrollUserFromCredential(userId: string, credentialId: string): Promise<void> {
  if (prisma) {
    await prisma.credentialEnrollment.delete({
      where: { userId_credentialId: { userId, credentialId } },
    });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured.");
  await supabase
    .from("credential_enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("credential_id", credentialId);
}