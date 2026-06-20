import { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Text, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  artists,
  GENRES,
  COUNTRIES,
  genreFor,
  countryFor,
  countryOfGenre,
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
    const c = countryOfGenre(artistPrimaryGenre(a))
    if (!byCountry.has(c)) byCountry.set(c, [])
    byCountry.get(c)!.push(a)
  }
  const countryKeys = COUNTRIES.map((c) => c.key).filter((k) => byCountry.has(k))
  const ringR = 110
  const cCentres: Record<string, { x: number; z: number }> = {}
  if (countryKeys.length === 1) cCentres[countryKeys[0]] = { x: 0, z: 0 }
  else countryKeys.forEach((k, i) => {
    const ang = (i / countryKeys.length) * Math.PI * 2 - Math.PI / 2
    cCentres[k] = { x: Math.cos(ang) * ringR, z: Math.sin(ang) * ringR }
  })

  const planets: Planet[] = []
  for (const country of countryKeys) {
    const cc = cCentres[country]
    const arts = byCountry.get(country) ?? []
    const byGenre = new Map<string, Artist[]>()
    for (const a of arts) {
      const g = artistPrimaryGenre(a)
      if (!byGenre.has(g)) byGenre.set(g, [])
      byGenre.get(g)!.push(a)
    }
    const genreKeys = GENRES.map((g) => g.key).filter((k) => byGenre.has(k))
    const innerR = 26
    const gCentres: Record<string, { x: number; z: number }> = {}
    if (genreKeys.length === 1) gCentres[genreKeys[0]] = cc
    else genreKeys.forEach((g, i) => {
      const ang = (i / genreKeys.length) * Math.PI * 2 - Math.PI / 2
      gCentres[g] = { x: cc.x + Math.cos(ang) * innerR, z: cc.z + Math.sin(ang) * innerR }
    })
    for (const genre of genreKeys) {
      const gc = gCentres[genre]
      const cluster = sortArtists(byGenre.get(genre) ?? [])
      const phase = cluster.length ? seed(cluster[0].name) * Math.PI * 2 : 0
      cluster.forEach((a, i) => {
        const ang = i * GOLDEN + phase
        const lr = cluster.length === 1 ? 0 : Math.sqrt(i + 0.6) * 13
        planets.push(newPlanet(a, gc.x + Math.cos(ang) * lr, gc.z + Math.sin(ang) * lr, country, genre))
      })
    }
  }
  return planets
}

