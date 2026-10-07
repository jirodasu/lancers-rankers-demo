"""Check first-run UI, safe editing, and inline JavaScript syntax."""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
editor = (root / "dev-editor/index.html").read_text(encoding="utf-8")
factory = (root / "dev-editor/factory.html").read_text(encoding="utf-8")
game = (root / "index.html").read_text(encoding="utf-8")
assert 'href="./factory.html"' in editor
assert 'button.tab[data-tab]' in editor
assert 'id="beginnerGuide"' in editor
assert 'id="retryPreview"' in editor
assert 'id="retryLoadMain"' in factory
assert 'id="importFactory"' in factory
assert 'id="onboarding"' in factory
assert 'localStorage.setItem(STORAGE_KEY' in factory
assert 'r.runtime="draft"' in factory
assert 'const cdnWatch=setTimeout(' in game
for name, html in (("editor", editor), ("factory", factory), ("game", game)):
    scripts = re.findall("<script[^>]*>(.*?)</script>", html, re.S)
    assert scripts
    for script in scripts:
        if script.strip():
            p = subprocess.run(["node", "--check", "-"], input=script, text=True, capture_output=True)
            assert p.returncode == 0, name + ": " + p.stderr
print("PASS beginner UX and JS syntax")
