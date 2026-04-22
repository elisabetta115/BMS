import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "./prisma";

// Supabase fallback client (used when Prisma isn't generated yet)
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
}

export async function findUserByEmail(email: string): Promise<DBUser | null> {
  if (prisma) {
    return prisma.user.findUnique({ where: { email } });
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error("No database configured. Set DATABASE_URL or SUPABASE env vars.");
  const { data } = await supabase
    .from("users")
    .select("id, name, email, password_hash, country")
    .eq("email", email)
    .single();
  if (!data) return null;
  return { id: data.id, name: data.name, email: data.email, passwordHash: data.password_hash, country: data.country };
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
    .select("id, name, email, password_hash, country")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, email: data.email, passwordHash: data.password_hash, country: data.country };
}