function placeByGenre(): Planet[] {
  const byGenre = new Map<string, Artist[]>()
  for (const a of artists) {
    const g = artistPrimaryGenre(a)
    if (!byGenre.has(g)) byGenre.set(g, [])
    byGenre.get(g)!.push(a)
  }
  const genreKeys = GENRES.map((g) => g.key).filter((k) => byGenre.has(k))
  const ringR = 130
  const centres: Record<string, { x: number; z: number }> = {}
  if (genreKeys.length === 1) centres[genreKeys[0]] = { x: 0, z: 0 }
  else genreKeys.forEach((g, i) => {
    const ang = (i / genreKeys.length) * Math.PI * 2 - Math.PI / 2
    centres[g] = { x: Math.cos(ang) * ringR, z: Math.sin(ang) * ringR }
  })
  const planets: Planet[] = []
  for (const genre of genreKeys) {
    const c = centres[genre]
    const cluster = sortArtists(byGenre.get(genre) ?? [])
    const phase = cluster.length ? seed(cluster[0].name) * Math.PI * 2 : 0
    cluster.forEach((a, i) => {
      const ang = i * GOLDEN + phase
      const lr = cluster.length === 1 ? 0 : Math.sqrt(i + 0.6) * 15
      planets.push(
        newPlanet(
          a,
          c.x + Math.cos(ang) * lr,
          c.z + Math.sin(ang) * lr,
          countryOfGenre(artistPrimaryGenre(a)),
          genre,
        ),
      )
    })
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
  forceSettle(planets)

  const moons: Moon[] = []
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
  return { planets, moons }
}

function forceSettle(planets: Planet[]): void {
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
  }
  // Spring strength + comfortable distance for a collab pair.
  const COLLAB_PULL = 0.018
  const COLLAB_TARGET_DELTA = 12 // how far inside the min-separation gap
                                 // we'd LIKE the pair to settle.

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
        const sameCountry = a.country === b.country
        const boost = sameCountry ? 0 : 38
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
        const key = i < j ? `${i}|${j}` : `${j}|${i}`
        if (collabs.has(key)) {
          const target = minD + COLLAB_TARGET_DELTA
          // If currently farther than the target, pull inward; never push
          // inside the min separation (that's the repulsion's job above).
          if (d > target) {
            const pull = (d - target) * COLLAB_PULL
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
          roughness={0.55}
          metalness={0.05}
          emissive={new THREE.Color(color)}
          emissiveIntensity={em}
          transparent={transparent}
          opacity={opacity}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={0.1}
          emissive={new THREE.Color(color)}
          emissiveIntensity={em + (dimmed ? 0 : 0.12)}
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
  onSelect: (name: string) => void
  dragRef: React.RefObject<DragState | null>
  dimmed?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const genre = genreFor(planet.primaryGenre)
  // Live drag offset, applied imperatively each frame (no React state churn).
  useFrame(() => {
    const ds = dragRef.current
    if (!ds || !groupRef.current) return
    const off = ds.offsets.get(planet.name)
    if (off) groupRef.current.position.set(planet.x + off.dx, 0, planet.z + off.dz)
    else groupRef.current.position.set(planet.x, 0, planet.z)
  })
  const handleDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onSelect(planet.name)
  }, [planet.name, onSelect])
  return (
    <group ref={groupRef} position={[planet.x, 0, planet.z]}>
      {/* Soft glow ring under the planet — sells the "floating" feel. */}
      <mesh position={[0, -planet.r * 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.r * 1.05, planet.r * 2.4, 64]} />
        <meshBasicMaterial
          color={genre.color}
          transparent
          opacity={dimmed ? 0.05 : hover ? 0.32 : 0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Sphere
        position={[0, 0, 0]}
        radius={planet.r}
        color={genre.color}
        faceUrl={planet.faceUrl}
        emissive={hover ? 0.35 : 0.1}
        dimmed={dimmed}
        onPointerDown={handleDown}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => setHover(false)}
      />
      {/* Floating name label above the planet — billboarded toward camera. */}
      <Text
        position={[0, planet.r + 1.6, 0]}
        fontSize={1.5}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.12}
        outlineColor="#ffffff"
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
  return (
    <group ref={groupRef} position={[moon.x, 0, moon.z]}>
      <Sphere
        position={[0, 0, 0]}
        radius={moon.r}
        color={genreFor((moon.song.genres[0] || 'other').toLowerCase()).color}
        faceUrl={art}
        emissive={hover ? 0.4 : 0.15}
        dimmed={dimmed}
        onPointerDown={(e) => { e.stopPropagation(); onOpen(moon) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => setHover(false)}
      />
    </group>
  )
}

function CountryDisk({ k, cx, cz, r }: { k: string; cx: number; cz: number; r: number }) {
  const spec = countryFor(k)
  return (
    <group position={[cx, -1.2, cz]}>
      {/* Solid soft disk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 96]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.32} />
      </mesh>
      {/* Outline ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.985, r, 96]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* Label floating above */}
      <Text
        position={[0, 4, -r + 8]}
        fontSize={6}
        color={spec.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.3}
        outlineColor="#ffffff"
        rotation={[-Math.PI / 6, 0, 0]}
      >
        {spec.label}
      </Text>
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
  // Build static bond list: own = moon→planet, feature = moon→featured.
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

  const geomRef = useRef<THREE.BufferGeometry>(null)
  const positions = useMemo(() => new Float32Array(bonds.length * 2 * 3), [bonds.length])
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
    if (geomRef.current) {
      const attr = geomRef.current.attributes.position as THREE.BufferAttribute
      attr.needsUpdate = true
    }
  })

  return (
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
  )
}

