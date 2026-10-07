export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/cmh-cleaning-logo.png"
      alt="CMH Cleaning"
      className={className ?? 'h-10 w-auto max-w-full object-contain'}
    />
  )
}
