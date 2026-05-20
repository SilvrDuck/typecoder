const REPO_URL = "https://github.com/SilvrDuck/typecoder";

export function Footer() {
  return (
    <footer className="font-mono text-2xs text-ink-500 tracking-wider leading-relaxed">
      <span>Inspired by </span>
      <a
        href="https://typing.io"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-300 hover:text-accent transition-colors"
      >
        typing.io
      </a>
      <span> &amp; </span>
      <a
        href="https://monkeytype.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-300 hover:text-accent transition-colors"
      >
        monkeytype.com
      </a>
      <span className="text-ink-700 mx-2">·</span>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-300 hover:text-accent transition-colors"
        data-testid="footer-repo"
      >
        source
      </a>
      <span className="text-ink-700 mx-2">·</span>
      <span>MIT</span>
    </footer>
  );
}
