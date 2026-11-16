import { DOCTOR_MARKER } from "./prompts";

/**
 * Removes the "[[DOCTOR]]" control marker from a streamed reply without ever
 * leaking a partial marker to the client. Sets `found` when it was present.
 */
export class MarkerFilter {
  private buf = "";
  found = false;

  constructor(private marker = DOCTOR_MARKER) {}

  push(chunk: string): string {
    this.buf += chunk;
    let out = "";
    for (;;) {
      const idx = this.buf.indexOf(this.marker);
      if (idx < 0) break;
      out += this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + this.marker.length);
      this.found = true;
    }
    const keep = partialSuffix(this.buf, this.marker);
    out += this.buf.slice(0, this.buf.length - keep);
    this.buf = this.buf.slice(this.buf.length - keep);
    return out;
  }

  flush(): string {
    const rest = this.buf.replace(/\[\[\s*DOCTOR\s*\]\]/gi, () => {
      this.found = true;
      return "";
    });
    this.buf = "";
    return rest;
  }
}

function partialSuffix(s: string, marker: string): number {
  for (let k = Math.min(s.length, marker.length - 1); k > 0; k--) {
    if (marker.startsWith(s.slice(-k))) return k;
  }
  return 0;
}
