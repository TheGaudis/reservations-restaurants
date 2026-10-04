/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";

import { expect, it } from "vitest";

// S2 (PLAN § 1.5, annexe F): every `defaultMessage` of translations/fr.json comes from docs/spec/ or from annexe F
// of the plan, placeholders aside. Each literal run of a message (outside `{…}` arguments, `#` and `<b>` tags, inside
// plural and select options) must appear word for word in that text. The spec writes « ␣ » for a no-break space,
// `**bold**`, HTML and « (s) » plurals: the comparison reads them as plain text, with « (s) » as « » or « s ».

const ROOT = new URL("../../", import.meta.url);

function read(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf-8");
}

/** Spaces of any kind as one space, typographic apostrophe as `'`, Markdown emphasis and code marks removed. */
function normalize(text: string): string {
  return text
    .replaceAll(/[`*]/gu, "")
    .replaceAll(/[␣\u00A0\u202F]/gu, " ")
    .replaceAll("’", "'")
    .replaceAll(/\s+/gu, " ");
}

/** The spec and annexe F, as written and without HTML tags (attribute values stay readable in the first one). */
function sources(): string[] {
  const spec = readdirSync(new URL("docs/spec/", ROOT))
    .filter((file) => file.endsWith(".md"))
    .map((file) => read(`docs/spec/${file}`))
    .join("\n");
  const plan = read("docs/migration/PLAN.md");
  const raw = `${spec}\n${plan.slice(plan.indexOf("### Annexe F"))}`;
  return [raw, raw.replaceAll(/<[^>]*>/gu, " ")]
    .map((text) => normalize(text))
    .flatMap((text) => [text, text.replaceAll("(s)", ""), text.replaceAll("(s)", "s")]);
}

/** Index of the `}` that closes the `{` at `open`. */
function closing(message: string, open: number): number {
  let depth = 0;
  for (let i = open; i < message.length; i += 1) {
    if (message[i] === "{") depth += 1;
    if (message[i] === "}") depth -= 1;
    if (depth === 0) return i;
  }
  throw new Error(`unbalanced braces in ${message}`);
}

/** Literal runs of an ICU message: text between arguments, and the text of each plural or select option. */
function literals(message: string): string[] {
  const runs: string[] = [];
  let text = "";
  let i = 0;
  while (i < message.length) {
    if (message[i] !== "{") {
      text += message[i];
      i += 1;
      continue;
    }
    runs.push(text);
    text = "";
    const end = closing(message, i);
    const argument = message.slice(i + 1, end);
    // `{name, plural, one {…} other {…}}`: the options follow the second comma.
    for (let option = argument.indexOf("{"); option !== -1;) {
      const optionEnd = closing(argument, option);
      runs.push(...literals(argument.slice(option + 1, optionEnd)));
      option = argument.indexOf("{", optionEnd);
    }
    i = end + 1;
  }
  runs.push(text);
  return runs
    .flatMap((run) => run.split(/#|<\/?b>/u))
    .map((run) => run.replaceAll("''", "'").trim())
    .filter((run) => /\p{L}/u.test(run));
}

const messages = Object.entries(
  JSON.parse(read("translations/fr.json")) as Record<string, { defaultMessage: string }>,
);
const texts = sources();

it("reads every message of translations/fr.json", () => {
  expect(messages.length).toBeGreaterThan(300);
  expect(
    literals("{name} : {count, plural, one {<b>#</b> couvert} other {<b>#</b> couverts}}"),
  ).toStrictEqual(["couvert", "couverts"]);
});

it.each(messages)("%s comes from docs/spec/ or annexe F (S2)", (_id, { defaultMessage }) => {
  const missing = literals(defaultMessage).filter(
    (run) => !texts.some((text) => text.includes(normalize(run))),
  );
  expect(missing).toStrictEqual([]);
});
