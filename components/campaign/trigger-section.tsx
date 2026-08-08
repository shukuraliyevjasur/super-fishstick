"use client";

import PostPicker from "@/components/post-picker";
import { Section, Radio } from "./primitives";

type TriggerScope = "specific" | "any" | "next";

interface TriggerSectionProps {
  triggerScope: TriggerScope;
  onTriggerScopeChange: (scope: TriggerScope) => void;
  postId: string | null;
  selectedAccountId: string;
  usedPosts: Record<string, string>;
  onPostSelect: (id: string, url?: string, thumb?: string, caption?: string) => void;
  t: {
    sectionWhen: string;
    triggerSpecific: string;
    triggerAny: string;
    triggerNext: string;
  };
}

export default function TriggerSection({
  triggerScope,
  onTriggerScopeChange,
  postId,
  selectedAccountId,
  usedPosts,
  onPostSelect,
  t,
}: TriggerSectionProps) {
  return (
    <Section title={t.sectionWhen}>
      <Radio
        checked={triggerScope === "specific"}
        onSelect={() => onTriggerScopeChange("specific")}
      >
        {t.triggerSpecific}
      </Radio>
      {triggerScope === "specific" && (
        <div className="rounded-lg border border-border p-2">
          <PostPicker
            selectedPostId={postId}
            instagramAccountId={selectedAccountId}
            usedPostIds={usedPosts}
            onSelect={onPostSelect}
          />
        </div>
      )}
      <Radio
        checked={triggerScope === "any"}
        onSelect={() => onTriggerScopeChange("any")}
      >
        {t.triggerAny}
      </Radio>
      <Radio
        checked={triggerScope === "next"}
        onSelect={() => onTriggerScopeChange("next")}
      >
        {t.triggerNext}
      </Radio>
    </Section>
  );
}
