/**
 * entitySDF.js — the entities, RENDERED rather than drawn.
 *
 * WHY THIS EXISTS
 *
 * Two passes of 2D work went into entityArt.js and the verdict on both was
 * the same: "it still looks like polygons." That verdict was correct, and
 * no amount of further 2D work was going to fix it, because the problem is
 * not the shapes — it is that a canvas fill has no surface normal.
 *
 * Everything that makes a form read as a solid object comes from the normal:
 * diffuse falloff around a curve, a specular lobe that moves as the surface
 * turns, ambient occlusion in the creases, contact shadow where one limb
 * passes another, and rim light where the surface goes tangent to the eye.
 * A gradient can fake exactly one of those from exactly one angle. All five
 * at once is what "solid" means, and you cannot draw it — you have to
 * compute it.
 *
 * So each entity is a signed distance field, raymarched in a fragment
 * shader, lit with the same light the photograph it appears in was lit by.
 * The output is a canvas, cached, and §4.3 bakes it to a PNG at build time
 * so nothing is raymarched while the player is playing.
 *
 * The 2D path in entityArt.js is still there and is still used for the
 * entities that are only ever seen small (crawler, gleaner, the archive
 * plates) and as the fallback if WebGL is unavailable.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* the shader                                                          */
/* ------------------------------------------------------------------ */

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * One shader, four bodies, selected by KIND. Branching on a uniform in a
 * raymarcher is normally a sin, but this runs a handful of times at build
 * time and never again, so clarity wins over speed by a mile.
 */
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform int   uKind;        // 0 tormentor, 1 incursion, 2 anguish, 3 pathogen
uniform vec2  uRes;
uniform vec3  uLightDir;    // toward the light
uniform vec3  uLightCol;
uniform vec3  uFillCol;     // the second light / sky / bounce
uniform float uAmbient;

const float PI = 3.14159265;

/* ---- noise, for surface and for silhouette break-up ---- */
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash13(vec3 p3){
  p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z);
}
float noise3(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i+vec3(0,0,0)), hash13(i+vec3(1,0,0)), f.x),
                 mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x),
                 mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a*noise3(p); p *= 2.03; a *= 0.5; }
  return s;
}

/* ---- primitives ---- */
float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdEllip(vec3 p, vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.0)/k1; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float ra, float rb){
  vec3 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa-ba*h) - mix(ra, rb, h);
}
float sdCone(vec3 p, vec3 a, vec3 b, float ra, float rb){ return sdCapsule(p,a,b,ra,rb); }
float smin(float a, float b, float k){
  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

/* A tapered curve through three points, as a chain of capsules. Cheap and
 * it is what every limb in here is made of. */
float sdArc(vec3 p, vec3 a, vec3 b, vec3 c, float r0, float r1){
  float d = 1e9;
  for (int i = 0; i < 8; i++){
    float t0 = float(i)/8.0, t1 = float(i+1)/8.0;
    vec3 p0 = mix(mix(a,b,t0), mix(b,c,t0), t0);
    vec3 p1 = mix(mix(a,b,t1), mix(b,c,t1), t1);
    d = min(d, sdCapsule(p, p0, p1, mix(r0,r1,t0), mix(r0,r1,t1)));
  }
  return d;
}

/* ================= THE TORMENTOR =================
 * Compact body high up, long leaning neck, small horned head, and eleven
 * boneless legs. The legs are the read: each is a sine-displaced run to the
 * ground with no joint anywhere on it. */
float mapTormentor(vec3 p, out float mat){
  mat = 0.0;
  float d = 1e9;

  // Body: a hanging mass, heavier at the bottom.
  vec3 bp = p - vec3(0.0, 0.10, 0.0);
  float body = sdEllip(bp, vec3(0.235, 0.325, 0.205));
  body += (fbm(p*7.0)-0.5)*0.030;                 // it is not smooth anywhere
  // Ribbing running the wrong way across it.
  body += sin(p.x*46.0)*0.006;
  d = body;

  // Neck, leaning.
  float neck = sdArc(p, vec3(0.0,0.42,0.0), vec3(-0.06,0.78,0.02), vec3(-0.13,1.06,0.03),
                     0.085, 0.062);
  d = smin(d, neck, 0.09);

  // Head, small, tipped down.
  vec3 hp = p - vec3(-0.15, 1.16, 0.03);
  hp.xy = mat2(0.97,-0.24, 0.24,0.97)*hp.xy;
  float head = sdEllip(hp, vec3(0.135, 0.105, 0.115));
  if (head < d) mat = 1.0;                        // the face marking lives here
  d = smin(d, head, 0.04);

  // Horns: a heavy sweeping pair and a smaller inner pair.
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    float h1 = sdArc(p, vec3(-0.15+sg*0.09, 1.24, 0.03),
                        vec3(-0.15+sg*0.46, 1.36, 0.0),
                        vec3(-0.15+sg*0.74, 1.62, -0.02), 0.055, 0.010);
    float h2 = sdArc(p, vec3(-0.15+sg*0.06, 1.22, 0.04),
                        vec3(-0.15+sg*0.20, 1.34, 0.02),
                        vec3(-0.15+sg*0.30, 1.48, 0.0), 0.026, 0.006);
    if (min(h1,h2) < d) mat = 2.0;
    d = min(d, min(h1, h2));
  }

  // Eleven legs. No joints — a travelling wave along a straight run.
  for (int i = 0; i < 11; i++){
    float f = float(i);
    float t = f/10.0;
    float ph = hash11(f*3.7)*6.28;
    float amp = 0.10 + hash11(f*1.9)*0.14;
    float rootX = (t-0.5)*0.34;
    float tipX  = (t-0.5)*2.30 + (hash11(f*5.1)-0.5)*0.18;
    float tipZ  = (hash11(f*7.3)-0.5)*0.70;
    // Sample the leg as a 3-point arc whose middle is pushed by the wave.
    vec3 a = vec3(rootX, -0.22, 0.0);
    vec3 b = vec3(mix(rootX,tipX,0.5) + sin(ph)*amp, -1.05, tipZ*0.5 + cos(ph)*amp*0.6);
    vec3 c = vec3(tipX, -1.95 + hash11(f*2.3)*0.10, tipZ);
    float leg = sdArc(p, a, b, c, 0.055, 0.010);
    d = min(d, leg);
  }
  return d;
}

