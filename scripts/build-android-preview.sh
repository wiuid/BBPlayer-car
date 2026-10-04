#!/usr/bin/env bash
set -euo pipefail

BUILD_ABI=${1:-armeabi-v7a}
case "$BUILD_ABI" in
  arm64-v8a|armeabi-v7a) ;;
  *) echo "Unsupported ABI: $BUILD_ABI" >&2; exit 2 ;;
esac

export PATH=/opt/bbplayer/toolchains/node-v26.8.1-linux-x64/bin:$PATH
export JAVA_HOME=/opt/bbplayer/toolchains/jdk17
export ANDROID_HOME=/opt/bbplayer/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export APP_VARIANT=preview ABI_FILTERS=$BUILD_ABI ANDROID_SLIM=true
export VERSION_CODE=${VERSION_CODE:-1230} CI=1 EXPO_NO_TELEMETRY=1 WITH_ROZENITE=false
export SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_ALLOW_FAILURE=true
export GRADLE_XMX=4g KOTLIN_XMX=1g ORG_GRADLE_WORKERS_MAX=2
export JAVA_TOOL_OPTIONS=-XX:ActiveProcessorCount=4

cd "$(dirname "$0")/.."
pnpm --dir apps/mobile exec expo prebuild --platform android --no-install
cd apps/mobile/android
./gradlew :app:assembleRelease --no-daemon --console=plain \
  -Pkotlin.compiler.execution.strategy=in-process

ARTIFACT_DIR=/opt/bbplayer/artifacts
mkdir -p "$ARTIFACT_DIR"
APK_PATH="$ARTIFACT_DIR/bbplayer-2.7.0-responsive-${VERSION_CODE}-${BUILD_ABI}.apk"
cp app/build/outputs/apk/release/app-release.apk "$APK_PATH"
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose "$APK_PATH"
cp -a app/build/outputs/mapping/release "$ARTIFACT_DIR/mapping-${VERSION_CODE}-${BUILD_ABI}"
sha256sum "$APK_PATH"
