export type PageKey = "compute" | "triangle";

export function getPageFromHash(): PageKey {
  return location.hash === "#triangle" ? "triangle" : "compute";
}
