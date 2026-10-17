> **Follow-up:** the UUID fix reduced the current audit to **15 high / 0 moderate**. An owner-approved Android-internal-only exception is documented in `APK-BUILD-REPORT.md`. The 23-finding report below is the original foundation audit, retained as historical evidence.

# Dependency audit — unresolved release gate

Final installed mobile graph reports **23 findings: 15 high, 8 moderate, 0 critical**. These are package-chain findings, not 23 independent root advisories. Do not describe this build as a clean security audit. The raw npm audit is preserved in `qa/logs/mobile-audit.json`.

Direct advisory roots found by npm:

- **braces / high**: braces vulnerable to stack-exhaustion denial of service through deeply nested patterns (affected `<=3.0.3`). https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- **node-forge / high**: node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements (affected `<=1.4.0`). https://github.com/advisories/GHSA-86w9-cpqp-85rv
- **uuid / moderate**: uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided (affected `<11.1.1`). https://github.com/advisories/GHSA-w5hq-g745-h8pq

The examined chains include Expo CLI/config/prebuild/Metro tooling; `uuid@7.0.3` is in the `expo-splash-screen → @expo/config-plugins → xcode` chain. The app's authentication uses expo-crypto and server Web Crypto, not node-forge or uuid buffer APIs. This observation does not prove all transitive runtime/build exposure harmless. A secure build pipeline is itself part of release security.

At inspection, npm registry latest versions were braces 3.0.3 and node-forge 1.4.0, both inside the reported affected ranges. npm suggested a major Expo downgrade to 44.0.6, not a compatible verified remediation. No forced downgrade, advisory suppression or untested major override was applied.

Before public release, resolve upstream compatible versions or perform a documented security review and mitigation appropriate to each reachable use. Re-run `npm ci`, `npm audit`, Expo doctor, TypeScript, exports and native device builds after any dependency change. The root website lockfile was preserved, not upgraded as a side effect of the app scaffold.

An unused expo-sharing dependency was removed during review; the final audit count above reflects that smaller dependency graph.
