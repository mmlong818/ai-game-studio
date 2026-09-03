// Hand-authored Cocos 4 EffectAsset (glsl3 / WebGL2) — no offline effect-compiler needed.
// Lambert + hemisphere ambient + directional shadow map (legacy forward pipeline).
export function createPaperLitEffect(cc) {
  const { gfx, EffectAsset } = cc;
  const { Type, Format, ShaderStageFlagBit, CullMode } = gfx;

  const UBO_GLOBAL = `
layout(std140) uniform CCGlobal {
  highp   vec4 cc_time;
  mediump vec4 cc_screenSize;
  mediump vec4 cc_nativeSize;
  mediump vec4 cc_probeInfo;
  mediump vec4 cc_debug_view_mode;
};`;
  const UBO_CAMERA = `
layout(std140) uniform CCCamera {
  highp   mat4 cc_matView;
  highp   mat4 cc_matViewInv;
  highp   mat4 cc_matProj;
  highp   mat4 cc_matProjInv;
  highp   mat4 cc_matViewProj;
  highp   mat4 cc_matViewProjInv;
  highp   vec4 cc_cameraPos;
  mediump vec4 cc_surfaceTransform;
  mediump vec4 cc_screenScale;
  mediump vec4 cc_exposure;
  mediump vec4 cc_mainLitDir;
  mediump vec4 cc_mainLitColor;
  mediump vec4 cc_ambientSky;
  mediump vec4 cc_ambientGround;
  mediump vec4 cc_fogColor;
  mediump vec4 cc_fogBase;
  mediump vec4 cc_fogAdd;
  mediump vec4 cc_nearFar;
  mediump vec4 cc_viewPort;
};`;
  const UBO_SHADOW = `
layout(std140) uniform CCShadow {
  highp mat4 cc_matLightView;
  highp mat4 cc_matLightViewProj;
  highp vec4 cc_shadowInvProjDepthInfo;
  highp vec4 cc_shadowProjDepthInfo;
  highp vec4 cc_shadowProjInfo;
  mediump vec4 cc_shadowNFLSInfo;
  mediump vec4 cc_shadowWHPBInfo;
  mediump vec4 cc_shadowLPNNInfo;
  lowp vec4 cc_shadowColor;
  mediump vec4 cc_planarNDInfo;
};`;
  const UBO_LOCAL = `
layout(std140) uniform CCLocal {
  highp mat4 cc_matWorld;
  highp mat4 cc_matWorldIT;
  highp vec4 cc_lightingMapUVParam;
  highp vec4 cc_localShadowBias;
  highp vec4 cc_reflectionProbeData1;
  highp vec4 cc_reflectionProbeData2;
  highp vec4 cc_reflectionProbeBlendData1;
  highp vec4 cc_reflectionProbeBlendData2;
};`;
  const UBO_MATERIAL = `
layout(std140) uniform Constants {
  vec4 mainColor;
  vec4 paperParams; // x: rim strength, y: edge darkening, z: shadow strength, w: depth far (alpha encodes linear depth / w)
};`;

  const litVert = `
precision highp float;
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec4 a_color;
${UBO_GLOBAL}
${UBO_CAMERA}
${UBO_SHADOW}
${UBO_LOCAL}
out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;
out vec4 v_color;
out vec4 v_shadowPos;
void main () {
  vec4 worldPos = cc_matWorld * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = normalize((cc_matWorldIT * vec4(a_normal, 0.0)).xyz);
  v_uv = a_texCoord;
  v_color = a_color;
  v_shadowPos = cc_matLightViewProj * worldPos;
  gl_Position = cc_matProj * (cc_matView * worldPos);
}`;

  const litFrag = `
precision highp float;
${UBO_GLOBAL}
${UBO_CAMERA}
${UBO_SHADOW}
${UBO_MATERIAL}
#if CC_RECEIVE_SHADOW
uniform highp sampler2D cc_shadowMap;
#endif
in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;
in vec4 v_color;
in vec4 v_shadowPos;
layout(location = 0) out vec4 fragColor;

float unpackRGBAToDepth (vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }

float sampleShadow (vec2 uv, float z, float bias) {
#if CC_RECEIVE_SHADOW
  #if CC_SHADOWMAP_FORMAT == 1
    float d = unpackRGBAToDepth(texture(cc_shadowMap, uv));
  #else
    float d = texture(cc_shadowMap, uv).x;
  #endif
  return (z - bias > d) ? 0.0 : 1.0;
#else
  return 1.0;
#endif
}

float shadowFactor (vec3 N) {
#if CC_RECEIVE_SHADOW
  vec3 ndc = v_shadowPos.xyz / v_shadowPos.w;
  ndc = ndc * 0.5 + 0.5;
  if (cc_cameraPos.w == 1.0) ndc.y = 1.0 - ndc.y; // engine's CC_HANDLE_NDC_SAMPLE_FLIP semantics (combined sign code == 1)
  if (ndc.x < 0.0 || ndc.x > 1.0 || ndc.y < 0.0 || ndc.y > 1.0 || ndc.z > 1.0) return 1.0;
  float NLs = max(dot(N, -cc_mainLitDir.xyz), 0.0);
  float bias = 0.0025 + 0.012 * sqrt(1.0 - NLs * NLs);
  vec2 texel = 1.0 / max(cc_shadowWHPBInfo.xy, vec2(1.0));
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    s += sampleShadow(ndc.xy + vec2(float(x), float(y)) * texel, ndc.z, bias);
  }
  s /= 9.0;
  return mix(s, 1.0, cc_shadowNFLSInfo.w);
#else
  return 1.0;
#endif
}

vec3 linearToSRGB (vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }

void main () {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(-cc_mainLitDir.xyz);
  float NL = max(dot(N, L), 0.0);
  vec3 albedo = mainColor.rgb * v_color.rgb;
  float shadow = shadowFactor(N);
  shadow = mix(1.0, shadow, paperParams.z);
  vec3 lit = cc_mainLitColor.rgb * cc_mainLitColor.w * NL * shadow;
  float hemi = N.y * 0.5 + 0.5;
  vec3 ambient = mix(cc_ambientGround.rgb, cc_ambientSky.rgb, hemi) * cc_ambientSky.w;
  vec3 V = normalize(cc_cameraPos.xyz - v_worldPos);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * paperParams.x;
  vec3 color = albedo * (lit + ambient) + rim * albedo;
#if CC_USE_HDR
  color *= cc_exposure.x;
#endif
  if (paperParams.y > 5.0) {
    vec3 ndc = v_shadowPos.xyz / v_shadowPos.w; ndc = ndc * 0.5 + 0.5;
    if (paperParams.y > 8.0) {
      #if CC_RECEIVE_SHADOW
      color = vec3(texture(cc_shadowMap, ndc.xy).x, ndc.z, cc_cameraPos.w * 0.3);
      #endif
    } else { color = vec3(ndc.xy, 0.0); }
  }
  float viewDepth = -(cc_matView * vec4(v_worldPos, 1.0)).z;
  fragColor = vec4(linearToSRGB(color), clamp(viewDepth / paperParams.w, 0.0, 1.0));
}`;

  const casterVert = `
precision highp float;
in vec3 a_position;
${UBO_SHADOW}
${UBO_LOCAL}
out highp vec2 v_clip_depth;
void main () {
  vec4 worldPos = cc_matWorld * vec4(a_position, 1.0);
  vec4 clipPos = cc_matLightViewProj * worldPos;
  v_clip_depth = clipPos.zw;
  gl_Position = clipPos;
}`;

  const casterFrag = `
precision highp float;
in highp vec2 v_clip_depth;
layout(location = 0) out vec4 fragColorX;
vec4 packDepthToRGBA (float depth) {
  vec4 ret = vec4(1.0, 255.0, 65025.0, 16581375.0) * depth;
  ret = fract(ret);
  ret -= vec4(ret.yzw, 0.0) / 255.0;
  return ret;
}
void main () {
  highp float clipDepth = v_clip_depth.x / v_clip_depth.y * 0.5 + 0.5;
#if CC_SHADOWMAP_FORMAT == 1
  fragColorX = packDepthToRGBA(clipDepth);
#else
  fragColorX = vec4(clipDepth, 1.0, 1.0, 1.0);
#endif
}`;

  const ALL = ShaderStageFlagBit.ALL;
  const attr = (name, format, location) => ({ name, format, isNormalized: false, stream: 0, isInstanced: false, location, defines: [] });
  const emptyBuiltin = () => ({ buffers: [], blocks: [], samplerTextures: [], images: [] });

  const materialBlock = {
    binding: 0,
    name: 'Constants',
    stageFlags: ALL,
    members: [
      { name: 'mainColor', type: Type.FLOAT4, count: 1 },
      { name: 'paperParams', type: Type.FLOAT4, count: 1 },
    ],
  };

  const litShader = {
    name: 'paper-lit|lit-vs|lit-fs',
    hash: 0x70617031,
    glsl4: { vert: litVert, frag: litFrag },
    glsl3: { vert: litVert, frag: litFrag },
    glsl1: { vert: litVert, frag: litFrag },
    builtins: {
      globals: {
        buffers: [], images: [],
        blocks: [{ name: 'CCGlobal', defines: [] }, { name: 'CCCamera', defines: [] }, { name: 'CCShadow', defines: [] }],
        samplerTextures: [{ name: 'cc_shadowMap', defines: ['CC_RECEIVE_SHADOW'] }],
      },
      locals: { buffers: [], images: [], samplerTextures: [], blocks: [{ name: 'CCLocal', defines: [] }] },
      statistics: { CC_EFFECT_USED_VERTEX_UNIFORM_VECTORS: 96, CC_EFFECT_USED_FRAGMENT_UNIFORM_VECTORS: 96 },
    },
    defines: [
      { name: 'CC_RECEIVE_SHADOW', type: 'boolean' },
      { name: 'CC_USE_HDR', type: 'boolean' },
      { name: 'CC_SHADOWMAP_FORMAT', type: 'number', range: [0, 1] },
    ],
    attributes: [
      attr('a_position', Format.RGB32F, 0),
      attr('a_normal', Format.RGB32F, 1),
      attr('a_texCoord', Format.RG32F, 2),
      attr('a_color', Format.RGBA32F, 3),
    ],
    blocks: [materialBlock],
    samplerTextures: [], samplers: [], textures: [], buffers: [], images: [], subpassInputs: [],
    descriptors: [],
  };

  const casterShader = {
    name: 'paper-lit|caster-vs|caster-fs',
    hash: 0x70617032,
    glsl4: { vert: casterVert, frag: casterFrag },
    glsl3: { vert: casterVert, frag: casterFrag },
    glsl1: { vert: casterVert, frag: casterFrag },
    builtins: {
      globals: { buffers: [], images: [], samplerTextures: [], blocks: [{ name: 'CCShadow', defines: [] }] },
      locals: { buffers: [], images: [], samplerTextures: [], blocks: [{ name: 'CCLocal', defines: [] }] },
      statistics: { CC_EFFECT_USED_VERTEX_UNIFORM_VECTORS: 64, CC_EFFECT_USED_FRAGMENT_UNIFORM_VECTORS: 16 },
    },
    defines: [
      { name: 'CC_SHADOWMAP_FORMAT', type: 'number', range: [0, 1] },
    ],
    attributes: [attr('a_position', Format.RGB32F, 0)],
    blocks: [materialBlock],
    samplerTextures: [], samplers: [], textures: [], buffers: [], images: [], subpassInputs: [],
    descriptors: [],
  };

  const properties = {
    mainColor: { type: Type.FLOAT4, value: [1, 1, 1, 1] },
    paperParams: { type: Type.FLOAT4, value: [0.15, 0.2, 1, 60] },
  };

  const effect = new EffectAsset();
  effect.name = 'paper-lit';
  effect._uuid = 'paper-lit';
  effect.shaders = [litShader, casterShader];
  effect.techniques = [{
    name: 'opaque',
    passes: [
      { program: litShader.name, properties },
      { program: casterShader.name, phase: 'shadow-caster', propertyIndex: 0, rasterizerState: { cullMode: CullMode.FRONT } },
    ],
  }];
  effect.combinations = [];
  effect.onLoaded();
  return effect;
}
