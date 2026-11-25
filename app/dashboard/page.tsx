"use client";

import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Bookmark, Heart, Eye, Video, Link } from "lucide-react";
import { useState, useEffect} from "react";
import NextLink from "next/link";

type Course = {
  id: number;
  code: string;
  title: string;
};

type Resource = {
  id: number;
  course_id: number;
  uploader_id: string;
  title: string;
  description: string | null;
  url: string;
  link_type: string;
  created_at: string;
}

type Profile = {
  id: string;
  display_name: string;
}

export default function DashboardPage() {
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [notes, setNotes] = useState<Resource[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [following, setFollowing] = useState<number[]>([]);
  

  useEffect(() => {
    const supabase = createClient();

    async function fetchCourses(){
      const {data, error} = await supabase
      .from("courses")
      .select("id, code, title")
      .order("code")

      if (error) {
        console.error(error);
      } else {
        setCourses(data);
      }
    }
    async function fetchResources() {
      const {data, error} = await supabase
      .from("resources")
      .select("id, course_id, uploader_id, title, description, url, link_type, created_at")
      .order("created_at", {ascending: false});

      if (error) {
        console.error(error);
      } else {
        console.log(data);
        setNotes(data);
      }
    }
    async function fetchProfiles(){
      const{data, error} = await supabase
      .from("profiles")
      .select("id, display_name")

      if (error) {
        console.error(error);
      } else {
        console.log(data);
        setProfiles(data);
      }
    }
    fetchCourses();
    fetchResources();
    fetchProfiles();
  }, []);

  function toggleBookmark(id: number) {
    if (bookmarked.includes(id)) {
      setBookmarked(bookmarked.filter((item) => item !== id));
    } else {
      setBookmarked([...bookmarked, id])
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchCourse =
    selectedCourse === "all" ||
    (selectedCourse === "mine" && following.includes(note.course_id)) ||
    note.course_id === Number(selectedCourse);

    const matchSearch = 
    note.title.toLowerCase().includes(submittedSearch.toLowerCase()) ||
    (note.description ?? "").toLowerCase().includes(submittedSearch.toLowerCase());

    return matchCourse && matchSearch;
  });

  function clearFilters() {
    setSelectedCourse("all");
    setSearch("");
    setSubmittedSearch("");
  }

  function toggleFollow(id: number) {
    if (following.includes(id)) {
      setFollowing(following.filter((item) => item !== id));
    } else {
      setFollowing ([...following, id]);
    }
  }

  return (
    <main className="flex-1 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Course notes
          </h1>

          <p className="text-muted-foreground mt-2">
            Find and share notes for your courses.
          </p>
        </div>

        <NextLink 
        href="/share"
        className="bg-primary text-primary-foreground rounded-md px-6 py-3 flex items-center gap-2"
        >
          <Upload size={20} />
          Upload note
        </NextLink>
      </div>
      <div className="mt-8 flex items-center gap-4">
        <select
          id="course"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="rounded-md border border-border bg-card p-3 w-1/4"
          >
            <option value="all">All courses</option>
            <option value="mine">My courses</option>
            {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code}
            </option>
          ))}
          </select>
          {selectedCourse !== "all" && selectedCourse !== "mine" && (
            <button
            onClick={() => toggleFollow(Number(selectedCourse))}
            className="bg-primary text-primary-foreground rounded-md px-6 py-3"
            >
              {following.includes(Number(selectedCourse)) ? "Unfollow" : "Follow"}
            </button>
          
          )}

          <input
          id="search"
          placeholder="Search by title or topic"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSubmittedSearch(search);
            }
          }}
          className="rounded-md border border-border bg-card p-3 flex-1"
          />

          <button
          onClick={() => setSubmittedSearch(search)}
          className="bg-primary text-primary-foreground rounded-md px-12 py-3 font-medium"
          >
            Search
          </button>
        </div>
        <hr className="mt-6 border-border border-t-2" />
        <div className="mt-4 flex justify-end items-center gap-3">
          <label htmlFor="sort">Sort by:</label>
          <select
          id="sort"
          className="rounded-md border border-border bg-card p-3 w-1/6"
          >
            <option value="recent">Most recent</option>
            <option value="liked>">Most liked</option>
            <option value="viewed">Most viewed</option>
          </select>
        </div>

        {notes.length === 0 ? (
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold">No notes found</h2>
            <p className="mt-2">Be the first to share a note!</p>
            <NextLink
            href="/share"
            className="inline-block mt-4 bg-primary text-text-primary-foreground rounded-md px-8 py-3">
            Upload note
            </NextLink>
          </div>
          ) : filteredNotes.length === 0 ? (
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold">No notes found</h2>
            <p className="mt-2">Try a different keyword or clear your filters</p>
            <button
            onClick={clearFilters}
            className="mt-4 bg-primary text-primary-foreground rounded-md px-8 py-3">
              Clear filters
            </button>
          </div>
          ) : ( 
          <table
          className="w-full mt-6 border-separate border-spacing-0">
            <thead className="bg-primary/20 text-left text-primary">
            <tr>
              <th className="p-3 rounded-l-xl">File</th>
              <th>Course</th>
              <th>Note title</th>
              <th>Author</th>
              <th> </th>
              <th className="text-center">Likes</th>
              <th className="text-center">Views</th>
              <th className="rounded-r-xl"> </th>
            </tr>
            </thead>
            <tbody>
              {filteredNotes.map((note) => (
                <tr key={note.id}>

              <td className="p-8 border-b border-border">
                {note.link_type === "pdf" ? (
                  <FileText size={50} className="text-red-600" /> 
                ) : note.link_type === "youtube" ? (
                  <Video size={50} className="text-red-600" />
                ) : (
                  <Link size={40} className="text-red-600" />
                )
                }
              </td>
              <td className="font-bold border-b border-border">
                {courses.find((course) => course.id === note.course_id)?.code}
                </td>
              <td className="border-b border-border">
                <span className="font-bold ">{note.title}</span><br/>
              {note.link_type}
              </td>
              <td className="border-b border-border">
                {profiles.find((profile) => profile.id === note.uploader_id)?.display_name ?? "Unknown Author"}
              </td>
              <td className="border-b border-border text-center">
                <button
                onClick={() => toggleBookmark(note.id)}
                className="flex items-center justify-center"
                  >
                  <Bookmark
                  size={28}
                  className={bookmarked.includes(note.id) ? "text-primary fill-current" : "text-primary"}
                  />
                  </button>
              </td>
              <td className="border-b border-border">
                <div className="flex items-center justify-center gap-2">
                  <Heart size={28} className="text-primary" />
                  -
                </div>
              </td>
              <td className="border-b border-border">
                <div className="flex items-center justify-center gap-2">
                  <Eye size={28} className="text-primary" />
                  -
                </div>
              </td>
              <td className="border-b border-border text-center">
                <button className="bg-primary/20 text-primary font-bold rounded-md px-6 py-3">
                  View note
                </button>
              </td>
              </tr>
              ))}
            </tbody>
            </table>
          )}

        
    </main>
  );








}

