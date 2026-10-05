// Pure helpers for staging files referenced by a containerlab topology
// deployed from a URL (issue #323).

// Collect bind-mount sources that must be staged for a URL-deployed topology.
// Only relative sources are returned (absolute paths and named volumes are
// skipped). Path is normalized (no leading "./"), POSIX separators.
export function collectReferencedBindSources(topology: object): string[] {
  const sources: string[] = [];
  const nodes = (topology as Record<string, unknown>)["topology"] as
    | Record<string, unknown>
    | undefined;
  const nodesMap = nodes?.["nodes"] as
    | Record<string, { binds?: unknown }>
    | undefined;
  if (!nodesMap || typeof nodesMap !== "object") {
    return sources;
  }
  for (const node of Object.values(nodesMap)) {
    if (!node || typeof node !== "object" || !Array.isArray(node.binds)) {
      continue;
    }
    for (const bind of node.binds) {
      if (typeof bind !== "string") {
        continue;
      }
      const parts = bind.split(":");
      if (parts.length !== 2) {
        continue;
      }
      let source = parts[0];
      while (source.startsWith("./")) {
        source = source.slice(2);
      }
      if (source.startsWith("/") || /^[A-Za-z]:/.test(source)) {
        continue;
      }
      // Named volumes have no path separator; relative file paths do.
      if (!source.includes("/")) {
        continue;
      }
      if (!sources.includes(source)) {
        sources.push(source);
      }
    }
  }
  return sources;
}

// Join a base topology URL with a relative file path, stripping any query
// string from the base. Returns the absolute file URL.
export function resolveFileUrl(topologyUrl: string, relativePath: string): string {
  const base = topologyUrl.split("?")[0];
  const dir = base.endsWith("/") ? base : base.slice(0, base.lastIndexOf("/") + 1);
  return dir + relativePath;
}
