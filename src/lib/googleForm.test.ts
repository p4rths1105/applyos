import { describe, it, expect } from "vitest";
import { extractQuestions } from "./googleForm";

describe("Google Form question extraction", () => {
  it("pulls question titles from FB_PUBLIC_LOAD_DATA_ and skips null-title items", () => {
    // Minimal shape of the real blob: data[1][1] = fields; field[1] = title.
    const data = [
      null,
      [
        null,
        [
          [111, "What is your full name?", null, 0],
          [222, "Why are you interested in this internship?", null, 1],
          [333, null, null, 6], // section break / image — no title, must be skipped
          [444, "Link to your best project", null, 1],
        ],
      ],
    ];
    const html = `<!doctype html><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(
      data,
    )};</script></html>`;

    expect(extractQuestions(html)).toEqual([
      "What is your full name?",
      "Why are you interested in this internship?",
      "Link to your best project",
    ]);
  });

  it("returns [] when the blob is absent", () => {
    expect(extractQuestions("<html>no forms here</html>")).toEqual([]);
  });
});
