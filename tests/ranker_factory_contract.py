import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
canonical = json.loads((ROOT / "config/lancers-tuning.json").read_text(encoding="utf-8"))
mirror = json.loads((ROOT / "config/ranker-factory.json").read_text(encoding="utf-8"))
html = (ROOT / "dev-editor/factory.html").read_text(encoding="utf-8")
editor = (ROOT / "dev-editor/index.html").read_text(encoding="utf-8")

assert canonical["schema"] == "lancers-tuning/v1"
assert canonical["authority"] == "canonical"
assert canonical["ui"]["stick"] == {"x": 18, "y": 8, "w": 112, "h": 112}
assert canonical["sound"]["volume"] == 0.1

factory = canonical["rankerFactory"]
assert factory == mirror, "ranker-factory.json must mirror canonical rankerFactory until migration is complete"
assert factory["schema"] == "ranker-factory/v1"
assert factory["runtimeMode"] == "legacy-mapped"

expected = {
    "10": {"id": "hectoran", "name": "城壁のヘクトラン", "hp": 600, "behavior": "heavy-punish", "chance": 0.82, "clear": {"s": 40, "a": 50, "b": 65}},
    "9": {"id": "lizel", "name": "旋槍のリゼル", "hp": 520, "behavior": "orbit-chain", "chance": 1.15, "clear": {"s": 72, "a": 82, "b": 97}},
}
for rank, e in expected.items():
    r = factory["rankers"][rank]
    assert r["rank"] == int(rank)
    assert r["id"] == e["id"]
    assert r["displayName"] == e["name"]
    assert r["runtime"] == "legacy"
    assert r["hp"] == e["hp"]
    assert r["behavior"] == e["behavior"]
    assert r["chance"] == e["chance"]
    assert r["clearRank"] == e["clear"]
    assert r["distance"]["near"] < r["distance"]["far"]
    assert len(r["chain"]) == 3 and all(x >= 1 for x in r["chain"])
    assert r["techniques"]
    for tech in r["techniques"]:
        assert tech[0] in factory["actionBlocks"]
        assert tech[1]
        assert all(x > 0 for x in tech[2:])

for block in ("thrust", "rush", "sweep", "projectile", "orbit", "combo"):
    assert block in factory["actionBlocks"]

# Authoring contract: canonical-first loading, all requested fields, cloning,
# validation, deterministic five-battle model, and explicit non-real-play disclosure.
for token in (
    '../config/lancers-tuning.json',
    'c.rankerFactory',
    'id="rank"',
    'id="name"',
    'id="hp"',
    'id="behavior"',
    'id="near"',
    'id="far"',
    'id="c1"',
    'id="c2"',
    'id="c3"',
    'id="chance"',
    'id="s"',
    'id="a"',
    'id="b"',
    'id="techs"',
    'id="clone"',
    'function validate(',
    'function simulate(',
    'variance=[.96,1.04,1,.92,1.08]',
    '実機AIプレイではありません',
):
    assert token in html, token

assert 'href="./factory.html"' in editor
print("PASS Ranker Factory canonical + authoring contract")
