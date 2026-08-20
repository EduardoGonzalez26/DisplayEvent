import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";

/* ------------------------------------------------------------------
   Perlas de madreperla en planos de profundidad + orbes de luz dorada.
   Reaccionan al ratón (parallax por capa) y al scroll (se alejan),
   y al abrir la invitación flotan desde el fondo hacia el frente.
------------------------------------------------------------------ */
const PEARLS = [
  // Capa trasera (plano profundo)
  { pos: [-2.6, 1.3, -2.4], scale: 0.34, speed: 0.5, phase: 0, spin: 0.05, color: "#fff8ec", layer: 0 },
  { pos: [2.4, -0.6, -2.2], scale: 0.42, speed: 0.7, phase: 1.2, spin: -0.04, color: "#f9edda", layer: 0 },
  { pos: [0.2, 2.4, -2.6], scale: 0.3, speed: 0.6, phase: 2.1, spin: 0.06, color: "#f6dce6", layer: 0 },
  { pos: [-1.6, -2.2, -2], scale: 0.26, speed: 0.9, phase: 3, spin: 0.03, color: "#f3e2cd", layer: 0 },
  { pos: [1.9, 2.1, -2.5], scale: 0.24, speed: 0.8, phase: 4, spin: -0.05, color: "#fff2dc", layer: 0 },
  { pos: [-0.7, 3.4, -2.8], scale: 0.22, speed: 0.55, phase: 5, spin: 0.04, color: "#efe4f2", layer: 0 },
  // Capa media
  { pos: [-1.1, -1.2, -1.3], scale: 0.3, speed: 0.6, phase: 0.6, spin: 0.05, color: "#fff8ec", layer: 1 },
  { pos: [1.2, 1.1, -1.4], scale: 0.36, speed: 0.8, phase: 1.8, spin: -0.05, color: "#f9e6c8", layer: 1 },
  { pos: [-2.3, 2.2, -1.6], scale: 0.28, speed: 0.7, phase: 2.6, spin: 0.06, color: "#f6dce6", layer: 1 },
  { pos: [2.6, -1.8, -1.2], scale: 0.32, speed: 0.5, phase: 3.6, spin: 0.04, color: "#fff2dc", layer: 1 },
  { pos: [0.4, -2.6, -1.7], scale: 0.24, speed: 0.9, phase: 4.4, spin: -0.03, color: "#f3e2cd", layer: 1 },
  // Capa frontal
  { pos: [-2.9, -0.3, -0.8], scale: 0.4, speed: 0.6, phase: 0.9, spin: 0.05, color: "#fff8ec", layer: 2 },
  { pos: [2.9, 0.9, -0.7], scale: 0.38, speed: 0.75, phase: 2.4, spin: -0.06, color: "#f6dce6", layer: 2 },
  { pos: [-0.1, -3.0, -0.9], scale: 0.34, speed: 0.5, phase: 3.4, spin: 0.03, color: "#f9e6c8", layer: 2 },
  { pos: [1.5, 2.9, -0.6], scale: 0.28, speed: 0.85, phase: 4.9, spin: 0.06, color: "#fff2dc", layer: 2 },
];

const ORBS = [
  { pos: [-2.2, 1.9, -2.2], scale: 0.16, speed: 0.5, phase: 0.5 },
  { pos: [2.0, -1.6, -1.9], scale: 0.13, speed: 0.7, phase: 1.6 },
  { pos: [0.6, 2.6, -2.4], scale: 0.11, speed: 0.6, phase: 2.7 },
  { pos: [-0.4, -2.4, -1.5], scale: 0.14, speed: 0.8, phase: 3.8 },
  { pos: [3.0, 0.2, -2.6], scale: 0.1, speed: 0.55, phase: 4.6 },
];

