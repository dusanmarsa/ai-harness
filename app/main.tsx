import { render } from "ink";
import { ClUI } from "./clui";

if (!process.env.OPEN_AI_API_KEY) {
  console.error("OPEN_AI_API_KEY is not set");
  process.exit(1);
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "This app must run in an interactive terminal (stdin/stdout connected to a TTY).",
  );

  process.exit(1);
}

const { waitUntilExit } = render(<ClUI />, {
  exitOnCtrlC: true
});

await waitUntilExit();
