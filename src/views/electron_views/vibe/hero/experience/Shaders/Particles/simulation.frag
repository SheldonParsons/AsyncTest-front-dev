uniform sampler2D uTextureA;//DATA Texture containing original uTextureA
uniform sampler2D uTextureB;
uniform sampler2D uTextureC;
uniform float uTime;
uniform float uScroll;
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uMouseForce;
uniform vec3 uClickPos;
uniform float uClickTime;
uniform float uClickSpeed;
uniform float uClickThickness;
uniform float uClickLife;
uniform float uClickForce;
varying vec2 vUv;

mat3 rotationMatrix3(vec3 axis, float angle)
{
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

// 0 -> 1
float random (in vec2 st) {
  return fract(sin(dot(st.xy,
  vec2(12.9898,78.233)))*
  43758.5453123);
}

float remap(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
  return outputMin + ((outputMax - outputMin) / (inputMax - inputMin)) * (value - inputMin);
}

void main() {

  float range = 1.0 / uTotalModels; // uTotalModels = 2 (3 slots: A, B, C)
  vec3 pos;

  vec3 textureA = rotationMatrix3(vec3(1.0, 0.0, 0.0), sin(uTime) * 0.1) * texture2D( uTextureA, vUv ).xyz;
  vec3 textureB = rotationMatrix3(vec3(0.0, 1.0, 0.0), sin(uTime) * 0.3 + 3.14) * texture2D( uTextureB, vUv ).xyz;
  vec3 textureC = texture2D( uTextureC, vUv ).xyz;

  if (uScroll < range) {
    // A -> B
    float r = random(vUv) * 0.2;
    float t = remap(clamp(uScroll - (r * 0.5), 0.0, range - r), 0.0, range - r, 0.0, 1.0);
    pos = mix(textureA, textureB, t);
  } else {
    // B -> C
    float r = random(vUv) * 0.2;
    float t = remap(clamp(uScroll - (r * 0.5), range, range * 2.0 - r), range, range * 2.0 - r, 0.0, 1.0);
    pos = mix(textureB, textureC, t);
  }

  // Mouse hover repulsion — pushes particles away from the cursor's
  // 3D-projected position (uMouse). uMouseStrength fades 0->1 as the
  // pointer enters/leaves so the effect eases in and out.
  vec3 toParticle = pos - uMouse;
  float mouseDist = length(toParticle);
  float mouseFalloff = smoothstep(uMouseRadius, 0.0, mouseDist);
  vec3 mouseDir = mouseDist > 0.0001 ? toParticle / mouseDist : vec3(0.0, 1.0, 0.0);
  pos += mouseDir * mouseFalloff * uMouseForce * uMouseStrength;

  // Click impact wave — an expanding ring impulse born at the last click
  // position. Fully re-derived from elapsed time every frame (no
  // persistence needed, same as the rest of this shader), so particles
  // snap back naturally once the ring has passed them and fully stop once
  // uClickLife has elapsed.
  float waveElapsed = uTime - uClickTime;
  if (waveElapsed >= 0.0 && waveElapsed < uClickLife) {
    float waveRadius = waveElapsed * uClickSpeed;
    float waveEnvelope = 1.0 - waveElapsed / uClickLife;
    vec3 toClick = pos - uClickPos;
    float clickDist = length(toClick);
    float band = exp(-pow((clickDist - waveRadius) / uClickThickness, 2.0));
    vec3 clickDir = clickDist > 0.0001 ? toClick / clickDist : vec3(0.0, 1.0, 0.0);
    pos += clickDir * band * waveEnvelope * uClickForce;
  }

  gl_FragColor = vec4( pos, 1.0 );
}
