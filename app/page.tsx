// Placeholder landing page. Replaced by the real landing page in #7.
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">CourseNotes</h1>
      <p className="text-muted-foreground">
        Share and find course notes with other McGill students.
      </p>
      <div className="flex gap-4">
        <Link href="/auth/login" className="underline">
          Log in
        </Link>
        <Link href="/auth/sign-up" className="underline">
          Create account
        </Link>
      </div>
    </main>
  );
}
