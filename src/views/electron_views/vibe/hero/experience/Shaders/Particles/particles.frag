varying vec3 vPos;
varying vec2 vUv;
uniform float uTime;
uniform float uScroll;

// Gradient / solid slots are baked into color textures, sampled by the same vUv
// as the position FBO. The A logo (slot C) is intentionally NOT baked: its
// green/white split is computed live from vPos in the shader (exactly like the
// first version), which guarantees a clean split with no mixing.
uniform sampler2D uColorA;
uniform sampler2D uColorB;

// Hover glow — brightens particles near the cursor without moving them
// (the push/pull happens separately in simulation.frag on vPos itself).
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform float uGlowRadius;
uniform float uGlowIntensity;

void main()
{
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float strength = 0.05 / distanceToCenter - 0.1;

  vec3 cA = texture2D(uColorA, vUv).rgb;
  vec3 cB = texture2D(uColorB, vUv).rgb;

  // Slot C — logo: clean green slash / white body from the live position.
  vec3 logoGreen = vec3(0.133, 1.0, 0.467);
  vec3 logoWhite = vec3(1.0, 1.0, 1.0);
  vec3 cC = (vPos.x < 0.5 * vPos.y - 0.219) ? logoGreen : logoWhite;

  float range = 1.0 / uTotalModels; // uTotalModels = 2 (3 slots: A, B, C)
  vec3 color;

  if (uScroll < range) {
    color = mix(cA, cB, clamp(uScroll / range, 0.0, 1.0));
  } else {
    color = mix(cB, cC, clamp((uScroll - range) / range, 0.0, 1.0));
  }

  // Glow falls off smoothly from the cursor and fades with uMouseStrength
  // (same pointer-enter/leave easing driving the repulsion effect).
  float distToMouse = length(vPos - uMouse);
  float glow = smoothstep(uGlowRadius, 0.0, distToMouse) * uMouseStrength;

  vec3 glowColor = mix(color, vec3(1.0), glow * 0.55);
  float glowAlpha = strength * length(vPos) * (1.0 + glow * uGlowIntensity);

  gl_FragColor = vec4(glowColor, glowAlpha);
}
