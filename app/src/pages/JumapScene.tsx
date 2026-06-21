import { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  artists,
  COUNTRIES,
  genreFor,
  countryFor,
  countryOfGenre,
  countryOfArtist,
  familyOfGenre,
  familyFor,
  GENRE_FAMILIES,
  bubbleRadius,
  bestTier,
  sortArtists,
  artistPrimaryGenre,
  artistFaceFor,
  type Artist,
  type Song,
} from '../data/jumap'
import { albumArtFor } from '../data/album-art'
import { artistPhotoFor } from '../data/artist-photos'
import { tierCrownSrc } from '../components/TierBadge'

// --- Layout primitives -------------------------------------------------------
// We re-use the same 2-pass force layout as the SVG version but now feed
// the (x, y) coordinates into a Three.js world. Y is up in Three; we keep
// our layout's y → z mapping so the "atlas plane" is the XZ plane and the
// camera looks down at a tilt.

const GOLDEN = Math.PI * (3 - Math.sqrt(5))
function seed(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return (h >>> 0) / 0xffffffff
}
function songRadius(s: Song): number {
  return ({ 1: 2.2, 2: 1.8, 3: 1.5, 4: 1.3, 5: 1.1 } as const)[s.tier]
}

interface Planet {
  name: string
  artist: Artist
  x: number
  z: number
  r: number
  country: string
  primaryGenre: string
  faceUrl?: string
  orbitR: number
  tier: number
}
interface Moon {
  id: string
  ownerName: string
  song: Song
  x: number
  z: number
  r: number
  faceUrl?: string
}

function estimateOrbitR(a: Artist): number {
  const r = bubbleRadius(a) * 0.1
  const lastI = Math.max(0, a.songs.length - 1)
  return r + 3.2 + Math.sqrt(lastI + 0.5) * 4.0 + 2.4
}

export type ViewMode = 'country' | 'genre' | 'tier'

function newPlanet(a: Artist, x: number, z: number, country: string, genre: string): Planet {
  return {
    name: a.name,
    artist: a,
    x,
    z,
    r: bubbleRadius(a) * 0.10,
    country,
    primaryGenre: genre,
    faceUrl: artistFaceFor(a, albumArtFor, artistPhotoFor),
    orbitR: estimateOrbitR(a),
    tier: bestTier(a),
  }
}

function placeByCountry(): Planet[] {
  const byCountry = new Map<string, Artist[]>()
  for (const a of artists) {
    const c = countryOfArtist(a)
    if (!byCountry.has(c)) byCountry.set(c, [])
    byCountry.get(c)!.push(a)
  }
  const countryKeys = COUNTRIES.map((c) => c.key).filter((k) => byCountry.has(k))
  // Auto-size super-ring + size-weighted angular slices, same recipe
  // as placeByGenre. Empire radius estimate is just the planet sprawl
  // (Poisson-disk targetR); the territory pad gets added at draw time.
  const empireR = countryKeys.map((k) => {
    const n = (byCountry.get(k) ?? []).length
    return 18 + Math.sqrt(n) * 18
  })
  const gapFactor = 1.45
  const totalCircum = empireR.reduce((s, r) => s + 2 * r * gapFactor, 0)
  const ringR = Math.max(80, totalCircum / (2 * Math.PI))
  const totalWeight = empireR.reduce((s, r) => s + r, 0)
  const cCentres: Record<string, { x: number; z: number }> = {}
  if (countryKeys.length === 1) cCentres[countryKeys[0]] = { x: 0, z: 0 }
  else {
    let cumulative = 0
    countryKeys.forEach((k, i) => {
      cumulative += empireR[i]
      const ang = (cumulative - empireR[i]) / totalWeight * Math.PI * 2 - Math.PI / 2
      cCentres[k] = { x: Math.cos(ang) * ringR, z: Math.sin(ang) * ringR }
    })
  }

  const planets: Planet[] = []
  for (const country of countryKeys) {
    const cc = cCentres[country]
    const cluster = sortArtists(byCountry.get(country) ?? [])
    // Poisson-disk-like scatter: pick a random spot inside the country's
    // disk for each artist, rejecting candidates that fall too close to
    // already-placed planets. The result is irregular and natural —
    // tighter than phyllotaxis was, and never the same arc pattern.
    const targetR = Math.max(12, Math.sqrt(cluster.length) * 16)
    const placedHere: { x: number; z: number; r: number; genre: string }[] = []
    for (const a of cluster) {
      const r = bubbleRadius(a) * 0.10
      const genre = artistPrimaryGenre(a)
      let chosenX = cc.x
      let chosenZ = cc.z
      // Small bias toward neighbours of the same genre so jpop / anime
      // still cluster softly inside Japan without being on rigid rings.
      let biasX = cc.x
      let biasZ = cc.z
      let biasW = 0
      for (const p of placedHere) {
        if (p.genre === genre) {
          biasX += p.x
          biasZ += p.z
          biasW += 1
        }
      }
      if (biasW > 0) {
        biasX /= biasW + 1
        biasZ /= biasW + 1
      } else {
        biasX = cc.x
        biasZ = cc.z
      }
      let bestScore = -Infinity
      let bestX = cc.x
      let bestZ = cc.z
      for (let tries = 0; tries < 80; tries++) {
        const angHash = seed(a.name + 'A' + tries)
        const radHash = seed(a.name + 'R' + tries)
        const ang = angHash * Math.PI * 2
        const rad = targetR * Math.sqrt(radHash)
        const x = cc.x + Math.cos(ang) * rad
        const z = cc.z + Math.sin(ang) * rad
        let minDistToOther = Infinity
        for (const p of placedHere) {
          const d = Math.hypot(x - p.x, z - p.z) - (p.r + r)
          if (d < minDistToOther) minDistToOther = d
        }
        // Score: prefer candidates further from neighbours but also
        // closer to the same-genre bias point. Hard-reject if it would
        // overlap (minDistToOther < gap).
        const gap = 5
        if (minDistToOther < gap) continue
        const genrePull = -Math.hypot(x - biasX, z - biasZ) * 0.35
        const spreadPush = Math.min(minDistToOther, 18) * 2
        const score = spreadPush + genrePull
        if (score > bestScore) {
          bestScore = score
          bestX = x
          bestZ = z
        }
      }
      // bestX/bestZ are guaranteed because spreadPush + genrePull is finite
      // once a non-rejected candidate is found; if zero candidates passed
      // the gap test, fall back to country centre + tiny offset.
      if (bestScore === -Infinity) {
        const ang = seed(a.name + 'fb') * Math.PI * 2
        bestX = cc.x + Math.cos(ang) * (targetR * 0.4)
        bestZ = cc.z + Math.sin(ang) * (targetR * 0.4)
      }
      chosenX = bestX
      chosenZ = bestZ
      placedHere.push({ x: chosenX, z: chosenZ, r, genre })
      planets.push(newPlanet(a, chosenX, chosenZ, country, genre))
    }
  }
  return planets
}