/* ================= THE INCURSION =================
 * A body in a hallway with one arm reaching across the frame, ending in a
 * hand nearer the lens than the shoulder. The hand is the subject. */
float mapIncursion(vec3 p, out float mat){
  mat = 0.0;
  // Torso: shoulders too high and too level, narrowing to a waist.
  float body = sdCapsule(p, vec3(0.09,-0.30,0.0), vec3(0.06,0.52,0.0), 0.235, 0.245);
  // Shoulders: wider than the chest, and dead level, which no shoulders are.
  body = smin(body, sdEllip(p-vec3(0.06,0.52,0.0), vec3(0.40,0.11,0.20)), 0.10);
  // Hips, and the hem below them.
  body = smin(body, sdEllip(p-vec3(0.11,-0.52,0.0), vec3(0.31,0.24,0.22)), 0.14);
  body = smin(body, sdCapsule(p, vec3(0.12,-0.72,0.0), vec3(0.13,-1.34,0.0),
                              0.29, 0.26), 0.12);
  body += (fbm(p*5.0)-0.5)*0.05;                  // cloth, not skin
  float d = body;

  // Neck and head.
  d = smin(d, sdCapsule(p, vec3(0.06,0.62,0.0), vec3(0.05,0.86,0.02), 0.10, 0.09), 0.06);
  vec3 hp = p - vec3(0.05, 1.06, 0.04);
  float head = sdEllip(hp, vec3(0.20, 0.27, 0.19));
  if (head < d) mat = 1.0;                        // the mask
  d = smin(d, head, 0.03);

  // The far arm, hanging.
  d = smin(d, sdArc(p, vec3(0.36,0.50,0.0), vec3(0.48,0.0,0.05), vec3(0.52,-0.44,0.06),
                    0.085, 0.060), 0.05);

  // THE REACH. Thicker at the wrist than at the shoulder, because the wrist
  // is closer to the lens. Comes forward in Z as well as across in X.
  float arm = sdArc(p, vec3(-0.22,0.52,0.02), vec3(-0.78,0.30,0.34),
                       vec3(-1.16,0.06,0.62), 0.090, 0.130);
  if (arm < d) mat = 2.0;
  d = smin(d, arm, 0.05);

  // The palm.
  vec3 wp = p - vec3(-1.22, 0.02, 0.66);
  float palm = sdEllip(wp, vec3(0.24, 0.20, 0.10));
  if (palm < d) mat = 2.0;
  d = smin(d, palm, 0.05);

  // Five digits: four fingers over about 100 degrees, and a thumb that is
  // set too low on the hand to be one. Three knuckles each.
  for (int i = 0; i < 5; i++){
    float f = float(i);
    float ang = i == 4 ? 0.62 : (-2.34 + f*0.39);
    float len = i == 4 ? 0.34 : (0.42 + sin(f*1.1)*0.12);
    vec3 root = vec3(-1.24, 0.06, 0.68);
    vec3 mid  = root + vec3(cos(ang), -sin(ang), 0.10)*len*0.55;
    vec3 tip  = mid  + vec3(cos(ang+0.30), -sin(ang+0.30), 0.16)*len*0.60;
    float fing = sdArc(p, root, mid, tip, 0.052, 0.012);
    // The claw: a hard point continuing the last direction.
    vec3 clw = tip + vec3(cos(ang+0.55), -sin(ang+0.55), 0.08)*len*0.22;
    float claw = sdCone(p, tip, clw, 0.014, 0.002);
    if (min(fing,claw) < d) mat = claw < fing ? 4.0 : 2.0;
    d = min(d, min(fing, claw));
  }
  return d;
}

