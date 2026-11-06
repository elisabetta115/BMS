import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  // ?access=1 (the header and the Admin Panel) reads the user's current role
  // and the programmes they are a programme admin of from the database. The
  // session cookie keeps the role from when they signed in, so without this a
  // new or removed site admin would only see the change after signing in again.
  // Only on request, to spare the database on the many other pages that ask
  // who is signed in. The server's permission checks read the database anyway
  // (src/lib/admin.ts).
  if (req.nextUrl.searchParams.get("access") && prisma) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { role: true, managedProgrammes: { select: { programmeId: true } } },
      });
      if (!user) return NextResponse.json({ user: null }); // the account no longer exists
      return NextResponse.json({
        user: { ...session, role: user.role, managedProgrammeIds: user.managedProgrammes.map((m) => m.programmeId) },
      });
    } catch (err) {
      console.error("Error reading the user's access:", err);
    }
  }

  return NextResponse.json({ user: session });
}
