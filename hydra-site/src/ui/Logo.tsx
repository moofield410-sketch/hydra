// HYDRA's mark: the diamond from the favicon, drawn in the current color.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4l5 12-5 12-5-12z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}
