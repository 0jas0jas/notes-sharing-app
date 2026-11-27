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

  // Record the view. ignoreDuplicates turns this into ON CONFLICT DO NOTHING,
  // so a repeat view keeps the original row (and timestamp) in one query,
  // with no race between checking and inserting.
  const { error: insertError } = await supabase
    .from("resource_views")
    .upsert(
      { user_id: user.id, resource_id: resourceId },
      { onConflict: "user_id,resource_id", ignoreDuplicates: true },
    );

  // 23503 = foreign key violation: no resource has this ID
  if (insertError?.code === "23503") {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
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
