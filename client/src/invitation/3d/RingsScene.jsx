import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useRef } from "react";

/* ------------------------------------------------------------------
   Dos anillos metálicos entrelazados construidos con geometría nativa
   (Torus + MeshStandardMaterial). Rotan lento, flotan y reaccionan al
   progreso del scroll: se alejan, rotan más y se encogen.
------------------------------------------------------------------ */
function Rings({ scrollProgress }) {
  const group = useRef(null);
  const ringGold = useRef(null);
  const ringSilver = useRef(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const s = scrollProgress?.get() ?? 0;

    if (group.current) {
      group.current.rotation.y = t * 0.22 + s * 1.1;
      group.current.rotation.x = Math.sin(t * 0.12) * 0.14 + s * -0.9;
      group.current.position.y = Math.sin(t * 0.6) * 0.07;
      group.current.position.z = s * -4;
      group.current.scale.setScalar(Math.max(0.2, 1 - s * 0.4));
    }
    // Contra-rotación sutil para que se lean como entrelazados.
    ringGold.current.rotation.z += delta * 0.35;
    ringSilver.current.rotation.z -= delta * 0.22;
  });

  return (
    <group ref={group}>
      {/* Anillo oro */}
      <mesh ref={ringGold} rotation={[0.62, 0, Math.PI / 2.8]}>
        <torusGeometry args={[1.08, 0.06, 48, 128]} />
        <meshStandardMaterial
          color="#c9a35c"
          metalness={1}
          roughness={0.16}
          envMapIntensity={1.25}
        />
      </mesh>

      {/* Anillo plata/platino, entrelazado */}
      <mesh ref={ringSilver} rotation={[-0.62, 0, -Math.PI / 2.8]}>
        <torusGeometry args={[1.08, 0.052, 48, 128]} />
        <meshStandardMaterial
          color="#e9e7e0"
          metalness={1}
          roughness={0.14}
          envMapIntensity={1.35}
        />
      </mesh>

      {/* Polvo dorado muy sutil (instanciado, barato) */}
      <Sparkles
        count={36}
        scale={[4.5, 3, 2.5]}
        size={1.7}
        speed={0.35}
        opacity={0.5}
        color="#d6c49b"
      />
    </group>
  );
}

/* ------------------------------------------------------------------
   Escena: entorno procedural con Lightformers (sin red ni HDR externo),
   luz cálida, dpr limitado a [1,2] y render pausable por frameloop.
------------------------------------------------------------------ */
export default function RingsScene({ paused, scrollProgress }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 38 }}
      dpr={[1, 2]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#fff3da" />

      <Suspense fallback={null}>
        <Rings scrollProgress={scrollProgress} />
        <Environment resolution={128} frames={1}>
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
            intensity={2}
            position={[5, -1, 3]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[6, 2, 1]}
            color="#ffffff"
          />
        </Environment>
      </Suspense>
    </Canvas>
  );
}