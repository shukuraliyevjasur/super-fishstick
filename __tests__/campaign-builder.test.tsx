// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CampaignBuilder from "@/components/campaign-builder";

// Stub next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ lang: "en" }),
}));

// Stub child components that hit the network or are irrelevant to payload shape
vi.mock("@/components/account-select", () => ({
  default: () => <div data-testid="account-select" />,
}));
vi.mock("@/components/post-picker", () => ({
  default: ({
    onSelect,
  }: {
    onSelect: (id: string, url?: string) => void;
  }) => (
    <button data-testid="post-picker" onClick={() => onSelect("post-1", "https://instagram.com/p/1")}>
      pick
    </button>
  ),
}));
vi.mock("@/components/campaign-preview", () => ({
  default: () => <div data-testid="campaign-preview" />,
}));

// Provide the dictionary context the component needs
vi.mock("@/components/dictionary-provider", () => ({
  useDict: () => ({
    campaignBuilder: {
      nameLabel: "Name",
      nameLabelOptional: "(optional)",
      namePlaceholder: "Name",
      accountLabel: "Account",
      sectionWhen: "When",
      triggerSpecific: "specific post",
      triggerAny: "any post",
      triggerNext: "next post",
      sectionAnd: "And",
      matchSpecific: "specific word",
      keywordPlaceholder: "keyword",
      keywordHint: "hint",
      matchAny: "any word",
      publicReplyLabel: "public reply",
      publicReplyPlaceholder: "reply",
      addReply: "+ reply",
      replyRotateHint: "rotate",
      sectionTheyReceive: "Receive",
      openingDmLabel: "opening",
      openingDmPlaceholder: "hi",
      openingDmButtonPlaceholder: "send",
      followGateLabel: "follow",
      followPromptPlaceholder: "follow me",
      followButtonPlaceholder: "followed",
      followHint: "hint",
      sectionAndTheyReceive: "And receive",
      dmWithLinkLabel: "DM",
      dmPlaceholder: "message",
      addLink: "+ link",
      addSecondLink: "+ second link",
      linkButtonPlaceholder: "btn",
      secondButtonPlaceholder: "btn2",
      tokenHint: "hint",
      previewLabel: "Preview",
      newLabel: "New",
      untitled: "Untitled",
      statusActive: "Active",
      statusPaused: "Paused",
      pause: "Pause",
      launch: "Launch",
      saveChanges: "Save",
      saving: "Saving…",
      defaultLinkBtn: "Open link",
      defaultFollowBtn: "I followed",
      defaultOpeningBtn: "Send link",
      defaultCampaignName: "@{{username}} campaign",
      errNoAccount: "No account",
      errNoPost: "No post",
      errNoKeyword: "No keyword",
      errNoDm: "No DM",
      errSaveFailed: "Failed",
      notFound: "Not found",
      backToCampaigns: "Back",
      importProgress: "{{done}}/{{total}}",
      importHint: "hint",
      skip: "Skip",
      skipAndFinish: "Skip & finish",
    },
  }),
}));

vi.mock("@/lib/client-cache", () => ({
  readCache: () => ({ data: null }),
  writeCache: vi.fn(),
}));
vi.mock("@/lib/import-queue", () => ({
  IMPORT_QUEUE_KEY: "import-queue",
  IMPORT_ACCOUNT_KEY: "import-account",
}));

let fetchCalls: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  fetchCalls = [];
  (global.fetch as Mock) = vi.fn(async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url, init });
    // /api/dashboard/stats — supply one account so selectedAccountId is set
    if (url.includes("/api/dashboard/stats")) {
      return Response.json({
        success: true,
        data: {
          instagramAccounts: [{ id: "acct-1", username: "testbrand" }],
          selectedInstagramAccountId: "acct-1",
        },
      });
    }
    // /api/instagram/profile
    if (url.includes("/api/instagram/profile")) {
      return Response.json({ success: true, data: { profilePictureUrl: null } });
    }
    // /api/automations GET (for usedPosts)
    if (url.includes("/api/automations") && (!init || init.method !== "POST")) {
      return Response.json({ success: true, data: [] });
    }
    // /api/automations POST — the save call we're pinning
    if (url.includes("/api/automations") && init?.method === "POST") {
      return Response.json({ success: true, data: { id: "new-1" } });
    }
    return Response.json({ success: false });
  });
});

async function renderAndWaitForAccounts() {
  render(<CampaignBuilder mode="new" />);
  // Wait for the accounts fetch to populate state
  await waitFor(() => {
    expect(fetchCalls.some((c) => c.url.includes("/api/dashboard/stats"))).toBe(true);
  });
}

function getLastPostPayload(): Record<string, unknown> | null {
  const post = fetchCalls.find(
    (c) => c.init?.method === "POST" && c.url.includes("/api/automations")
  );
  if (!post?.init?.body) return null;
  return JSON.parse(post.init.body as string);
}

