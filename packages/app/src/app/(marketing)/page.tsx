// Public (frontend) pages use plain Tailwind CSS utilities.
export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Coming soon
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">DevMentor</h1>
      <p className="max-w-md text-balance text-lg text-muted-foreground">
        Guided mentorship for developers. We&apos;re building it now.
      </p>
    </main>
  );
}
