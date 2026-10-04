# Remote Android Build

## Rebuild workflow (2026-10-04)

The current ARM server owns the source changes and public downloads. The x86
host is used only for Android compilation. Do not install x86 Android SDK
executables on the ARM server. The upstream app version remains `2.7.0`;
the persistent split-workspace update uses Android `versionCode=1228`
(previous phone-landscape update: 1227; initial wide-screen update: 1226).

### Set up the x86 host

1. Use an x86_64 Linux host; confirm with `uname -m`. This build host runs
   Rocky Linux 10.2, so an Ubuntu image is not required.
2. Install `git`, `curl`, `unzip`, `tar`, `xz`, and `zip` with the host package
   manager. Create `/opt/bbplayer/toolchains`, `/opt/bbplayer/android-sdk`,
   and `/opt/bbplayer/source`.
3. Download the Linux x64 Node 26.8.1 archive from
   `https://nodejs.org/dist/v26.8.1/`, verify against its `SHASUMS256.txt`,
   and extract it under `/opt/bbplayer/toolchains`. Put its `bin` on PATH.
   Install pnpm using `npm install -g pnpm@11.25.0`; use pnpm for all project
   dependency operations.
4. Download Microsoft OpenJDK 17 for Linux x64 from Microsoft's official
   distribution, extract it to `/opt/bbplayer/toolchains/jdk17`, and set
   `JAVA_HOME` to that directory. Verify `java -version` reports 17. The
   React Native Gradle plugin requires 17; using the host's default JDK 21
   previously prevented the build.
5. Download Android command-line tools for Linux from
   `https://developer.android.com/studio#command-tools`. Extract so that
   `sdkmanager` resides at `android-sdk/cmdline-tools/latest/bin/sdkmanager`
   (avoid a duplicate nested `cmdline-tools` directory).
6. Set the environment and accept the Android SDK licenses, then install
   the packages below. Gradle itself uses the repository wrapper; a separate
   system Gradle installation is unnecessary.

```bash
export PATH=/opt/bbplayer/toolchains/node-v26.8.1-linux-x64/bin:$PATH
export JAVA_HOME=/opt/bbplayer/toolchains/jdk17
export ANDROID_HOME=/opt/bbplayer/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
sdkmanager --licenses
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' \
  'ndk;27.0.12077973' 'ndk;27.1.12297006' 'cmake;3.22.1'
cd /opt/bbplayer/source/BBPlayer
pnpm install --frozen-lockfile
```

The host already has these tools and dependencies installed. Preserve its
Gradle cache and Android debug keystore to allow incremental builds and
updates over previously installed preview APKs. Do not include credentials
or signing keys in this repository.

### Synchronize and validate

Create a source snapshot on the current server, including uncommitted and
untracked changes. This deliberately excludes ignored dependencies, build
outputs, and `.git`. Upload must finish before extraction starts.

```bash
cd /data/bbplayer/BBPlayer
git ls-files --cached --others --exclude-standard -z | \
  tar --null -T - -czf /tmp/bbplayer-responsive-source.tar.gz
scp /tmp/bbplayer-responsive-source.tar.gz root@60.205.142.63:/opt/bbplayer/
ssh root@60.205.142.63
tar -xzf /opt/bbplayer/bbplayer-responsive-source.tar.gz \
  -C /opt/bbplayer/source/BBPlayer
export PATH=/opt/bbplayer/toolchains/node-v26.8.1-linux-x64/bin:$PATH
cd /opt/bbplayer/source/BBPlayer
pnpm type-check
pnpm lint
pnpm --dir apps/mobile exec jest src/features/player/utils/layout.test.ts \
  --runInBand --watchAll=false
```

Extraction updates existing files; if a future change deletes or renames a
source file, remove the corresponding stale remote file explicitly. Evaluate
check failures before building; previously known failures are listed below.

### Compile both architectures

The versioned script `scripts/build-android-preview.sh` captures the actual
build environment. Run sequentially; concurrent R8/native builds would exceed
the intended memory budget. The existing 8 GiB swap file is not persistent
across reboots; inspect `swapon --show` and activate it if needed.

```bash
swapon --show
# Only if the existing swap file is inactive:
# swapon /opt/bbplayer/build.swap
cd /opt/bbplayer/source/BBPlayer
VERSION_CODE=1228 bash scripts/build-android-preview.sh armeabi-v7a \
  > /opt/bbplayer/build-responsive-v7a.log 2>&1
VERSION_CODE=1228 bash scripts/build-android-preview.sh arm64-v8a \
  > /opt/bbplayer/build-responsive-arm64.log 2>&1
```

