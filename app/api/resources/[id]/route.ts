import { createClient } from "@/lib/supabase/server";

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
  const currentUserId = authData?.claims.sub;

  if (!currentUserId) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const resourceId = /^\d+$/.test(id) ? BigInt(id) : null;

  if(
    resourceId === null || 
    resourceId < BigInt(1) || 
    resourceId > BigInt("9223372036854775807")
  ) {
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
      myVote: vote?.value ?? 0,
      course: {
        id: resource.course_id,
        code: resource.course_code,
      },
    },
  });
};
