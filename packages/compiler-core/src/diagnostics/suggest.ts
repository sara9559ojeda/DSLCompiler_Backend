/** Classic edit distance (insert/delete/substitute = 1). Inputs are short identifiers, so O(n·m) is fine. */
export function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j]!;
      previous[j] = Math.min(above + 1, previous[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length]!;
}

/**
 * The candidate closest to `word`, if it's close enough to plausibly be a
 * typo (distance ≤ 1/3 of the word's length, at least 1). Case-insensitive.
 */
export function closestMatch(word: string, candidates: Iterable<string>): string | undefined {
  const target = word.toLowerCase();
  const maxDistance = Math.max(1, Math.floor(target.length / 3));
  let best: { candidate: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const distance = editDistance(target, candidate.toLowerCase());
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { candidate, distance };
    }
  }
  return best?.candidate;
}

export function didYouMean(candidate: string | undefined): string | undefined {
  return candidate === undefined ? undefined : `¿Quisiste decir '${candidate}'?`;
}
