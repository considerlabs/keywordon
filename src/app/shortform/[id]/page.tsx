import { ShortformEditor } from "@/components/shortform/shortform-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShortformProjectPage({ params }: PageProps) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-[var(--muted)]">프로젝트 ID가 올바르지 않습니다.</p>
      </div>
    );
  }
  return <ShortformEditor projectId={projectId} />;
}
