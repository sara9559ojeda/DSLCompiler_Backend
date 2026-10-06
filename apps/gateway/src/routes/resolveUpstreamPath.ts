/** Replaces `:name` segments in an upstream path template with the matching route params. */
export function resolveUpstreamPath(template: string, params: Readonly<Record<string, string>>): string {
  return template.replace(/:([A-Za-z_]+)/g, (match, paramName: string) => params[paramName] ?? match);
}
