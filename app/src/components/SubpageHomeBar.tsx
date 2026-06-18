import { Link, useLocation } from 'react-router-dom'

// Small fixed pill at the top-left of every non-home route. Replaces the
// inline "← junst.github.io" back-link that used to live in each sub-page's
// header.
export function SubpageHomeBar() {
  const loc = useLocation()
  if (loc.pathname === '/') return null
  return (
    <Link to="/" className="subpage-home-bar" aria-label="Back to home" title="Back to home">
      <span className="subpage-home-arrow" aria-hidden="true">←</span>
      <span className="subpage-home-text">Home</span>
    </Link>
  )
}
