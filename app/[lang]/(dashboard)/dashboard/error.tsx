"use client";

import { useParams } from "next/navigation";

const LABELS: Record<string, { title: string; retry: string }> = {
  uz: { title: "Xatolik yuz berdi", retry: "Qayta urinish" },
  ru: { title: "Произошла ошибка", retry: "Повторить" },
  en: { title: "Something went wrong", retry: "Try again" },
};

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const lang = (params?.lang as string) || "uz";
  const labels = LABELS[lang] ?? LABELS.en;

  return (
    <div className="panel rounded-lg p-8 text-center space-y-3">
      <p className="text-sm text-muted">{error.message || labels.title}</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
      >
        {labels.retry}
      </button>
    </div>
  );
}