function Pearls({ scrollProgress, pointer, active }) {
  const group = useRef(null);
  const layers = [useRef(null), useRef(null), useRef(null)];
  const pearlRefs = useRef([]);
  const orbRefs = useRef([]);
  // Marca el instante en que la invitación "se abre": las perlas emergen
  // desde el fondo hacia el primer plano recién a partir de ese momento.
  const t0Ref = useRef(null);

  useEffect(() => {
    if (!active) t0Ref.current = null;
  }, [active]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (active && t0Ref.current === null) t0Ref.current = t;
    const since = t0Ref.current === null ? 0 : t - t0Ref.current;
    const intro = Math.min(1, since * 0.5);
    const ease = intro * intro * (3 - 2 * intro);
    const s = scrollProgress?.get() ?? 0;

    if (group.current) {
      group.current.position.z = (1 - ease) * 5 + s * -4.2;
      group.current.scale.setScalar(
        Math.max(0.25, (0.45 + 0.55 * ease) * (1 - s * 0.32)),
      );
      group.current.rotation.y = t * 0.06 + s * 0.5;
    }

    // Parallax por plano de profundidad siguiendo al ratón.
    const p = pointer?.current ?? { x: 0, y: 0 };
    layers.forEach((ref, i) => {
      if (!ref.current) return;
      ref.current.position.x = p.x * (0.2 + i * 0.3);
      ref.current.position.y = p.y * (0.16 + i * 0.24);
    });

    PEARLS.forEach((pearl, i) => {
      const m = pearlRefs.current[i];
      if (!m) return;
      m.position.y = pearl.pos[1] + Math.sin(t * pearl.speed + pearl.phase) * 0.14;
      m.position.x = pearl.pos[0] + Math.sin(t * pearl.speed * 0.5 + pearl.phase) * 0.07;
      m.rotation.y += delta * pearl.spin;
    });

    ORBS.forEach((orb, i) => {
      const m = orbRefs.current[i];
      if (!m) return;
      m.position.y = orb.pos[1] + Math.sin(t * orb.speed + orb.phase) * 0.24;
    });
  });

  return (
    <group ref={group}>
      {[0, 1, 2].map((layer) => (
        <group key={layer} ref={layers[layer]}>
          {PEARLS.map((p, i) =>
            p.layer !== layer ? null : (
              <mesh
                key={i}
                ref={(el) => (pearlRefs.current[i] = el)}
                position={p.pos}
                scale={p.scale}
              >
                <sphereGeometry args={[1, 32, 32]} />
                <meshPhysicalMaterial
                  color={p.color}
                  roughness={0.06}
                  metalness={0.05}
                  clearcoat={1}
                  clearcoatRoughness={0.1}
                  iridescence={0.75}
                  iridescenceIOR={1.3}
                  envMapIntensity={1.6}
                />
              </mesh>
            ),
          )}
          {layer === 1 &&
            ORBS.map((o, i) => (
              <mesh
                key={`orb-${i}`}
                ref={(el) => (orbRefs.current[i] = el)}
                position={o.pos}
                scale={o.scale}
              >
                <sphereGeometry args={[1, 24, 24]} />
                <meshStandardMaterial
                  color="#fff1c4"
                  emissive="#ffd27a"
                  emissiveIntensity={2}
                  toneMapped={false}
                />
              </mesh>
            ))}
        </group>
      ))}
      <Sparkles
        count={44}
        scale={[7, 4.5, 3]}
        size={2.2}
        speed={0.35}
        opacity={0.5}
        color="#e8cd94"
      />
    </group>
  );
}

/* ------------------------------------------------------------------
   Escena: entorno procedural con Lightformers, luz cálida y dpr [1,2].
------------------------------------------------------------------ */
export default function XvPearlsScene({ paused, scrollProgress, pointer, active }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 42 }}
      dpr={[1, 2]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} color="#fff3da" />

      <Suspense fallback={null}>
        <Pearls scrollProgress={scrollProgress} pointer={pointer} active={active} />
        <Environment resolution={64} frames={1}>
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 5, -3]}
            scale={[8, 2, 1]}
            color="#fff6e3"
          />
          <Lightformer
            form="rect"
            intensity={2.5}
            position={[-5, 1, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[6, 2, 1]}
            color="#ffe9c4"
          />
          <Lightformer
            form="rect"
            intensity={2.5}
            position={[5, -1, 3]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[6, 2, 1]}
            color="#fff5ec"
          />
        </Environment>
      </Suspense>
    </Canvas>
  );
}