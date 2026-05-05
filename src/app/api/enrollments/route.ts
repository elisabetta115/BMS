import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserEnrolledProgrammes,
  getUserEnrolledCredentials,
  enrollUserInProgramme,
  enrollUserInCredential,
  unenrollUserFromProgramme,
  unenrollUserFromCredential,
} from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [programmes, credentials] = await Promise.all([
      getUserEnrolledProgrammes(session.userId),
      getUserEnrolledCredentials(session.userId),
    ]);
    return NextResponse.json({ programmes, credentials });
  } catch (err) {
    console.error("Error fetching enrollments:", err);
    return NextResponse.json({ error: "Failed to fetch enrollments." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: "Type and id are required." }, { status: 400 });
    }

    if (type === "programme") {
      await enrollUserInProgramme(session.userId, id);
    } else if (type === "credential") {
      await enrollUserInCredential(session.userId, id);
    } else {
      return NextResponse.json({ error: "Invalid type. Must be 'programme' or 'credential'." }, { status: 400 });
    }

    return NextResponse.json({ message: "Enrolled successfully." }, { status: 201 });
  } catch (err) {
    console.error("Error enrolling:", err);
    return NextResponse.json({ error: "Failed to enroll." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: "Type and id are required." }, { status: 400 });
    }

    if (type === "programme") {
      await unenrollUserFromProgramme(session.userId, id);
    } else if (type === "credential") {
      await unenrollUserFromCredential(session.userId, id);
    } else {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }

    return NextResponse.json({ message: "Unenrolled successfully." });
  } catch (err) {
    console.error("Error unenrolling:", err);
    return NextResponse.json({ error: "Failed to unenroll." }, { status: 500 });
  }
}
