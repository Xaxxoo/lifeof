import { Color, MeshStandardMaterial, type IUniform } from "three";

/**
 * Dusk city look: mauve ground and walls, dark slate roads, deep green trees, warm lit windows.
 * Shop colors are pulled toward the palette so every block reads as one scene.
 */
export const CITY = {
  ground: "#866e96",
  sidewalk: "#8d77a0",
  slab: "#7d6890",
  curb: "#b8a2c8",
  road: "#2e2638",
  lane: "#efeaff",
  grass: "#3e5a3c",
  park: "#46663f",
  path: "#9a85ab",
  wall: "#7a6290",
  walls: ["#7a6290", "#86709c", "#6c5886", "#937aa6", "#655278", "#7d6690"],
  leaf: ["#2f5f3c", "#3a6e44", "#2a5236"],
  trunk: "#4a3a3a",
  pathLight: ["#ff9ad5", "#fff1e0"],
};

const SKY_NIGHT = new Color("#1a1028");
const SKY_DUSK = new Color("#583e76");
const SKY_DAY = new Color("#b8a0c8");

/** 0 at midday, 1 from late evening until just before dawn. */
export function nightFactor(daylight: number): number {
  return Math.min(1, Math.max(0, (0.75 - daylight) / 0.5));
}

export function skyColor(night: number): Color {
  return night > 0.5 ? SKY_DUSK.clone().lerp(SKY_NIGHT, (night - 0.5) * 2) : SKY_DAY.clone().lerp(SKY_DUSK, night * 2);
}

/** Pulls a brand color most of the way toward the dusk wall color, keeping a hint of it. */
export function tint(color: string | undefined, amount = 0.55): string {
  return `#${new Color(color ?? CITY.wall).lerp(new Color(CITY.wall), amount).getHexString()}`;
}

/** Shared so one update lights or dims every window in the city. */
export const cityUniforms: { uNight: IUniform<number> } = { uNight: { value: 0 } };

/**
 * Standard material that paints a grid of windows on the walls of a unit box (base at y = 0, scaled
 * into shape by its mesh or instance matrix). A share of windows glow, more of them at night.
 * `base` keeps the ground floor clear for storefronts.
 */
export function buildingMaterial({ color = "#ffffff", base = 0.45 }: { color?: string; base?: number } = {}) {
  const m = new MeshStandardMaterial({ color, roughness: 0.9 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = cityUniforms.uNight;
    shader.uniforms.uBase = { value: base };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vBLocal;
varying vec3 vBScale;
varying vec3 vBNormal;
varying vec2 vBSeed;`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
mat4 bm = modelMatrix;
#ifdef USE_INSTANCING
bm = modelMatrix * instanceMatrix;
#endif
vBScale = vec3(length(bm[0].xyz), length(bm[1].xyz), length(bm[2].xyz));
vBLocal = position * vBScale;
vBNormal = normal;
vBSeed = bm[3].xz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uNight;
uniform float uBase;
varying vec3 vBLocal;
varying vec3 vBScale;
varying vec3 vBNormal;
varying vec2 vBSeed;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  const float CW = 0.62;
  const float CH = 0.72;
  bool xFace = abs(vBNormal.x) > 0.5;
  float side = 1.0 - step(0.5, abs(vBNormal.y));
  float faceW = xFace ? vBScale.z : vBScale.x;
  float along = (xFace ? vBLocal.z : vBLocal.x) + faceW * 0.5;
  float h = vBLocal.y;
  float cols = floor(faceW / CW);
  float u = (along - (faceW - cols * CW) * 0.5) / CW;
  float rows = floor((vBScale.y - uBase - 0.2) / CH);
  float v = (h - uBase) / CH;
  float inside = side * step(0.0, u) * step(u, cols) * step(0.0, v) * step(v, rows);
  vec2 g = fract(vec2(u, v));
  float pane = inside * step(0.22, g.x) * step(g.x, 0.78) * step(0.2, g.y) * step(g.y, 0.8);
  float r = bHash(floor(vec2(u, v)) + vBSeed * 1.37 + vBNormal.xz * 17.0);
  float lit = step(1.0 - mix(0.2, 0.62, uNight), r);
  vec3 glass = mix(vec3(0.5, 0.56, 0.74), vec3(0.1, 0.08, 0.18), uNight);
  vec3 warm = mix(vec3(1.0, 0.76, 0.4), vec3(1.0, 0.92, 0.7), step(0.8, fract(r * 7.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb, glass, pane);
  totalEmissiveRadiance += pane * lit * warm * mix(0.35, 2.6, uNight);
  // Lighter roofs and walls that darken toward the street give the diorama depth.
  float roof = step(0.5, vBNormal.y);
  diffuseColor.rgb *= mix(mix(0.7, 1.0, smoothstep(0.0, 1.8, h)), 1.3, roof);
}`,
      );
  };
  return m;
}
