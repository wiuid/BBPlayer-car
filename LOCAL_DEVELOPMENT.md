# Local Android Development

## Environment cleanup (2026-10-03)

The owner requested removal of the temporary ARM64 development environment.
Metro is stopped. Local toolchains, dependencies, caches and generated Android
files were removed, and the system build-tool installation was undone.
Source changes remain on branch `optimize/android-size`. APK building will
continue on an x86_64 machine. Preview APKs have since been built remotely and
published on this server. See [X86_BUILD.md](X86_BUILD.md) for the x86 toolchain
setup, validation, build commands, and publication workflow.

The sections below are a historical record of the development verification.
Their local paths and manager commands are no longer available after cleanup.

## Previously available on this host

- Node.js 26.8.1 ARM64 is installed in
  `/data/bbplayer/toolchains/node-v26.8.1-linux-arm64`.
  The archive SHA-256 matches the official Node.js checksum.
- pnpm 11.25.0 is available through Corepack with
  `COREPACK_HOME=/tmp/bbplayer-corepack`.
- Workspace dependencies were linked with installation scripts disabled.
  A full dependency installation needs a C++ compiler for development tools
  including `node-pty` and `tree-sitter`; these are not validated here.
- Expo/Metro can compile the Android development JavaScript bundle.
- Android prebuild completed. Generated native files are ignored by Git.
  `MainActivity` uses `android:screenOrientation="unspecified"`.

## Metro

The local manager uses the workspace Node binary, the development application
variant, and headless Expo mode. It leaves file watching enabled, disables
Rozenite, and skips Expo network requests during startup. This does not disable
network access in the mobile application.

```bash
python3 /data/bbplayer/dev-environment/manage.py start
python3 /data/bbplayer/dev-environment/manage.py status
python3 /data/bbplayer/dev-environment/manage.py stop
```

The manager chooses an available port from 8081 through 8090. Its state and logs
are in `/data/bbplayer/dev-environment/metro.json` and `metro.log`. The default
health endpoint is `http://127.0.0.1:8081/status`; it returns
`packager-status:running`. This is a bundler service, not a browser preview of
the application.

The bundler's project root is the monorepo root. A direct Android bundle request
therefore uses `/apps/mobile/index.bundle?platform=android&dev=true&minify=false`.
Compilation was verified with 3,884 modules and HTTP 200.

## Device connection

This application requires an Android development-client APK containing its
custom native modules. Expo Go cannot run it. A production APK is also not a
replacement for that development client.

Build and install the development APK on a compatible Android build machine.
Open the development client and connect to `http://<host-address>:<metro-port>`.
The device must be able to reach this host and port. For USB debugging on a
machine with ADB and access to the device, use `adb reverse tcp:8081 tcp:8081`
and connect to `http://127.0.0.1:8081` instead.

An existing development client built with a portrait-only native manifest must
be rebuilt to verify the new orientation setting. JavaScript reload alone will
not update that manifest.

## Native build limitations

The host is Linux ARM64. Java, Android SDK/NDK and ADB are not installed, and
`./gradlew --version` currently fails because Java is missing. Official Linux
Android NDK host binaries require an x86_64 host; building an ARM64 target APK
does not remove this host requirement. Use an x86_64 Linux build machine or a
supported macOS environment for the native APK build.

The generated wrapper selects Gradle 9.3.1. React Native's version catalog
specifies SDK 36, Build Tools 36.0.0, and NDK 27.1.12297006. Final requirements
must be confirmed by Gradle configuration on the build host. No APK or device
rendering has been verified on this host.

To regenerate the local Android project without installing dependencies:

```bash
python3 /data/bbplayer/dev-environment/manage.py expo prebuild --platform android --no-install
```
