import { hydrateRoot } from "react-dom/client";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { BrowserOnly } from "@/features/page/BrowserOnly";

// The prerendered shell and its hydration (PLAN § 2.1, arbitrage 16): React renders to HTML as the build does, then
// hydrates it, with a value that differs between the two renders, like the URL or the local copy.

let side = "server";

function Side() {
  return <p>{side}</p>;
}

function App({ browserOnly }: { browserOnly: boolean }) {
  return (
    <div>
      <h1>Shell</h1>
      {browserOnly ? (
        <BrowserOnly fallback={<p>fallback</p>}>
          <Side />
        </BrowserOnly>
      ) : (
        <Side />
      )}
    </div>
  );
}

/** The HTML of `browserOnly`, rendered with `side` at "server", in a container of the page. */
async function prerender(browserOnly: boolean): Promise<HTMLElement> {
  side = "server";
  const stream = await renderToReadableStream(<App browserOnly={browserOnly} />);
  await stream.allReady;
  const container = document.createElement("div");
  container.innerHTML = await new Response(stream).text();
  document.body.append(container);
  return container;
}

/** Hydrates `container` with `side` at "client"; returns the errors React reports (#418 among them). */
function hydrate(container: HTMLElement, browserOnly: boolean): unknown[] {
  side = "client";
  const errors: unknown[] = [];
  // Test only: React reports a mismatch here instead of in the console.
  const root = hydrateRoot(container, <App browserOnly={browserOnly} />, {
    onRecoverableError: (error) => errors.push(error),
  });
  cleanups.push(() => {
    root.unmount();
    container.remove();
  });
  return errors;
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("BrowserOnly", () => {
  it("leaves its fallback in the shell, then renders its children in the browser without a mismatch", async () => {
    const container = await prerender(true);
    expect(container.textContent).toBe("Shellfallback");
    const title = container.querySelector("h1");
    const errors = hydrate(container, true);
    await expect.poll(() => container.textContent).toBe("Shellclient");
    expect(errors).toStrictEqual([]);
    // The rest of the shell is hydrated, not built again.
    expect(container.querySelector("h1")).toBe(title);
  });

  it("is what prevents the mismatch: the same value outside of it fails to hydrate", async () => {
    const container = await prerender(false);
    expect(container.textContent).toBe("Shellserver");
    const errors = hydrate(container, false);
    await expect.poll(() => errors.length).toBeGreaterThan(0);
  });
});
