import { describe, it, expect } from "vitest";
import React from "react";
import {
  cleanCueText,
  decodeHtmlEntities,
  parseCueText,
  hexToRgba,
} from "../components/SubtitleOverlay";

describe("SubtitleOverlay - Cue text sanitizer and parser", () => {
  describe("cleanCueText", () => {
    it("strips font tags with face, size, and color attributes", () => {
      const input =
        '<font face="Swis721 BT" size="48"><b>What should we do, Allen?</b></font>';
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("<b>What should we do, Allen?</b>");
    });

    it("strips font tags from Chronos sample", () => {
      const input =
        '<font face="Swis721 BT" size="48">We work together to save Rohzenheim.</font>';
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("We work together to save Rohzenheim.");
    });

    it("strips SSA/ASS override tags like {\\an8} and {\\pos(x,y)}", () => {
      const input = "{\\an8}Hello {\\b1}World{\\b0} {\\pos(192,240)}!";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("Hello World !");
    });

    it("strips WebVTT inline timestamps", () => {
      const input = "<00:19.500>Karaoke <00:20.000>text";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("Karaoke text");
    });

    it("converts <br>, <br/>, <br /> to newlines", () => {
      const input = "Line 1<br>Line 2<br/>Line 3<br />Line 4";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("Line 1\nLine 2\nLine 3\nLine 4");
    });

    it("normalizes <strong> and <em> to <b> and <i>", () => {
      const input = "<strong>Bold</strong> and <em>Italic</em>";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("<b>Bold</b> and <i>Italic</i>");
    });

    it("strips voice, class, ruby, and other non-formatting tags", () => {
      const input =
        "<v Speaker><c.yellow><ruby>Base<rt>Annotation</rt></ruby> Message</c></v>";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("BaseAnnotation Message");
    });

    it("preserves <b>, <i>, and <u> tags", () => {
      const input = "<b>Bold</b>, <i>Italic</i>, and <u>Underline</u>";
      const cleaned = cleanCueText(input);
      expect(cleaned).toBe("<b>Bold</b>, <i>Italic</i>, and <u>Underline</u>");
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodes basic entities correctly", () => {
      expect(decodeHtmlEntities("&quot;Hello&quot; &amp; &lt;World&gt;")).toBe(
        '"Hello" & <World>',
      );
      expect(
        decodeHtmlEntities(
          "&apos;quote&apos; &#39;quote&#39; &#039;quote&#039;",
        ),
      ).toBe("'quote' 'quote' 'quote'");
      expect(decodeHtmlEntities("word&nbsp;word")).toBe("word word");
    });

    it("decodes numeric and hex entities", () => {
      expect(decodeHtmlEntities("&#65;&#66;&#67;")).toBe("ABC");
      expect(decodeHtmlEntities("&#x41;&#x42;&#x43;")).toBe("ABC");
    });
  });

  describe("parseCueText", () => {
    it("renders cleaned text with nested React elements without raw tags", () => {
      const input =
        '<font face="Swis721 BT" size="48"><b>What should we do, Allen?</b></font>';
      const result = parseCueText(input) as React.ReactNode[];
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verify that no font tag strings remain in the output
      const json = JSON.stringify(result);
      expect(json).not.toContain("Swis721");
      expect(json).not.toContain("<font");
      expect(json).not.toContain("</font>");
      expect(json).toContain("What should we do, Allen?");
    });

    it("handles empty or null text safely", () => {
      expect(parseCueText("")).toBeNull();
    });
  });

  describe("hexToRgba", () => {
    it("converts 6-character hex colors correctly", () => {
      expect(hexToRgba("#ffffff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
      expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
      expect(hexToRgba("ff0000", 0.8)).toBe("rgba(255, 0, 0, 0.8)");
    });

    it("converts 3-character shorthand hex colors correctly", () => {
      expect(hexToRgba("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
      expect(hexToRgba("#000", 1)).toBe("rgba(0, 0, 0, 1)");
    });

    it("falls back safely on invalid colors", () => {
      expect(hexToRgba("invalid", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
      expect(hexToRgba("", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
    });
  });
});
