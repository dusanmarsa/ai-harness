import { render } from "ink";
import { CliApp } from "./CliApp";

const apiKey = process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  console.error("OPEN_AI_API_KEY is not set");
  process.exit(1);
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "This app must run in an interactive terminal (stdin/stdout connected to a TTY).",
  );

  process.exit(1);
}

const { waitUntilExit } = render(<CliApp apiKey={apiKey} />, {
  exitOnCtrlC: true
});

await waitUntilExit();
