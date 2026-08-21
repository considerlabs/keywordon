export type AutomationDraftStatus = "draft" | "ready" | "exported";

export type IdeaSource = "manual" | "suggestion" | "keyword";

export type AutomationSuggestion = {
  id: string;
  title: string;
  keyword: string;
  monthlyVolume?: number;
};
