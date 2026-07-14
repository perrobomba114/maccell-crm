from __future__ import annotations

import tomllib
import unittest
from pathlib import Path


class RuntimeDependenciesTest(unittest.TestCase):
    def test_docker_runtime_matches_declared_project_dependencies(self) -> None:
        service_root = Path(__file__).resolve().parents[1]
        project = tomllib.loads((service_root / "pyproject.toml").read_text())
        declared = set(project["project"]["dependencies"])
        runtime = {
            line.strip()
            for line in (service_root / "requirements-runtime.txt").read_text().splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }

        self.assertEqual(runtime, declared)


if __name__ == "__main__":
    unittest.main()