function placeByGenre(): Planet[] {
  // Family-first: outer ring per genre family (pop / hiphop / anime /
  // rock / rnb / edm). Inside each family, sub-genres get their own
  // small sub-centroid (pop / jpop / kpop inside the pop family, etc.)
  // and artists scatter via Poisson disk inside their sub-centroid.
  const byGenre = new Map<string, Artist[]>()
  for (const a of artists) {
    const g = artistPrimaryGenre(a)
    if (!byGenre.has(g)) byGenre.set(g, [])
    byGenre.get(g)!.push(a)
  }
  // Build families from populated genres.
  const familyToGenres = new Map<string, string[]>()
  for (const g of byGenre.keys()) {
    const f = familyOfGenre(g)
    if (!familyToGenres.has(f)) familyToGenres.set(f, [])
    familyToGenres.get(f)!.push(g)
  }
  const familyKeys = GENRE_FAMILIES.map((f) => f.key).filter((k) => familyToGenres.has(k))

  // Estimate per-family empire radius (sum of its sub-genres' sprawl).
  const familyR = familyKeys.map((f) => {
    const genres = familyToGenres.get(f) ?? []
    const totalN = genres.reduce((s, g) => s + (byGenre.get(g)?.length ?? 0), 0)
    return 22 + Math.sqrt(totalN) * 18
  })
  const gapFactor = 1.40
  const totalCircum = familyR.reduce((s, r) => s + 2 * r * gapFactor, 0)
  const ringR = Math.max(80, totalCircum / (2 * Math.PI))
  const totalWeight = familyR.reduce((s, r) => s + r, 0)
  const familyCentres: Record<string, { x: number; z: number }> = {}
  if (familyKeys.length === 1) familyCentres[familyKeys[0]] = { x: 0, z: 0 }
  else {
    let cumulative = 0
    familyKeys.forEach((f, i) => {
      cumulative += familyR[i]
      const ang = (cumulative - familyR[i]) / totalWeight * Math.PI * 2 - Math.PI / 2
      familyCentres[f] = { x: Math.cos(ang) * ringR, z: Math.sin(ang) * ringR }
    })
  }

  const planets: Planet[] = []
  for (const family of familyKeys) {
    const fc = familyCentres[family]
    const subGenres = familyToGenres.get(family)!
    // Sub-genre centroids — each gets a small offset inside the family
    // disk, scaled to its own member count. Single-genre families
    // (anime / rock / rnb / edm) sit at the family centre.
    const subCentres: Record<string, { x: number; z: number }> = {}
    if (subGenres.length === 1) {
      subCentres[subGenres[0]] = fc
    } else {
      const subN = subGenres.map((g) => byGenre.get(g)?.length ?? 0)
      const subR = subN.map((n) => 14 + Math.sqrt(n) * 12)
      const subTotal = subR.reduce((s, r) => s + r, 0)
      const innerR = Math.max(14, subTotal / (2 * Math.PI) * 1.6)
      let cum = 0
      subGenres.forEach((g, i) => {
        cum += subR[i]
        const ang = (cum - subR[i]) / subTotal * Math.PI * 2 - Math.PI / 2 + seed(family + 'rot') * Math.PI * 2
        subCentres[g] = {
          x: fc.x + Math.cos(ang) * innerR,
          z: fc.z + Math.sin(ang) * innerR,
        }
      })
    }

    for (const genre of subGenres) {
      const c = subCentres[genre]
      const cluster = sortArtists(byGenre.get(genre) ?? [])
      const targetR = 14 + Math.sqrt(cluster.length) * 14
      const placedHere: { x: number; z: number; r: number }[] = []
      for (const a of cluster) {
        const r = bubbleRadius(a) * 0.10
        let bestScore = -Infinity
        let bestX = c.x
        let bestZ = c.z
        for (let tries = 0; tries < 80; tries++) {
          const angHash = seed(a.name + 'gA' + tries)
          const radHash = seed(a.name + 'gR' + tries)
          const ang = angHash * Math.PI * 2
          const rad = targetR * Math.sqrt(radHash)
          const x = c.x + Math.cos(ang) * rad
          const z = c.z + Math.sin(ang) * rad
          let minDistToOther = Infinity
          for (const p of placedHere) {
            const d = Math.hypot(x - p.x, z - p.z) - (p.r + r)
            if (d < minDistToOther) minDistToOther = d
          }
          if (minDistToOther < 5) continue
          const score = Math.min(minDistToOther, 18) * 2
          if (score > bestScore) { bestScore = score; bestX = x; bestZ = z }
        }
        if (bestScore === -Infinity) {
          const ang = seed(a.name + 'gfb') * Math.PI * 2
          bestX = c.x + Math.cos(ang) * (targetR * 0.4)
          bestZ = c.z + Math.sin(ang) * (targetR * 0.4)
        }
        placedHere.push({ x: bestX, z: bestZ, r })
        planets.push(newPlanet(a, bestX, bestZ, countryOfArtist(a), genre))
      }
    }
  }
  return planets
}

function placeByTier(): Planet[] {
  // Best-tier artists at the centre, each higher tier on a wider ring.
  const byTier = new Map<number, Artist[]>()
  for (const a of artists) {
    const t = bestTier(a)
    if (!byTier.has(t)) byTier.set(t, [])
    byTier.get(t)!.push(a)
  }
  const tiers = Array.from(byTier.keys()).sort((a, b) => a - b)
  const ringStep = 55
  const planets: Planet[] = []
  for (const tier of tiers) {
    const cluster = sortArtists(byTier.get(tier) ?? [])
    const ringR = (tier - 1) * ringStep + 12
    const phase = cluster.length ? seed(cluster[0].name) * Math.PI * 2 : 0
    cluster.forEach((a, i) => {
      const ang =
        cluster.length === 1
          ? phase
          : (i / cluster.length) * Math.PI * 2 + phase
      const genre = artistPrimaryGenre(a)
      planets.push(
        newPlanet(a, Math.cos(ang) * ringR, Math.sin(ang) * ringR, countryOfGenre(genre), genre),
      )
    })
  }
  return planets
}

function buildLayout(mode: ViewMode = 'country'): { planets: Planet[]; moons: Moon[] } {
  const planets =
    mode === 'genre' ? placeByGenre() : mode === 'tier' ? placeByTier() : placeByCountry()
  forceSettle(planets, mode)

  const moons: Moon[] = []
  if (mode === 'tier') {
    // Song-first tier ranking: every song lives on a concentric ring keyed
    // to its own tier (not the artist's best tier). So an ARASHI T1 song
    // and an ARASHI T4 song sit on different rings. Artist planets stay
    // where placeByTier put them (best-tier ring) as visual anchors only.
    type Entry = { artistName: string; song: Song }
    const byTier = new Map<number, Entry[]>()
    for (const a of artists) {
      for (const s of a.songs) {
        if (!byTier.has(s.tier)) byTier.set(s.tier, [])
        byTier.get(s.tier)!.push({ artistName: a.name, song: s })
      }
    }
    const tiers = Array.from(byTier.keys()).sort((a, b) => a - b)
    // Each tier owns a band [Rmin, Rmax]; subTier 3 sits at the inner
    // edge of the band, subTier 0 at the outer. That keeps T1+3 well
    // separated from T1+0 instead of stacking on a single ring.
    const ringStep = 48
    for (const tier of tiers) {
      const list = byTier.get(tier)!
      // Sub-rings per (tier, subTier) so each sub-tier gets its own
      // angular spread.
      const bySub = new Map<number, Entry[]>()
      for (const e of list) {
        const st = e.song.subTier ?? 0
        if (!bySub.has(st)) bySub.set(st, [])
        bySub.get(st)!.push(e)
      }
      const subs = Array.from(bySub.keys()).sort((a, b) => b - a) // 3..0
      const tierR0 = (tier - 1) * ringStep + 14
      // 4 sub-bands inside a tier band; subTier 3 = innermost.
      const subStep = (ringStep * 0.78) / 4
      for (const st of subs) {
        const ringR = tierR0 + (3 - st) * subStep
        const sublist = bySub.get(st)!.sort(
          (a, b) => a.song.title.localeCompare(b.song.title),
        )
        const phase = sublist.length ? seed(sublist[0].artistName) * Math.PI * 2 : 0
        const n = sublist.length
        sublist.forEach((e, i) => {
          const ang = (i / n) * Math.PI * 2 + phase
          const sr = songRadius(e.song)
          moons.push({
            id: `${e.artistName}|${e.song.title}`,
            ownerName: e.artistName,
            song: e.song,
            x: Math.cos(ang) * ringR,
            z: Math.sin(ang) * ringR,
            r: sr,
          })
        })
      }
    }
  } else {
    for (const p of planets) {
      const songs = [...p.artist.songs].sort(
        (a, b) => a.tier - b.tier || (b.subTier ?? 0) - (a.subTier ?? 0) || a.title.localeCompare(b.title),
      )
      const phase = seed(p.name) * Math.PI * 2
      songs.forEach((song, i) => {
        const ang = i * GOLDEN + phase
        const orbitR = p.r + 3.5 + Math.sqrt(i + 0.5) * 4.0
        const sr = songRadius(song)
        moons.push({
          id: `${p.name}|${song.title}`,
          ownerName: p.name,
          song,
          x: p.x + Math.cos(ang) * orbitR,
          z: p.z + Math.sin(ang) * orbitR,
          r: sr,
        })
      })
    }
  }
  return { planets, moons }
}