describe("CampaignBuilder save payload", () => {
  it("sends the expected shape for a specific-post, specific-keyword campaign", async () => {
    await renderAndWaitForAccounts();

    // Pick a post (trigger scope defaults to "specific")
    fireEvent.click(screen.getByTestId("post-picker"));

    // Enter a keyword (match mode defaults to "specific")
    const keywordInput = screen.getByPlaceholderText("keyword");
    fireEvent.change(keywordInput, { target: { value: "price" } });

    // Enter DM message
    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "Here is your link {link}" } });

    // Hit Launch
    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    const payload = getLastPostPayload()!;

    // Pin the full shape
    expect(payload).toEqual({
      name: "@testbrand campaign",
      instagramAccountId: "acct-1",
      postId: "post-1",
      postUrl: "https://instagram.com/p/1",
      matchAnyPost: false,
      pendingNextReel: false,
      matchAnyWord: false,
      keywords: ["price"],
      dmMessage: "Here is your link {link}",
      openingDmEnabled: false,
      openingDmMessage: null,
      openingDmButtonLabel: null,
      publicReplyEnabled: false,
      publicReplyMessages: [],
      trackedDestinationUrl: "",
      linkButtonLabel: "Open link",
      secondaryDestinationUrl: "",
      secondaryButtonLabel: "Open link",
      requireFollow: false,
      followPromptMessage: "",
      followPromptButtonLabel: "",
      isActive: true,
      // T10. Both must default off: a campaign that never touched the Telegram
      // section has to save exactly as it did before the section existed.
      telegramEnabled: false,
      telegramFlowId: null,
    });
  });

  it("nulls postId/postUrl when triggerScope is 'any'", async () => {
    await renderAndWaitForAccounts();

    // Select "any post" trigger
    fireEvent.click(screen.getByText("any post"));

    // "any word" match mode so no keyword required
    fireEvent.click(screen.getByText("any word"));

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "Thanks!" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    const payload = getLastPostPayload()!;
    expect(payload.postId).toBeNull();
    expect(payload.postUrl).toBeNull();
    expect(payload.matchAnyPost).toBe(true);
    expect(payload.pendingNextReel).toBe(false);
  });

  it("sets pendingNextReel when triggerScope is 'next'", async () => {
    await renderAndWaitForAccounts();

    fireEvent.click(screen.getByText("next post"));
    fireEvent.click(screen.getByText("any word"));

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "DM" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    const payload = getLastPostPayload()!;
    expect(payload.postId).toBeNull();
    expect(payload.matchAnyPost).toBe(false);
    expect(payload.pendingNextReel).toBe(true);
  });

  it("clears keywords when matchMode is 'any'", async () => {
    await renderAndWaitForAccounts();

    fireEvent.click(screen.getByTestId("post-picker"));
    fireEvent.click(screen.getByText("any word"));

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "DM" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    expect(getLastPostPayload()!.keywords).toEqual([]);
    expect(getLastPostPayload()!.matchAnyWord).toBe(true);
  });

  it("includes publicReplyMessages only when enabled", async () => {
    await renderAndWaitForAccounts();

    fireEvent.click(screen.getByTestId("post-picker"));
    fireEvent.click(screen.getByText("any word"));

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "DM" } });

    // Enable public reply — click the toggle button, not the label span
    const toggleContainer = screen.getByText("public reply").closest("div")!;
    fireEvent.click(toggleContainer.querySelector("button")!);
    const replyInput = screen.getByPlaceholderText("reply");
    fireEvent.change(replyInput, { target: { value: "Check your DMs!" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    const payload = getLastPostPayload()!;
    expect(payload.publicReplyEnabled).toBe(true);
    expect(payload.publicReplyMessages).toEqual(["Check your DMs!"]);
  });

  it("always sends openingDmEnabled=false and requireFollow=false", async () => {
    await renderAndWaitForAccounts();

    fireEvent.click(screen.getByTestId("post-picker"));
    fireEvent.click(screen.getByText("any word"));

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "DM" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(getLastPostPayload()).not.toBeNull();
    });

    const payload = getLastPostPayload()!;
    expect(payload.openingDmEnabled).toBe(false);
    expect(payload.openingDmMessage).toBeNull();
    expect(payload.openingDmButtonLabel).toBeNull();
    expect(payload.requireFollow).toBe(false);
    expect(payload.followPromptMessage).toBe("");
    expect(payload.followPromptButtonLabel).toBe("");
  });

  it("shows validation error when DM message is empty", async () => {
    await renderAndWaitForAccounts();

    fireEvent.click(screen.getByTestId("post-picker"));
    fireEvent.click(screen.getByText("any word"));

    // Don't enter DM message — leave empty
    fireEvent.click(screen.getByText("Launch"));

    // Should show error, not send
    await waitFor(() => {
      expect(screen.getByText("No DM")).toBeInTheDocument();
    });

    const postCall = fetchCalls.find(
      (c) => c.init?.method === "POST" && c.url.includes("/api/automations")
    );
    expect(postCall).toBeUndefined();
  });

  it("shows validation error when no post selected in specific mode", async () => {
    await renderAndWaitForAccounts();

    // Don't pick a post, but enter keyword and DM
    const keywordInput = screen.getByPlaceholderText("keyword");
    fireEvent.change(keywordInput, { target: { value: "price" } });

    const dmInput = screen.getByPlaceholderText("message");
    fireEvent.change(dmInput, { target: { value: "DM" } });

    fireEvent.click(screen.getByText("Launch"));

    await waitFor(() => {
      expect(screen.getByText("No post")).toBeInTheDocument();
    });
  });
});
