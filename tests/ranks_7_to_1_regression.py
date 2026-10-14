"""Rank 7-1: programmer (state transitions) and motion (telegraph) contract."""
import ast
import math
from pathlib import Path
from types import SimpleNamespace, MethodType

ROOT = Path(__file__).resolve().parents[1]
source4 = (ROOT / "src/game04.txt").read_text()
source6 = (ROOT / "src/game06.txt").read_text()
source7 = (ROOT / "src/game07.txt").read_text()
source3 = (ROOT / "src/game03.txt").read_text()
source1 = (ROOT / "src/game01.txt").read_text()
ns = {"math": math, "DT": 1/60, "CX": 96, "CY": 130, "R": 85,
      "unit": lambda x, y: (x / (math.hypot(x, y) or 1), y / (math.hypot(x, y) or 1)),
      "segment_hit": lambda px, py, ax, ay, bx, by, radius:
          (lambda t: math.hypot(px-(ax+(bx-ax)*t), py-(ay+(by-ay)*t)) <= radius)
          (max(0, min(1, ((px-ax)*(bx-ax)+(py-ay)*(by-ay)) /
          (((bx-ax)**2+(by-ay)**2) or 1))))}
runtime = ast.parse("\n".join((ROOT / f"src/game0{i}.txt").read_text() for i in range(1, 8)))
selected = [n for n in runtime.body if isinstance(n, ast.Assign) and
            any(isinstance(t, ast.Name) and t.id in ("RANK_NEW", "RANK_NEW_DAMAGE") for t in n.targets)]
assert len(selected) == 2
exec(compile(ast.Module(body=selected, type_ignores=[]), "<boss-data>", "exec"), ns)
roster = ns["RANK_NEW"]
assert set(roster) == set(range(1, 8))
assert len({roster[r]["name"] for r in roster}) == 7
assert len({roster[r]["style"] for r in roster}) == 7
assert all(roster[r]["hp"] > 0 for r in roster)

app = next(n for n in runtime.body if isinstance(n, ast.ClassDef) and n.name == "App")
method_names = ("new_boss_hit", "new_boss_update", "new_boss_telegraph", "draw_new_boss")
methods = {n.name: n for n in app.body if isinstance(n, ast.FunctionDef) and n.name in method_names}
assert set(methods) == set(method_names)
exec(compile(ast.Module(body=list(methods.values()), type_ignores=[]), "<boss-methods>", "exec"), ns)

for rank in range(1, 8):
    o = SimpleNamespace(rank=rank, px=125.0, py=135.0, bx=96.0, by=105.0,
        ba=0.0, new_aim=0.0, new_origin=(96.,105.), new_attack_index=0,
        new_prep_stage=0, new_fake=False, new_attack_total=.3, state="idle",
        timer=.01, phase=1, hit=False, frame=0, tech="lane", prep_total=.8,
        notice="", flash=0)
    o.clamp = lambda *args: None
    o.sound = lambda *args: None
    o.hurt = lambda damage: True
    for name in method_names:
        setattr(o, name, MethodType(ns[name], o))
    states = set()
    for frame in range(210):
        o.frame = frame
        o.new_boss_update()
        states.add(o.state)
    assert {"prep", "attack", "recover"}.issubset(states), (rank, states)
    assert o.new_attack_index >= 1, rank
    assert o.notice, rank
    
# Six distinct AI functions must be executed, not just declared.
unique_methods = ("_unique_begin", "_unique_strike", "_unique_damage",
    "_unique_follow", "rank6_wall_hunt", "rank5_mirror_trial",
    "rank4_guard_duel", "rank3_inner_range", "rank2_oracle_lock",
    "rank1_master_trial")
unique_nodes = [n for n in app.body if isinstance(n, ast.FunctionDef)
                and n.name in unique_methods]
assert len(unique_nodes) == len(unique_methods)
exec(compile(ast.Module(body=unique_nodes, type_ignores=[]),
             "<distinct-bosses>", "exec"), ns)
assert "self.rank6_wall_hunt" in source6 and "self.rank1_master_trial" in source6
assert "if self.rank == 7:" in source6
assert "self.rank == 4 and self.state in ('idle','prep')" in (ROOT/"src/game05.txt").read_text()
assert "mirror_decoy" in (ROOT/"src/game05.txt").read_text()

unique_names = {6:"rank6_wall_hunt", 5:"rank5_mirror_trial",
                4:"rank4_guard_duel", 3:"rank3_inner_range",
                2:"rank2_oracle_lock", 1:"rank1_master_trial"}
for rank, method in unique_names.items():
    for seed in range(5):
        o = SimpleNamespace(rank=rank, px=120.+seed, py=139., bx=96., by=100.,
            ba=0., new_aim=0., new_origin=(96.,100.), new_attack_index=0,
            new_prep_stage=0, new_fake=False, new_stance="wall",
            new_attack_total=.3, state="idle", timer=.01,
            phase=1, hit=False, frame=0, tech="lane", prep_total=.8,
            notice="", flash=0)
        o.clamp = lambda *args: None
        o.sound = lambda *args: None
        o.hurt = lambda damage: True
        o.new_boss_hit = lambda: False
        for name in unique_methods:
            setattr(o, name, MethodType(ns[name], o))
        states, techniques, notices = set(), set(), set()
        for frame in range(450):
            o.frame = frame
            getattr(o, method)()
            states.add(o.state)
            techniques.add(o.tech)
            notices.add(o.notice)
        assert "prep" in states and "attack" in states, (rank,seed,states)
        assert o.new_attack_index >= 1, (rank,seed)
        assert len(notices) >= 2, (rank,seed)
        if rank == 6:
            assert "recover" in states and any("WALL BREAK" in n for n in notices), (rank,seed,notices)
        if rank == 5:
            assert "feint" in techniques and any("REAL OPEN" in n for n in notices)
        if rank == 3:
            assert "lane" in techniques
        if rank == 2:
            assert any("LOCK" in n for n in notices)
        if rank == 1:
            assert {"dash","lane","feint"}.issubset(techniques), techniques

