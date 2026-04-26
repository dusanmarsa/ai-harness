import OpenAI from "openai";
import { EMBED_BATCH_SIZE } from "../constants";

export const embedTexts = async (
  client: OpenAI,
  texts: string[],
  model: string,
  dimensions: number,
): Promise<number[][]> => {
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const slice = texts.slice(i, i + EMBED_BATCH_SIZE);

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
};
