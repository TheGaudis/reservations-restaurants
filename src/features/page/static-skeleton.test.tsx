import { expect, it } from "vitest";

import { Header } from "@/features/page/Header";
import { PageLayout } from "@/features/page/PageLayout";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { renderWithProviders } from "@/test/render";

import indexHtml from "../../../index.html?raw";

// The static skeleton of index.html is written by hand (G-01, 03 § 3): it must stay the markup that React renders
// first, without the « Client / Collègue » switch, or the page jumps when React replaces it.

/** Tag, sorted attributes and text of an element tree; whitespace between elements is ignored. */
function canonical(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE)
    return (node.textContent ?? "").replaceAll(/\s+/gu, " ").trim();
  if (!(node instanceof HTMLElement)) return "";
  const attributes = [...node.attributes]
    .map(({ name, value }) => `${name}="${name === "style" ? node.style.cssText : value}"`)
    .toSorted();
  const children = [...node.childNodes].map(canonical).filter((text) => text !== "");
  return `<${node.localName} ${attributes.join(" ")}>${children.join("")}</${node.localName}>`;
}

it("index.html holds the frame of the root and PageSkeleton with the default names", async () => {
  const shell = new DOMParser()
    .parseFromString(indexHtml, "text/html")
    .querySelector("#root > .app-root");
  const { screen } = await renderWithProviders(
    <PageLayout>
      <Header />
      <PageSkeleton />
    </PageLayout>,
  );
  const rendered = screen.container.querySelector(".app-root");
  expect(shell).not.toBeNull();
  expect(rendered).not.toBeNull();
  const children = (root: Element | null) =>
    [...(root?.childNodes ?? [])].map(canonical).filter(Boolean);
  expect(children(shell)).toStrictEqual(children(rendered));
});
