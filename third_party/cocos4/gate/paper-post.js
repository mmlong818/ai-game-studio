// Hand-authored fullscreen post-process EffectAsset: SSAO contact shadows (depth stored in scene RT alpha) + soft bloom.
export function createPaperPostEffect(cc) {
  const { gfx, EffectAsset } = cc;
  const { Type, Format, ShaderStageFlagBit, SampleType, CullMode } = gfx;

  const vert = `
precision highp float;
in vec3 a_position;
in vec2 a_texCoord;
out vec2 v_uv;
void main () {
  v_uv = a_texCoord;
  gl_Position = vec4(a_position.xy, 0.0, 1.0);
}`;

  const frag = `
precision highp float;
layout(std140) uniform PostParams {
  vec4 texelSize;   // xy: 1/size, z: ao radius (world units), w: ao strength
  vec4 postParams;  // x: bloom threshold, y: bloom strength, z: vignette, w: flip
  vec4 camParams;   // x: near, y: far, z: tan(fovY/2)*aspect, w: tan(fovY/2)
};
uniform sampler2D sceneTex;
uniform highp sampler2D depthTex;
in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

float linearDepth (vec2 uv) {
  float z = texture(depthTex, uv).r * 2.0 - 1.0;
  float n = camParams.x, f = camParams.y;
  return (2.0 * n * f) / (f + n - z * (f - n));
}
vec3 viewPos (vec2 uv) {
  float d = linearDepth(uv);
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc.x * camParams.z * d, ndc.y * camParams.w * d, -d);
}
float hash12 (vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main () {
  vec2 uv = v_uv;
  if (postParams.w > 0.5) uv.y = 1.0 - uv.y;
  vec4 scene = texture(sceneTex, uv);
  // --- SSAO (hemisphere-less horizon sampling in view space, normals from depth derivatives) ---
  vec3 P = viewPos(uv);
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  float radiusPx = texelSize.z / max(-P.z, 0.5) * 0.5 / camParams.w / texelSize.y; // world radius -> pixels
  radiusPx = clamp(radiusPx, 2.0, 48.0);
  float ao = 0.0;
  float rot = hash12(uv * 4096.0) * 6.2831853;
  const int N_S = 12;
  for (int i = 0; i < N_S; i++) {
    float a = rot + 6.2831853 * float(i) / float(N_S);
    float r = radiusPx * (0.2 + 0.8 * fract(float(i) * 0.618034 + 0.31));
    vec2 o = vec2(cos(a), sin(a)) * r * texelSize.xy;
    vec3 S = viewPos(uv + o);
    vec3 v = S - P;
    float dist = length(v);
    float occ = max(dot(N, v / max(dist, 1e-4)) - 0.08, 0.0);
    ao += occ * (1.0 / (1.0 + dist * dist / (texelSize.z * texelSize.z)));
  }
  ao = 1.0 - clamp(ao / float(N_S) * 2.0, 0.0, 1.0) * texelSize.w;
  // --- soft bloom: 9-tap bright pass ---
  vec3 bloom = vec3(0.0);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    vec3 c = texture(sceneTex, uv + vec2(float(x), float(y)) * texelSize.xy * 3.0).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    bloom += c * smoothstep(postParams.x, 1.0, l);
  }
  bloom /= 9.0;
  vec2 vc = uv - 0.5;
  float vig = 1.0 - postParams.z * dot(vc, vc) * 1.6;
  vec3 color = (scene.rgb * ao + bloom * postParams.y) * vig;
  fragColor = vec4(color, 1.0);
}`;

  const attr = (name, format, location) => ({ name, format, isNormalized: false, stream: 0, isInstanced: false, location, defines: [] });
  const shader = {
    name: 'paper-post|post-vs|post-fs',
    hash: 0x70617033,
    glsl4: { vert, frag }, glsl3: { vert, frag }, glsl1: { vert, frag },
    builtins: {
      globals: { buffers: [], images: [], samplerTextures: [], blocks: [] },
      locals: { buffers: [], images: [], samplerTextures: [], blocks: [] },
      statistics: { CC_EFFECT_USED_VERTEX_UNIFORM_VECTORS: 8, CC_EFFECT_USED_FRAGMENT_UNIFORM_VECTORS: 8 },
    },
    defines: [],
    attributes: [attr('a_position', Format.RGB32F, 0), attr('a_texCoord', Format.RG32F, 1)],
    blocks: [{
      binding: 0, name: 'PostParams', stageFlags: ShaderStageFlagBit.FRAGMENT,
      members: [{ name: 'texelSize', type: Type.FLOAT4, count: 1 }, { name: 'postParams', type: Type.FLOAT4, count: 1 }, { name: 'camParams', type: Type.FLOAT4, count: 1 }],
    }],
    samplerTextures: [
      { binding: 1, name: 'sceneTex', type: Type.SAMPLER2D, count: 1, stageFlags: ShaderStageFlagBit.FRAGMENT, sampleType: SampleType.FLOAT },
      { binding: 2, name: 'depthTex', type: Type.SAMPLER2D, count: 1, stageFlags: ShaderStageFlagBit.FRAGMENT, sampleType: SampleType.UNFILTERABLE_FLOAT },
    ],
    samplers: [], textures: [], buffers: [], images: [], subpassInputs: [], descriptors: [],
  };
  const effect = new EffectAsset();
  effect.name = 'paper-post';
  effect._uuid = 'paper-post';
  effect.shaders = [shader];
  effect.techniques = [{
    name: 'post',
    passes: [{
      program: shader.name,
      rasterizerState: { cullMode: CullMode.NONE },
      depthStencilState: { depthTest: false, depthWrite: false },
      properties: {
        texelSize: { type: Type.FLOAT4, value: [1 / 960, 1 / 640, 14, 0.9] },
        postParams: { type: Type.FLOAT4, value: [0.82, 0.35, 0.25, 0] },
        camParams: { type: Type.FLOAT4, value: [0.1, 100, 1, 1] },
        sceneTex: { type: Type.SAMPLER2D, value: 'white', samplerHash: gfx.Sampler.computeHash(new gfx.SamplerInfo()) },
        depthTex: { type: Type.SAMPLER2D, value: 'white', samplerHash: gfx.Sampler.computeHash(new gfx.SamplerInfo(gfx.Filter.POINT, gfx.Filter.POINT, gfx.Filter.NONE)) },
      },
    }],
  }];
  effect.combinations = [];
  effect.onLoaded();
  return effect;
}
