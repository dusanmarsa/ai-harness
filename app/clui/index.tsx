import { useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import type { ChatCompletionMessageParam } from "openai/resources";
import { createMessagesArray } from "../internals/runModelTurn";
import Spinner from "ink-spinner";
import { Input } from "./Input";
import type { TranscriptItem } from "./Transcript";
import { Transcript } from "./Transcript";

export const ClUI = () => {
  const { columns } = useWindowSize();
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<ChatCompletionMessageParam[]>(
    createMessagesArray(),
  );

  return (
    <Box flexDirection="column" width={columns}>
      <Transcript transcript={transcript} columns={columns} />

      {
        busy ? (
          <Box paddingX={1}>
            <Text dimColor color="green">
              <Spinner type="dots3" /> <Text>Thinking...</Text>
            </Text>
          </Box>
        ) : null
      }

      <Input
        busy={busy}
        setBusy={setBusy}
        setTranscript={setTranscript}
        messagesRef={messagesRef}
      />
    </Box>
  );
};
