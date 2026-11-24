import { createClient } from "@/lib/supabase/server";

function isValidResourceId(id: string):
boolean {
  if(!/^\d+$/.test(id)) return false;

  // A PostgreSQL bigint ID can exceed JavaScript's safe integer range.
  const value = BigInt(id);
  return value >= BigInt(1) && value <= BigInt("9223372036854775807");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // For GET /api/resources/12, the [id] route parameter is the string "12".
  const { id } = await context.params;
  // Use the caller's session cookies so the query follows their database permissions.
  const supabase = await createClient();

  const { data: authData } = await
  supabase.auth.getClaims();
  // The token's subject (sub) is the signed-in user's ID.
  const currentUserId = authData?.claims.sub;

  if (!currentUserId) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  if(!isValidResourceId(id)) {
    return Response.json({ error: "Invalid resource ID" }, { status: 400 });
  }

  const { data: resource, error } = await supabase
    .from("resources_with_stats")
    .select(`
      id, title, description, url, 
      course_id, course_code, uploader_id, uploader_name, 
      likes, dislikes, view_count,
      created_at, preview_title, preview_image
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // Keep the database error details in the server log.
    console.error("Could not load resource:", error.message);
    return Response.json({ error: "Could not load resource" }, { status: 500 });
  }

  // maybeSingle() returns null when the query succeeds but finds no visible row.
  if (resource === null) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  // The stats view counts all votes. Look up this user's vote separately.
  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", currentUserId)
    .eq("resource_id", id)
    .maybeSingle();

  if (voteError) {
    console.error("Could not load vote:", voteError.message);
    return Response.json({ error: "Could not load vote" }, { status: 500 });
  }

  return Response.json({
    resource:{
      id: resource.id,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      createdAt: new
      Date(resource.created_at).toISOString(),
      previewTitle: resource.preview_title,
      previewImage: resource.preview_image,
      uploader: {
        id: resource.uploader_id,
        name: resource.uploader_name,
      },
      isMine: currentUserId === resource.uploader_id,
      likes: resource.likes,
      dislikes: resource.dislikes,
      views: resource.view_count,
      // No vote row means the user hasn't voted on this resource.
      myVote: vote?.value ?? 0,
      course: {
        id: resource.course_id,
        code: resource.course_code,
      },
    },
  });
};


export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const currentUserId = data?.claims.sub;

  if (!currentUserId) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  if (!isValidResourceId(id)) {
    return Response.json({ error: "Invalid resource ID" }, { status: 400 });
  }

  const { data: resource, error } = await supabase
    .from("resources")
    .select("uploader_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Could not load resource:", error.message);
    return Response.json({ error: "Could not load resource" }, { status: 500 });
  }

  if (resource === null) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  if (resource.uploader_id !== currentUserId) {
    return Response.json(
      { error: "Only the uploader can delete this resource" },
      { status: 403 }
    );
  }

  const { data: deleteResource, error: deleteError } = await supabase
    .from("resources")
    .delete()
    .eq("id", id)
    .eq("uploader_id", currentUserId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("Could not delete resource:", deleteError.message);
    return Response.json({ error: "Could not delete resource" }, { status: 500 });
  }

  if (deleteResource === null) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
