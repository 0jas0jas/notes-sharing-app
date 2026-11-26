// Author: Eric Li
// First Written: 26/11/2026
// Last Updated: 26/11/2026
//
// Find courses with options to filter by course code and user enrollment
// Returns a list of queried courses, with a following parameter indicating
// user enrollment

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMetadataVaryParamsAccumulator } from "next/dist/server/app-render/vary-params";

// Packet Format: "GET /api/courses?q=comp&mine=true"
// where "q" is the search query and
// "mine" is a boolean indicating whether we want to search by user enrollment, default false
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const supabase = await createClient();

  //If no course query provided, return all courses
  const q = searchParams.get("q") ?? "";
  const mine = (searchParams.get("mine") ?? "false") === "true";

  //Obtain user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  //Obtain enrollments.
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);

  if (enrollmentError) {
    return NextResponse.json(
      { error: enrollmentError.message },
      { status: 500 },
    );
  }

  //Get array of courseIDs
  const courseIDs = enrollments.map((enrollment) => enrollment.course_id);

  //Build the SQL query
  let query = supabase.from("courses").select("id, code, title");

  //Filter by input parameters
  if (mine) {
    query = query.in("id", courseIDs);
  }
  if (q !== "") {
    query = query.ilike("code", `${q}%`);
  }

  //Query the database
  const { data: courses, error: courseError } = await query;
  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 });
  }

  const coursesWithFollowing = courses.map((course) => ({
    ...course,
    following: courseIDs.includes(course.id),
  }));

  return NextResponse.json(coursesWithFollowing);
}

// I hate Javascript