/* ================= ANGUISH =================
 * An upper-body specimen plate: broad low skull, short muzzle, horns wider
 * than the body is tall, a ribbed torso, thin arms. */
float mapAnguish(vec3 p, out float mat){
  mat = 0.0;
  // Cranium and muzzle.
  vec3 hp = p - vec3(0.0, 0.86, 0.0);
  float skull = sdEllip(hp, vec3(0.32, 0.30, 0.30));
  vec3 mp = p - vec3(0.0, 0.50, 0.06);
  float muzzle = sdEllip(mp, vec3(0.20, 0.28, 0.22));
  float d = smin(skull, muzzle, 0.10);
  d += (fbm(p*9.0)-0.5)*0.016;

  // Horns. Out, then up. Ridged crosswise.
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    vec3 a = vec3(sg*0.24, 0.98, 0.0);
    vec3 b = vec3(sg*0.96, 0.92, -0.06);
    vec3 c = vec3(sg*1.34, 1.62, -0.10);
    float horn = sdArc(p, a, b, c, 0.150, 0.022);
    horn += sin(length(p.xy)*54.0)*0.004;         // growth rings
    if (horn < d) mat = 2.0;
    d = min(d, horn);
  }

  // Neck and ribbed torso.
  d = smin(d, sdCapsule(p, vec3(0.0,0.40,0.0), vec3(0.0,0.06,0.0), 0.13, 0.22), 0.09);
  vec3 tp = p - vec3(0.0, -0.60, 0.0);
  float torso = sdEllip(tp, vec3(0.44, 0.66, 0.34));
  // The ribbing: raised bands, unevenly spaced.
  torso += sin(p.y*23.0 + sin(p.y*7.0)*1.4)*0.020;
  if (torso < d) mat = 3.0;
  d = smin(d, torso, 0.10);

  // Arms, thin, leaving the frame at the bottom.
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    d = smin(d, sdArc(p, vec3(sg*0.38,-0.18,0.0), vec3(sg*0.72,-0.86,0.06),
                         vec3(sg*0.90,-1.60,0.10), 0.075, 0.032), 0.06);
  }

  /* THE FOUR EYES. Two pairs, the lower smaller and shut, all of them set
   * INTO the skull rather than onto it — a socket carved out, then a ball
   * dropped into the hole, which is the only way an eye reads as an eye
   * and not as a sticker. Nothing about the arrangement is symmetrical
   * enough to be a design or asymmetrical enough to be damage. */
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    d = max(d, -sdEllip(p - vec3(sg*0.135, 0.905, 0.235), vec3(0.105,0.088,0.13)));
    d = max(d, -sdEllip(p - vec3(sg*0.115, 0.705, 0.225), vec3(0.070,0.045,0.11)));
  }
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    // The open pair: a bone-coloured ball with a black slit in it.
    vec3 e = p - vec3(sg*0.135, 0.905, 0.190);
    float ball = sdSphere(e, 0.072);
    if (ball < d) mat = 4.0;
    d = min(d, ball);
    float slit = sdEllip(p - vec3(sg*0.128, 0.905, 0.250), vec3(0.016,0.045,0.05));
    if (slit < d) mat = 5.0;
    d = min(d, slit);
    // The lower pair, shut: a lid with no opening in it.
    float lid = sdEllip(p - vec3(sg*0.115, 0.705, 0.185), vec3(0.062,0.032,0.075));
    if (lid < d) mat = 3.0;
    d = min(d, lid);
  }
  return d;
}

