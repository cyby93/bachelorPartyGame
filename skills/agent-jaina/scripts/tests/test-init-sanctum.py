#!/usr/bin/env python3
"""Unit tests for init-sanctum.py"""

import sys
import shutil
import tempfile
from pathlib import Path

# Load init-sanctum module dynamically (filename has a hyphen)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "init_sanctum",
    Path(__file__).parent.parent / "init-sanctum.py"
)
init_sanctum = importlib.util.module_from_spec(spec)
spec.loader.exec_module(init_sanctum)


def test_parse_yaml_config_basic():
    """parse_yaml_config returns key-value pairs from a simple YAML file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write("user_name: Cyby\ncommunication_language: English\n")
        tmp = Path(f.name)
    try:
        result = init_sanctum.parse_yaml_config(tmp)
        assert result["user_name"] == "Cyby"
        assert result["communication_language"] == "English"
    finally:
        tmp.unlink()


def test_parse_yaml_config_missing_file():
    """parse_yaml_config returns empty dict if file does not exist."""
    result = init_sanctum.parse_yaml_config(Path("/nonexistent/config.yaml"))
    assert result == {}


def test_parse_frontmatter_with_code():
    """parse_frontmatter extracts name, code, and description from a capability file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write("---\nname: HUD Forge\ncode: hud-forge\ndescription: Implement HUD elements\n---\n\n# Content\n")
        tmp = Path(f.name)
    try:
        result = init_sanctum.parse_frontmatter(tmp)
        assert result["name"] == "HUD Forge"
        assert result["code"] == "hud-forge"
        assert result["description"] == "Implement HUD elements"
    finally:
        tmp.unlink()


def test_parse_frontmatter_no_frontmatter():
    """parse_frontmatter returns empty dict if no frontmatter present."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write("# Just a heading\nNo frontmatter here.\n")
        tmp = Path(f.name)
    try:
        result = init_sanctum.parse_frontmatter(tmp)
        assert result == {}
    finally:
        tmp.unlink()


def test_substitute_vars():
    """substitute_vars replaces {key} placeholders with values."""
    content = "Hello {user_name}, born on {birth_date}."
    result = init_sanctum.substitute_vars(content, {"user_name": "Cyby", "birth_date": "2026-04-17"})
    assert result == "Hello Cyby, born on 2026-04-17."


def test_substitute_vars_unknown_key():
    """substitute_vars leaves unknown placeholders unchanged."""
    content = "Value: {unknown_key}"
    result = init_sanctum.substitute_vars(content, {"user_name": "Cyby"})
    assert "{unknown_key}" in result


def test_generate_capabilities_md_structure():
    """generate_capabilities_md produces a table with the given capabilities."""
    caps = [
        {"code": "hud-forge", "name": "HUD Forge", "description": "Implement HUD elements", "source": "./references/hud-forge.md"},
        {"code": "state-binding", "name": "State Binding", "description": "Connect game state to UI", "source": "./references/state-binding.md"},
    ]
    result = init_sanctum.generate_capabilities_md(caps)
    assert "| [hud-forge] | HUD Forge |" in result
    assert "| [state-binding] | State Binding |" in result
    assert "## Built-in" in result
    assert "## Learned" not in result


def test_discover_capabilities_finds_code_files():
    """discover_capabilities returns capability metadata from files with code frontmatter."""
    with tempfile.TemporaryDirectory() as tmpdir:
        refs = Path(tmpdir)
        (refs / "hud-forge.md").write_text(
            "---\nname: HUD Forge\ncode: hud-forge\ndescription: Implement HUD elements\n---\n\n# Content\n"
        )
        (refs / "memory-guidance.md").write_text(
            "---\nname: memory-guidance\ndescription: Memory discipline\n---\n\n# Content\n"
        )
        result = init_sanctum.discover_capabilities(refs, "./references")
        assert len(result) == 1
        assert result[0]["code"] == "hud-forge"


def test_discover_capabilities_skips_skill_only_files():
    """discover_capabilities skips files listed in SKILL_ONLY_FILES."""
    with tempfile.TemporaryDirectory() as tmpdir:
        refs = Path(tmpdir)
        (refs / "first-breath.md").write_text(
            "---\nname: first-breath\ncode: FB\ndescription: First breath\n---\n"
        )
        result = init_sanctum.discover_capabilities(refs, "./references")
        assert len(result) == 0


if __name__ == "__main__":
    tests = [
        test_parse_yaml_config_basic,
        test_parse_yaml_config_missing_file,
        test_parse_frontmatter_with_code,
        test_parse_frontmatter_no_frontmatter,
        test_substitute_vars,
        test_substitute_vars_unknown_key,
        test_generate_capabilities_md_structure,
        test_discover_capabilities_finds_code_files,
        test_discover_capabilities_skips_skill_only_files,
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS  {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL  {test.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
