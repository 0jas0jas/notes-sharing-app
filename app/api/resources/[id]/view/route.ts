/*********************************
 * Author: Eric Li
 * First Written: 23/11/2026
 * Last updated: 23/11/2026
 *
 * Handles the viewing system and communicates with the backend database
 ***********************************/

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  //Obtain ID
  const { id } = await params;
  const resourceId = Number(id);
  if (!Number.isSafeInteger(resourceId) || resourceId <= 0) {
    return NextResponse.json({ error: "Invalid Resource ID" }, { status: 400 });
  }

  const supabase = await createClient();

  //Obtain user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Probably redundant
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch existing data

  const { data: existing, error: dataError } = await supabase
    .from("resource_views")
    .select("*")
    .eq("user_id", user.id)
    .eq("resource_id", resourceId);

  if (dataError) {
    return NextResponse.json({ error: dataError.message }, { status: 500 });
  }

  // No overriding existing data to preserve the timestamp
  if (existing.length === 0) {
    const { error } = await supabase
      .from("resource_views")
      .upsert({ user_id: user.id, resource_id: resourceId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Return resource count

  const { data: data, error: error } = await supabase
    .from("resources_with_stats")
    .select("view_count")
    .eq("id", resourceId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ views: data.view_count });
}

// I hate Javascript