/* ================= THE PATHOGEN =================
 * A face filling the frame, on a neck like a length of pipe, on wide low
 * shoulders. The grin is cut INTO the head as geometry so it has a lip with
 * thickness and teeth that sit inside a mouth. */
float mapPathogen(vec3 p, out float mat){
  mat = 0.0;
  vec3 hp = p - vec3(0.0, 0.34, 0.0);
  float head = sdEllip(hp, vec3(0.62, 0.78, 0.56));
  head += (fbm(p*6.0)-0.5)*0.020;

  // Brow shelf and cheekbones, as additive lumps.
  head = smin(head, sdEllip(p-vec3(0.0,0.62,0.44), vec3(0.44,0.10,0.14)), 0.16);
  head = smin(head, sdEllip(p-vec3(-0.30,0.18,0.40), vec3(0.20,0.16,0.14)), 0.20);
  head = smin(head, sdEllip(p-vec3( 0.30,0.18,0.40), vec3(0.20,0.16,0.14)), 0.20);
  // Nose ridge: raised, with nothing under it.
  head = smin(head, sdCapsule(p, vec3(0.01,0.40,0.50), vec3(-0.02,0.06,0.52), 0.05, 0.07), 0.10);

  float d = head;

  // THE EYES: sockets carved in, with a ball recessed inside each.
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    vec3 e = p - vec3(sg*0.26, 0.40, 0.44);
    d = max(d, -sdEllip(e, vec3(0.19, 0.15, 0.22)));      // the orbit
  }
  for (int s = 0; s < 2; s++){
    float sg = s == 0 ? -1.0 : 1.0;
    vec3 e = p - vec3(sg*0.26, 0.38, 0.34);
    float ball = sdSphere(e, 0.125);
    if (ball < d) mat = 1.0;
    d = min(d, ball);
  }

  // THE GRIN: a wide shallow torus-ish slot cut across the lower face, far
  // wider than the head, so it runs off both sides and has no corners.
  vec3 g = p - vec3(0.0, -0.16, 0.30);
  g.y += g.x*g.x*0.30;                                   // the upward curve
  float slot = sdEllip(g, vec3(1.34, 0.170, 0.46));
  d = max(d, -slot);
  // The teeth: a comb standing inside the slot.
  float comb = slot + 0.125 - abs(sin(p.x*44.0))*0.026;
  if (comb < d && comb > -0.30) mat = 4.0;
  d = min(d, max(comb, sdEllip(g, vec3(1.30, 0.155, 0.32))));

  // Neck: the same width top and bottom, like a pipe.
  float neck = sdCapsule(p, vec3(0.0,-0.62,0.0), vec3(0.0,-1.36,0.0), 0.20, 0.22);
  if (neck < d) mat = 5.0;
  d = smin(d, neck, 0.10);
  // Shoulders, wide and low, cropped by the frame.
  float sh = sdEllip(p-vec3(0.0,-2.05,0.0), vec3(1.45, 0.62, 0.50));
  if (sh < d) mat = 6.0;
  d = smin(d, sh, 0.22);
  return d;
}

float map(vec3 p, out float mat){
  if (uKind == 0) return mapTormentor(p, mat);
  if (uKind == 1) return mapIncursion(p, mat);
  if (uKind == 2) return mapAnguish(p, mat);
  return mapPathogen(p, mat);
}
float mapD(vec3 p){ float m; return map(p, m); }

vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0016, 0.0);
  return normalize(vec3(
    mapD(p+e.xyy)-mapD(p-e.xyy),
    mapD(p+e.yxy)-mapD(p-e.yxy),
    mapD(p+e.yyx)-mapD(p-e.yyx)));
}

/* Ambient occlusion. This is most of what makes the creases read. */
float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for (int i = 0; i < 5; i++){
    float h = 0.012 + 0.12*float(i)/4.0;
    occ += (h - mapD(p + n*h))*sca;
    sca *= 0.72;
  }
  return clamp(1.0 - 2.4*occ, 0.0, 1.0);
}

