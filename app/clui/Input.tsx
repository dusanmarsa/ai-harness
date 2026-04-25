import { useCallback, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Box } from "ink";
import { Text } from "ink";
import TextInput from "ink-text-input";
import type { ChatCompletionMessageParam } from "openai/resources";
import type { TranscriptItem } from "./Transcript";
import { getLastAssistantMessage, runModelTurn } from "../internals/runModelTurn";

type Props = {
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setTranscript: Dispatch<SetStateAction<TranscriptItem[]>>;
  messagesRef: RefObject<ChatCompletionMessageParam[]>;
};

const createTranscriptItem = (kind: "user" | "assistant" | "tool" | "error", text: string): TranscriptItem => {
  return { id: crypto.randomUUID(), kind, text };
};

export const Input = ({ busy, setBusy, setTranscript, messagesRef }: Props) => {
  const [input, setInput] = useState("");

  const submit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();

      if (!trimmed || busy) {
        return;
      }

      setInput("");
      setBusy(true);
      
      setTranscript((t) => [...t, createTranscriptItem("user", trimmed)]);
      
      messagesRef.current.push({ role: "user", content: trimmed });

      try {
        await runModelTurn(messagesRef.current, {
          onToolLog: (m) => {
            setTranscript((t) => [
              ...t,
              createTranscriptItem("tool", m),
            ]);
          },
        });

        const reply = getLastAssistantMessage(messagesRef.current);

        const content = reply;

        if (reply && typeof reply.content === "string") {
          setTranscript((t) => [
            ...t,
            createTranscriptItem("assistant", reply.content as string),
          ]);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);

        setTranscript((t) => [
          ...t,
          createTranscriptItem("error", `Error: ${message}`),
        ]);

      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return (
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
  );
};
