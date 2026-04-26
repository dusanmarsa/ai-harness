import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ModelMessage } from "ai";

const TRANSCRIPTS_DIR = join(process.cwd(), ".transcripts");

export const makeSessionPath = (): string => {
  const now = new Date();
  const stamp = now.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
  return join(TRANSCRIPTS_DIR, `${stamp}.json`);
};

export const saveTranscript = async (
  sessionPath: string,
  messages: ModelMessage[],
): Promise<void> => {
  await mkdir(TRANSCRIPTS_DIR, { recursive: true });
  await Bun.write(sessionPath, JSON.stringify(messages, null, 2));
};