The script runs Expo prebuild without requesting `--clean` (Expo may still
regenerate the native directory when it detects a configuration change),
assembles Release with shrinking enabled, verifies the APK signature, and
preserves R8 mappings per architecture. It limits the JVM to four CPUs,
Gradle to two workers and a 4 GiB heap, and Kotlin compilation to in-process.
APKs are preview builds signed with the existing Android debug key, with
application ID `com.roitium.bbplayer.preview`, minimum Android 8.0.

### Publish on the current ARM server

After signature verification, inspect native library entries with `unzip -l`
and manifest metadata with SDK `aapt`. Confirm ABI, versionCode, package ID,
and signing certificate match expectations. Copy the validated files back
to the ARM server; the download domain must not depend on the build host.

```bash
# Run on the current ARM server; transfer to a temporary file first.
scp root@60.205.142.63:/opt/bbplayer/artifacts/bbplayer-2.7.0-responsive-1228-armeabi-v7a.apk \
  /var/www/bbplayer/bbplayer-2.7.0-responsive-1228-armeabi-v7a.apk.part
mv /var/www/bbplayer/bbplayer-2.7.0-responsive-1228-armeabi-v7a.apk.part \
  /var/www/bbplayer/bbplayer-2.7.0-responsive-1228-armeabi-v7a.apk
# Repeat the transfer and rename for arm64-v8a.
cd /var/www/bbplayer
sha256sum *.apk > SHA256SUMS
curl --fail --location \
  https://files.webraa.com/bbplayer-2.7.0-responsive-1228-armeabi-v7a.apk \
  --output /tmp/bbplayer-responsive-v7a-download.apk
sha256sum /tmp/bbplayer-responsive-v7a-download.apk
```

Compare the remote build, local static file and complete HTTPS download
hashes. Adding files does not require reloading Nginx. Keep the old APK links
available for comparison. Real-device startup, playback, rotation, long song
titles and lyrics rendering require separate phone/tablet/car testing.

## Host and paths

- Host: `60.205.142.63`, x86_64, Rocky Linux 10.2, 14 GiB RAM.
- Source: `/opt/bbplayer/source/BBPlayer`, branch `optimize/android-size`.
- Node: `/opt/bbplayer/toolchains/node-v26.8.1-linux-x64`, version 26.8.1.
- pnpm: 11.25.0; frozen-lockfile dependency installation completed.
- JDK 17: `/opt/bbplayer/toolchains/jdk17` (Microsoft OpenJDK 17.0.20.1).
- SDK: `/opt/bbplayer/android-sdk`; SDK/build tools 36, NDK 27.0 and 27.1.
- SDK CMake: 3.22.1; Gradle wrapper: 9.3.1.
- Logs: `/opt/bbplayer/build.log`, `dependencies.log`, `layout-tests.log`.

The React Native Gradle plugin explicitly requires JDK 17, even though Gradle
itself can run on JDK 21. Configure JAVA_HOME to the JDK 17 path above.

## Verified checks

All four responsive player layout tests passed on the x86 host for versionCode
1227. The 2026-10-04 root checks reported only the existing failures below;
no additional diagnostics were reported for the responsive player changes.
Root type-check reports pre-existing missing backend `Env` declarations.
Root lint reports the pre-existing unnecessary assertion in
`apps/mobile/src/app/settings/account.tsx:74`.

## Build state

### Persistent split workspace, versionCode 1228

This preview adds a root-level split workspace for landscape windows with
at least 600dp usable width. The left pane owns navigation and browsing;
the right pane owns a persistent player, using the existing playback state.
Portrait and narrow windows retain a single pane. Native bottom tabs and
the mini-player are hidden in split mode. Opening `/player` in split mode
shows lyrics in the left pane without duplicate playback controls.

Three Jest suites passed (nine tests), including player mount persistence
across left-pane navigation, portrait rotation, minimum pane widths and
keyboard-height changes. Root type-check and lint reported only the known
backend `Env` and account-page assertion failures. No physical-device
rendering has been verified by these tests.

Build command:

```bash
VERSION_CODE=1228 bash scripts/build-android-preview.sh armeabi-v7a \
  > /opt/bbplayer/build-workspace-v7a.log 2>&1
```

