import { memo } from "react";
import { Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

export type TranscriptItem = {
  id: string;
  kind: "user" | "assistant" | "tool" | "error";
  text: string;
};

type Props = {
  transcript: TranscriptItem[];
  columns: number;
};

const hasCode = (text: string) => text.includes("```");

/** First fenced block: language from the opening ``` line, body without that line. */
const splitWithCode = (text: string) => {
  const match = text.match(
    /^([\s\S]*?)```[ \t]*([^\r\n]*)\r?\n([\s\S]*?)```([\s\S]*)$/,
  );

  if (!match) {
    return null;
  }

  const [, before, langLine, code, after] = match;
  const language = langLine.trim() || undefined;

  return {
    textBeforeCodeBlock: before.trim() || undefined,
    language,
    code: code.trimEnd(),
    textAfterCodeBlock: after.trim() || undefined,
  };
};

const AssitantMessage = ({ text }: { text: string }) => {
  if (!hasCode(text)) {
    return (
      <Text bold color="green" wrap="wrap">
        {text}
      </Text>
    );
  }

  const parsed = splitWithCode(text);
  if (!parsed) {
    return (
      <Text color="green" wrap="wrap">
        {text}
      </Text>
    );
  }

  const { textBeforeCodeBlock, language, code, textAfterCodeBlock } = parsed;

  return (
    <Box flexDirection="column" gap={1}>
      {textBeforeCodeBlock && (
        <Box>
          <Text color="green" wrap="wrap">
            {textBeforeCodeBlock}
          </Text>
        </Box>
      )}
      <Box
        borderStyle="single"
        borderColor="gray"
        borderDimColor
        alignSelf="flex-start"
      >
        {code ? <SyntaxHighlight code={code} language={language} /> : null}
      </Box>
      {textAfterCodeBlock && (
        <Box>
          <Text color="green" wrap="wrap">
            {textAfterCodeBlock}
          </Text>
        </Box>
      )}
    </Box>
  );
};

const getTranscriptItemText = (kind: TranscriptItem["kind"], text: string) => {
  switch (kind) {
    case "user":
      return (
        <Text bold color="cyan" wrap="wrap">
          {"> "} {text}
        </Text>
      );
    case "assistant": {
      return <AssitantMessage text={text} />;
    }
    case "tool":
      return (
        <Text dimColor wrap="wrap">
          {text}
        </Text>
      );
    case "error":
      return (
        <Text dimColor wrap="wrap" color="red">
          {text}
        </Text>
      );
    default:
      return <Text wrap="wrap">{text}</Text>;
  }
};

const TranscriptItem = memo(
  ({ item, columns }: { item: TranscriptItem; columns: number }) => {
    return (
      <Box flexDirection="column" width={columns} paddingLeft={1} marginTop={1}>
        {getTranscriptItemText(item.kind, item.text)}
      </Box>
    );
  },
);

export const Transcript = ({ transcript, columns }: Props) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {transcript.map((item) => (
        <TranscriptItem key={item.id} item={item} columns={columns} />
      ))}
    </Box>
  );
};