// --- Pointer-to-plane drag controller ----------------------------------------
// Sits inside the Canvas so it can use the live camera / DOM events.

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
    // Click vs drag is disambiguated by movement distance. Until the
    // pointer crosses ~6 client-px from where it landed, we treat the
    // gesture as a potential click on the artist — no drag state, no
    // orbit-controls lock. Once it crosses the threshold, we promote
    // the pending grab to an active drag.
    const CLICK_THRESHOLD = 6
    let pending:
      | { name: string; pid: number; startX: number; startY: number }
      | null = null
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
      // Promotion phase
      if (pending && pending.pid === ev.pointerId) {
        const dx = ev.clientX - pending.startX
        const dy = ev.clientY - pending.startY
        if (Math.hypot(dx, dy) > CLICK_THRESHOLD) {
          const p = pending
          pending = null
          promoteToDrag(p.name, ev.clientX, ev.clientY, p.pid)
        }
      }
      // Active drag phase
      const ds = dragRef.current as (DragState & { grabDx?: number; grabDz?: number }) | null
      if (!ds || activeId !== ev.pointerId) return
      ev.preventDefault()
      const t = pointerToWorld(ev.clientX, ev.clientY)
      ds.tx = t.x - (ds.grabDx ?? 0)
      ds.tz = t.z - (ds.grabDz ?? 0)
    }
    function onUp(ev: PointerEvent) {
      // Pending → click: open the artist modal.
      if (pending && pending.pid === ev.pointerId) {
        const name = pending.name
        pending = null
        onArtistClick(name)
        return
      }
      if (activeId !== ev.pointerId) return
      activeId = null
      setOrbitEnabled(true)
      if (dragRef.current) dragRef.current = { ...dragRef.current, grabbed: '' }
    }
    function onCustom(ev: Event) {
      const e = ev as CustomEvent<{ name: string; clientX: number; clientY: number; pointerId: number }>
      // Park a pending grab. Don't disable OrbitControls yet — we still
      // don't know if this is a click or a drag.
      pending = {
        name: e.detail.name,
        pid: e.detail.pointerId,
        startX: e.detail.clientX,
        startY: e.detail.clientY,
      }
    }
    canvas.addEventListener('jumap-drag-start' as keyof HTMLElementEventMap, onCustom as EventListener)
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('jumap-drag-start' as keyof HTMLElementEventMap, onCustom as EventListener)
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

  const onPlanetDown = useCallback((name: string) => {
    // Synthesize a custom event with the latest pointer position so the
    // DragController can pick it up consistently.
    const latest = (window as unknown as { __lastPointer?: { x: number; y: number; id: number } }).__lastPointer
    if (!latest) return
    const canvas = document.querySelector('canvas.jumap3d-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    canvas.dispatchEvent(new CustomEvent('jumap-drag-start', {
      detail: { name, clientX: latest.x, clientY: latest.y, pointerId: latest.id },
    }))
  }, [])
  const onMoonOpen = useCallback((m: Moon) => {
    onSongOpen(m.ownerName, m.song)
  }, [onSongOpen])

  // Country territory disks.
  const countryDisks = useMemo(() => {
    const groups = new Map<string, Planet[]>()
    for (const p of planets) {
      if (!groups.has(p.country)) groups.set(p.country, [])
      groups.get(p.country)!.push(p)
    }
    const out: Array<{ k: string; cx: number; cz: number; r: number }> = []
    for (const [k, list] of groups) {
      let cx = 0, cz = 0
      for (const p of list) { cx += p.x; cz += p.z }
      cx /= list.length; cz /= list.length
      let r = 0
      for (const p of list) {
        const d = Math.hypot(p.x - cx, p.z - cz) + p.orbitR
        if (d > r) r = d
      }
      out.push({ k, cx, cz, r: r + 16 })
    }
    return out
  }, [planets])

  return (
    <>
      {/* Lighting */}
      <hemisphereLight args={[0xffffff, 0x8898a8, 0.55]} />
      <directionalLight position={[60, 120, 80]} intensity={0.85} castShadow={false} />
      <pointLight position={[-80, 60, -40]} intensity={0.3} color="#ffe0c4" />

      {/* Ground gradient */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshBasicMaterial color="#f6f3ee" />
      </mesh>

      {countryDisks.map((c) => (
        <CountryDisk key={c.k} k={c.k} cx={c.cx} cz={c.cz} r={c.r} />
      ))}

      {planets.map((p) => (
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

      <Bonds planets={planets} moons={moons} dragRef={dragRef} />
      <DragLoop dragRef={dragRef} />
      <DragController
        planets={planets}
        dragRef={dragRef}
        setOrbitEnabled={setOrbitEnabled}
        onArtistClick={onArtistOpen}
      />
      <OrbitControls
        enabled={orbitEnabled}
        enableDamping
        dampingFactor={0.12}
        // Atlas tilt: look down from above; restrict so we can't flip under.
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={40}
        maxDistance={520}
        // Pan in world units instead of screen pixels.
        screenSpacePanning={false}
      />
    </>
  )
}

export function JumapScene({ onSongOpen, onArtistOpen, viewMode, searchQuery }: SceneProps) {
  // Track last pointer at document level so a planet pointerdown handler
  // can know its client coords (R3F's event already gives us this; we
  // just shuttle it through window.__lastPointer for the custom event).
  useEffect(() => {
    function track(ev: PointerEvent) {
      (window as unknown as { __lastPointer: { x: number; y: number; id: number } }).__lastPointer =
        { x: ev.clientX, y: ev.clientY, id: ev.pointerId }
    }
    window.addEventListener('pointerdown', track)
    return () => window.removeEventListener('pointerdown', track)
  }, [])
  return (
    <Canvas
      className="jumap3d-canvas"
      // dpr capped on mobile for fps
      dpr={[1, typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches ? 1.4 : 2]}
      camera={{ position: [0, 180, 200], fov: 35, near: 0.1, far: 2000 }}
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
