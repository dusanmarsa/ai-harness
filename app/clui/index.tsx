import { useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import type { ModelMessage } from "ai";
import { makeSessionPath } from "../internals/saveTranscript";
import Spinner from "ink-spinner";
import { Input } from "./Input";
import type { TranscriptItem } from "./Transcript";
import { Transcript } from "./Transcript";

export const ClUI = () => {
  const { columns } = useWindowSize();
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesRef = useRef<ModelMessage[]>([]);
  const sessionPathRef = useRef<string>(makeSessionPath());

  return (
    <Box flexDirection="column" width={columns}>
      <Transcript transcript={transcript} columns={columns} />

      {streamingText ? (
        <Box paddingLeft={2} marginTop={1} width={columns}>
          <Text bold color="green" wrap="wrap">{"* "}{streamingText}</Text>
        </Box>
      ) : null}

      {busy && !streamingText ? (
        <Box paddingX={1} marginTop={1}>
          <Text dimColor color="green">
            <Spinner type="dots3" /> <Text>Thinking...</Text>
          </Text>
        </Box>
      ) : null}

      <Input
        busy={busy}
        setBusy={setBusy}
        setTranscript={setTranscript}
        setStreamingText={setStreamingText}
        messagesRef={messagesRef}
        sessionPath={sessionPathRef.current}
      />
    </Box>
  );
};
