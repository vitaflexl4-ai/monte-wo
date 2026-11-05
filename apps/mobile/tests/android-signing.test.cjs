// Release-signing helper for the generated Android project (scripts/configure-android-signing.cjs).
// The fixture is the signingConfigs/buildTypes section exactly as `expo prebuild` (SDK 57) writes it.
const test = require("node:test");
const assert = require("node:assert/strict");
const { SECRET_VARS, signingMode, applyUploadKeystore } = require("../scripts/configure-android-signing.cjs");

const TEMPLATE = `android {
    namespace 'com.vitaflex.montewovitaflex'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
    packagingOptions {
    }
}
`;

const ALL = {
  ANDROID_KEYSTORE_PATH: "/tmp/fixture-upload-keystore.jks",
  ANDROID_KEYSTORE_PASSWORD: "fixture-store-pass-9f3",
  ANDROID_KEY_ALIAS: "fixture-upload-alias",
  ANDROID_KEY_PASSWORD: "fixture-key-pass-7c1"
};

test("no secrets -> debug keystore mode (template untouched)", () => {
  assert.deepEqual(signingMode({}), { mode: "debug-keystore", present: [] });
  assert.deepEqual(signingMode({ ANDROID_KEYSTORE_PATH: "   " }).mode, "debug-keystore");
});

test("all four secrets -> upload keystore mode; a partial set is refused", () => {
  assert.equal(signingMode(ALL).mode, "upload-keystore");
  for (const name of SECRET_VARS) {
    const partial = { ...ALL };
    delete partial[name];
    assert.throws(() => signingMode(partial), new RegExp(`missing ${name}`));
  }
});

test("upload mode rewires ONLY the release build type and reads every value from the environment", () => {
  const out = applyUploadKeystore(TEMPLATE);
  // release signing config added after the debug one, inside signingConfigs
  const signingConfigs = out.slice(out.indexOf("signingConfigs {"), out.indexOf("buildTypes {"));
  assert.match(signingConfigs, /release \{[\s\S]*storeFile file\(System\.getenv\("ANDROID_KEYSTORE_PATH"\)\)/);
  assert.match(signingConfigs, /storePassword System\.getenv\("ANDROID_KEYSTORE_PASSWORD"\)/);
  assert.match(signingConfigs, /keyAlias System\.getenv\("ANDROID_KEY_ALIAS"\)/);
  assert.match(signingConfigs, /keyPassword System\.getenv\("ANDROID_KEY_PASSWORD"\)/);
  // the debug config and the debug build type are exactly as before
  assert.ok(out.includes("storeFile file('debug.keystore')"));
  const debugType = out.slice(out.indexOf("        debug {\n            signingConfig"), out.indexOf("        release {\n            // Caution"));
  assert.ok(debugType.includes("signingConfig signingConfigs.debug"));
  // the release build type now uses the upload keystore and keeps minify/proguard settings
  const releaseType = out.slice(out.indexOf("        release {\n            // Caution"), out.indexOf("    packagingOptions"));
  assert.ok(releaseType.includes("signingConfig signingConfigs.release"));
  assert.ok(!releaseType.includes("signingConfigs.debug"));
  assert.ok(releaseType.includes("minifyEnabled enableMinifyInReleaseBuilds"));
  // no literal secret values anywhere, and applying twice changes nothing
  for (const value of Object.values(ALL)) assert.ok(!out.includes(value), `literal ${value} leaked into build.gradle`);
  assert.equal(applyUploadKeystore(out), out);
});

test("an unexpected template fails loudly instead of producing a mislabelled build", () => {
  assert.throws(() => applyUploadKeystore("android {\n}\n"), /signingConfigs block not found/);
  assert.throws(() => applyUploadKeystore(TEMPLATE.replace("signingConfig signingConfigs.debug\n            def", "signingConfig signingConfigs.other\n            def")), /does not use signingConfigs.debug/);
});
