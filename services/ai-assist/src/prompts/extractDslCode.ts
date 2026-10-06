/** Strips a ```-fenced code block if the model wrapped its answer in one despite instructions not to. */
export function extractDslCode(rawResponse: string): string {
  const fenced = rawResponse.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
  return (fenced ? fenced[1]! : rawResponse).trim();
}
