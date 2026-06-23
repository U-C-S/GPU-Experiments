export type PageKey = "compute" | "life" | "triangle";

export function getPageFromHash(): PageKey {
  if (location.hash === "#triangle") {
    return "triangle";
  }

  if (location.hash === "#life") {
    return "life";
  }

  return "compute";
}
