// Author: Eric Li
// First Written: 26/11/2026
// Last Updated: 26/11/2026

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { UNSTABLE_REVALIDATE_RENAME_ERROR } from "next/dist/lib/constants";

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

  //Check if course exists
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
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

  //Check if existing enrollment
  // Probably redundant, can remove
  const { data: enrollement, error: enrollementError } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseIdNum);
  if (enrollementError) {
    return NextResponse.json(
      { error: enrollementError.message },
      { status: 500 },
    );
  }

  //Insert new enrollment
  if (enrollement.length === 0) {
    const { error } = await supabase
      .from("enrollments")
      .upsert({ user_id: user.id, course_id: courseIdNum });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
    .select("*")
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

  const { data: enrollement, error: enrollementError } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseIdNum);
  if (enrollementError) {
    return NextResponse.json(
      { error: enrollementError.message },
      { status: 500 },
    );
  }

  if (enrollement.length > 0) {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .match({ user_id: user.id, course_id: courseIdNum });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { courseId: courseIdNum, following: false },
    { status: 200 },
  );
}

// I hate Javascript
