# Queue — delivery tooling defects found while working, recorded not switched to

## 2026-09-25 — Coolify deploy fails at "exporting to image" about one run in three

Measured today on audit-web (app eywy2rjfyittg93wk2j3phco): 3 of 9 deploys failed after a successful `next build`,
during `#16 exporting to image` (exporting layers 153-190 s, then exit 255 at the attestation manifest); the same
commit deployed on the next try each time. Disk was not the cause on the last one (22 GB free, 6 GB RAM available per
the pre-flight). Every build also re-downloads ~470 MB of nix store paths. Cost: one extra 5-minute deploy per failure.
Next step when taken up: read the Docker daemon log on the host around a failed export, and whether the build cache
or attestations can be turned off for this app.

## 2026-09-25 — One pre-flight suite run failed and passed on the rerun

The pre-flight at 08:24:13Z refused commit 70b620e ("the suite does not pass"); the rerun passed, and three later full
runs passed (786/786). The failing test was not recorded because the pre-flight keeps no test log. Suspects:
time-bounded tests under load (lib/audit-store.test.ts waits 20 ms; mapWithConcurrency deadline tests). Next step:
keep the failing test names in the pre-flight output, then fix that test.
