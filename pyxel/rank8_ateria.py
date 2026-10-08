"""RANK 8 Ateria — standalone Pyxel battle prototype.
Run: pip install pyxel && python rank8_ateria.py
This prototype does not modify the canonical RANK 9/10 runtime.
"""
import math
import pyxel

W, H, FPS = 240, 320, 60
HP = 270
TECHNIQUES = (
    ("SHIELD THRUST", .80, .24, 12, "thrust"),
    ("HALF MOON", 1.05, .38, 14, "sweep"),
    ("GUARD STEP", .90, .32, 16, "rush"),
)
def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def in_attack(px, py, bx, by, dx, dy, kind):
    x, y = px-bx, py-by
    forward, side = x*dx+y*dy, abs(x*dy-y*dx)
    if kind == "thrust":
        return -6 <= forward <= 145 and side < 13
    if kind == "rush":
        return -12 <= forward <= 170 and side < 19
    return abs(math.hypot(x, y)-54) < 18

class Game:
    def __init__(self):
        pyxel.init(W, H, title="LANCERS - RANK 8 ATERIA", fps=FPS)
        self.reset()
        pyxel.run(self.update, self.draw)

    def reset(self):
        self.px, self.py = 120., 255.
        self.bx, self.by = 120., 110.
        self.hp, self.bhp = 150, HP
        self.inv = self.attack_cd = self.dodge_cd = self.dash = 0.
        self.state, self.timer, self.elapsed = "idle", .8, 0.
        self.tech_index = 0
        self.tech = TECHNIQUES[0]
        self.aim = (0., 1.)
        self.origin = (self.bx, self.by)
        self.hit = False
        self.counter = False
        self.message = "GUARD -> DODGE -> PUNISH"
        self.mode = "ready"

    def attack(self):
        if self.attack_cd > 0:
            return
        self.attack_cd = .29
        if math.hypot(self.px-self.bx, self.py-self.by) >= 55:
            self.message = "OUT OF RANGE"
        elif self.state in ("idle", "tell"):
            self.counter = True
            self.message = "BLOCKED! COUNTER"
        else:
            self.bhp = max(0, self.bhp-26)
            self.message = "HIT 26"
            if self.bhp == 0:
                self.mode = "won"

    def begin_tech(self):
        self.tech = TECHNIQUES[self.tech_index % len(TECHNIQUES)]
        self.tech_index += 1
        vx, vy = self.px-self.bx, self.py-self.by
        length = math.hypot(vx, vy) or 1
        self.aim = (vx/length, vy/length)
        self.origin = (self.bx, self.by)
        self.state, self.timer, self.hit = "tell", self.tech[1], False
        self.message = "WARNING: "+self.tech[0]

    def update(self):
        if self.mode != "battle":
            if pyxel.btnp(pyxel.KEY_RETURN) or pyxel.btnp(pyxel.KEY_SPACE):
                self.reset()
                self.mode = "battle"
            return
        dt = 1/FPS
        self.elapsed += dt
        self.inv = max(0, self.inv-dt)
        self.attack_cd = max(0, self.attack_cd-dt)
        self.dodge_cd = max(0, self.dodge_cd-dt)
        self.dash = max(0, self.dash-dt)
        x = int(pyxel.btn(pyxel.KEY_RIGHT) or pyxel.btn(pyxel.KEY_D))-int(pyxel.btn(pyxel.KEY_LEFT) or pyxel.btn(pyxel.KEY_A))
        y = int(pyxel.btn(pyxel.KEY_DOWN) or pyxel.btn(pyxel.KEY_S))-int(pyxel.btn(pyxel.KEY_UP) or pyxel.btn(pyxel.KEY_W))
        length = math.hypot(x, y) or 1
        speed = 235 if self.dash else 100
        self.px = clamp(self.px+x/length*speed*dt, 12, W-12)
        self.py = clamp(self.py+y/length*speed*dt, 48, H-16)
        if pyxel.btn(pyxel.KEY_Z) or pyxel.btn(pyxel.KEY_J):
            self.attack()
        if (pyxel.btnp(pyxel.KEY_X) or pyxel.btnp(pyxel.KEY_K)) and self.dodge_cd <= 0:
            self.dash, self.dodge_cd = .23, 1.15
            self.inv = max(self.inv, .28)
        if self.state == "idle":
            vx, vy = self.px-self.bx, self.py-self.by
            d = math.hypot(vx, vy) or 1
            radial = clamp((d-53)/33, -1, 1)
            self.bx = clamp(self.bx+vx/d*radial*17.5*dt, 16, W-16)
            self.by = clamp(self.by+vy/d*radial*17.5*dt, 50, H-22)
        self.timer -= dt
        if self.timer <= 0:
            if self.state == "idle":
                self.begin_tech()
                self.counter = False
            elif self.state == "tell":
                self.state, self.timer = "active", self.tech[2]
                if self.tech[4] == "rush":
                    self.bx = clamp(self.bx+self.aim[0]*67.5, 16, W-16)
                    self.by = clamp(self.by+self.aim[1]*67.5, 50, H-22)
            elif self.state == "active":
                self.state, self.timer = "recover", 1.05
                self.message = "CHANCE! ATTACK"
            else:
                self.state, self.timer = "idle", .18
        if self.state == "active" and not self.hit:
            if in_attack(self.px,self.py,*self.origin,*self.aim,self.tech[4]):
                self.hit = True
                if self.inv <= 0:
                    self.hp = max(0, self.hp-self.tech[3])
                    self.inv = .68
                    if self.hp == 0:
                        self.mode = "lost"

    def draw(self):
        pyxel.cls(1)
        pyxel.rect(6, 39, W-12, H-50, 0)
        pyxel.rectb(6, 39, W-12, H-50, 5)
        pyxel.text(8, 7, "RANK 08 / SHIELD SPEAR ATERIA", 10)
        pyxel.text(8, 18, f"BOSS {self.bhp:3d}/270   YOU {self.hp:3d}/150", 7)
        pyxel.rect(8, 29, int(224*self.bhp/HP), 4, 8)
        if self.state in ("tell", "active"):
            ox, oy = self.origin
            dx, dy = self.aim
            color = 8 if self.state == "tell" else 10
            if self.tech[4] == "sweep":
                pyxel.circb(ox, oy, 54, color)
                pyxel.circb(ox, oy, 42, color)
                pyxel.circb(ox, oy, 66, color)
            else:
                length = 145 if self.tech[4] == "thrust" else 170
                for side in (-12, 12):
                    pyxel.line(ox-dy*side,oy+dx*side,ox+dx*length-dy*side,oy+dy*length+dx*side,color)
        if self.state in ("idle", "tell"):
            pyxel.circb(self.bx,self.by,20,12)
            pyxel.text(int(self.bx)-14,int(self.by)-31,"GUARD",12)
        pyxel.circ(self.bx,self.by,11,9)
        pyxel.line(self.bx,self.by-13,self.bx,self.by+15,7)
        pyxel.circ(self.px,self.py,8,11 if self.inv<=0 else 6)
        pyxel.text(8,H-19,self.message[:36],7)
        pyxel.text(8,H-10,f"{self.state.upper()}  {self.elapsed:.1f}s",13)
        if self.mode != "battle":
            pyxel.rect(24,128,192,57,1)
            pyxel.rectb(24,128,192,57,10)
            label = {"ready":"RANK 8 - ATERIA","won":"VICTORY","lost":"DEFEAT"}[self.mode]
            pyxel.text(74,142,label,7)
            pyxel.text(45,160,"ENTER: START / RETRY",10)

if __name__ == "__main__":
    Game()
