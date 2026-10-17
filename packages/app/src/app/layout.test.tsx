import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("renders the html shell with the font variable and the page inside body", () => {
    const html = RootLayout({ children: <main>content</main> }) as ReactElement<{ lang: string; className: string; children: ReactElement<{ children: ReactElement }> }>;
    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
    expect(html.props.className).toBe("font-sans antialiased __variable__font_sans");
    const body = html.props.children;
    expect(body.type).toBe("body");
    expect(isValidElement(body.props.children) && body.props.children.type).toBe("main");
  });

  it("titles pages as '<page> | DevMentor'", () => {
    expect(metadata.title).toEqual({ default: "DevMentor", template: "%s | DevMentor" });
    expect(metadata.description).toMatch(/mentorship/);
  });
});
