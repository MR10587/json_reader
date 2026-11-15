import { describe, expect, it } from "vitest";
import { normalizeContent } from "../content";

describe("normalizeContent", () => {
  it("keeps text parts and drops empty or non-string ones", () => {
    expect(normalizeContent({ content_type: "text", parts: ["Hello", "", 5, "World"] }).parts).toEqual([
      { kind: "text", text: "Hello" },
      { kind: "text", text: "World" },
    ]);
  });

  it("handles text with missing or invalid parts", () => {
    expect(normalizeContent({ content_type: "text" }).parts).toEqual([]);
    expect(normalizeContent({ content_type: "text", parts: "nope" }).parts).toEqual([]);
  });

  it("parses multimodal_text with images, audio and unknown parts", () => {
    const result = normalizeContent({
      content_type: "multimodal_text",
      parts: [
        { content_type: "image_asset_pointer", asset_pointer: "file-service://file-fake", width: 640, height: 480, size_bytes: 1 },
        "Describe this image",
        { content_type: "audio_transcription", text: "spoken words", direction: "in" },
        { content_type: "audio_asset_pointer", asset_pointer: "sediment://fake" },
        { content_type: "some_future_part" },
        { no_type: true },
        null,
      ],
    });
    expect(result.contentType).toBe("multimodal_text");
    expect(result.parts).toEqual([
      { kind: "image", assetPointer: "file-service://file-fake", width: 640, height: 480 },
      { kind: "text", text: "Describe this image" },
      { kind: "audio", transcript: "spoken words" },
      { kind: "audio", transcript: null },
      { kind: "unsupported", contentType: "some_future_part" },
      { kind: "unsupported", contentType: "unknown" },
    ]);
  });

  it("parses code and execution_output", () => {
    expect(normalizeContent({ content_type: "code", language: "python", text: "print(1)" }).parts).toEqual([
      { kind: "code", language: "python", text: "print(1)" },
    ]);
    expect(normalizeContent({ content_type: "code", text: "x" }).parts).toEqual([
      { kind: "code", language: null, text: "x" },
    ]);
    expect(normalizeContent({ content_type: "execution_output", text: "1\n" }).parts).toEqual([
      { kind: "execution_output", text: "1\n" },
    ]);
  });

  it("parses browsing-related types", () => {
    expect(
      normalizeContent({ content_type: "tether_quote", url: "https://example.com", domain: "example.com", text: "quoted", title: "Ex" }).parts,
    ).toEqual([{ kind: "quote", text: "quoted", url: "https://example.com", title: "Ex", domain: "example.com" }]);
    expect(normalizeContent({ content_type: "tether_browsing_display", result: "raw", summary: "" }).parts).toEqual([
      { kind: "browsing", text: "raw" },
    ]);
    expect(normalizeContent({ content_type: "tether_browsing_display" }).parts).toEqual([]);
  });

  it("parses system_error", () => {
    expect(normalizeContent({ content_type: "system_error", name: "tool_error", text: "boom" }).parts).toEqual([
      { kind: "error", name: "tool_error", text: "boom" },
    ]);
  });

  it("parses reasoning types", () => {
    expect(
      normalizeContent({
        content_type: "thoughts",
        thoughts: [{ summary: "Plan", content: "Think step" }, { content: "More" }, "bad"],
      }).parts,
    ).toEqual([{ kind: "reasoning", text: "Plan\nThink step\n\nMore" }]);
    expect(normalizeContent({ content_type: "reasoning_recap", content: "Thought for 3s" }).parts).toEqual([
      { kind: "reasoning", text: "Thought for 3s" },
    ]);
  });

  it("parses user_editable_context", () => {
    expect(
      normalizeContent({ content_type: "user_editable_context", user_profile: "Profile", user_instructions: "Be brief" }).parts,
    ).toEqual([{ kind: "context", text: "Profile\n\nBe brief" }]);
  });

  it("keeps unknown content types as unsupported", () => {
    expect(normalizeContent({ content_type: "brand_new_type", stuff: 1 })).toEqual({
      contentType: "brand_new_type",
      parts: [{ kind: "unsupported", contentType: "brand_new_type" }],
    });
  });

  it("handles missing or non-object content", () => {
    expect(normalizeContent(undefined)).toEqual({ contentType: "missing", parts: [] });
    expect(normalizeContent("text")).toEqual({ contentType: "missing", parts: [] });
    expect(normalizeContent({}).contentType).toBe("unknown");
  });
});
