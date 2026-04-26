import { CHUNK_MAX_CHARS } from "../constants";

export type TextChunk = {
  startLine: number;
  endLine: number;
  text: string;
};

/**
 * Splits a file into line-bounded chunks so each chunk is at most `maxChars`
 * (unless a single line exceeds that, in which case the line is taken alone).
 */
export const chunkSource = (
  content: string,
  maxChars: number = CHUNK_MAX_CHARS,
): TextChunk[] => {
  const lines = content.split("\n");
  const chunks: TextChunk[] = [];

  let startLine = 1;
  let buffer: string[] = [];
  let length = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;
    const added = line.length + (buffer.length > 0 ? 1 : 0);

    if (line.length > maxChars) {
      if (buffer.length > 0) {
        chunks.push(flushBuffer(buffer, startLine, i));
        buffer = [];
        length = 0;
      }

      chunks.push({ startLine: lineNum, endLine: lineNum, text: line });
      startLine = lineNum + 1;

      continue;
    }

    if (length + added > maxChars && buffer.length > 0) {
      const endLine = i;
      chunks.push(flushBuffer(buffer, startLine, endLine));
      buffer = [line];
      length = line.length;
      startLine = lineNum;
    } else {
      buffer.push(line);
      length += added;
    }
  }

  if (buffer.length > 0) {
    chunks.push(
      flushBuffer(
        buffer,
        startLine,
        lines.length > 0 ? lines.length : startLine,
      ),
    );
  }

  return chunks;
};

const flushBuffer = (
  buffer: string[],
  startLine: number,
  endLineInclusive: number,
): TextChunk => {
  return {
    startLine,
    endLine: endLineInclusive,
    text: buffer.join("\n"),
  };
};
