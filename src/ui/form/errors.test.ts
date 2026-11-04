import { describe, expect, it } from "vitest";

import { errorText, focusFirstInvalid } from "@/ui/form/errors";

describe("errorText", () => {
  it.each([
    [[], ""],
    [["Indiquez vos nom et prénom."], "Indiquez vos nom et prénom."],
    [[undefined, "", "Indiquez le nom."], "Indiquez le nom."],
    // Standard Schema (valibot): issue objects (R-17).
    [
      [{ message: "Indiquez un stock supérieur à 0.", path: [] }],
      "Indiquez un stock supérieur à 0.",
    ],
    [[{ message: "" }, { code: 1 }, null, "Choisissez une date."], "Choisissez une date."],
  ])("reads %j as « %s »", (errors, text) => {
    expect(errorText(errors)).toBe(text);
  });
});

describe("focusFirstInvalid", () => {
  function container(html: string) {
    const root = document.createElement("form");
    root.innerHTML = html;
    document.body.append(root);
    return root;
  }

  it("focuses the first invalid control in DOM order (04 § 5.4)", () => {
    const root = container(
      '<input id="name"><input id="contact" aria-invalid="true"><input id="class" aria-invalid="true">',
    );
    focusFirstInvalid(root);
    expect(document.activeElement?.id).toBe("contact");
    root.remove();
  });

  it("skips an invalid element that takes no focus, and a disabled control (04 § 5.4)", () => {
    const root = container(
      '<div id="group" aria-invalid="true"></div><input id="price" aria-invalid="true" disabled>' +
        '<span id="box" role="checkbox" tabindex="0" aria-invalid="true"></span>',
    );
    focusFirstInvalid(root);
    expect(document.activeElement?.id).toBe("box");
    root.remove();
  });

  it("leaves the focus alone without an invalid control", () => {
    const root = container('<input id="name"><button id="send">Envoyer</button>');
    root.querySelector<HTMLButtonElement>("#send")?.focus();
    focusFirstInvalid(root);
    expect(document.activeElement?.id).toBe("send");
    root.remove();
  });
});