Phone acceptance checks: left navigation and playlist/search work while the
right player remains visible; playback buttons do not scroll with content;
long titles do not displace controls; portrait rotation restores normal
navigation; search keyboard leaves core controls usable. Also test an empty
queue, music and podcast playback, lyrics navigation, and queue dialogs.

### Phone-landscape update, versionCode 1227

The 2026-10-04 v7a Release build succeeded in 19m 47s. Its APK is
65,263,765 bytes and contains only `armeabi-v7a`. Manifest package ID,
versionCode 1227 and minimum SDK 26 were verified. APK v2 signature
verification passed; the signing certificate SHA-256 matches the previous
preview: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
The remote build, current server file, and complete HTTPS download all match:
`b1647430ef5fb044f45376dd74950a06574b1c3471c667faf070dd40d34951ea`.

Download:
`https://files.webraa.com/bbplayer-2.7.0-responsive-1227-armeabi-v7a.apk`.
R8 mappings: `/opt/bbplayer/artifacts/mapping-1227-armeabi-v7a`.

The ARM64 Release build also succeeded, in 20m 59s. Its APK is 81,271,893
bytes, contains only `arm64-v8a`, and has the same package ID, versionCode,
minimum SDK and signing certificate as the v7a build. APK signature
verification passed. The remote build, current server file and complete
HTTPS download all match:
`a6475cc3a7705b27b6c02a105008967097346facdc0b989f0b5d65bd334057b8`.

Download:
`https://files.webraa.com/bbplayer-2.7.0-responsive-1227-arm64-v8a.apk`.
R8 mappings: `/opt/bbplayer/artifacts/mapping-1227-arm64-v8a`.
Both new files are stored in `/var/www/bbplayer`; `SHA256SUMS` includes the
new and previous APKs. Application source is recorded in fork commit
`99b4e190` on `wiuid/BBPlayer-car` branch `dev`; README and build records
were edited after the source snapshot and do not affect APK contents.

### Previous wide-screen update, versionCode 1226

The ARM64 preview Release build completed successfully in 49m 24s. The host
temporarily stopped responding during compression and recovered afterward.
The cause was not confirmed from kernel logs. APK signature verification
passed. The APK is 81,270,657 bytes and contains only `arm64-v8a` native code.
Public download SHA-256 matches the build output:
`120bfb387d4aa99a07efb341802d90d6673ce884afdbe040649bdd75b3f59204`.

An 8 GiB swap file at `/opt/bbplayer/build.swap` was activated to support later
builds. It is not configured to activate automatically after a reboot.
The revised remote build script is `/opt/bbplayer/build-multiabi.sh` and the
local copy is `/tmp/bbplayer-x86-build.sh`. It limits JVM CPU
count to four, Gradle workers to two, uses a 4 GiB heap, and compiles Kotlin
in-process. The v7a build completed successfully in 25m 29s using these limits.

The v7a APK is 65,262,529 bytes, contains only `armeabi-v7a` native code, and
has the preview application ID `com.roitium.bbplayer.preview`. Its manifest
sets MainActivity orientation to `unspecified`. APK signature verification
passed, and the full public download SHA-256 matches the build output:
`258fb653ac625f2a3b8572fe329bcc3e11d1e6389a665ec71a240f03eb1dc901`.
R8 mapping files were preserved in `/opt/bbplayer/artifacts/mapping-armeabi-v7a`.
Both APKs use the generated Android debug signing key and are test releases.

The script accepts `arm64-v8a` or `armeabi-v7a` as its first argument. Build
sequentially, verify APK signatures and native architectures, preserve R8
mapping files, then copy only validated APKs into the public directory.
These are preview test builds for Android 8.0 or newer; physical device
startup, playback and landscape rendering still need verification.

## Downloads

APKs are stored on the current ARM server in `/var/www/bbplayer` and served
directly by its Nginx. The download service does not proxy requests to the
x86 build host. Nginx config: `/etc/nginx/conf.d/files.webraa.com.conf`.
The domain uses a Let's Encrypt certificate with automatic renewal; HTTP
redirects to HTTPS. Both complete HTTPS downloads were verified:

- `https://files.webraa.com/bbplayer-2.7.0-widescreen-arm64-v8a.apk`
- `https://files.webraa.com/bbplayer-2.7.0-widescreen-armeabi-v7a.apk`
- Checksums: `https://files.webraa.com/SHA256SUMS`

The requested download domain is `files.webraa.com`.
