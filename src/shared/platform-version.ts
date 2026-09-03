export const PLATFORM_RELEASE = "1.1" as const;
export const PLATFORM_VERSION = "1.1.0" as const;
export const PROJECT_FORMAT_VERSION = "game-project-v3" as const;

export const PLATFORM_VERSION_INFO = Object.freeze({
  release: PLATFORM_RELEASE,
  version: PLATFORM_VERSION,
  projectFormat: PROJECT_FORMAT_VERSION,
});
