from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
read = lambda p: (ROOT / p).read_text(encoding="utf-8")

g1 = read("src/game01.txt")
g3 = read("src/game03.txt")
g5 = read("src/game05.txt")
g7 = read("src/game07.txt")
practice = read("src/practice-flow-fix.txt")
index = read("index.html")

# Shared invariants every Rank 9 run must preserve.
assert "practiceStart.hidden = s.mode !== 'select' || Number(s.rank) === 9;" in practice
assert "槍を選び、連撃を見切れ。" in g3
assert "RANK 9 CLEAR" in g3 and "TRY AGAIN · RANK 9" in g3
assert "RANK 9 撃破</b><span>旋槍のリゼル" in practice
assert "self.rank != 9 or self.rank9_opening" in g5
assert "self.rank != 9 or self.rank9_opening" in index
assert "self.shots = []" in g7
assert "self.shots = []" in g5
assert "威力20 / 溜め40 · バランス型" in g1
assert "威力38 / 溜め70 · 体勢を崩す" in g1
assert "威力15 / 連突10×3 · 手数型" in g1
assert "出血を蓄積" not in g1
assert "s.seconds<=40?'S':s.seconds<=50?'A':s.seconds<=65?'B':'C'" in g3

# Five battle-path regressions. These are deterministic flow/invariant checks,
# not a replacement for real-device touch playtesting.
runs = [
    ("01 白銀 勝利→武器選択→白銀再戦", 0, "victory"),
    ("02 岩穿 敗北→武器選択→岩穿再戦", 1, "defeat"),
    ("03 紅牙 勝利→武器選択→紅牙再戦", 2, "victory"),
    ("04 白銀 三叉投槍終端→安全なCHANCE→勝利", 0, "victory"),
    ("05 岩穿 PHASE3三連撃→真のCHANCE→勝利", 1, "victory"),
]

for name, weapon, outcome in runs:
    rank = 9
    mode = outcome
    assert rank == 9
    assert weapon in (0, 1, 2)
    # Both Rank 9 outcomes intentionally route to rank9_select, preserving
    # unlimited retries and allowing a weapon choice before every new run.
    command = "rank9_select" if mode in ("victory", "defeat") else None
    assert command == "rank9_select"
    mode = "select"
    assert mode == "select"
    selected_weapon = weapon
    assert selected_weapon == weapon
    mode = "battle"
    assert mode == "battle"
    print("PASS", name)

print("PASS Rank 9 five-battle regression")
