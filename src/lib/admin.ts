import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Two kinds of people use the Admin Panel:
//  - site admins (users.role = ADMIN), who can do everything;
//  - programme admins (programme_admins), learners a site admin put in charge
//    of a programme. They can edit that programme, create new
//    micro-credentials in it, add existing ones to it (shared with any other
//    programmes they're in), edit every micro-credential in it, and take
//    micro-credentials out of it. They can't delete anything, import courses,
//    or touch certificates or other programmes.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
}

/** A site admin. */
export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await getSession();
  if (!session) return unauthorized();

  if (prisma) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") return unauthorized();
  } else if (session.role !== "ADMIN") {
    return unauthorized();
  }

  return { userId: session.userId };
}

export interface AdminAccess {
  userId: string;
  /** A site admin, who can do everything. */
  isAdmin: boolean;
  /** The programmes the user is a programme admin of. */
  programmeIds: string[];
}

/** What the signed-in user may manage, or null when signed out. Read from the database, so a change applies at once. */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const session = await getSession();
  if (!session) return null;
  if (!prisma) return { userId: session.userId, isAdmin: session.role === "ADMIN", programmeIds: [] };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, managedProgrammes: { select: { programmeId: true } } },
  });
  if (!user) return null;
  return {
    userId: session.userId,
    isAdmin: user.role === "ADMIN",
    programmeIds: user.managedProgrammes.map((m) => m.programmeId),
  };
}

/** A site admin, or a programme admin of any programme. */
export async function requireAnyAdminAccess(): Promise<AdminAccess | NextResponse> {
  const access = await getAdminAccess();
  if (!access || (!access.isAdmin && access.programmeIds.length === 0)) return unauthorized();
  return access;
}

/** A site admin, or a programme admin of this programme. */
export async function requireProgrammeAccess(programmeId: string): Promise<AdminAccess | NextResponse> {
  const access = await getAdminAccess();
  if (!access || (!access.isAdmin && !access.programmeIds.includes(programmeId))) return unauthorized();
  return access;
}

/** A site admin, or a programme admin of a programme this micro-credential is in. */
export async function requireCredentialAccess(credentialId: string): Promise<AdminAccess | NextResponse> {
  const access = await getAdminAccess();
  if (!access) return unauthorized();
  if (access.isAdmin) return access;
  if (access.programmeIds.length > 0 && prisma) {
    const link = await prisma.programmeCredential.findFirst({
      where: { credentialId, programmeId: { in: access.programmeIds } },
      select: { programmeId: true },
    });
    if (link) return access;
  }
  return unauthorized();
}

/**
 * For a programme admin's save: the S3 file keys its units point at must be
 * their own, either already on this micro-credential's units or a new upload
 * no other unit uses. Otherwise they could point a unit at another course's
 * file (keys are visible in the public course data) to read it, then delete it
 * from S3 by removing the unit. Returns an error message, or null if all is well.
 */
export async function checkUnitFileKeys(sections: any[], credentialId: string | null): Promise<string | null> {
  if (!prisma) return null;
  const keys: string[] = [];
  for (const s of sections || [])
    for (const ss of s.subsections || [])
      for (const u of ss.units || []) if (u.type === "PRESENTATION" && u.fileKey) keys.push(String(u.fileKey));
  if (keys.length === 0) return null;

  if (keys.some((k) => !k.startsWith("unit-files/"))) return "A unit points at a file that isn't a lesson file.";
  const usedElsewhere = await prisma.credentialUnit.findFirst({
    where: {
      fileKey: { in: keys },
      ...(credentialId ? { subsection: { section: { credentialId: { not: credentialId } } } } : {}),
    },
    select: { id: true },
  });
  return usedElsewhere ? "A unit points at another micro-credential's file. Upload the file again instead." : null;
}
