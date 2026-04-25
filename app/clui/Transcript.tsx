import { Box, Static, Text } from "ink";

export type TranscriptItem = {
  id: string;
  kind: "user" | "assistant" | "tool" | "error";
  text: string;
};

type Props = {
  transcript: TranscriptItem[];
  columns: number;
};

const getTranscriptItemText = (kind: TranscriptItem["kind"], text: string) => {
  switch (kind) {
    case "user":
      return (
        <Text bold color="cyan" wrap="wrap">
          {"> "} {text}
        </Text>
      );
    case "assistant":
      return (
        <Text bold color="green" wrap="wrap">
          {"* "} {text}
        </Text>
      );
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

const TranscriptItem = ({
  index,
  item,
  columns,
}: {
  index: number;
  item: TranscriptItem;
  columns: number;
}) => {
  return (
    <Box
      key={`${item.id}-${index}`}
      flexDirection="column"
      width={columns}
      paddingLeft={1}
      marginTop={1}
    >
      {getTranscriptItemText(item.kind, item.text)}
    </Box>
  );
};

export const Transcript = ({ transcript, columns }: Props) => {
  return (
    <Static items={transcript} style={{ flexDirection: "column", paddingX: 1 }}>
      {(item, index) => (
        <TranscriptItem
          key={`${item.id}-${index}`}
          index={index}
          item={item}
          columns={columns}
        />
      )}
    </Static>
  );
};