# Counterfactual, controlled combat situations.
# A close-range approach suppresses rank 3's projectile.
close = SimpleNamespace(rank=3, px=100.,py=110.,bx=96.,by=100.,
    ba=0.,new_aim=0.,new_origin=(96.,100.),new_attack_index=0,
    new_prep_stage=0,new_fake=False,new_stance="wall",
    new_attack_total=.3,state="prep",timer=.5,phase=1,hit=False,
    frame=0,tech="lane",prep_total=.95,notice="")
close.clamp=lambda *args:None
close.sound=lambda *args:None
close.hurt=lambda *args:True
close.new_boss_hit=lambda:False
for name in unique_methods:
    setattr(close,name,MethodType(ns[name],close))
close.rank3_inner_range()
assert close.state=="recover" and "INNER ZONE" in close.notice

# Rank 2 tracks an early sidestep but not a late one.
oracle = SimpleNamespace(rank=2, px=120.,py=135.,bx=96.,by=100.,
    ba=0.,new_aim=0.,new_origin=(96.,100.),new_attack_index=1,
    new_prep_stage=0,new_fake=False,new_stance="wall",
    new_attack_total=.3,state="prep",timer=.50,phase=1,hit=False,
    frame=0,tech="lane",prep_total=1.1,notice="")
oracle.clamp=lambda *args:None
oracle.sound=lambda *args:None
oracle.hurt=lambda *args:True
oracle.new_boss_hit=lambda:False
for name in unique_methods:
    setattr(oracle,name,MethodType(ns[name],oracle))
oracle.rank2_oracle_lock()
early=oracle.new_aim
oracle.px,oracle.py=70.,130.
oracle.timer=.15
oracle.rank2_oracle_lock()
locked=oracle.new_aim
assert abs(early-locked)<1e-8 and oracle.new_prep_stage==1
print("PASS: 30 independent rank 6-1 state-machine runs and counterfactual checks")
# Rank 7 retains legacy fire-dance; ranks 6-1 use distinct dispatch.
assert "if self.rank in RANK_NEW:" in source6
assert "self.draw_new_boss()" in source7
for rank in range(1, 11):
    assert f'data-select-rank=' in source1 and f'{rank}位' in source1, rank
for rank in range(1, 8):
    assert f"{rank}:['RANK {rank} CHALLENGER'" in source3, rank
# Boot-time source patch must match the actual concatenated Python runtime.
# Previously the HTML loader hardcoded a rank9-only block and rejected
# the newly added rank7-1 selection code before Pyxel could start.
index = (ROOT / "index.html").read_text()
anchor = """        if self.mode == 'select':
            self.weapon_index = max(0, min(2, c.get('weapon', self.weapon_index)))"""
runtime_text = "\n".join((ROOT / part).read_text() for part in
    ["src/game01.txt", "src/game02.txt", "src/layout-fix.txt",
     "src/practice-flow-fix.txt", "src/balance-ui-fix.txt",
     "src/rank-timer-fix.txt", "src/game03.txt", "src/game04.txt",
     "src/game05.txt", "src/game06.txt", "src/game07.txt"])
assert anchor in runtime_text, "Boot patch no longer matches runtime"
assert "const selectWeaponAnchor=" in index
assert "const oldSelectCommand=" not in index, "Obsolete rank9-specific boot patch"
assert "5.3.2" in index
# All ten ranks must have both post-battle actions after a win or loss.
# Verify that the result UI is not hidden and routes back through the same picker.
source2 = (ROOT / "src/game02.txt").read_text()
assert 'id=\\\"return-ranks\\\"' in source1
assert "on($('return-ranks'),'click',()=>request('select'))" in source3
assert "const onResult=s.mode==='victory'||s.mode==='defeat'" in source3
assert "$('mode-choice').hidden=s.mode!=='select'&&!onResult" in source3
assert "$('return-ranks').hidden=!onResult" in source3
assert "$('mode-choice').classList.toggle('result',onResult)" in source3
assert "#mode-choice.result" in source2
assert "else if(s.rank<=7)" in source3
assert "bossLabel[1]} 残りHP" in source3
assert "chosen_rank, chosen_weapon = self.rank, self.weapon_index" in source4
assert "self.mode = 'select'" in source4
# Ranks 10/9 still advance on victory; 8 and lower can retry.
assert "mode==='victory'&&current?.rank===10?'rank9_select'" in source3
assert "mode==='victory'&&current?.rank===9?'rank8_select'" in source3
assert "['victory','defeat'].includes(mode))request('retry')" in source3
for rank in range(1, 11):
    assert f'{rank}位' in source1
print("PASS: rank 10-1 victory/defeat navigation, picker return, and retry wiring")
print("PASS: rank 7-1 boss state loops, motion methods, unique concepts, rank 10-1 picker")
