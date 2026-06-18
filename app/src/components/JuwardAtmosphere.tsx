// Shared atmospheric background for Juward pages — same drifting blob
// language as Jumap, so the two sub-sites feel like one universe.
export function JuwardAtmosphere() {
  return (
    <div className="juward-atmosphere" aria-hidden="true">
      <span className="juward-atmo-blob blob-1" />
      <span className="juward-atmo-blob blob-2" />
      <span className="juward-atmo-blob blob-3" />
    </div>
  )
}
