# Android Size Optimization

Local branch: `optimize/android-size`.

## Findings

- Upstream release CI already builds separate APKs for each CPU architecture.
- Release code minification and resource shrinking are disabled upstream.
- Checked-in mobile assets occupy approximately 768 KiB on disk. This does not
  measure assets contributed by dependencies or their final APK sizes.
- There is no measured comparable APK baseline yet. Size savings are unverified.
- Locally modified preview builds measured 81,270,657 bytes for ARM64 and
  65,262,529 bytes for v7a. Both enabled R8 and resource shrinking; these
  architecture-specific results do not establish savings against upstream.

## ARM64 candidate

The `android-slim` EAS profile inherits the preview release build, targets
`arm64-v8a`, and enables R8 minification and resource shrinking. Its application
ID is `com.roitium.bbplayer.preview`, so it can coexist with the production app.
It retains the existing ProGuard rules and all application features.

Expo OTA updates are disabled in this candidate to prevent upstream JavaScript
updates from introducing references to native code removed by R8. Install local
candidate APKs for subsequent testing. The existing in-app APK update feature
has not been specialized; do not use it to update the local candidate.

Prerequisites: the repository's pinned pnpm version, a compatible Node version,
Java, Android SDK/NDK, and EAS CLI. Use the upstream CI toolchain as a reference.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
```

From `apps/mobile`, build comparable ARM64 release APKs:

```bash
eas build --platform android --profile preview --local --output /tmp/bbplayer-baseline.apk
eas build --platform android --profile android-slim --local --output /tmp/bbplayer-slim.apk
```

Compare APK file sizes and Android Studio APK Analyzer breakdowns for native
libraries, DEX, resources, and assets. Preserve R8 mapping files for crash analysis.
Test cold startup, login, search, background playback, notifications, local
cache, lyrics, theme rendering, audio export, and backup/restore on a device
before treating this configuration as ready for daily use. Resource names
resolved dynamically and reflection/JNI entry points require particular care.

## Pending specialization

The `android-slim-v7a` profile inherits `android-slim` and changes the target
architecture to `armeabi-v7a` for 32-bit ARM devices. Build it separately with
`eas build --platform android --profile android-slim-v7a --local`.
Both candidates require Android 8.0 (API 26) or newer.

Device requirements and feature removals have not been selected. Dependency
removal should follow measured APK analysis and confirmation of the features
to retain.
