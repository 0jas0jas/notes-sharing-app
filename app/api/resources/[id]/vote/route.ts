/*********************************
 * Developer: Eric Li
 * First Written: 19/11/2026
 * Last updated: 19/11/2026
 *
 * Handles the Like/Dislike system and communicates with the backend database
 *
 * Note: This is my first time writing backend code with NextJS and supabase
 *       so I'm going to be leaving a lot of redundant comments to remind myself
 *       what the hell I'm doing for future use.
 *
 * IMPORTANT NOTE: This code hasn't been tested yet.
 ***********************************/

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Handles Post methods
 * @param request The incoming HTTP request. Contains mainly the header, the body and the URL that you'll want to use
 * @param param Any information about the path. NextJS uses this to simplify things.
 *              In this case, since the path is "/app/api/resources/[id]/vote", param would contain something
 *              like below
 *          {
 *             "value": 1
 *          }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, //The curly brackets are used to destructure JSON data
) {
  // The "await" keyword forces JS to wait for the result before continuing
  // something something asychronous programming
  const supabase = await createClient();

  //Get the ID of the resource (document) we currently have
  const { id } = await params;
  const resourceId = Number(id);

  //Validate that our document id works.
  //isSafeInteger ensures we won't overflow by ensuring it can be represented as a double
  if (!Number.isSafeInteger(resourceId) || resourceId <= 0) {
    return NextResponse.json({ error: "Invalid Resource ID" }, { status: 400 });
  }

  //Get (and confirm) current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  //Read the request body (and get "value")
  let body: { value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const { value } = body;

  if (value != -1 && value != 0 && value != 1) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  //Update the database
  if (value === 0) {
    //Delete a vote
    const { error } = await supabase
      .from("votes")
      .delete()
      .match({ user_id: user.id, resource_id: resourceId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Insert new vote or update existing vote
    const { error } = await supabase.from("votes").upsert(
      { user_id: user.id, resource_id: resourceId, value: value },
      //The onConflict tells supabase which columns to identify conflicts
      //and when to update a value instead of inserting a new one
      //In general, you're probably using it onto your primary keys
      { onConflict: "user_id,resource_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  //Obtain values to return
  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("value")
    .eq("resouce_id", resourceId);

  if (votesError) {
    return NextResponse.json({ error: votesError.message }, { status: 500 });
  }

  const likes = votes.filter((vote) => vote.value == 1).length;
  const dislikes = votes.filter((vote) => vote.value == -1).length;

  //Response (everything works :D)
  return NextResponse.json({
    likes,
    dislikes,
    myVote: value,
  });
}

// I hate javascript
