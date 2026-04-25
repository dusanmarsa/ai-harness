import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources";
import {
  findFilesToolDefinition,
  findFilesToolFunction,
  findFilesToolFunctionArgsSchema,
} from "./tools/findFiles";
import {
  readFileToolDefinition,
  readFileToolFunction,
  readFileToolFunctionArgsSchema,
} from "./tools/readFile";

const apiKey = process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  throw new Error("OPEN_AI_API_KEY is not set");
}

const [, , flag, prompt] = process.argv;

if (flag !== "-p" || !prompt) {
  throw new Error("error: -p flag is required");
}

const client = new OpenAI({
  apiKey,
});

const messages = [
  {
    role: "system",
    content:
      "You are a helpful assistant that can answer questions and help with tasks.",
  },
  {
    role: "user",
    content: prompt,
  },
] as ChatCompletionMessageParam[];

let shouldContinue = true;

while (shouldContinue) {
  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages,
    tools: [readFileToolDefinition, findFilesToolDefinition],
  });

  messages.push({
    role: "assistant",
    content: response.choices[0].message.content,
    tool_calls: response.choices[0].message.tool_calls,
  } satisfies ChatCompletionAssistantMessageParam);

  const choise = response.choices[0];

  if (choise) {
    if(choise.finish_reason === 'stop') {
      shouldContinue = false;
      break;
    }

    if (choise.finish_reason === "tool_calls") {
      const toolType = choise.message.tool_calls?.[0]?.type;

      if (toolType === "function") {
        const { name, arguments: args } =
          choise.message.tool_calls?.[0]?.function ?? {};


          

        if (name === "readFile") {
          const { success, data, error } =
            readFileToolFunctionArgsSchema.safeParse(JSON.parse(args ?? ""));

          if (success) {
            const { filePath } = data;
            const fileContent = await readFileToolFunction(filePath);

            messages.push({
              role: "tool",
              tool_call_id: choise.message.tool_calls?.[0]?.id ?? "",
              content: [
                {
                  type: "text",
                  text: fileContent,
                },
              ],
            } satisfies ChatCompletionToolMessageParam);
          } else {
            console.error(error);

            messages.push({
              role: "assistant",
              content: `Error: ${error.message}`,
            } satisfies ChatCompletionAssistantMessageParam);
          }
        } else if (name === "findFiles") {
          const { success, data, error } =
            findFilesToolFunctionArgsSchema.safeParse(JSON.parse(args ?? ""));

          if (success) {
            const { query } = data;
            const listing = await findFilesToolFunction(query);

            messages.push({
              role: "tool",
              tool_call_id: choise.message.tool_calls?.[0]?.id ?? "",
              content: [
                {
                  type: "text",
                  text: listing,
                },
              ],
            } satisfies ChatCompletionToolMessageParam);
          } else {
            console.error(error);

            messages.push({
              role: "assistant",
              content: `Error: ${error.message}`,
            } satisfies ChatCompletionAssistantMessageParam);
          }
        }
      }
    }
  }
}

console.log(JSON.stringify(messages, null, 2));