/* Soft shadow, so one limb passing another actually darkens it. */
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 40; i++){
    float h = mapD(ro + rd*t);
    if (h < 0.001) return 0.0;
    res = min(res, 9.0*h/t);
    t += clamp(h, 0.02, 0.22);
    if (t > 4.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

/* ---- per-entity surface response ---- */
void surface(float kind, float mat, vec3 p, out vec3 alb, out float rough, out float spec){
  if (kind < 0.5){                    // TORMENTOR — black, wet, matte marking
    alb = vec3(0.026, 0.025, 0.024);
    rough = 0.52; spec = 0.34;
    if (mat > 0.5 && mat < 1.5){      // the head: chalk blaze, dry
      float blaze = smoothstep(0.10, 0.02, abs(p.x + 0.15 - (p.y-1.16)*0.30));
      blaze *= smoothstep(1.30, 1.06, p.y);
      alb = mix(alb, vec3(0.62,0.59,0.52), blaze*0.92);
      rough = mix(rough, 0.94, blaze);  // matte where the marking is
      spec = mix(spec, 0.05, blaze);
    }
    if (mat > 1.5) { alb = vec3(0.048,0.042,0.036); rough = 0.44; spec = 0.42; }
  } else if (kind < 1.5){             // INCURSION — dark cloth, pale mask
    alb = vec3(0.045, 0.047, 0.043);
    rough = 0.80; spec = 0.18;
    if (mat > 0.5 && mat < 1.5){      // the mask
      alb = vec3(0.78, 0.75, 0.69); rough = 0.42; spec = 0.65;
    }
    if (mat > 1.5 && mat < 3.0){      // the arm and hand: skin over bone
      alb = vec3(0.30, 0.30, 0.27); rough = 0.62; spec = 0.35;
    }
    if (mat > 3.5) { alb = vec3(0.72,0.69,0.60); rough = 0.30; spec = 0.9; }
  } else if (kind < 2.5){             // ANGUISH — oxblood shell
    alb = vec3(0.150, 0.042, 0.035);
    rough = 0.58; spec = 0.26;
    if (mat > 1.5 && mat < 2.5){ alb = vec3(0.095,0.028,0.023); rough = 0.46; spec = 0.34; }
    if (mat > 2.5 && mat < 3.5) { alb = vec3(0.130,0.037,0.031); rough = 0.62; }
    if (mat > 3.5 && mat < 4.5) { alb = vec3(0.58,0.55,0.47); rough = 0.30; spec = 0.80; }
    if (mat > 4.5) { alb = vec3(0.010,0.008,0.008); rough = 0.20; spec = 0.95; }
    // Mottle: it has been outdoors.
    alb *= 0.80 + fbm(p*11.0)*0.45;
  } else {                            // PATHOGEN — pale, transmitted
    alb = vec3(0.66, 0.66, 0.68);
    rough = 0.55; spec = 0.35;
    if (mat > 0.5 && mat < 1.5){ alb = vec3(0.055,0.055,0.062); rough = 0.16; spec = 0.95; }
    if (mat > 3.5 && mat < 4.5){ alb = vec3(0.80,0.78,0.70); rough = 0.34; spec = 0.7; }
    if (mat > 4.5 && mat < 5.5){ alb = vec3(0.52,0.52,0.55); rough = 0.60; }
    if (mat > 5.5) { alb = vec3(0.020,0.020,0.024); rough = 0.85; spec = 0.1; }
    alb *= 0.90 + fbm(p*8.0)*0.22;
  }
}

void main(){
  vec2 uv = (vUv*2.0 - 1.0);
  uv.x *= uRes.x/uRes.y;

  vec3 ro = vec3(0.0, 0.0, 4.2);
  vec3 rd = normalize(vec3(uv*0.62, -1.0));

  float t = 0.0, mat = 0.0;
  bool hit = false;
  for (int i = 0; i < 128; i++){
    vec3 p = ro + rd*t;
    float d = map(p, mat);
    if (d < 0.0016*t){ hit = true; break; }
    t += d*0.86;
    if (t > 9.0) break;
  }

  if (!hit){ gl_FragColor = vec4(0.0); return; }

  vec3 p = ro + rd*t;
  float m; map(p, m);
  vec3 n = calcNormal(p);
  vec3 v = -rd;

  vec3 alb; float rough, spec;
  surface(float(uKind), m, p, alb, rough, spec);

  vec3 L = normalize(uLightDir);
  float ndl = max(dot(n, L), 0.0);
  float sh  = softShadow(p + n*0.006, L);
  float ao  = calcAO(p, n);

  // Diffuse.
  vec3 col = alb * uLightCol * ndl * sh;
  // Fill, from the opposite side, unshadowed and weak.
  col += alb * uFillCol * max(dot(n, normalize(vec3(-L.x, 0.35, L.z*0.4))), 0.0) * 0.55;
  // Ambient, occluded.
  col += alb * uAmbient * ao;

  // Specular. A real lobe, so it slides across the form as the surface turns.
  vec3 hv = normalize(L + v);
  float g2 = rough*rough;
  float ndh = max(dot(n, hv), 0.0);
  float dd = ndh*ndh*(g2-1.0)+1.0;
  float D = g2/(PI*dd*dd);
  col += uLightCol * D * spec * ndl * sh * 0.26;

  // Rim, where the surface goes tangent to the eye. This is the single
  // strongest cue that a thing is round and it is the one a 2D fill can
  // never produce.
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.6);
  col += uLightCol * rim * 0.20 * mix(0.4, 1.0, sh);

  // Contact darkening at the very edge, so the silhouette is not a cut-out.
  col *= mix(0.72, 1.0, ao);

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------------ */
/* the lighting, per entity, matched to the photograph it appears in    */
/* ------------------------------------------------------------------ */

const SETUP = {
  // Sodium streetlamp, up and to the left, and a very dark night behind.
  tormentor: { kind: 0, w: 620, h: 900,
    light: [-0.62, 0.68, 0.40], lightCol: [1.05, 0.80, 0.46],
    fill: [0.07, 0.09, 0.14], ambient: 0.07 },
  // On-camera flash, dead front, plus the green of a dying fluorescent tube.
  incursion: { kind: 1, w: 760, h: 780,
    light: [-0.18, 0.30, 1.0], lightCol: [1.45, 1.52, 1.36],
    fill: [0.16, 0.30, 0.22], ambient: 0.13 },
  // Two lights at 45 degrees on a specimen sweep. Flat, even, no drama.
  anguish:   { kind: 2, w: 900, h: 760,
    light: [-0.55, 0.55, 0.72], lightCol: [1.25, 1.18, 1.12],
    fill: [0.55, 0.50, 0.48], ambient: 0.26 },
  // A face lit by the display it is coming through: front, cold, flat.
  pathogen:  { kind: 3, w: 760, h: 900,
    light: [-0.28, 0.34, 1.0], lightCol: [1.30, 1.31, 1.36],
    fill: [0.24, 0.25, 0.30], ambient: 0.16 },
};

export const KINDS = Object.keys(SETUP);

/** Where the subject sits inside its own canvas, for the photo layer. */
export const FRAMING = {
  tormentor: { aspect: 620 / 900 },
  incursion: { aspect: 760 / 780 },
  anguish:   { aspect: 900 / 760 },
  pathogen:  { aspect: 760 / 900 },
};

/* ------------------------------------------------------------------ */

let renderer = null;
const cache = new Map();

function getRenderer() {
  if (renderer) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
  } catch { renderer = null; }
  return renderer;
}

/**
 * Render one entity and return a canvas with a transparent background.
 * Returns null if WebGL is not available, and the caller falls back to the
 * 2D path.
 */
export function renderEntity(kind, scale = 1) {
  const key = kind + '@' + scale;
  if (cache.has(key)) return cache.get(key);
  const S = SETUP[kind];
  if (!S) return null;
  const R = getRenderer();
  if (!R) return null;

  const w = Math.round(S.w * scale), h = Math.round(S.h * scale);
  R.setSize(w, h, false);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true,
    uniforms: {
      uKind:     { value: S.kind },
      uRes:      { value: new THREE.Vector2(w, h) },
      uLightDir: { value: new THREE.Vector3(...S.light) },
      uLightCol: { value: new THREE.Vector3(...S.lightCol) },
      uFillCol:  { value: new THREE.Vector3(...S.fill) },
      uAmbient:  { value: S.ambient },
    },
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  const rt = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  R.setRenderTarget(rt);
  R.render(scene, cam);

  const buf = new Uint8Array(w * h * 4);
  R.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  R.setRenderTarget(null);

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  // WebGL reads bottom-up; the canvas is top-down.
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4, dst = y * w * 4;
    img.data.set(buf.subarray(src, src + w * 4), dst);
  }
  g.putImageData(img, 0, 0);

  rt.dispose(); mat.dispose();
  cache.set(key, c);
  return c;
}

export default renderEntity;