function forceSettle(planets: Planet[], mode: ViewMode = 'country'): void {
  const n = planets.length
  if (n < 2) return
  const anchorX = planets.map((p) => p.x)
  const anchorZ = planets.map((p) => p.z)
  const vx = new Array(n).fill(0)
  const vz = new Array(n).fill(0)
  const ANCHOR = 0.022
  const STEP = 0.85
  const DAMP = 0.78

  // Pre-build adjacency for collaboration pulls: any pair of artists who
  // appear on each other's songs as features. Stored as an index pair set
  // so the inner loop just checks `pairs.has(key)`.
  const indexOf = new Map<string, number>()
  for (let i = 0; i < n; i++) indexOf.set(planets[i].name, i)
  const collabs = new Set<string>()
  // memberPairs — solo artist ↔ their group (Sho Sakurai ↔ ARASHI,
  // Lilas ↔ YOASOBI, etc). Stronger spring than collab so members
  // sit visibly inside their group's gravity well.
  const memberPairs = new Set<string>()
  for (let i = 0; i < n; i++) {
    for (const s of planets[i].artist.songs) {
      if (!s.features) continue
      for (const f of s.features) {
        const j = indexOf.get(f)
        if (j == null || j === i) continue
        const key = i < j ? `${i}|${j}` : `${j}|${i}`
        collabs.add(key)
      }
    }
    const mo = planets[i].artist.memberOf
    if (mo) {
      for (const g of mo) {
        const j = indexOf.get(g)
        if (j == null || j === i) continue
        const key = i < j ? `${i}|${j}` : `${j}|${i}`
        memberPairs.add(key)
      }
    }
  }
  // Spring strength + comfortable distance for a collab pair.
  const COLLAB_PULL = 0.018
  const COLLAB_TARGET_DELTA = 12 // how far inside the min-separation gap
                                 // we'd LIKE the pair to settle.
  // Members sit much closer than collaborators.
  const MEMBER_PULL = 0.075
  const MEMBER_TARGET_DELTA = 4  // basically tangent to each other

  for (let k = 0; k < 700; k++) {
    let maxs = 0
    for (let i = 0; i < n; i++) {
      const a = planets[i]
      let fx = 0
      let fz = 0
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const b = planets[j]
        const dx = a.x - b.x
        const dz = a.z - b.z
        const d = Math.sqrt(dx * dx + dz * dz) || 0.01
        // The grouping that the territory layer is showing — country in
        // Country mode, primary genre in Genre mode. Same-group pairs
        // get no boost so they pack tightly inside their empire's
        // boundary; cross-group pairs get pushed apart so the empires
        // visually separate.
        const sameGroup = mode === 'genre'
          ? familyOfGenre(a.primaryGenre) === familyOfGenre(b.primaryGenre)
          : a.country === b.country
        const boost = sameGroup ? 0 : 110
        const minD = Math.max(
          2 * Math.max(a.orbitR, b.orbitR) + 12 + boost,
          a.orbitR + b.orbitR + 18 + boost,
        )
        if (d < minD) {
          const push = (minD - d) * 0.55
          fx += (dx / d) * push
          fz += (dz / d) * push
        }
        // Collab pull — if i and j are tied by any featuring, draw them
        // toward a comfortable distance just past their min-separation.
        // Cross-country pairs feel a 3× stronger pull so a feat. across
        // borders actually drags the planet toward the partner's country
        // (e.g. JENNIE ↔ Dominic Fike — KR feat. US — pulls JENNIE
        // toward the US side instead of staying parked in Korea).
        const key = i < j ? `${i}|${j}` : `${j}|${i}`
        if (collabs.has(key)) {
          const target = minD + COLLAB_TARGET_DELTA
          if (d > target) {
            const pullStrength = sameGroup ? COLLAB_PULL : COLLAB_PULL * 3
            const pull = (d - target) * pullStrength
            fx -= (dx / d) * pull
            fz -= (dz / d) * pull
          }
        }
        // Member pull — much stronger than collab so members visibly sit
        // right next to their group (Sho Sakurai ↔ ARASHI, Lilas ↔
        // YOASOBI). Bypasses the cross-country gap entirely.
        if (memberPairs.has(key)) {
          const target = minD + MEMBER_TARGET_DELTA
          if (d > target) {
            const pull = (d - target) * MEMBER_PULL
            fx -= (dx / d) * pull
            fz -= (dz / d) * pull
          }
        }
      }
      fx += (anchorX[i] - a.x) * ANCHOR
      fz += (anchorZ[i] - a.z) * ANCHOR
      vx[i] = (vx[i] + fx * STEP) * DAMP
      vz[i] = (vz[i] + fz * STEP) * DAMP
      const s = Math.abs(vx[i]) + Math.abs(vz[i])
      if (s > maxs) maxs = s
    }
    for (let i = 0; i < n; i++) {
      planets[i].x += vx[i]
      planets[i].z += vz[i]
    }
    if (k > 120 && maxs < 0.05) break
  }
}

// --- Three components --------------------------------------------------------

function Sphere({
  position, radius, color, faceUrl, onPointerDown, onPointerOver, onPointerOut,
  emissive = 0, dimmed = false,
}: {
  position: [number, number, number]
  radius: number
  color: string
  faceUrl?: string
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
  emissive?: number
  /** Search-dim flag: lower the material's opacity + kill emissive so
   *  non-matches read as background while matches stay bright. */
  dimmed?: boolean
}) {
  // Lazy texture — when faceUrl resolves, swap onto the sphere.
  const tex = faceUrl ? useTexture(faceUrl) : null
  if (tex) {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
  }
  const opacity = dimmed ? 0.18 : 1
  const transparent = dimmed
  const em = dimmed ? 0 : emissive
  return (
    <mesh
      position={position}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[radius, 28, 22]} />
      {tex ? (
        <meshStandardMaterial
          map={tex}
          roughness={0.35}
          metalness={0.02}
          // Use the planet's photo as its own emissive map so the surface
          // glows in its own colours — high-key, almost self-illuminated.
          emissive={new THREE.Color(0xffffff)}
          emissiveMap={tex}
          emissiveIntensity={em + (dimmed ? 0 : 0.7)}
          transparent={transparent}
          opacity={opacity}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.1}
          emissive={new THREE.Color(color)}
          emissiveIntensity={em + (dimmed ? 0 : 0.65)}
          transparent={transparent}
          opacity={opacity}
        />
      )}
    </mesh>
  )
}

function PlanetMesh({
  planet, onSelect, dragRef, dimmed,
}: {
  planet: Planet
  onSelect: (name: string, clientX: number, clientY: number, pointerId: number) => void
  dragRef: React.RefObject<DragState | null>
  dimmed?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const rimRef = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const genre = genreFor(planet.primaryGenre)
  // Unique phase so all planets don't pulse in lockstep — derived from the
  // artist name seed so it's deterministic per render.
  const phase = useMemo(() => seed(planet.name) * Math.PI * 2, [planet.name])
  // Per-frame: apply drag offset AND pulse the rim glow opacity.
  useFrame(({ clock }) => {
    const ds = dragRef.current
    if (groupRef.current) {
      const off = ds?.offsets.get(planet.name)
      if (off) groupRef.current.position.set(planet.x + off.dx, 0, planet.z + off.dz)
      else groupRef.current.position.set(planet.x, 0, planet.z)
    }
    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshBasicMaterial
      // Pulse range 0.18 → 0.85. Hover stays at the top; dimmed kills it.
      const t = clock.elapsedTime * 1.3 + phase
      const wave = 0.5 + Math.sin(t) * 0.5  // 0..1
      const base = hover ? 0.75 : 0.18 + wave * 0.55
      mat.opacity = dimmed ? 0.02 : base
    }
  })
  const handleDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const nev = e.nativeEvent
    onSelect(planet.name, nev.clientX, nev.clientY, nev.pointerId)
  }, [planet.name, onSelect])
  return (
    <group ref={groupRef} position={[planet.x, 0, planet.z]}>
      {/* Ground glow ring — the "floating" cue. */}
      <mesh position={[0, -planet.r * 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.r * 1.05, planet.r * 2.4, 64]} />
        <meshBasicMaterial
          color={genre.color}
          transparent
          opacity={dimmed ? 0.05 : hover ? 0.5 : 0.36}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pulsing rim — a slightly larger backside sphere with additive
          blending. The backside renders as the planet's silhouette from
          the camera, so the user sees a colored ring of light hugging
          the planet that breathes in and out. */}
      <mesh ref={rimRef}>
        <sphereGeometry args={[planet.r * 1.22, 28, 22]} />
        <meshBasicMaterial
          color={genre.color}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Sphere
        position={[0, 0, 0]}
        radius={planet.r}
        color={genre.color}
        faceUrl={planet.faceUrl}
        emissive={hover ? 0.7 : 0.4}
        dimmed={dimmed}
        onPointerDown={handleDown}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => setHover(false)}
      />
      {/* Floating name label above the planet — billboarded toward camera. */}
      <Text
        position={[0, planet.r + 1.6, 0]}
        fontSize={1.5}
        color="#f4f0e6"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.18}
        outlineColor="#0e1322"
        fillOpacity={dimmed ? 0.25 : 1}
      >
        {planet.name}
      </Text>
    </group>
  )
}

