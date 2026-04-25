import OpenAI from "openai";

const BATCH = 64;

export async function embedTexts(
  client: OpenAI,
  texts: string[],
  model: string,
  dimensions: number
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await client.embeddings.create({
      model,
      input: slice,
      dimensions,
    });
    const ordered = res.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding as number[]);
    out.push(...ordered);
  }
  return out;
}
