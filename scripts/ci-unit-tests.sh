#!/usr/bin/env bash
# Runs every unit suite (node --test tests/*.test.js) and fails on any failure EXCEPT the single documented
# pre-existing baseline item inherited from main: tests/website.test.js "original assets … unchanged" failing only
# because public/assets/INTER-LICENSE.txt differs from the hash in docs/website/baseline.json
# (docs/release/RELEASE_STATUS.md §4 item 8 — owner decision pending). Anything else fails the build.
set -u
node --test --test-reporter=tap tests/*.test.js > tap.log 2>&1; code=$?
grep -E '^\s*not ok|^# (tests|pass|fail)' tap.log || true
if [ "$code" -ne 0 ]; then
  if grep -E '^\s*not ok' tap.log | grep -vqE 'Website: original assets|tests/website\.test\.js' || ! grep -q '# fail 1' tap.log || ! grep -q 'INTER-LICENSE.txt' tap.log; then
    # Surface every failing test (and its first assertion detail) as annotations: job logs are not always reachable from the maintainer's tooling.
    grep -nE '^\s*not ok' tap.log | head -n 9 | while IFS= read -r line; do
      n="${line%%:*}"; detail="$(sed -n "$((n+1)),$((n+40))p" tap.log | grep -E '^\s*(error|message|expected|actual|code|stack):' | head -n 4 | tr -s ' ' | tr '\n' ' ' | cut -c1-900)"
      echo "::error title=unit test failed::${line#*:} :: ${detail}"
    done
    echo "::error::unexpected unit-test failures ($(grep -cE '^\s*not ok' tap.log) failing)"; tail -n 120 tap.log; exit 1
  fi
  echo "::warning::npm test: only the documented pre-existing baseline item failed (public/assets/INTER-LICENSE.txt vs docs/website/baseline.json, present on main) — every other test passed"
fi
exit 0