function MoonMesh({
  moon, onOpen, dragRef, dimmed,
}: {
  moon: Moon
  onOpen: (m: Moon) => void
  dragRef: React.RefObject<DragState | null>
  dimmed?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  // Moons follow their owner planet.
  useFrame(() => {
    const ds = dragRef.current
    if (!groupRef.current) return
    if (ds) {
      const off = ds.offsets.get(moon.ownerName)
      if (off) groupRef.current.position.set(moon.x + off.dx, 0, moon.z + off.dz)
      else groupRef.current.position.set(moon.x, 0, moon.z)
    }
  })
  const art = albumArtFor(moon.ownerName, moon.song.title)
  const genreColor = genreFor((moon.song.genres[0] || 'other').toLowerCase()).color
  const rimRef = useRef<THREE.Mesh>(null)
  const phase = useMemo(() => seed(moon.id) * Math.PI * 2, [moon.id])
  useFrame(({ clock }) => {
    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshBasicMaterial
      const t = clock.elapsedTime * 1.6 + phase
      const wave = 0.5 + Math.sin(t) * 0.5
      const base = hover ? 0.85 : 0.22 + wave * 0.55
      mat.opacity = dimmed ? 0.02 : base
    }
  })
  return (
    <group ref={groupRef} position={[moon.x, 0, moon.z]}>
      {/* Pulsing additive rim. */}
      <mesh ref={rimRef}>
        <sphereGeometry args={[moon.r * 1.3, 22, 16]} />
        <meshBasicMaterial
          color={genreColor}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Sphere
        position={[0, 0, 0]}
        radius={moon.r}
        color={genreColor}
        faceUrl={art}
        emissive={hover ? 0.75 : 0.5}
        dimmed={dimmed}
        onPointerDown={(e) => { e.stopPropagation(); onOpen(moon) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => setHover(false)}
      />
    </group>
  )
}

// Far-away starfield — 2500 fixed points on a large upper-hemisphere shell
// so they sit above the atlas plane. Bottom half is left to the atlas
// disk + space background so there's no "stars under the ground" weirdness.
function Stars() {
  const { positions, colors } = useMemo(() => {
    const N = 2500
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      // Pick a direction uniformly on the upper hemisphere (y >= 0.05).
      const u = 0.05 + Math.random() * 0.95 // 0.05..1 (always above horizon)
      const t = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const r = 700 + Math.random() * 100
      pos[i * 3] = s * Math.cos(t) * r
      pos[i * 3 + 1] = u * r
      pos[i * 3 + 2] = s * Math.sin(t) * r
      const bright = Math.random() < 0.05 ? 1 : 0.4 + Math.random() * 0.35
      let cr = bright, cg = bright, cb = bright
      const tint = Math.random()
      if (tint < 0.08) { cr *= 1; cg *= 0.85; cb *= 0.6 }
      else if (tint < 0.16) { cr *= 0.7; cg *= 0.85; cb *= 1 }
      col[i * 3] = cr
      col[i * 3 + 1] = cg
      col[i * 3 + 2] = cb
    }
    return { positions: pos, colors: col }
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.6} vertexColors transparent opacity={0.9} sizeAttenuation={false} />
    </points>
  )
}

