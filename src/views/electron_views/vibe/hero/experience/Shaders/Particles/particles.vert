uniform sampler2D uPositions;//RenderTarget containing the transformed positions
uniform float uSize;
uniform float uPixelRatio;
uniform vec2 uResolution;
uniform float uScroll;
varying vec3 vPos;
varying vec2 vUv;
void main() {

  //the mesh is a nomrliazed square so the uvs = the xy positions of the vertices
  vec3 pos = texture2D( uPositions, position.xy ).xyz;
  //pos now contains a 3D position in space, we can use it as a regular vertex

  float range = 1.0 / uTotalModels;
  float customSize = uSize;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;


  // uTotalModels = 2 (3 slots: A, B, C) — size eases A -> B -> C.
  if (uScroll < range) {
    customSize = mix(6.0, 10.0, uScroll * uTotalModels);
  } else {
    customSize = mix(10.0, 6.0, (uScroll - range) * uTotalModels);
  }

  gl_Position = projectionPosition;
  // uSize is a global multiplier (1.0 == unchanged). Tune it in Page.js
  // via renderMaterial.uniforms.uSize.value.
  gl_PointSize = customSize * (uSize / 8.0) * uResolution.y * 0.0013;
  gl_PointSize *= (1.0 / - viewPosition.z);

  vPos = pos;
  vUv = position.xy;
}
