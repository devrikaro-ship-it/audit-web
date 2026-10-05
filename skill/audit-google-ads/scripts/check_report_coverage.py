#!/usr/bin/env python3
import argparse
import subprocess
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the semantic TypeScript report-contract validator.")
    parser.add_argument("--app-root", type=Path, required=True)
    parser.add_argument("--skill-root", type=Path, required=True)
    args = parser.parse_args()
    result = subprocess.run(
        ["node", str(args.skill_root / "scripts/check_report_coverage.mjs"), str(args.app_root), str(args.skill_root)],
        cwd=args.app_root,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