// A single big disk under the planets, painted with a canvas-rendered
// radial gradient so the alpha falls off smoothly to 0 at the rim. No
// hard edge, no z-fighting between layers.
function AtlasGround() {
  const texture = useMemo(() => {
    const size = 1024
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const cx = size / 2
    const cy = size / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
    // Warm-cool atlas: bright-ish core fades to deep space at the rim.
    g.addColorStop(0.00, 'rgba(58, 78, 130, 0.95)')
    g.addColorStop(0.15, 'rgba(36, 50, 90, 0.85)')
    g.addColorStop(0.40, 'rgba(22, 30, 60, 0.65)')
    g.addColorStop(0.70, 'rgba(14, 18, 40, 0.35)')
    g.addColorStop(1.00, 'rgba(10, 14, 28, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    // A faint concentric ring scribble so the floor doesn't look uniform.
    ctx.globalCompositeOperation = 'lighter'
    for (let r = 80; r < cx; r += 90) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.lineWidth = 1.1
      ctx.strokeStyle = 'rgba(120, 150, 220, 0.06)'
      ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[1400, 1400]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}

// Country territory — instead of a static circular disk, a triangle fan
// whose rim wobbles like a strategy-game empire boundary that's slowly
// pushing/pulling against its neighbours. Each country has its own seed
// phase + frequencies so they look like independent forces, and the
// whole field reads as "fighting for territory" when zoomed out.
const TERRITORY_SEGMENTS = 96
function CountryTerritory({
  k, cx, cz, r, color, label,
}: {
  k: string
  cx: number
  cz: number
  r: number
  /** Override colour/label — used by Genre mode to reuse this component
   *  with a genre tint and genre label instead of country. */
  color?: string
  label?: string
}) {
  // Look up the country spec only when caller didn't already supply color
  // + label. In Genre mode we pass both explicitly and `k` is a genre key
  // which would mis-resolve through countryFor.
  const spec = !color || !label ? countryFor(k) : null
  const finalColor = color ?? spec!.color
  const finalLabel = label ?? spec!.label
  const meshRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.LineLoop>(null)
  // Per-country deterministic phase.
  const phase = useMemo(() => seed(k) * Math.PI * 2, [k])
  // Per-territory irregularity (static shape) — eccentricity, major-axis
  // tilt, lobe count (2–6 so adjacent territories look genuinely
  // different, not all "circles with 4 bumps").
  const ellipse = useMemo(() => 0.16 + seed(k + 'ecc') * 0.28, [k])   // 0.16..0.44
  const axisAng = useMemo(() => seed(k + 'axis') * Math.PI, [k])
  const lobes = useMemo(() => 2 + Math.floor(seed(k + 'lobe') * 5), [k]) // 2..6
  // Per-territory motion — drift speeds in three octaves, with random
  // direction, plus a slow radial pulse and gentle whole-body sway.
  // Each gets its own seed so every territory ends up with a distinct
  // breathing rhythm instead of every one looking like the same wobble.
  const f1 = useMemo(() => 0.16 + seed(k + 'f1') * 0.42, [k])  // 0.16..0.58
  const f2 = useMemo(() => 0.10 + seed(k + 'f2') * 0.32, [k])
  const f3 = useMemo(() => 0.07 + seed(k + 'f3') * 0.26, [k])
  const dir1 = useMemo(() => (seed(k + 'd1') > 0.5 ? 1 : -1), [k])
  const dir2 = useMemo(() => (seed(k + 'd2') > 0.5 ? 1 : -1), [k])
  const pulseAmp = useMemo(() => 0.04 + seed(k + 'pa') * 0.06, [k])   // ±4..10% radial pulse
  const pulseSpeed = useMemo(() => 0.22 + seed(k + 'ps') * 0.4, [k])
  const wobbleScale = useMemo(() => 0.75 + seed(k + 'ws') * 0.7, [k]) // 0.75..1.45
  const swayAmp = useMemo(() => 1.4 + seed(k + 'sw') * 3.2, [k])    // ±1.4..4.6 vbx

  // Pre-build the triangle-fan geometry. Vertex 0 = centre, vertices
  // 1..N = rim. The rim positions get rewritten each frame.
  const { fanGeometry, lineGeometry } = useMemo(() => {
    const N = TERRITORY_SEGMENTS
    // Fan: 1 centre + N rim verts; indices wrap.
    const fan = new THREE.BufferGeometry()
    const fanPos = new Float32Array((N + 1) * 3)
    fanPos[0] = 0; fanPos[1] = 0; fanPos[2] = 0
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2
      fanPos[(i + 1) * 3] = Math.cos(ang) * r
      fanPos[(i + 1) * 3 + 1] = Math.sin(ang) * r
      fanPos[(i + 1) * 3 + 2] = 0
    }
    const fanIdx = new Uint16Array(N * 3)
    for (let i = 0; i < N; i++) {
      fanIdx[i * 3] = 0
      fanIdx[i * 3 + 1] = i + 1
      fanIdx[i * 3 + 2] = ((i + 1) % N) + 1
    }
    fan.setAttribute('position', new THREE.BufferAttribute(fanPos, 3))
    fan.setIndex(new THREE.BufferAttribute(fanIdx, 1))

    // Line loop along the rim — same N verts, drawn separately.
    const line = new THREE.BufferGeometry()
    const linePos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const ang = ((i % N) / N) * Math.PI * 2
      linePos[i * 3] = Math.cos(ang) * r
      linePos[i * 3 + 1] = Math.sin(ang) * r
      linePos[i * 3 + 2] = 0
    }
    line.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    return { fanGeometry: fan, lineGeometry: line }
  }, [r])

  // Per-frame rim wobble — sum of three sin waves of different angular
  // frequencies + slow phase drift gives the organic "Risk map empires
  // breathing" look. Cheap: 96 verts × 3 multiplies/frame.
  useFrame(({ clock }) => {
    const N = TERRITORY_SEGMENTS
    const t = clock.elapsedTime
    const fanPos = (meshRef.current?.geometry.attributes.position.array as Float32Array | undefined)
    const linePos = (lineRef.current?.geometry.attributes.position.array as Float32Array | undefined)
    if (!fanPos || !linePos) return
    // Whole-territory sway — moves the centroid in a slow elliptical orbit
    // so two countries side-by-side don't appear to breathe in sync.
    const sx = swayAmp * Math.sin(t * pulseSpeed * 0.6 + phase)
    const sy = swayAmp * Math.cos(t * pulseSpeed * 0.5 + phase * 1.7)
    // Slow radial pulse — each territory grows/shrinks at its own rate.
    const pulse = 1 + pulseAmp * Math.sin(t * pulseSpeed + phase * 0.8)
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2
      // Static ellipse component — every territory a unique base shape.
      const ell = 1 + ellipse * Math.cos(2 * (ang - axisAng))
      // Animated multi-octave wobble with per-country frequencies + dirs,
      // scaled overall by per-country amplitude. Every empire visibly
      // breathes to a different rhythm.
      const w = wobbleScale * (
        Math.sin(ang * lobes + dir1 * t * f1 + phase) * 0.13 +
        Math.sin(ang * (lobes + 2) + dir2 * t * f2 + phase * 1.3) * 0.07 +
        Math.sin(ang * (lobes + 4) - t * f3 + phase * 2.1) * 0.04
      )
      const rad = r * pulse * ell * (1 + w)
      const x = Math.cos(ang) * rad + sx
      const y = Math.sin(ang) * rad + sy
      const fi = (i + 1) * 3
      fanPos[fi] = x
      fanPos[fi + 1] = y
      const li = i * 3
      linePos[li] = x
      linePos[li + 1] = y
    }
    // Close the line loop.
    linePos[N * 3] = linePos[0]
    linePos[N * 3 + 1] = linePos[1]
    if (meshRef.current) meshRef.current.geometry.attributes.position.needsUpdate = true
    if (lineRef.current) lineRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={[cx, -1.2, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Filled territory body */}
      <mesh ref={meshRef}>
        <primitive object={fanGeometry} attach="geometry" />
        <meshBasicMaterial
          color={finalColor}
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Wobbling rim outline. lineLoop is unambiguously the three.js
          primitive (vs SVG <line> which TS otherwise infers). */}
      <lineLoop ref={lineRef as unknown as React.RefObject<THREE.LineLoop>}>
        <primitive object={lineGeometry} attach="geometry" />
        <lineBasicMaterial color={finalColor} transparent opacity={0.9} />
      </lineLoop>
      {/* Floating label — kept above the centroid so it's stable. */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Text
          position={[0, 4, -r * 0.4]}
          fontSize={6}
          color={finalColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.3}
          outlineColor="#0e1322"
          rotation={[-Math.PI / 6, 0, 0]}
        >
          {finalLabel}
        </Text>
      </group>
    </group>
  )
}

// --- Drag state --------------------------------------------------------------
// Soft-body drag: grabbed planet snaps to pointer, others spring back to
// anchors with pairwise repulsion. All applied per-frame via refs so React
// re-renders never happen during the gesture.
interface DragState {
  grabbed: string
  // Per-planet delta from its base position. Source of truth for the frame.
  offsets: Map<string, { dx: number; dz: number }>
  // Anchor positions (the layout's static positions).
  anchors: Map<string, { x: number; z: number; orbitR: number }>
  // Velocities for the spring sim.
  vels: Map<string, { vx: number; vz: number }>
  // Current pointer target in world space (XZ plane).
  tx: number
  tz: number
}

function DragLoop({ dragRef }: { dragRef: React.RefObject<DragState | null> }) {
  useFrame(() => {
    const ds = dragRef.current
    if (!ds) return
    const STEP = 0.55
    const DAMP = 0.78
    const ANCHOR = 0.030
    const BUFFER = 6
    const names = Array.from(ds.anchors.keys())
    // Force step
    for (const n of names) {
      if (n === ds.grabbed) {
        // Grabbed: snap directly toward target each frame.
        const a = ds.anchors.get(n)!
        ds.offsets.set(n, { dx: ds.tx - a.x, dz: ds.tz - a.z })
        ds.vels.set(n, { vx: 0, vz: 0 })
        continue
      }
      const a = ds.anchors.get(n)!
      const off = ds.offsets.get(n) ?? { dx: 0, dz: 0 }
      const v = ds.vels.get(n) ?? { vx: 0, vz: 0 }
      const cx = a.x + off.dx
      const cz = a.z + off.dz
      let fx = (a.x - cx) * ANCHOR
      let fz = (a.z - cz) * ANCHOR
      for (const m of names) {
        if (m === n) continue
        const ma = ds.anchors.get(m)!
        const mo = ds.offsets.get(m) ?? { dx: 0, dz: 0 }
        const mx = ma.x + mo.dx
        const mz = ma.z + mo.dz
        const dx = cx - mx
        const dz = cz - mz
        const d = Math.sqrt(dx * dx + dz * dz) || 0.01
        const min = a.orbitR + ma.orbitR + BUFFER
        if (d < min) {
          const push = (min - d) * 0.45
          fx += (dx / d) * push
          fz += (dz / d) * push
        }
      }
      v.vx = (v.vx + fx * STEP) * DAMP
      v.vz = (v.vz + fz * STEP) * DAMP
      off.dx += v.vx
      off.dz += v.vz
      ds.vels.set(n, v)
      ds.offsets.set(n, off)
    }
  })
  return null
}

// Tier mode visual guides — one ring per tier band so the user can tell
// at a glance which concentric circle a song belongs to. Computed from
// the laid-out moons so the ring sits exactly where the songs do.
function TierGuides({ moons }: { moons: Moon[] }) {
  const tierRings = useMemo(() => {
    // Group moons by song.tier, take the median radius of each group.
    const byTier = new Map<number, number[]>()
    for (const m of moons) {
      const t = m.song.tier
      const r = Math.hypot(m.x, m.z)
      if (!byTier.has(t)) byTier.set(t, [])
      byTier.get(t)!.push(r)
    }
    return Array.from(byTier.entries())
      .map(([tier, rs]) => {
        rs.sort((a, b) => a - b)
        // Use the outer edge (90th pct) so the ring sits at the band's rim.
        const outer = rs[Math.floor(rs.length * 0.9)]
        return { tier, r: outer + 1.5 }
      })
      .sort((a, b) => a.tier - b.tier)
  }, [moons])
  const TIER_COLORS: Record<number, string> = {
    1: '#7ec6ff',
    2: '#ffe27a',
    3: '#ff9b5e',
    4: '#c47bff',
    5: '#9aa3b2',
  }
  return (
    <group position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {tierRings.map(({ tier, r }) => {
        const color = TIER_COLORS[tier] ?? '#9aa3b2'
        return (
          <group key={tier}>
            {/* Faint solid disc rim */}
            <mesh>
              <ringGeometry args={[r - 0.6, r, 128]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            {/* Soft outer glow */}
            <mesh>
              <ringGeometry args={[r, r + 2.2, 128]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.18}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Tier label floating just outside the ring */}
            <group rotation={[Math.PI / 2, 0, 0]} position={[0, -r * 0 - r * 0, 0]}>
              <Text
                position={[r + 4, 3, 0]}
                fontSize={3.6}
                color={color}
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.18}
                outlineColor="#0e1322"
                rotation={[-Math.PI / 6, 0, 0]}
              >
                {`T${tier}`}
              </Text>
            </group>
          </group>
        )
      })}
    </group>
  )
}

// --- Bonds: simple line segments ---------------------------------------------
// Drawn as Line3 buffers; updated each frame from current drag offsets.

function Bonds({
  planets, moons, dragRef,
}: {
  planets: Planet[]
  moons: Moon[]
  dragRef: React.RefObject<DragState | null>
}) {
  const planetMap = useMemo(() => new Map(planets.map((p) => [p.name, p])), [planets])
  const artistByName = useMemo(() => {
    const m = new Map<string, Artist>()
    for (const a of artists) m.set(a.name, a)
    return m
  }, [])
  // Build static bond list: own = moon→planet, feat = moon→featured planet,
  // member = solo planet → group planet (golden, drawn separately).
  const bonds = useMemo(() => {
    const out: Array<{ kind: 'own' | 'feat'; aOwner: string; bOwner: string; aSide: 'planet' | 'moon'; bSide: 'planet'; moonRef?: Moon }> = []
    for (const m of moons) {
      if (!planetMap.has(m.ownerName)) continue
      out.push({ kind: 'own', aOwner: m.ownerName, bOwner: m.ownerName, aSide: 'moon', bSide: 'planet', moonRef: m })
      const feats = m.song.features
      if (!feats) continue
      for (const f of feats) {
        if (!planetMap.has(f)) continue
        out.push({ kind: 'feat', aOwner: m.ownerName, bOwner: f, aSide: 'moon', bSide: 'planet', moonRef: m })
      }
    }
    return out
  }, [moons, planetMap])

  // Member bonds — drawn as a second LineSegments so we can give them a
  // gold tint without polluting the per-vertex colour buffer of the main
  // bond pass. Endpoints are both planet centres.
  const memberBonds = useMemo(() => {
    const out: Array<{ from: string; to: string }> = []
    for (const p of planets) {
      const a = artistByName.get(p.name)
      if (!a?.memberOf) continue
      for (const groupName of a.memberOf) {
        if (!planetMap.has(groupName)) continue
        out.push({ from: p.name, to: groupName })
      }
    }
    return out
  }, [planets, artistByName, planetMap])

  const geomRef = useRef<THREE.BufferGeometry>(null)
  const memberGeomRef = useRef<THREE.BufferGeometry>(null)
  const positions = useMemo(() => new Float32Array(bonds.length * 2 * 3), [bonds.length])
  const memberPositions = useMemo(() => new Float32Array(memberBonds.length * 2 * 3), [memberBonds.length])
  const colors = useMemo(() => {
    const c = new Float32Array(bonds.length * 2 * 3)
    for (let i = 0; i < bonds.length; i++) {
      const o = i * 6
      const grey = bonds[i].kind === 'feat' ? 0.55 : 0.28
      c[o] = c[o + 1] = c[o + 2] = grey
      c[o + 3] = c[o + 4] = c[o + 5] = grey
    }
    return c
  }, [bonds])

  useFrame(() => {
    const ds = dragRef.current
    for (let i = 0; i < bonds.length; i++) {
      const b = bonds[i]
      const ownerP = planetMap.get(b.aOwner)!
      const ownerOff = ds?.offsets.get(b.aOwner) ?? { dx: 0, dz: 0 }
      let ax: number, az: number
      if (b.aSide === 'moon' && b.moonRef) {
        ax = b.moonRef.x + ownerOff.dx
        az = b.moonRef.z + ownerOff.dz
      } else {
        ax = ownerP.x + ownerOff.dx
        az = ownerP.z + ownerOff.dz
      }
      const targetP = planetMap.get(b.bOwner)!
      const targetOff = ds?.offsets.get(b.bOwner) ?? { dx: 0, dz: 0 }
      const bx = targetP.x + targetOff.dx
      const bz = targetP.z + targetOff.dz
      const o = i * 6
      positions[o] = ax; positions[o + 1] = 0; positions[o + 2] = az
      positions[o + 3] = bx; positions[o + 4] = 0; positions[o + 5] = bz
    }
    // Member bonds — planet-to-planet.
    for (let i = 0; i < memberBonds.length; i++) {
      const mb = memberBonds[i]
      const a = planetMap.get(mb.from)!
      const b = planetMap.get(mb.to)!
      const aOff = ds?.offsets.get(mb.from) ?? { dx: 0, dz: 0 }
      const bOff = ds?.offsets.get(mb.to) ?? { dx: 0, dz: 0 }
      const o = i * 6
      memberPositions[o] = a.x + aOff.dx
      memberPositions[o + 1] = 0
      memberPositions[o + 2] = a.z + aOff.dz
      memberPositions[o + 3] = b.x + bOff.dx
      memberPositions[o + 4] = 0
      memberPositions[o + 5] = b.z + bOff.dz
    }
    if (geomRef.current) {
      const attr = geomRef.current.attributes.position as THREE.BufferAttribute
      attr.needsUpdate = true
    }
    if (memberGeomRef.current) {
      const attr = memberGeomRef.current.attributes.position as THREE.BufferAttribute
      attr.needsUpdate = true
    }
  })

  return (
    <>
      <lineSegments>
        <bufferGeometry ref={geomRef}>
          <bufferAttribute
            attach="attributes-position"
            count={bonds.length * 2}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={bonds.length * 2}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.7} />
      </lineSegments>
      {/* Member bonds — drawn in a warm gold so they're visually distinct
          from feature lines. */}
      {memberBonds.length > 0 && (
        <lineSegments>
          <bufferGeometry ref={memberGeomRef}>
            <bufferAttribute
              attach="attributes-position"
              count={memberBonds.length * 2}
              array={memberPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#f6c66c" transparent opacity={0.85} />
        </lineSegments>
      )}
    </>
  )
}

// --- Pointer-to-plane drag controller ----------------------------------------
// Sits inside the Canvas so it can use the live camera / DOM events.

// Pending-grab handle shared between PlanetMesh's pointerdown handler and
// the DragController. Kept as a module-level ref-like singleton (assigned
// from SceneInner) so we don't have to thread it through React props and
// can't accidentally lose it to a stale closure.
interface PendingGrab { name: string; pid: number; startX: number; startY: number }
const pendingGrabRef: { current: PendingGrab | null } = { current: null }

function DragController({
  planets, dragRef, setOrbitEnabled, onArtistClick,
}: {
  planets: Planet[]
  dragRef: React.MutableRefObject<DragState | null>
  setOrbitEnabled: (b: boolean) => void
  onArtistClick: (name: string) => void
}) {
  const { camera, gl } = useThree()
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())
  const ndc = useRef(new THREE.Vector2())
  const planetByName = useMemo(() => new Map(planets.map((p) => [p.name, p])), [planets])

  useEffect(() => {
    const canvas = gl.domElement
    const CLICK_THRESHOLD = 6
    let activeId: number | null = null

    function pointerToWorld(clientX: number, clientY: number): { x: number; z: number } {
      const rect = canvas.getBoundingClientRect()
      ndc.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.current.setFromCamera(ndc.current, camera)
      const hit = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(planeRef.current, hit)
      return { x: hit.x, z: hit.z }
    }
    function promoteToDrag(name: string, clientX: number, clientY: number, pid: number) {
      activeId = pid
      setOrbitEnabled(false)
      const anchors = new Map<string, { x: number; z: number; orbitR: number }>()
      const offsets = new Map<string, { dx: number; dz: number }>()
      const vels = new Map<string, { vx: number; vz: number }>()
      for (const p of planets) {
        anchors.set(p.name, { x: p.x, z: p.z, orbitR: p.orbitR })
        const existing = dragRef.current?.offsets.get(p.name)
        offsets.set(p.name, existing ?? { dx: 0, dz: 0 })
        vels.set(p.name, { vx: 0, vz: 0 })
      }
      const t = pointerToWorld(clientX, clientY)
      const planet = planetByName.get(name)!
      const off = dragRef.current?.offsets.get(name) ?? { dx: 0, dz: 0 }
      const cur = { x: planet.x + off.dx, z: planet.z + off.dz }
      const grabDx = t.x - cur.x
      const grabDz = t.z - cur.z
      dragRef.current = {
        grabbed: name,
        anchors,
        offsets,
        vels,
        tx: t.x - grabDx,
        tz: t.z - grabDz,
      }
      ;(dragRef.current as DragState & { grabDx: number; grabDz: number }).grabDx = grabDx
      ;(dragRef.current as DragState & { grabDx: number; grabDz: number }).grabDz = grabDz
    }
    function onMove(ev: PointerEvent) {
      const pending = pendingGrabRef.current
      if (pending && pending.pid === ev.pointerId) {
        const dx = ev.clientX - pending.startX
        const dy = ev.clientY - pending.startY
        if (Math.hypot(dx, dy) > CLICK_THRESHOLD) {
          pendingGrabRef.current = null
          promoteToDrag(pending.name, ev.clientX, ev.clientY, pending.pid)
        }
      }
      const ds = dragRef.current as (DragState & { grabDx?: number; grabDz?: number }) | null
      if (!ds || activeId !== ev.pointerId) return
      ev.preventDefault()
      const t = pointerToWorld(ev.clientX, ev.clientY)
      ds.tx = t.x - (ds.grabDx ?? 0)
      ds.tz = t.z - (ds.grabDz ?? 0)
    }
    function onUp(ev: PointerEvent) {
      const pending = pendingGrabRef.current
      if (pending && pending.pid === ev.pointerId) {
        const name = pending.name
        pendingGrabRef.current = null
        onArtistClick(name)
        return
      }
      if (activeId !== ev.pointerId) return
      activeId = null
      setOrbitEnabled(true)
      if (dragRef.current) dragRef.current = { ...dragRef.current, grabbed: '' }
    }
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [camera, gl, planets, planetByName, dragRef, setOrbitEnabled, onArtistClick])
  return null
}

// --- The scene ---------------------------------------------------------------

interface SceneProps {
  onSongOpen: (artist: string, song: Song) => void
  onArtistOpen: (name: string) => void
  viewMode?: ViewMode
  searchQuery?: string
}

function SceneInner({ onSongOpen, onArtistOpen, viewMode = 'country', searchQuery = '' }: SceneProps) {
  const { planets, moons } = useMemo(() => buildLayout(viewMode), [viewMode])
  // Precompute search matches once per (planets, moons, query) so the
  // per-mesh memo can just look up a boolean.
  const search = searchQuery.trim().toLowerCase()
  const matchedPlanets = useMemo(() => {
    if (!search) return null
    const set = new Set<string>()
    for (const p of planets) {
      if (p.name.toLowerCase().includes(search)) { set.add(p.name); continue }
      for (const s of p.artist.songs) {
        if (s.title.toLowerCase().includes(search)) { set.add(p.name); break }
      }
    }
    return set
  }, [planets, search])
  const matchedMoons = useMemo(() => {
    if (!search) return null
    const set = new Set<string>()
    for (const m of moons) {
      if (m.song.title.toLowerCase().includes(search)) set.add(m.id)
      else if (m.ownerName.toLowerCase().includes(search)) set.add(m.id)
    }
    return set
  }, [moons, search])
  const dragRef = useRef<DragState | null>(null)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  // OrbitControls handle for camera tweening.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null)
  // Camera tween target — set by the search-match effect, consumed by a
  // per-frame lerp below until reached, then cleared. Null = no active
  // camera animation.
  const camTargetRef = useRef<{ x: number; z: number; dist: number } | null>(null)

  // When the search produces matches, compute a camera target so the user
  // is flown into focus on the matched planets.
  useEffect(() => {
    if (!matchedPlanets || matchedPlanets.size === 0) {
      camTargetRef.current = null
      return
    }
    let cx = 0, cz = 0, count = 0
    let maxOrbit = 0
    for (const p of planets) {
      if (matchedPlanets.has(p.name)) {
        cx += p.x; cz += p.z; count++
        // p.orbitR already covers the artist + furthest moon, so using
        // the largest orbitR among matches gives us a distance that
        // safely fits every song in the frame.
        if (p.orbitR > maxOrbit) maxOrbit = p.orbitR
      }
    }
    if (count === 0) return
    cx /= count
    cz /= count
    // Distance has to fit the artist's full moon orbit in view. The
    // visible-frustum half-width at distance d (fov 35°) is roughly
    // d · tan(17.5°) ≈ d · 0.314. So d ≈ orbitR / 0.314 covers it.
    // Add a comfort multiplier so the planet doesn't sit edge-to-edge.
    const VIEW_FACTOR = 0.314
    const COMFORT = 2.4
    const orbitDist = (maxOrbit / VIEW_FACTOR) * COMFORT
    const dist = count === 1
      ? Math.max(110, orbitDist)
      : Math.min(380, Math.max(140, 90 + count * 12 + orbitDist * 0.6))
    camTargetRef.current = { x: cx, z: cz, dist }
  }, [matchedPlanets, planets])

  // Camera tween loop. Lerps OrbitControls target + camera position toward
  // camTargetRef each frame until close enough, then stops touching the
  // controls so the user can move freely again.
  useFrame(() => {
    const t = camTargetRef.current
    const oc = orbitRef.current
    if (!t || !oc) return
    const LERP = 0.10
    const dx = (t.x - oc.target.x) * LERP
    const dz = (t.z - oc.target.z) * LERP
    oc.target.x += dx
    oc.target.z += dz
    oc.object.position.x += dx
    oc.object.position.z += dz
    // Lerp camera distance to the target distance, preserving the current
    // viewing angle.
    const dir = new THREE.Vector3().subVectors(oc.object.position, oc.target)
    const curDist = dir.length()
    if (curDist > 0.1) {
      const newDist = curDist + (t.dist - curDist) * LERP
      dir.setLength(newDist)
      oc.object.position.copy(oc.target).add(dir)
    }
    oc.update()
    // Done? Within 0.3 viewBox-units of target and matching distance.
    if (Math.abs(t.x - oc.target.x) < 0.3 && Math.abs(t.z - oc.target.z) < 0.3 && Math.abs(curDist - t.dist) < 0.6) {
      camTargetRef.current = null
    }
  })

  const onPlanetDown = useCallback(
    (name: string, clientX: number, clientY: number, pointerId: number) => {
      // Park a pending grab on the module-level ref. DragController's
      // document-level pointermove/up listeners will read it, no event
      // dispatch needed — that path was unreliable on Safari (R3F's
      // synthesised events fire before any window/canvas listener could
      // see them).
      pendingGrabRef.current = { name, pid: pointerId, startX: clientX, startY: clientY }
    },
    [],
  )
  const onMoonOpen = useCallback((m: Moon) => {
    onSongOpen(m.ownerName, m.song)
  }, [onSongOpen])

  // Compute centroid + radius for each group, then pairwise-clip the
  // radii so no two territories ever overlap. Steps:
  //   1. Centroid = mean of planet positions.
  //   2. Tentative radius = 85th-percentile distance — outliers (e.g.
  //      a Japan artist dragged by feat. toward Korea) don't blow up
  //      the empire's reach. Wobble headroom (×0.78) baked in so the
  //      animated boundary still doesn't cross.
  //   3. Pairwise clip: if radius_A + radius_B exceeds centroid distance,
  //      shave both proportionally so they meet at the midpoint.
  function buildDisks<T extends string>(
    groups: Map<T, Planet[]>,
    extra: (k: T) => { color?: string; label?: string } = () => ({}),
  ) {
    // Containment-first sizing: every member must sit inside its own
    // empire's disk. We track a `required` radius (the minimum that
    // encloses every member from the current centroid) and a `desired`
    // radius (required + breathing pad). The clip pass below is allowed
    // to shrink toward `required` but never below it — if neighbours
    // really cannot fit, we push centroids further apart instead.
    type Disk = {
      k: T
      cx: number; cz: number
      r: number
      required: number
      members: Planet[]
      color?: string
      label?: string
    }
    const out: Disk[] = []
    for (const [k, list] of groups) {
      if (list.length === 0) continue
      let cx = 0, cz = 0
      for (const p of list) { cx += p.x; cz += p.z }
      cx /= list.length; cz /= list.length
      const maxDist = list.reduce(
        (acc, p) => Math.max(acc, Math.hypot(p.x - cx, p.z - cz) + p.r * 1.4),
        0,
      )
      // Breathing pad scales linearly with member count so big empires
      // (Korea ~30, USA ~30, Japan ~22) get more visual padding than
      // single-act territories (Sweden, NL). France/Canada with 2-4
      // members get only a couple px of buffer.
      const pad = Math.max(3, list.length * 0.6)
      out.push({
        k,
        cx, cz,
        r: maxDist + pad,
        required: maxDist + 2,
        members: list,
        ...extra(k),
      })
    }

    // Re-derive containment radius from the current centroid + members.
    // Called whenever a centroid moves so the disk follows.
    function refit(d: Disk) {
      let m = 0
      for (const p of d.members) {
        const dist = Math.hypot(p.x - d.cx, p.z - d.cz) + p.r * 1.4
        if (dist > m) m = dist
      }
      const pad = Math.max(3, d.members.length * 0.6)
      d.required = m + 2
      d.r = Math.max(d.r, m + pad)
    }

    // Pass 0 — push apart any centroids that overlap given current
    // radii. Containment radii are recomputed after each move so the
    // disk always encloses every artist (was a bug: pushing the
    // centroid without recomputing left France's disk floating away
    // from its actual members).
    const PUSH_HEAD = 1.18
    for (let pass = 0; pass < 8; pass++) {
      let moved = false
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const A = out[i], B = out[j]
          const dx = A.cx - B.cx
          const dz = A.cz - B.cz
          const dist = Math.hypot(dx, dz) || 0.01
          const minSep = (A.r + B.r) * PUSH_HEAD + 6
          if (dist < minSep) {
            moved = true
            const push = (minSep - dist) * 0.5
            const totalR = A.r + B.r
            const shareA = totalR > 0 ? B.r / totalR : 0.5
            const shareB = 1 - shareA
            A.cx += (dx / dist) * push * shareA
            A.cz += (dz / dist) * push * shareA
            B.cx -= (dx / dist) * push * shareB
            B.cz -= (dz / dist) * push * shareB
            refit(A); refit(B)
          }
        }
      }
      if (!moved) break
    }

    // Pass 1 — pairwise clip if any overlap remains, but never shrink
    // below the containment-required radius. If we'd need to, push the
    // centroids further apart instead so containment + separation both
    // hold.
    const HEADROOM = 1.18
    for (let pass = 0; pass < 4; pass++) {
      let changed = false
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const A = out[i], B = out[j]
          const dx = A.cx - B.cx
          const dz = A.cz - B.cz
          const dist = Math.hypot(dx, dz) || 0.01
          const overlap = (A.r + B.r) * HEADROOM - dist + 2
          if (overlap <= 0) continue
          changed = true
          // First try shrinking — but only the slack above each disk's
          // required radius can be given back.
          const slackA = Math.max(0, A.r - A.required)
          const slackB = Math.max(0, B.r - B.required)
          const slackTotal = slackA + slackB
          const shrink = Math.min(overlap, slackTotal)
          if (shrink > 0 && slackTotal > 0) {
            A.r -= shrink * (slackA / slackTotal)
            B.r -= shrink * (slackB / slackTotal)
          }
          // Whatever overlap remains after eating slack — push the
          // centroids apart, then refit so containment stays intact.
          const remaining = overlap - shrink
          if (remaining > 0) {
            const totalR = A.r + B.r
            const shareA = totalR > 0 ? B.r / totalR : 0.5
            const shareB = 1 - shareA
            const push = remaining * 0.55
            A.cx += (dx / dist) * push * shareA
            A.cz += (dz / dist) * push * shareA
            B.cx -= (dx / dist) * push * shareB
            B.cz -= (dz / dist) * push * shareB
            refit(A); refit(B)
          }
        }
      }
      if (!changed) break
    }
    for (const t of out) if (t.r < 4) t.r = 4
    return out.map(({ k, cx, cz, r, color, label }) => ({ k, cx, cz, r, color, label }))
  }

  // Genre territory: outer blob per genre FAMILY (so pop / jpop / kpop
  // all share one pink "Pop" empire) and an inner halo per sub-genre
  // inside its family for visual nesting.
  const genreDisks = useMemo(() => {
    const groups = new Map<string, Planet[]>()
    for (const p of planets) {
      const f = familyOfGenre(p.primaryGenre)
      if (!groups.has(f)) groups.set(f, [])
      groups.get(f)!.push(p)
    }
    return buildDisks(groups, (k) => {
      const spec = familyFor(k)
      return { color: spec.color, label: spec.label }
    }) as Array<{ k: string; cx: number; cz: number; r: number; color: string; label: string }>
  }, [planets])

  // Sub-genre halos — drawn inside each family's blob with the sub-
  // genre's own colour. Lets the user see "this side of the pop empire
  // is jpop, that side is kpop" without splitting the empire.
  const subGenreHalos = useMemo(() => {
    if (viewMode !== 'genre') return []
    // Sub-genre halos rendered as CountryTerritory-style wobbly blobs
    // (same animated rim as country/family) so they breathe rather
    // than sitting as static circles. We also clip each sub-genre's
    // radius against (a) its family's outer rim and (b) every other
    // sub-genre inside the same family — so jpop's halo can't bleed
    // out into the rock empire next door, or eat its sibling kpop.
    const byGenre = new Map<string, Planet[]>()
    const byFamily = new Map<string, Planet[]>()
    for (const p of planets) {
      const g = p.primaryGenre
      if (!byGenre.has(g)) byGenre.set(g, [])
      byGenre.get(g)!.push(p)
      const f = familyOfGenre(g)
      if (!byFamily.has(f)) byFamily.set(f, [])
      byFamily.get(f)!.push(p)
    }

    // Family centroid + radius cap, computed the same way as the outer
    // family territory so we can clip sub-genres against it exactly.
    const famInfo = new Map<string, { cx: number; cz: number; r: number }>()
    for (const [f, list] of byFamily) {
      let cx = 0, cz = 0
      for (const p of list) { cx += p.x; cz += p.z }
      cx /= list.length; cz /= list.length
      const ds = list.map((p) => Math.hypot(p.x - cx, p.z - cz) + p.r * 1.4)
      ds.sort((a, b) => a - b)
      const pctIdx = Math.max(0, Math.min(ds.length - 1, Math.floor(ds.length * 0.95)))
      const pad = Math.max(2, list.length * 0.7)
      famInfo.set(f, { cx, cz, r: ds[pctIdx] + pad })
    }

    const out: Array<{ k: string; cx: number; cz: number; r: number; color: string; label?: string }> = []
    for (const [g, list] of byGenre) {
      const fam = familyOfGenre(g)
      // If this genre IS its family (anime / rock / rnb / edm), the
      // outer blob already shows it — skip the inner halo.
      const familySize = byFamily.get(fam)?.length ?? 0
      if (familySize === list.length) continue
      let cx = 0, cz = 0
      for (const p of list) { cx += p.x; cz += p.z }
      cx /= list.length; cz /= list.length
      const ds = list.map((p) => Math.hypot(p.x - cx, p.z - cz) + p.r * 1.4)
      ds.sort((a, b) => a - b)
      const pctIdx = Math.max(0, Math.min(ds.length - 1, Math.floor(ds.length * 0.95)))
      const subPad = Math.max(1.5, list.length * 0.45)
      let r = ds[pctIdx] + subPad
      // Clip against family rim — wobble peaks add ~30% so reserve that.
      const fi = famInfo.get(fam)!
      const distToFamCentre = Math.hypot(cx - fi.cx, cz - fi.cz)
      const maxToFamRim = (fi.r / 1.30) - distToFamCentre - 4
      if (r > maxToFamRim) r = Math.max(maxToFamRim, 4)
      out.push({ k: g, cx, cz, r, color: genreFor(g).color, label: genreFor(g).label })
    }
    // Pairwise clip within family so sibling sub-genres don't overlap.
    const HEAD = 1.30
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const A = out[i], B = out[j]
          if (familyOfGenre(A.k) !== familyOfGenre(B.k)) continue
          const dist = Math.hypot(A.cx - B.cx, A.cz - B.cz)
          const overlap = (A.r + B.r) * HEAD - dist + 2
          if (overlap > 0) {
            const total = A.r + B.r
            const shareA = total > 0 ? A.r / total : 0.5
            A.r -= overlap * shareA / HEAD
            B.r -= overlap * (1 - shareA) / HEAD
          }
        }
      }
    }
    for (const o of out) if (o.r < 4) o.r = 4
    return out
  }, [planets, viewMode])

  // Country territory disks.
  const countryDisks = useMemo(() => {
    const groups = new Map<string, Planet[]>()
    for (const p of planets) {
      if (!groups.has(p.country)) groups.set(p.country, [])
      groups.get(p.country)!.push(p)
    }
    return buildDisks(groups) as Array<{ k: string; cx: number; cz: number; r: number }>
  }, [planets])

  return (
    <>
      {/* Deep-space background colour. No fog — the atlas disk uses an
          alpha-falling texture so it blends without a hard edge, and fog
          was creating visible banding on faraway stars. */}
      <color attach="background" args={['#0a0e1c']} />

      {/* Lighting — bumped up so even base-colour planets read brighter
          against the deep-space backdrop. */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[0xffffff, 0x4c4f70, 0.85]} />
      <directionalLight position={[60, 140, 80]} intensity={1.4} castShadow={false} />
      <pointLight position={[-140, 80, -90]} intensity={0.7} color="#a6c2ff" />
      <pointLight position={[140, 60, 140]} intensity={0.55} color="#ffc69a" />

      <Stars />
      <AtlasGround />

      {viewMode === 'tier' && <TierGuides moons={moons} />}
      {viewMode === 'country' && countryDisks.map((c) => (
        <CountryTerritory key={c.k} k={c.k} cx={c.cx} cz={c.cz} r={c.r} />
      ))}
      {viewMode === 'genre' && genreDisks.map((g) => (
        <CountryTerritory
          key={g.k}
          k={g.k}
          cx={g.cx}
          cz={g.cz}
          r={g.r}
          color={g.color}
          label={g.label}
        />
      ))}
      {viewMode === 'genre' && subGenreHalos.map((h) => (
        <CountryTerritory
          key={'sh-' + h.k}
          k={'sub-' + h.k}
          cx={h.cx}
          cz={h.cz}
          r={h.r}
          color={h.color}
          label={h.label}
        />
      ))}

      {viewMode !== 'tier' && planets.map((p) => (
        <PlanetMesh
          key={p.name}
          planet={p}
          onSelect={onPlanetDown}
          dragRef={dragRef}
          dimmed={matchedPlanets ? !matchedPlanets.has(p.name) : false}
        />
      ))}

      <Suspense fallback={null}>
        {moons.map((m) => (
          <MoonMesh
            key={m.id}
            moon={m}
            onOpen={onMoonOpen}
            dragRef={dragRef}
            dimmed={matchedMoons ? !matchedMoons.has(m.id) : false}
          />
        ))}
      </Suspense>

      {viewMode !== 'tier' && <Bonds planets={planets} moons={moons} dragRef={dragRef} />}
      <DragLoop dragRef={dragRef} />
      <DragController
        planets={planets}
        dragRef={dragRef}
        setOrbitEnabled={setOrbitEnabled}
        onArtistClick={onArtistOpen}
      />
      <OrbitControls
        ref={orbitRef}
        enabled={orbitEnabled}
        enableDamping
        dampingFactor={0.12}
        // Idle auto-rotate — very slow drift around the atlas so the whole
        // map feels alive even when nobody's touching it. autoRotateSpeed
        // is 2π rad/min at value 2.0; 0.18 ≈ one revolution every ~5 min.
        autoRotate
        autoRotateSpeed={0.18}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={18}
        maxDistance={1400}
        screenSpacePanning={false}
      />
    </>
  )
}

export function JumapScene({ onSongOpen, onArtistOpen, viewMode, searchQuery }: SceneProps) {
  return (
    <Canvas
      className="jumap3d-canvas"
      // dpr capped on mobile for fps
      dpr={[1, typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches ? 1.4 : 2]}
      camera={{ position: [0, 750, 950], fov: 35, near: 0.1, far: 3500 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <SceneInner
        onSongOpen={onSongOpen}
        onArtistOpen={onArtistOpen}
        viewMode={viewMode}
        searchQuery={searchQuery}
      />
    </Canvas>
  )
}

// Suppress unused-from-import warning for tierCrownSrc / Html (kept for next iter).
void tierCrownSrc
void Html
