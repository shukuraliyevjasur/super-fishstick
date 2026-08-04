/**
 * Webhook — Unit Tests
 *
 * Tests signature verification and comment event parsing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyWebhookSignature,
  parseCommentEvents,
  parseMessageEvents,
  parseReadEvents,
} from "../lib/meta/webhook";
import { createHmac } from "crypto";

// Mock the environment variable
beforeEach(() => {
  vi.stubEnv("FACEBOOK_APP_SECRET", "test_app_secret_12345");
});

describe("verifyWebhookSignature", () => {
  function createSignature(payload: string, secret: string): string {
    return (
      "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
    );
  }

  it("should return true for valid signature", () => {
    const payload = '{"test": "data"}';
    const signature = createSignature(payload, "test_app_secret_12345");
    expect(verifyWebhookSignature(payload, signature)).toBe(true);
  });

  it("should return false for invalid signature", () => {
    const payload = '{"test": "data"}';
    const signature = "sha256=invalid_signature_here";
    expect(verifyWebhookSignature(payload, signature)).toBe(false);
  });

  it("should return false for null signature", () => {
    expect(verifyWebhookSignature('{"test": "data"}', null)).toBe(false);
  });

  it("should return false for empty signature", () => {
    expect(verifyWebhookSignature('{"test": "data"}', "")).toBe(false);
  });

  it("should return false when payload is tampered", () => {
    const originalPayload = '{"test": "data"}';
    const signature = createSignature(originalPayload, "test_app_secret_12345");
    const tamperedPayload = '{"test": "tampered"}';
    expect(verifyWebhookSignature(tamperedPayload, signature)).toBe(false);
  });

  it("should return false when signed with wrong secret", () => {
    const payload = '{"test": "data"}';
    const signature = createSignature(payload, "wrong_secret");
    expect(verifyWebhookSignature(payload, signature)).toBe(false);
  });
});

describe("parseCommentEvents", () => {
  it("should parse a valid comment event", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_456",
                text: "I want the LINK!",
                from: {
                  id: "user_789",
                  username: "testuser",
                },
                media: {
                  id: "media_101",
                },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      instagramAccountId: "page_123",
      commentId: "comment_456",
      commentText: "I want the LINK!",
      commenterId: "user_789",
      commenterName: "testuser",
      mediaId: "media_101",
    });
  });

  it("should ignore non-instagram objects", () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_456",
                text: "hello",
                from: { id: "user_789", username: "test" },
                media: { id: "media_101" },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(0);
  });

  it("should ignore non-comment fields", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                id: "msg_456",
                text: "hello",
                from: { id: "user_789", username: "test" },
                media: { id: "media_101" },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(0);
  });

  it("should handle multiple comment events in one payload", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_1",
                text: "LINK",
                from: { id: "user_1", username: "user1" },
                media: { id: "media_1" },
              },
            },
            {
              field: "comments",
              value: {
                id: "comment_2",
                text: "PRICE",
                from: { id: "user_2", username: "user2" },
                media: { id: "media_1" },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(2);
  });

  it("should parse events with empty text so matching can decide later", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_1",
                text: "", // empty text
                from: { id: "user_1", username: "user1" },
                media: { id: "media_1" },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0].commentText).toBe("");
  });

  it("should ignore comments from the connected account itself", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_1",
                text: "LINK",
                from: { id: "page_123", username: "ourbrand" },
                media: { id: "media_1" },
              },
            },
          ],
        },
      ],
    };

    expect(parseCommentEvents(payload)).toHaveLength(0);
  });

  it("should still parse other users' comments alongside a self-comment", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_1",
                text: "LINK",
                from: { id: "page_123", username: "ourbrand" },
                media: { id: "media_1" },
              },
            },
            {
              field: "comments",
              value: {
                id: "comment_2",
                text: "LINK",
                from: { id: "user_2", username: "user2" },
                media: { id: "media_1" },
              },
            },
          ],
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0].commenterId).toBe("user_2");
  });

  it("should handle entries without changes", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1234567890,
          // no changes field
        },
      ],
    };

    const events = parseCommentEvents(payload);
    expect(events).toHaveLength(0);
  });
});

describe("parseMessageEvents", () => {
  it("parses a quick-reply tap from entry.changes messages field", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "user_999" },
                recipient: { id: "acct_123" },
                message: {
                  mid: "mid_abc",
                  text: "Reveal",
                  quick_reply: { payload: "reveal:automation_456" },
                },
              },
            },
          ],
        },
      ],
    };

    const events = parseMessageEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      instagramAccountId: "acct_123",
      userId: "user_999",
      payload: "reveal:automation_456",
      mid: "mid_abc",
    });
  });

  it("parses a followcheck quick-reply tap", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "user_999" },
                recipient: { id: "acct_123" },
                message: {
                  mid: "mid_def",
                  quick_reply: { payload: "followcheck:automation_456" },
                },
              },
            },
          ],
        },
      ],
    };

    const events = parseMessageEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0].payload).toBe("followcheck:automation_456");
  });

  it("drops echo events (bot's own outbound messages)", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "acct_123" },
                recipient: { id: "user_999" },
                message: {
                  mid: "mid_echo",
                  is_echo: true,
                  text: "Here's your link!",
                },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("drops messages without a matching quick_reply payload", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "user_999" },
                recipient: { id: "acct_123" },
                message: { mid: "mid_plain", text: "hello" },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("drops messages whose payload does not match known patterns", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "user_999" },
                recipient: { id: "acct_123" },
                message: {
                  quick_reply: { payload: "UNKNOWN_PAYLOAD" },
                },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("drops self-sent messages (sender === account)", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "acct_123" },
                recipient: { id: "acct_123" },
                message: { quick_reply: { payload: "reveal:automation_456" } },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("ignores non-messages change fields", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "comments",
              value: {
                sender: { id: "user_999" },
                message: { quick_reply: { payload: "reveal:automation_456" } },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("parses quick-reply from Messenger-platform entry.messaging format", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          messaging: [
            {
              sender: { id: "user_999" },
              recipient: { id: "acct_123" },
              message: {
                mid: "mid_msg",
                quick_reply: { payload: "reveal:automation_456" },
              },
            },
          ],
        },
      ],
    };

    const events = parseMessageEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      instagramAccountId: "acct_123",
      userId: "user_999",
      payload: "reveal:automation_456",
      mid: "mid_msg",
    });
  });

  it("skips entry.messaging items that already have a postback (handled elsewhere)", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          messaging: [
            {
              sender: { id: "user_999" },
              recipient: { id: "acct_123" },
              postback: { payload: "reveal:automation_456" },
              message: { quick_reply: { payload: "reveal:automation_456" } },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });

  it("ignores non-instagram objects", () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "acct_123",
          time: 1234567890,
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: "user_999" },
                message: { quick_reply: { payload: "reveal:automation_456" } },
              },
            },
          ],
        },
      ],
    };

    expect(parseMessageEvents(payload)).toHaveLength(0);
  });
});

describe("parseReadEvents", () => {
  it("should parse Instagram DM read receipts", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "ig_456",
          time: 1234567890,
          messaging: [
            {
              sender: { id: "commenter_999" },
              recipient: { id: "ig_456" },
              read: { watermark: 1770000000000 },
            },
          ],
        },
      ],
    };

    expect(parseReadEvents(payload)).toEqual([
      {
        instagramAccountId: "ig_456",
        userId: "commenter_999",
        watermark: 1770000000000,
      },
    ]);
  });

  it("should ignore read receipts from the connected account itself", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "ig_456",
          time: 1234567890,
          messaging: [
            {
              sender: { id: "ig_456" },
              recipient: { id: "ig_456" },
              read: { watermark: 1770000000000 },
            },
          ],
        },
      ],
    };

    expect(parseReadEvents(payload)).toHaveLength(0);
  });
});
