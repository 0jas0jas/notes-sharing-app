// Author: Eric Li
// First Written: 26/11/2026
// Last Updated: 26/11/2026

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

//Packet Format:
//POST   /api/enrollments   { "courseId": 1 }  → 201 { "courseId": 1, "following": true }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Obtain user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not Logged In" }, { status: 401 });
  }

  //Read request body
  let body: { courseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  //Validate request body
  const { courseId } = body;
  const courseIdNum = Number(courseId);
  if (!Number.isSafeInteger(courseId) || courseIdNum <= 0) {
    return NextResponse.json({ error: "Invalid Course ID" }, { status: 400 });
  }

  //Insert the enrollment in one query. ignoreDuplicates makes this
  //ON CONFLICT DO NOTHING, so following a course twice is fine, and a
  //missing course shows up as a foreign key error instead of needing
  //a separate lookup first.
  const { error } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: user.id, course_id: courseIdNum },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );

  // 23503 = foreign key violation: no course has this ID
  if (error?.code === "23503") {
    return NextResponse.json(
      { error: `Course with ID ${courseId} Not Found` },
      { status: 404 },
    );
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      courseId: courseIdNum,
      following: true,
    },
    { status: 201 },
  );
}

//Packet Format:
//DELETE /api/enrollments   { "courseId": 1 }  → 200 { "courseId": 1, "following": false }
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  // Obtain user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not Logged In" }, { status: 401 });
  }

  //Read request body
  let body: { courseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  //Validate request body
  const { courseId } = body;
  const courseIdNum = Number(courseId);
  if (!Number.isSafeInteger(courseId) || courseIdNum <= 0) {
    return NextResponse.json({ error: "Invalid Course ID" }, { status: 400 });
  }

  //Check if course exists
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseIdNum);

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 });
  }
  if (course.length === 0) {
    return NextResponse.json(
      { error: `Course with ID ${courseId} Not Found` },
      { status: 404 },
    );
  }

  //Deleting a row that isn't there is a no-op, so no need to check first
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .match({ user_id: user.id, course_id: courseIdNum });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { courseId: courseIdNum, following: false },
    { status: 200 },
  );
}

// I hate Javascript
