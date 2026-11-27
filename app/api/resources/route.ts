import { createClient } from "@/lib/supabase/server";
import { getPreview } from "@/lib/microlink";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const currentUserId = data?.claims.sub;

  if (!currentUserId) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  if (!("title" in body) || typeof body.title !== "string") {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const title = body.title.trim();

  // Count Unicode code points to match the database character limit.
  if (title.length === 0 || Array.from(title).length > 120) {
    return Response.json(
      { error: "Title must be between 1 and 120 characters" },
      { status: 400 }
    );
  }

  if (!("courseId" in body) || typeof body.courseId !== "number") {
    return Response.json({ error: "courseId must be a number" }, { status: 400 });
  }

  const courseId = body.courseId;

  if (!Number.isSafeInteger(courseId) || courseId < 1) {
    return Response.json(
      { error: "courseId must be a positive integer" },
      { status: 400 }
    );
  }

  if (!("url" in body) || typeof body.url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  const url = body.url.trim();

  if (!/^https?:\/\//i.test(url) || !URL.canParse(url)) {
    return Response.json(
      { error: "Enter a valid HTTP or HTTPS URL" },
      { status: 400 }
    );
  }

  if (Array.from(url).length > 2048) {
    return Response.json({ error: "URL is too long" }, { status: 400 });
  }

  const description = "description" in body ? body.description : "";

  if (typeof description !== "string") {
    return Response.json({ error: "Description must be a string" }, { status: 400 });
  }

  if (Array.from(description).length > 1000) {
    return Response.json({ error: "Description is too long" }, { status: 400 });
  }

  if (!("fileType" in body) || typeof body.fileType !== "string") {
    return Response.json({ error: "fileType is required" }, { status: 400 });
  }

  const fileType = body.fileType;
  const allowedFileTypes = ["PDF", "DOCX", "PPTX", "ZIP", "IMAGE", "FOLDER", "OTHER"];

  if (!allowedFileTypes.includes(fileType)) {
    return Response.json({ error: "Invalid fileType" }, { status: 400 });
  }

  // A missing course comes back as null, so it can be handled separately from a query error.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    console.error("Could not load course:", courseError.message);
    return Response.json({ error: "Could not load course" }, { status: 500 });
  }

  if (course === null) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  // Fetch the preview after the course has been validated.
  const preview = await getPreview(url);

  const newResource = {
    course_id: courseId,
    title,
    description,
    url,
    file_type: fileType,
    preview_title: preview.title,
    preview_image: preview.image,
  };

  const insertQuery = supabase
    .from("resources")
    .insert(newResource)
    .select(`
      id, title, description, url, fileType:file_type,
      createdAt:created_at, previewTitle:preview_title, previewImage:preview_image,
      course:courses(id, code), uploader:profiles!resources_uploader_id_fkey(id, name:display_name)
    `)
    .single();

  const { data: created, error: insertError } = await insertQuery;

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json({ error: "This link was already shared here." }, { status: 400 });
    }

    console.error("Could not create resource:", insertError.message);
    return Response.json({ error: "Could not create resource" }, { status: 500 });
  }

  return Response.json(
    {
      resource: {
        ...created,
        createdAt: new Date(created.createdAt).toISOString(),
        isMine: true,
        likes: 0,
        dislikes: 0,
        views: 0,
        myVote: 0,
      },
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const currentUserId = data?.claims.sub;

  if (!currentUserId) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "recent";

  if (!["recent", "likes", "views"].includes(sort)) {
    return Response.json({ error: "Invalid sort" }, { status: 400 });
  }

  // Translate the API sort option into a column on resources_with_stats.
  let sortColumn = "created_at";
  if (sort === "likes") {
    sortColumn = "likes";
  } else if (sort === "views") {
    sortColumn = "view_count";
  }

  const courseId = searchParams.get("courseId");

  let query = supabase
    .from("resources_with_stats")
    .select(`
      id, title, fileType:file_type, createdAt:created_at, likes, dislikes, views:view_count,
      previewImage:preview_image, course_id, course_code, uploader_id, uploader_name
      `);

  if (courseId !== null) {
    if (!/^\d+$/.test(courseId)
      || !Number.isSafeInteger(Number(courseId))
      || Number(courseId) < 1) {
        return Response.json({ error: "Invalid courseId" }, { status: 400 });
      }

    query = query.eq("course_id", Number(courseId));
  }

  const q = searchParams.get("q")?.trim();

  if (q) {
    // Escape %, _, and backslash before adding the wildcards for a substring search.
    const term = q.replace(/[\\%_]/g, "\\$&");
    query = query.ilike("title", `%${term}%`);
  }

  const mine = searchParams.get("mine") ?? "false";

  if (mine !== "true" && mine !== "false") {
    return Response.json({ error: "Invalid mine" }, { status: 400 });
  }

  if (mine === "true") {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", currentUserId);

    if (enrollmentError) {
      console.error("Could not load enrollments:", enrollmentError.message);
      return Response.json({ error: "Could not load enrollments" }, { status: 500 });
    }

    const courseIds = enrollments.map(row => row.course_id);
    if (courseIds.length === 0) {
      return Response.json({ resources: [] });
    }

    query = query.in("course_id", courseIds);
  }

  const { data: resources, error } = await query
    .order(sortColumn, { ascending: false })
    // Use the unique ID to keep rows in a consistent order when the sort values tie.
    .order("id", { ascending: false });

  if (error) {
    console.error("Could not load resources:", error.message);
    return Response.json({ error: "Could not load resources" }, { status: 500 });
  }

  if (resources.length === 0) {
    return Response.json({ resources: [] });
  }

  const resourceIds = resources.map(resource => resource.id);
  const { data: votes, error: voteError } = await supabase
    .from("votes")
    .select("resource_id, value")
    .eq("user_id", currentUserId)
    .in("resource_id", resourceIds);

  if (voteError) {
    console.error("Could not load votes:", voteError.message);
    return Response.json({ error: "Could not load votes" }, { status: 500 });
  }

  const voteByResourceId = new Map<number, number>();
  for (const vote of votes) {
    voteByResourceId.set(vote.resource_id, vote.value);
  }

  const items = resources.map(
    ({ course_id, course_code, uploader_id, uploader_name, ...resource }) => ({
      ...resource,
      createdAt: new Date(resource.createdAt).toISOString(),
      myVote: voteByResourceId.get(resource.id) ?? 0,
      course: { id: course_id, code: course_code },
      uploader: { id: uploader_id, name: uploader_name },
    }),
  );

  return Response.json({ resources: items });
}
