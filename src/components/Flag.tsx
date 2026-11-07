export default function Flag({ cca2, className = '' }: { cca2: string; className?: string }) {
  return (
    <span className={`inline-block overflow-hidden rounded-[0.2em] shadow-sm ring-1 ring-black/10 ${className}`} style={{ aspectRatio: '4 / 3' }}>
      <span className={`fi fi-${cca2} flag-big block`} />
    </span>
  );
}
