import type { ReactNode } from "react";

// A template (unlike layout) re-mounts on every navigation, which is what
// makes this animation replay on each page change rather than only once.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out">{children}</div>;
}
