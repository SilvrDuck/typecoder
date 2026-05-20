export function Landing() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="max-w-xl w-full">
        <header className="mb-12">
          <h1 className="font-mono text-sm tracking-tightish text-ink-300">
            <span className="text-accent">▶</span> CodeType
          </h1>
        </header>
        <p className="font-sans text-3xl leading-tight tracking-tightish text-ink-100">
          Type real code.
          <br />
          <span className="text-ink-400">Understand real codebases.</span>
        </p>
      </div>
    </main>
  );
}
