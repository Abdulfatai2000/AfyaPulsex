export function FeaturePlaceholder({ title }: { title: string }) {
  return (
    <section className="min-w-0 rounded-xl border border-dashed p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
    </section>
  );
}
