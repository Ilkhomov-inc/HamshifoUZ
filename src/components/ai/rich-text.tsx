import { Fragment } from "react";

/**
 * Renders model output safely: plain text → React elements only.
 * Supports short "Heading:" lines, "- " bullets and **bold**. Nothing is ever
 * injected as HTML, so model output cannot execute markup or scripts.
 */
function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{p.replace(/\*\*/g, "")}</Fragment>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${k}`} className="my-1.5 space-y-1 pl-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>{inline(li, `li-${k}-${i}`)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]!);
      return;
    }
    flush(idx);
    if (!line) return;
    const plain = line.replace(/^#+\s*/, "");
    if (/:$/.test(plain) && plain.length <= 70) {
      blocks.push(
        <p key={idx} className="mt-3 font-semibold text-ink first:mt-0">
          {inline(plain.replace(/\*\*/g, ""), `h-${idx}`)}
        </p>,
      );
    } else {
      blocks.push(
        <p key={idx} className="my-1.5">
          {inline(plain, `p-${idx}`)}
        </p>,
      );
    }
  });
  flush(lines.length);
  return <div className="text-[15px] leading-relaxed text-ink-2">{blocks}</div>;
}
