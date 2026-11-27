"use client";

import {
  Upload,
  FileText,
  Bookmark,
  Heart,
  Eye,
  Link,
  Folder,
  Image as ImageIcon,
  FileArchive,
  Presentation,
} from "lucide-react";
import { useState, useEffect } from "react";
import NextLink from "next/link";

// Shapes come from the API contract (#3)
type Course = {
  id: number;
  code: string;
  title: string;
  following: boolean;
};

type Resource = {
  id: number;
  title: string;
  fileType: string;
  course: { id: number; code: string };
  uploader: { id: string; name: string };
  createdAt: string;
  likes: number;
  dislikes: number;
  views: number;
  myVote: number;
  previewImage: string | null;
};

type Sort = "recent" | "likes" | "views";

// Picks an icon for each fileType the API can send back
function FileIcon({ fileType }: { fileType: string }) {
  switch (fileType) {
    case "PDF":
    case "DOCX":
      return <FileText size={50} className="text-red-600" />;
    case "PPTX":
      return <Presentation size={50} className="text-red-600" />;
    case "IMAGE":
      return <ImageIcon size={50} className="text-red-600" />;
    case "ZIP":
      return <FileArchive size={50} className="text-red-600" />;
    case "FOLDER":
      return <Folder size={50} className="text-red-600" />;
    default:
      return <Link size={40} className="text-red-600" />;
  }
}

export default function DashboardPage() {
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [notes, setNotes] = useState<Resource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  // Courses come with a "following" flag, so the followed list is derived from them
  const following = courses.filter((course) => course.following).map((course) => course.id);

  useEffect(() => {
    async function fetchCourses() {
      const response = await fetch("/api/courses");
      if (!response.ok) {
        console.error("Could not load courses:", response.status);
        return;
      }
      const data: { courses: Course[] } = await response.json();
      setCourses(data.courses);
    }
    fetchCourses();
  }, []);

  // Refetch whenever the sort changes, the API does the sorting
  useEffect(() => {
    async function fetchResources() {
      const response = await fetch(`/api/resources?sort=${sort}`);
      if (!response.ok) {
        console.error("Could not load resources:", response.status);
      } else {
        const data: { resources: Resource[] } = await response.json();
        setNotes(data.resources);
      }
      setLoaded(true);
    }
    fetchResources();
  }, [sort]);

  function toggleBookmark(id: number) {
    if (bookmarked.includes(id)) {
      setBookmarked(bookmarked.filter((item) => item !== id));
    } else {
      setBookmarked([...bookmarked, id]);
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchCourse =
      selectedCourse === "all" ||
      (selectedCourse === "mine" && following.includes(note.course.id)) ||
      note.course.id === Number(selectedCourse);

    // The list endpoint doesn't send descriptions, so search matches titles
    const matchSearch = note.title.toLowerCase().includes(submittedSearch.toLowerCase());

    return matchCourse && matchSearch;
  });

  function clearFilters() {
    setSelectedCourse("all");
    setSearch("");
    setSubmittedSearch("");
  }

  // Saves the follow through /api/enrollments, then updates the course list
  async function toggleFollow(id: number) {
    const isFollowing = following.includes(id);
    const response = await fetch("/api/enrollments", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: id }),
    });
    if (!response.ok) {
      console.error("Could not update follow:", response.status);
      return;
    }
    const data: { courseId: number; following: boolean } = await response.json();
    setCourses((current) =>
      current.map((course) =>
        course.id === data.courseId ? { ...course, following: data.following } : course,
      ),
    );
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
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-border bg-card p-3 w-1/6"
          >
            <option value="recent">Most recent</option>
            <option value="likes">Most liked</option>
            <option value="views">Most viewed</option>
          </select>
        </div>

        {!loaded ? (
          <p className="mt-20 text-center text-muted-foreground">Loading notes...</p>
          ) : notes.length === 0 ? (
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold">No notes found</h2>
            <p className="mt-2">Be the first to share a note!</p>
            <NextLink
            href="/share"
            className="inline-block mt-4 bg-primary text-primary-foreground rounded-md px-8 py-3">
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
                <FileIcon fileType={note.fileType} />
              </td>
              <td className="font-bold border-b border-border">
                {note.course.code}
                </td>
              <td className="border-b border-border">
                <span className="font-bold ">{note.title}</span><br/>
              {note.fileType}
              </td>
              <td className="border-b border-border">
                {note.uploader.name}
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
                  {note.likes}
                </div>
              </td>
              <td className="border-b border-border">
                <div className="flex items-center justify-center gap-2">
                  <Eye size={28} className="text-primary" />
                  {note.views}
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
