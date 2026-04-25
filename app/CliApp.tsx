import OpenAI from "openai";
import { useCallback, useMemo, useRef, useState } from "react";
import { Box, Static, Text, useWindowSize } from "ink";
import TextInput from "ink-text-input";
import type { ChatCompletionMessageParam } from "openai/resources";
import {
  createInitialMessages,
  getLastAssistantText,
  runModelTurn,
} from "./runModelTurn";
import Spinner from "ink-spinner";

type TranscriptItem = {
  id: string;
  kind: "user" | "assistant" | "tool";
  text: string;
};

function newId() {
  return crypto.randomUUID();
}

type CliAppProps = {
  apiKey: string;
};

export const CliApp = ({ apiKey }: CliAppProps) => {
  const { columns } = useWindowSize();
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<ChatCompletionMessageParam[]>(
    createInitialMessages(),
  );

  const client = useMemo(() => new OpenAI({ apiKey }), [apiKey]);

  const submit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();

      if (!trimmed || busy) {
        return;
      }

      setInput("");
      setBusy(true);

      const userId = newId();
      setTranscript((t) => [...t, { id: userId, kind: "user", text: trimmed }]);
      messagesRef.current.push({ role: "user", content: trimmed });

      try {
        await runModelTurn(client, messagesRef.current, {
          onToolLog: (m) => {
            setTranscript((t) => [
              ...t,
              { id: newId(), kind: "tool", text: m },
            ]);
          },
        });
        const reply = getLastAssistantText(messagesRef.current);
        if (reply) {
          setTranscript((t) => [
            ...t,
            { id: newId(), kind: "assistant", text: reply },
          ]);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setTranscript((t) => [
          ...t,
          { id: newId(), kind: "tool", text: `Error: ${message}` },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, client],
  );

  return (
    <Box flexDirection="column" width={columns}>
      <Static
        items={transcript}
        style={{ flexDirection: "column", paddingX: 1 }}
      >
        {(item, index) => (
          <Box
            key={`${item.id}-${index}`}
            flexDirection="column"
            width={columns}
            paddingLeft={1}
            marginBottom={1}
          >
            {item.kind === "user" ? (
              <Text wrap="wrap" color="cyan">
                <Text bold>{"> "}</Text>
                {item.text}
              </Text>
            ) : null}
            {item.kind === "assistant" ? (
              <Text wrap="wrap" color="white">
                <Text bold color="green">
                  {"* "}
                </Text>
                {item.text}
              </Text>
            ) : null}
            {item.kind === "tool" ? (
              <Text dimColor wrap="wrap">
                {item.text}
              </Text>
            ) : null}
          </Box>
        )}
      </Static>

      <Box paddingX={1}>
        {busy ? (
          <Text dimColor color="green">
            <Spinner type="dots3" /> <Text>Thinking...</Text>
          </Text>
        ) : null}
      </Box>

      <Box
        marginTop={1}
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        gap={1}
        width="100%"
      >
        <Box flexDirection="row" alignItems="center">
          <Text>{" >  "}</Text>
          <Box flexGrow={1}>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={submit}
              focus={!busy}
              placeholder="Type your message… (Ctrl+C to exit)"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
