// One shader for every glowing thing in the forest. Ported verbatim from the prototype.
// parts: 0 Kodi's skin, 1 leaf, 2 face, 3 left arm, 4 right arm, 5 eyes,
//        6 trees, 7 grass, 8 falling leaves, 9 fireflies, 10 animals, 11 mushrooms and flowers
export const vertexShader = `
  attribute vec3 scatter; attribute vec3 heart; attribute vec3 intro; attribute vec3 color; attribute float size; attribute float seed; attribute float part;
  uniform float uTime, uScatter, uHeart, uIntro, uPx, uHover, uKodi, uDrift, uFade, uArmL, uArmR, uBlink, uSize, uWind, uPeek; uniform vec3 uMouse;
  varying vec3 vColor; varying float vLight;
  vec2 rot(vec2 v, float a) { return vec2(cos(a) * v.x - sin(a) * v.y, sin(a) * v.x + cos(a) * v.y); }
  void main() {
    vec3 base = position;
    float life = 1.0; // extra light for the living things of the forest
    float hgt = max(0.0, base.y + 1.32);
    if (part > 5.5 && part < 6.5) { // trees sway in the breeze, most at the crown
      float sway = sin(uTime * 0.9 + base.x * 0.3 + base.z * 0.2) * 0.6 + sin(uTime * 1.9 + base.x * 0.8) * 0.25;
      base.x += sway * 0.022 * hgt * hgt * uWind;
      base.z += cos(uTime * 0.7 + base.x * 0.4) * 0.008 * hgt * hgt * uWind;
    }
    if (part > 6.5 && part < 7.5) base.x += sin(uTime * 2.4 + base.x * 0.9 + base.z * 0.7) * 0.7 * hgt * uWind; // grass ripples
    if (part > 7.5 && part < 8.5) { // leaves drift down from the crowns, then fade
      float c = fract(uTime * (0.03 + fract(seed * 1.31) * 0.035) + fract(seed * 0.77));
      base.y = mix(base.y, -1.3, c);
      base.x += sin(uTime * 1.3 + seed) * 0.35 + c * (fract(seed * 2.1) - 0.3) * 2.4 * uWind;
      base.z += cos(uTime * 1.1 + seed * 1.7) * 0.25;
      life = smoothstep(0.0, 0.06, c) * smoothstep(1.0, 0.86, c);
    }
    if (part > 8.5 && part < 9.5) { // fireflies wander, and blink on and off
      base += vec3(sin(uTime * 0.23 + seed) * 1.4, sin(uTime * 0.41 + seed * 2.0) * 0.45, cos(uTime * 0.19 + seed) * 1.2);
      life = 0.1 + 1.9 * pow(max(0.0, sin(uTime * (0.5 + fract(seed * 7.0) * 0.9) + seed * 5.0)), 6.0);
    }
    if (part > 10.5 && part < 11.5) life = 0.8 + 0.35 * sin(uTime * 1.2 + base.x * 2.0 + base.z); // mushrooms breathe
    // Kodi's own little movements: arms swing from the shoulder, eyes blink
    if (part > 2.5 && part < 4.5) {
      float sgn = part < 3.5 ? -1.0 : 1.0;
      vec2 pivot = vec2(0.66 * sgn, -0.3);
      base.xy = pivot + rot(base.xy - pivot, (part < 3.5 ? uArmL : uArmR) * sgn);
    }
    if (part > 4.5 && part < 5.5) base.y = 0.62 + (base.y - 0.62) * uBlink;
    // shy: the two leaves fold down over the eyes, like hands (while a password is typed)
    if (part > 0.5 && part < 1.5 && uPeek > 0.001) {
      float side = base.x >= 0.0 ? 1.0 : -1.0;
      vec2 pivot = vec2(0.04 * side, 1.62);
      vec2 d = base.xy - pivot;
      float reach = clamp(length(d) / 1.25, 0.0, 1.0);
      base.xy = pivot + rot(d, -side * 1.6 * uPeek) + vec2(-side * 0.08, -0.35) * uPeek; // the blades land over the eyes
      base.z += uPeek * (0.15 + 0.8 * reach);
    }
    float k = clamp((uIntro - fract(seed * 0.37) * 0.45) / 0.55, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - k, 3.0);
    float flies = step(0.01, distance(intro, position));
    vec3 home = mix(intro, base, e) + flies * vec3(0.0, sin(e * 3.14159) * (fract(seed * 1.7) - 0.5) * 1.6, sin(e * 3.14159) * 1.2);
    float s = smoothstep(0.0, 1.0, clamp(uScatter * 1.15 - fract(seed) * 0.15, 0.0, 1.0)) * uKodi;
    vec3 p = mix(home, scatter, s);
    p = mix(p, heart, smoothstep(0.0, 1.0, uHeart) * uKodi);
    float drift = mix(uDrift, 0.22, s);
    p += drift * vec3(sin(uTime * 0.5 + seed), cos(uTime * 0.4 + seed * 1.3), sin(uTime * 0.35 + seed * 0.7));
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec3 toMouse = uMouse - wp.xyz;
    float f = exp(-dot(toMouse, toMouse) / 1.2) * uHover * uKodi;
    wp.xyz += toMouse * f * (0.25 + 0.25 * fract(seed * 3.1));
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    vec3 n = normalize(mat3(modelMatrix) * normal + 1e-5);
    float rim = pow(1.0 - abs(n.z), 2.2);
    float skin = (part < 0.5 || (part > 2.5 && part < 4.5)) ? 1.0 : 0.0;
    float shade = mix(1.0, (0.3 + 0.7 * smoothstep(-0.5, 0.6, n.z)) * (0.75 + 0.9 * rim), skin);
    // trees, grass and animals are lit by the moon from the upper right, and glow at their edges like Kodi
    float solid = (part > 5.5 && part < 7.5) || (part > 9.5 && part < 10.5) ? 1.0 : 0.0;
    float moonlit = mix(1.0, (0.4 + 0.85 * smoothstep(-0.2, 0.9, dot(n, normalize(vec3(0.7, 0.6, 0.4))))) * (0.5 + 1.5 * rim), solid);
    float tw = 0.72 + 0.28 * sin(uTime * (1.2 + fract(seed * 5.3) * 2.2) + seed * 7.0);
    vLight = mix(1.0, shade, uKodi * (1.0 - s)) * moonlit * life * tw * (1.0 + 1.6 * f) * uFade;
    // far-off woods would shrink to nothing; they keep some size so the trees still read
    float dist = -mv.z;
    gl_PointSize = size * uPx * uSize * mix(7.5 / dist, 7.5 / pow(dist, 0.6) / 3.7, step(5.5, part)) * (1.0 + 0.8 * f) * mix(1.0, 1.0 + 0.5 * rim, uKodi * skin);
    if (part > 0.5 && part < 1.5) { vLight *= 1.0 + 1.1 * uPeek; gl_PointSize *= 1.0 + 0.45 * uPeek; } // the shy leaves glow
    vColor = color;
  }`;

export const fragmentShader = `
  varying vec3 vColor; varying float vLight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d); a *= a;
    float core = smoothstep(0.16, 0.0, d);
    gl_FragColor = vec4((vColor + core * 0.5) * vLight, a);
  }`;
