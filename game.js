// ASADO DEFENSE — Platanus Hack 26
// Tower Defense · Single Player · Phaser 3 · no assets externos · <50kb

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

// ── Mapa kbd → código arcade ────────────────────────────────
const KBD_MAP = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) KBD_MAP[k.toLowerCase()] = code;
}

const W = 800, H = 600;
const CURSOR_SPEED = 240; // px/s al mover con joystick

const C = {
  bg: 0x1a0a00, parrilla: 0x2a1500, grass: 0x2d4a1e, path: 0x8b6914,
  ember: 0xff4400, coal: 0x333333, meat: 0x8b2500, chorizo: 0xcc4400,
  smoke: 0x888877, veg: 0x4caf50, salad: 0x8bc34a, rain: 0x4488cc,
  yellow: 0xffcc00, white: 0xffffff, red: 0xff2222, gold: 0xffd700,
  orange: 0xff6600, brown: 0x6b3a2a, darkbrown: 0x3d1c0e,
};

// ── Sistema de controles físicos del gabinete ───────────────
const KONAMI_CODE = ['P1_U', 'P1_D', 'P1_L', 'P1_R', 'P1_1'];

function createControls(scene) {
  scene.kb = { held: {}, pressed: {} };
  scene.konamiInput = [];
  const down = (e) => {
    if (!scene.scene.isActive()) return;
    if (scene.sound && scene.sound.context && scene.sound.context.state === 'suspended') scene.sound.context.resume();
    const code = KBD_MAP[e.key.toLowerCase()] || KBD_MAP[e.key];
    if (code) {
      if (!scene.kb.held[code]) {
        scene.konamiInput.push(code);
        if (scene.konamiInput.length > KONAMI_CODE.length) scene.konamiInput.shift();
        if (scene.konamiInput.join(',') === KONAMI_CODE.join(',')) {
          window.hardcoreMode = true;
          scene.cameras.main.flash(800, 255, 0, 0);
          if (scene.flashText) scene.flashText('¡MODO D10S ACTIVADO!', 0xff2222, W / 2, H / 2 - 80);
          if (scene.scene.key === 'End' && scene.d && scene.d.win) {
            scene.scene.stop();
            scene.d.gs.paused = false;
            scene.scene.resume('Game');
            scene.d.gs.flashText('¡DIFICULTAD EXTREMA!', 0xff2222);
            scene.d.gs.waveReady = true;
            setTimeout(() => scene.d.gs.startWave(), 1000);
          }
        }
        scene.kb.pressed[code] = true;
      }
      scene.kb.held[code] = true;
    }
  };
  const up = (e) => {
    if (!scene.scene.isActive()) return;
    const code = KBD_MAP[e.key.toLowerCase()] || KBD_MAP[e.key];
    if (code) scene.kb.held[code] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  scene.events.once('shutdown', () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  });
}

function held(scene, code) { return !!scene.kb.held[code]; }
function pressed(scene, code) {
  if (scene.kb.pressed[code]) { scene.kb.pressed[code] = false; return true; }
  return false;
}

function makeTexture(scene, key, fn, w = 32, h = 32) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  fn(g, w, h); g.generateTexture(key, w, h); g.destroy();
}

function sfx(scene, act) {
  if (!scene.sound.context) return;
  const cx = scene.sound.context, t = cx.currentTime;
  if (cx.state === 'suspended') cx.resume();
  const o = cx.createOscillator(), g = cx.createGain();
  o.connect(g); g.connect(cx.destination);
  if (act === 'shoot') {
    o.type = 'square'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    o.start(t); o.stop(t + 0.1);
  } else if (act === 'hit') {
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    o.start(t); o.stop(t + 0.1);
  } else if (act === 'build') {
    o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(600, t + 0.1);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0, t + 0.2);
    o.start(t); o.stop(t + 0.2);
  } else if (act === 'error') {
    o.type = 'triangle'; o.frequency.setValueAtTime(150, t);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0, t + 0.2);
    o.start(t); o.stop(t + 0.2);
  } else if (act === 'wave') {
    o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(330, t + 0.1); o.frequency.setValueAtTime(440, t + 0.2);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0, t + 0.4);
    o.start(t); o.stop(t + 0.4);
  }
}

let musicStarted = false;
const mLead = [62, 0, 67, 0, 69, 0, 70, 0, 62, 0, 67, 0, 69, 0, 70, 0, 62, 0, 67, 0, 69, 0, 70, 0, 62, 0, 67, 0, 69, 0, 70, 0];
const mSitar = [67, 0, 70, 0, 74, 0, 67, 0, 70, 0, 74, 0, 67, 0, 70, 0, 65, 0, 69, 0, 72, 0, 75, 0, 77, 0, 65, 0, 69, 0, 72, 0];
const mBass = [50, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 57, 0, 0, 0, 50, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 57, 0, 0, 0];

let nextNoteTime = 0, mStep = 0;
function startMusic(cx) {
  if (musicStarted || !cx) return;
  musicStarted = true;
  setInterval(() => {
    if (cx.state === 'suspended') return;
    if (nextNoteTime === 0) nextNoteTime = cx.currentTime + 0.1;
    while (nextNoteTime < cx.currentTime + 0.3) {
      const b = mBass[mStep % 32], l = mLead[mStep % 32];

      if (b) {
        const o = cx.createOscillator(), g = cx.createGain();
        o.connect(g); g.connect(cx.destination); o.type = 'triangle';
        o.frequency.value = 440 * Math.pow(2, (b - 69) / 12);
        g.gain.setValueAtTime(0.12, nextNoteTime); g.gain.linearRampToValueAtTime(0, nextNoteTime + 0.3);
        o.start(nextNoteTime); o.stop(nextNoteTime + 0.3);
      }

      if (l) {
        const o = cx.createOscillator(), g = cx.createGain();
        o.connect(g); g.connect(cx.destination); o.type = 'square';
        o.frequency.value = 440 * Math.pow(2, (l - 69) / 12);
        g.gain.setValueAtTime(0.04, nextNoteTime); g.gain.linearRampToValueAtTime(0, nextNoteTime + 0.1);
        o.start(nextNoteTime); o.stop(nextNoteTime + 0.1);
      }

      const s = mSitar[mStep % 32];
      if (s) {
        const o = cx.createOscillator(), g = cx.createGain();
        o.connect(g); g.connect(cx.destination);
        o.type = 'sawtooth';
        o.frequency.value = 440 * Math.pow(2, (s - 69) / 12);
        o.detune.value = 1200; // sube 1 octava para timbre de sitar
        g.gain.setValueAtTime(0.03, nextNoteTime);
        g.gain.linearRampToValueAtTime(0, nextNoteTime + 0.2);
        o.start(nextNoteTime); o.stop(nextNoteTime + 0.22);
      }

      const st16 = mStep % 16;
      if (st16 % 2 === 0) {
        const go = cx.createOscillator(), gg = cx.createGain();
        go.connect(gg); gg.connect(cx.destination); go.type = 'square';
        go.frequency.value = 8000;
        const acc = (st16 === 4 || st16 === 12);
        gg.gain.setValueAtTime(acc ? 0.03 : 0.01, nextNoteTime);
        gg.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + (acc ? 0.08 : 0.03));
        go.start(nextNoteTime); go.stop(nextNoteTime + 0.1);
      }

      nextNoteTime += 0.145;
      mStep++;
    }
  }, 50);
}

// ── Escena: MENÚ ────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    startMusic(this.sound.context);
    createControls(this);
    const g = this.add.graphics();
    g.fillStyle(C.bg); g.fillRect(0, 0, W, H);
    g.fillStyle(C.parrilla); g.fillRect(0, H - 120, W, 120);
    g.lineStyle(3, C.coal);
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, H - 120); g.lineTo(x, H); g.strokePath(); }
    for (let y = H - 100; y < H; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath(); }

    this.embers = [];
    for (let i = 0; i < 20; i++) {
      const e = this.add.graphics();
      e.fillStyle(i % 2 === 0 ? C.ember : C.yellow);
      e.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      e.setPosition(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(H - 110, H - 20));
      e.alpha = Math.random();
      this.embers.push(e);
    }

    this.add.text(W / 2 + 5, 105, 'ASADO', {
      fontSize: '95px', fontFamily: 'monospace', fontStyle: 'bold', color: '#000'
    }).setOrigin(0.5).setAlpha(0.6);
    this.add.text(W / 2, 100, 'ASADO', {
      fontSize: '95px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ff5500', stroke: '#220000', strokeThickness: 10
    }).setOrigin(0.5);
    this.add.text(W / 2, 185, 'DEFENSE', {
      fontSize: '55px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5).setShadow(4, 4, '#000000', 0, true, false);

    this.add.text(W / 2, 290, '« EL DESTINO DE LA PARRILLA ESTÁ EN TUS MANOS »', { 
      fontSize: '16px', fontFamily: 'monospace', color: '#fff', fontStyle: 'bold' 
    }).setOrigin(0.5).setShadow(2, 2, '#cc4400');

    const btn = this.add.text(W / 2, 360, '▶ EMPEZAR ASADO ◀', {
      fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#fff', backgroundColor: '#aa3300', padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setShadow(3, 3, '#000', 0, true, false);
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#ff5500' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#aa3300' }));
    btn.on('pointerdown', () => { sfx(this, 'build'); this.scene.start('Game'); });

    this.add.text(W / 2, 430, 'PRESIONA [START] O HACE CLICK PARA JUGAR', { fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5);

    this.hsText = this.add.text(W / 2, 480, 'Top 5: Cargando...', {
      fontSize: '18px', fontFamily: 'monospace', color: '#fff'
    }).setOrigin(0.5).setShadow(2, 2, '#ff6600');
    this.add.text(W / 2, 530, 'Arcade Challenge · Platanus Hack 26', {
      fontSize: '14px', fontFamily: 'monospace', color: '#888', align: 'center'
    }).setOrigin(0.5);
    this.add.text(W / 2, 560, 'WASD mover · [B1-B4] torre · [B5] colocar · [START] pausa', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666', align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({ targets: btn, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });

    this.time.addEvent({
      delay: 100, loop: true, callback: () => {
        this.embers.forEach(e => {
          e.alpha += (Math.random() - 0.5) * 0.3;
          e.alpha = Phaser.Math.Clamp(e.alpha, 0.2, 1);
        });
      }
    });

    loadHS().then(l => {
      const txt = l.slice(0, 3).map(e => `${e.n}:${e.s}`).join(' | ');
      this.hsText.setText(`TOP: ${txt}`);
    });
  }

  update() {
    if (pressed(this, 'START1') || pressed(this, 'START2') || pressed(this, 'P1_1')) {
      sfx(this, 'build');
      this.scene.start('Game');
    }
  }
}

// ── Escena: GAME ────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init() {
    this.lives = 5; this.coins = 80; this.score = 0;
    this.wave = 0; this.waveReady = true; this.paused = false;
    this.enemies = []; this.towers = []; this.projectiles = [];
    this.particles = []; this.smokeParticles = [];
    this.selectedTower = null; this.placing = false;
    this.cur = { x: W / 2, y: H / 2 };
    this.firePowerActive = false;
    this.MAX_PER_TYPE = 3;  // máx 3 torres de cada tipo
    this.blockedQuinchos = new Set(); // towers bloqueadas esta oleada
  }

  get PATH() {
    return [
      { x: -40, y: 120 }, { x: 160, y: 120 }, { x: 160, y: 280 }, { x: 480, y: 280 },
      { x: 480, y: 160 }, { x: 640, y: 160 }, { x: 640, y: 400 }, { x: 320, y: 400 },
      { x: 320, y: 500 }, { x: 840, y: 500 },
    ];
  }

  get WAVES() {
    return [
      {
        name: '🌿 Oleada 1: Vegetarianos', enemies: [
          ...Array(8).fill({ type: 'vegano', hp: 40, speed: 50, reward: 8 }),
          ...Array(4).fill({ type: 'vegano_gordo', hp: 80, speed: 30, reward: 15 }),
        ]
      },
      {
        name: '🌧 Oleada 2: Lluvia', enemies: [
          ...Array(12).fill({ type: 'lluvia', hp: 20, speed: 90, reward: 5 }),
          ...Array(5).fill({ type: 'lluvia', hp: 60, speed: 50, reward: 10 }),
        ]
      },
      {
        name: '💼 Oleada 3: Piqueteros', enemies: [
          ...Array(6).fill({ type: 'piquetero', hp: 100, speed: 35, reward: 18 }),
          ...Array(3).fill({ type: 'piquetero', hp: 200, speed: 20, reward: 30 }),
          ...Array(8).fill({ type: 'vegano', hp: 40, speed: 60, reward: 8 }),
        ]
      },
      {
        name: '👔 Oleada 4: Inspectores + Jefe', enemies: [
          ...Array(3).fill({ type: 'inspector', hp: 80, speed: 40, reward: 25 }),
          { type: 'jefe', hp: 1000, speed: 25, reward: 150, spawnOnDeath: window.hardcoreMode },
          ...Array(2).fill({ type: 'inspector', hp: 90, speed: 55, reward: 25 }),
        ]
      },
    ];
  }

  // Torre indexed para acceso rápido con B1-B4
  get TOWER_ORDER() { return ['brasa', 'chorizo', 'empanada', 'quincho']; }

  get TOWER_TYPES() {
    return {
      brasa: { cost: 30, range: 100, dmg: 15, rate: 60, color: C.ember, label: '🔥 Brasa', desc: '$30 · Fuego básico', btn: 'B1' },
      chorizo: { cost: 50, range: 140, dmg: 30, rate: 90, color: C.chorizo, label: '🌭 Chorizo', desc: '$50 · Alto daño', btn: 'B2' },
      empanada: { cost: 40, range: 80, dmg: 20, rate: 40, color: C.yellow, label: '🥟 Empanada', desc: '$40 · Ralentiza', btn: 'B3' },
      quincho: { cost: 80, range: 120, dmg: 50, rate: 120, color: C.brown, label: '🏠 Quincho', desc: '$80 · Área', btn: 'B4' },
    };
  }

  preload() { }

  create() {
    createControls(this);
    this.buildTextures();
    this.drawMap();
    this.buildUI();
    this.buildPauseScreen();
    this.setupMouseInput();
    this.ticker = this.time.addEvent({ delay: 16, loop: true, callback: this.gameTick, callbackScope: this });
    this.time.addEvent({ delay: 300, loop: true, callback: this.spawnSmoke, callbackScope: this });
  }

  buildTextures() {
    makeTexture(this, 'vegano', (g) => {
      g.fillStyle(C.veg); g.fillCircle(16, 16, 14);
      g.fillStyle(0x2a6b20); g.fillCircle(16, 16, 10);
      g.fillStyle(C.white); g.fillCircle(12, 13, 3); g.fillCircle(20, 13, 3);
      g.fillStyle(0x000); g.fillCircle(12, 13, 1.5); g.fillCircle(20, 13, 1.5);
      g.lineStyle(2, 0x000); g.beginPath(); g.arc(16, 20, 4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)); g.strokePath();
    });
    makeTexture(this, 'vegano_gordo', (g) => {
      g.fillStyle(C.salad); g.fillCircle(20, 20, 18);
      g.fillStyle(0x4a8040); g.fillCircle(20, 20, 13);
      g.fillStyle(C.white); g.fillCircle(14, 17, 4); g.fillCircle(26, 17, 4);
      g.fillStyle(0x000); g.fillCircle(14, 17, 2); g.fillCircle(26, 17, 2);
      g.lineStyle(2, 0x000); g.beginPath(); g.arc(20, 24, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)); g.strokePath();
    }, 40, 40);
    makeTexture(this, 'lluvia', (g) => {
      g.fillStyle(C.rain); g.fillTriangle(16, 2, 4, 20, 28, 20);
      g.fillStyle(0x2266aa); g.fillCircle(16, 20, 8);
      g.fillStyle(C.white, 0.4); g.fillEllipse(11, 14, 4, 6);
    });
    makeTexture(this, 'piquetero', (g) => {
      g.fillStyle(C.brown); g.fillRect(10, 18, 12, 18);
      g.fillStyle(0xffcc99); g.fillCircle(16, 14, 8);
      g.fillStyle(0xeeeeee); g.fillRect(4, 4, 24, 14);
      g.lineStyle(1.5, 0x333); g.strokeRect(4, 4, 24, 14);
      g.fillStyle(C.red); g.fillRect(6, 7, 20, 4);
      g.fillStyle(0x333366); g.fillRect(10, 36, 5, 8); g.fillRect(17, 36, 5, 8);
    }, 36, 48);
    makeTexture(this, 'inspector', (g) => {
      g.fillStyle(0x555577); g.fillRect(8, 18, 16, 20);
      g.fillStyle(0xffcc99); g.fillCircle(16, 14, 8);
      g.fillStyle(0x222244); g.fillRect(8, 18, 16, 4);
      g.fillStyle(C.red); g.fillRect(15, 18, 2, 14);
      g.fillStyle(C.darkbrown); g.fillRect(24, 28, 10, 8); g.fillRect(26, 26, 6, 4);
      g.lineStyle(1, 0x000); g.strokeRect(24, 28, 10, 8);
      g.fillStyle(0x333366); g.fillRect(8, 38, 7, 8); g.fillRect(17, 38, 7, 8);
    }, 40, 50);
    makeTexture(this, 'jefe', (g) => {
      g.fillStyle(C.gold); g.fillRect(10, 22, 36, 28);
      g.fillStyle(0xffcc99); g.fillCircle(28, 16, 14);
      g.fillStyle(C.red); g.fillRect(26, 22, 4, 20);
      g.fillStyle(C.gold); g.fillRect(10, 22, 36, 6);
      g.fillStyle(0x111); g.fillRect(18, 12, 8, 5); g.fillRect(30, 12, 8, 5);
      g.lineStyle(2, 0x888); g.beginPath(); g.moveTo(26, 14); g.lineTo(30, 14); g.strokePath();
      g.fillStyle(0x333366); g.fillRect(10, 50, 14, 10); g.fillRect(32, 50, 14, 10);
    }, 56, 64);
    makeTexture(this, 'proj_brasa', (g) => {
      g.fillStyle(C.ember); g.fillCircle(6, 6, 5);
      g.fillStyle(C.yellow); g.fillCircle(6, 6, 2);
    }, 12, 12);
    makeTexture(this, 'proj_chorizo', (g) => {
      g.fillStyle(C.chorizo); g.fillEllipse(16, 8, 28, 10);
      g.fillStyle(0xaa2200); g.fillEllipse(16, 8, 22, 6);
    }, 32, 16);
    makeTexture(this, 'proj_empanada', (g) => {
      g.fillStyle(C.yellow); g.fillEllipse(12, 8, 22, 14);
      g.lineStyle(2, 0xaa6600); g.strokeEllipse(12, 8, 22, 14);
    }, 24, 16);
    makeTexture(this, 'proj_quincho', (g) => {
      g.fillStyle(C.orange); g.fillCircle(10, 10, 9);
      g.fillStyle(C.red); g.fillCircle(10, 10, 5);
      g.fillStyle(C.yellow); g.fillCircle(10, 10, 2);
    }, 20, 20);
  }

  drawMap() {
    const g = this.add.graphics();
    g.fillStyle(C.grass); g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 16) for (let y = 0; y < H; y += 16) {
      if ((x + y) % 32 === 0) { g.fillStyle(0x264218, 0.4); g.fillRect(x, y, 8, 8); }
    }
    const path = this.PATH;
    g.lineStyle(44, C.path, 1); g.beginPath(); g.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
    g.lineStyle(48, 0x6b5010, 0.4); g.beginPath(); g.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();
    g.lineStyle(40, C.path, 1); g.beginPath(); g.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath();

    const pg = this.add.graphics();
    pg.fillStyle(0x221100); pg.fillRect(W - 126, H - 166, 122, 92);
    pg.fillStyle(C.darkbrown); pg.fillRect(W - 120, H - 160, 110, 80);
    pg.fillStyle(C.coal, 0.9); pg.fillRect(W - 110, H - 150, 90, 60);
    pg.lineStyle(4, C.brown);
    for (let x = W - 110; x < W - 20; x += 12) { pg.beginPath(); pg.moveTo(x, H - 150); pg.lineTo(x, H - 90); pg.strokePath(); }
    for (let y = H - 150; y < H - 90; y += 12) { pg.beginPath(); pg.moveTo(W - 110, y); pg.lineTo(W - 20, y); pg.strokePath(); }

    // Carnes y Chorizos (Sausages)
    pg.fillStyle(C.meat); pg.fillEllipse(W - 85, H - 130, 35, 16); pg.fillEllipse(W - 50, H - 125, 38, 16); pg.fillEllipse(W - 75, H - 115, 30, 14);
    pg.fillStyle(C.chorizo); pg.fillRoundedRect(W - 90, H - 105, 20, 8, 4); pg.fillRoundedRect(W - 55, H - 100, 25, 8, 4);

    pg.fillStyle(C.ember, 0.7);
    for (let i = 0; i < 15; i++) pg.fillCircle(W - 110 + Phaser.Math.Between(5, 85), H - 90, Phaser.Math.Between(2, 6));

    this.add.text(W - 65, H - 175, '🥩 LA PARRILLA 🥩', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc00', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true, false);
    this.add.text(20, 120, '► ENTRADA', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0.5);
  }

  buildUI() {
    // ── Barra superior (50px) con 3 zonas claras ────────────
    const uiBg = this.add.graphics().setDepth(10);
    uiBg.fillStyle(0x080400, 0.95); uiBg.fillRect(0, 0, W, 50);
    uiBg.lineStyle(2, 0xffaa00, 0.7); uiBg.beginPath(); uiBg.moveTo(0, 50); uiBg.lineTo(W, 50); uiBg.strokePath();
    uiBg.lineStyle(1, 0x553311, 0.5);
    uiBg.beginPath(); uiBg.moveTo(240, 4); uiBg.lineTo(240, 46); uiBg.strokePath();
    uiBg.beginPath(); uiBg.moveTo(W - 200, 4); uiBg.lineTo(W - 200, 46); uiBg.strokePath();

    // ZONA 1: Vidas + Monedas (izquierda)
    this.livesText = this.add.text(12, 5, '❤️ 5', { fontSize: '20px', fontFamily: 'monospace', color: '#ff4444', fontStyle: 'bold' }).setDepth(11).setShadow(1, 1, '#000');
    this.coinsText = this.add.text(12, 29, '💰 80', { fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold' }).setDepth(11).setShadow(1, 1, '#000');

    // ZONA 2: Score (centro)
    this.scoreText = this.add.text(W / 2, 10, '⭐ 0', { fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(11).setShadow(2, 2, '#000');

    // ZONA 3: Torres + pausa (derecha)
    this.towerCountText = this.add.text(W - 8, 5, '🔥0 🌭0 🥟0 🏠0  (/3)', {
      fontSize: '13px', fontFamily: 'monospace', color: '#88ffaa', fontStyle: 'bold'
    }).setOrigin(1, 0).setDepth(11).setShadow(1, 1, '#000');
    this.add.text(W - 8, 32, '[START] Pausa', { fontSize: '11px', fontFamily: 'monospace', color: '#776644' }).setOrigin(1, 0).setDepth(11);

    // ── Strip de mecánicas especiales (2 líneas) ────────────
    const hintBg = this.add.graphics().setDepth(10);
    hintBg.fillStyle(0x060301, 0.92); hintBg.fillRect(0, 50, W, 36);
    hintBg.lineStyle(1, 0x664411, 0.8);
    hintBg.beginPath(); hintBg.moveTo(0, 50); hintBg.lineTo(W, 50); hintBg.strokePath();
    hintBg.beginPath(); hintBg.moveTo(0, 86); hintBg.lineTo(W, 86); hintBg.strokePath();
    this.add.text(W / 2, 53, '🌧️ lluvia → DESTRUYE 🔥 Brasa   |   🌿 Vegano → BLOQUEA 🏠 Quincho (1 oleada)', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ddaa44', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5, 0).setDepth(11);
    this.add.text(W / 2, 70, '🚶 Piquetero → DEVORA 🌭 Chorizo + 🥟 Empanada   |   👔 Inspector (100px) → Paraliza   |   💀 Boss → Rompe torres (+25%)', {
      fontSize: '9px', fontFamily: 'monospace', color: '#998855', align: 'center'
    }).setOrigin(0.5, 0).setDepth(11);

    // Wave text debajo del strip
    this.waveText = this.add.text(W / 2, 88, 'Fase de Preparación... [START] Iniciar', {
      fontSize: '15px', fontFamily: 'monospace', color: '#fff', backgroundColor: '#000000bb', padding: { x: 12, y: 4 }, fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(11).setShadow(1, 1, '#ff6600');

    // ── Panel inferior torres (80px) ────────────────────────
    const panelBg = this.add.graphics().setDepth(10);
    panelBg.fillStyle(0x0c0400, 0.98); panelBg.fillRect(0, H - 80, W, 80);
    panelBg.lineStyle(2, C.ember); panelBg.beginPath(); panelBg.moveTo(0, H - 80); panelBg.lineTo(W, H - 80); panelBg.strokePath();

    this.towerButtons = [];
    const iHints = {
      brasa: '⚠ lluvia la apaga',
      chorizo: '⚠ piquetero lo devora',
      empanada: '⚠ piquetero la devora',
      quincho: '⚠ vegano lo bloquea'
    };
    const types = Object.entries(this.TOWER_TYPES);
    types.forEach(([key, t], i) => {
      const bx = 10 + i * 155;
      const box = this.add.graphics().setDepth(10);
      box.fillStyle(0x1a0900, 0.97); box.fillRoundedRect(bx, H - 76, 146, 54, 5);
      box.lineStyle(1, 0x553322); box.strokeRoundedRect(bx, H - 76, 146, 54, 5);

      const btnLabel = this.add.text(bx + 5, H - 74, `[${t.btn}]`, { fontSize: '11px', fontFamily: 'monospace', color: '#ff9944', fontStyle: 'bold' }).setDepth(12);
      const label = this.add.text(bx + 36, H - 74, t.label, { fontSize: '13px', fontFamily: 'monospace', color: '#ffdd88', fontStyle: 'bold' }).setDepth(12);
      const descT = this.add.text(bx + 5, H - 56, t.desc, { fontSize: '11px', fontFamily: 'monospace', color: '#cc9955' }).setDepth(12);
      this.add.text(bx + 5, H - 42, iHints[key] || '', { fontSize: '10px', fontFamily: 'monospace', color: '#ff7733' }).setDepth(12);
      this.add.text(bx + 142, H - 74, '/3', { fontSize: '9px', fontFamily: 'monospace', color: '#665544' }).setOrigin(1, 0).setDepth(12);

      const hitZone = this.add.zone(bx + 73, H - 49, 146, 54).setOrigin(0.5).setInteractive({ useHandCursor: true });
      hitZone.on('pointerover', () => {
        if (this.coins >= t.cost && this.towersOfType(key) < this.MAX_PER_TYPE) {
          box.clear(); box.fillStyle(0x3a1600, 0.97); box.fillRoundedRect(bx, H - 76, 146, 54, 5);
          box.lineStyle(2, t.color); box.strokeRoundedRect(bx, H - 76, 146, 54, 5);
        }
      });
      hitZone.on('pointerout', () => {
        box.clear(); box.fillStyle(0x1a0900, 0.97); box.fillRoundedRect(bx, H - 76, 146, 54, 5);
        box.lineStyle(1, 0x553322); box.strokeRoundedRect(bx, H - 76, 146, 54, 5);
      });
      hitZone.on('pointerdown', () => this.selectTower(key));
      hitZone.setDepth(11);
      this.towerButtons.push({ key, box, label, descT, btnLabel, t, bx });
    });

    // Boton oleada
    this.waveBtn = this.add.text(W - 8, H - 76, '► OLEADA\n[START]', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#000', backgroundColor: '#ff6600', padding: { x: 8, y: 6 }, align: 'center'
    }).setOrigin(1, 0).setDepth(11).setInteractive({ useHandCursor: true });
    this.waveBtn.on('pointerdown', () => this.startWave());

    const ctrlTxt = window.hardcoreMode
      ? '🔴 MODO D10S: +75% stats/loop · 3 max/tipo · Torres Lvl5 · [B6] = upg/vender'
      : 'WASD = mover cursor   |   [B5] = colocar torre   |   [B6] = vender torre (50% de plata)';
    this.add.text(W / 2, H - 10, ctrlTxt, {
      fontSize: '11px', fontFamily: 'monospace', color: window.hardcoreMode ? '#ff5533' : '#aa9988'
    }).setOrigin(0.5, 0.5).setDepth(11);

    this.ghost = this.add.graphics().setDepth(8);
    this.cursorGfx = this.add.graphics().setDepth(9);
    this.selText = this.add.text(W / 2, H - 85, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffaa44', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(11);
  }

  updateTowerCountUI() {
    if (!this.towerCountText) return;
    const icons = ['🔥', '🌭', '🥟', '🏠'];
    const types = ['brasa', 'chorizo', 'empanada', 'quincho'];
    const counts = types.map(tp => this.towersOfType(tp));
    const anyMax = counts.some(c => c >= this.MAX_PER_TYPE);
    this.towerCountText.setText(counts.map((c, i) => `${icons[i]}${c}`).join(' ') + '  (/3)');
    this.towerCountText.setColor(anyMax ? '#ffaa00' : '#88ffaa');
  }

  buildPauseScreen() {
    this.pauseContainer = this.add.container(0, 0).setDepth(30).setVisible(false);
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75); overlay.fillRect(0, 0, W, H);
    const box = this.add.graphics();
    box.fillStyle(0x1a0a00, 0.98); box.fillRoundedRect(W / 2 - 200, H / 2 - 100, 400, 200, 8);
    box.lineStyle(2, C.ember); box.strokeRoundedRect(W / 2 - 200, H / 2 - 100, 400, 200, 8);
    const title = this.add.text(W / 2, H / 2 - 60, '⏸ PAUSA', {
      fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ff6600', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    const sub = this.add.text(W / 2, H / 2 - 5, '[START] para continuar', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff'
    }).setOrigin(0.5);
    const subExit = this.add.text(W / 2, H / 2 + 25, '[START2] Abandonar Partida', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff4444'
    }).setOrigin(0.5);
    const sub2 = this.add.text(W / 2, H / 2 + 65, 'WASD · [B1-B4] torre · [B5] colocar · [B6] can/upg', {
      fontSize: '11px', fontFamily: 'monospace', color: '#888'
    }).setOrigin(0.5);
    this.pauseContainer.add([overlay, box, title, sub, subExit, sub2]);
  }

  // ── Mouse input (por si se usa con mouse también) ──────────
  setupMouseInput() {
    this.input.on('pointermove', (ptr) => {
      if (!this.placing || this.paused) return;
      this.cur.x = ptr.x; this.cur.y = ptr.y;
      this.drawGhost();
    });
    this.input.on('pointerdown', (ptr) => {
      if (this.paused) return;
      if (ptr.y > H - 80 || ptr.y < 50) return;
      if (!this.placing) return;
      this.cur.x = ptr.x; this.cur.y = ptr.y;
      if (this.canPlace(this.cur.x, this.cur.y)) this.placeTower(this.cur.x, this.cur.y, this.selectedTower);
    });
    this.input.keyboard.on('keydown-ESC', () => this.cancelPlacing());
  }

  // ── Dibujo del ghost / cursor ───────────────────────────
  drawGhost() {
    this.ghost.clear();
    this.cursorGfx.clear();
    const x = this.cur.x, y = this.cur.y;
    this.cursorGfx.lineStyle(2, 0xffffff, 0.9);
    this.cursorGfx.beginPath(); this.cursorGfx.moveTo(x - 14, y); this.cursorGfx.lineTo(x + 14, y); this.cursorGfx.strokePath();
    this.cursorGfx.beginPath(); this.cursorGfx.moveTo(x, y - 14); this.cursorGfx.lineTo(x, y + 14); this.cursorGfx.strokePath();
    this.cursorGfx.strokeCircle(x, y, 5);

    if (!this.placing) {
      const ht = this.towers.find(tw => Phaser.Math.Distance.Between(x, y, tw.x, tw.y) < 25);
      if (ht) {
        const MAX_LVL = 5;
        const sv = Math.floor(ht.data.cost * 0.5);
        if (window.hardcoreMode && ht.level < MAX_LVL) {
          const cost = this.upgradeCost(ht);
          this.selText.setText(`[B6] Upg Nv${ht.level}→${ht.level+1}: $${cost}  |  (max→vende $${sv})`);
        } else {
          this.selText.setText(`[B6] Vender: +$${sv} (50%)`);
        }
        this.ghost.lineStyle(1, ht.data.color, 0.5); this.ghost.strokeCircle(ht.x, ht.y, ht.data.range);
      } else {
        this.selText.setText('');
      }
      return;
    }

    const t = this.TOWER_TYPES[this.selectedTower];
    const valid = this.canPlace(x, y);
    this.ghost.lineStyle(1, valid ? 0xffffff : 0xff0000, 0.25);
    this.ghost.strokeCircle(x, y, t.range);
    this.ghost.fillStyle(valid ? t.color : 0xff0000, 0.45);
    this.ghost.fillCircle(x, y, 18);
  }

  // ── Selección de torre ──────────────────────────────────
  towersOfType(type) { return this.towers.filter(tw => tw.type === type).length; }

  selectTower(key) {
    if (this.towersOfType(key) >= this.MAX_PER_TYPE) {
      sfx(this, 'error');
      this.flashText(`¡Máx ${this.MAX_PER_TYPE} torres de este tipo!`, 0xff4444);
      return;
    }
    const t = this.TOWER_TYPES[key];
    if (this.coins < t.cost) { sfx(this, 'error'); this.flashText('¡No alcanza la plata!', 0xff4444); return; }
    sfx(this, 'shoot');
    this.selectedTower = key; this.placing = true;
    if (this.cur.x < 50 || this.cur.x > W - 50 || this.cur.y < 55 || this.cur.y > H - 85) {
      this.cur.x = W / 2; this.cur.y = H / 2;
    }
    this.selText.setText(`[${t.btn}] ${t.label} · $${t.cost} · WASD mover · [B5] colocar · [B6] cancelar`);
    this.updateTowerButtonHighlight();
    this.drawGhost();
  }

  // Costo de upgrade al nivel siguiente (exponencial)
  upgradeCost(tower) {
    return Math.floor(tower.data.cost * Math.pow(2.2, tower.level - 1));
  }

  cancelPlacing() {
    this.placing = false; this.selectedTower = null;
    this.ghost.clear(); this.cursorGfx.clear(); this.selText.setText('');
    this.updateTowerButtonHighlight();
  }

  updateTowerButtonHighlight() {
    this.towerButtons.forEach(({ key, box, bx, t }) => {
      const active = key === this.selectedTower;
      box.clear();
      box.fillStyle(active ? 0x3a1600 : 0x1a0900, 0.97);
      box.fillRoundedRect(bx, H - 76, 146, 54, 5);
      box.lineStyle(active ? 2 : 1, active ? t.color : 0x553322);
      box.strokeRoundedRect(bx, H - 76, 146, 54, 5);
    });
  }

  canPlace(x, y) {
    if (y < 55 || y > H - 85) return false;
    const path = this.PATH;
    for (let i = 0; i < path.length - 1; i++) {
      if (this.onSegment(x, y, path[i], path[i + 1], 30)) return false;
    }
    for (const t of this.towers) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) < 36) return false;
    }
    if (x > W - 130 && y > H - 175) return false;
    return true;
  }

  onSegment(px, py, a, b, dist) {
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (len2 === 0) return Phaser.Math.Distance.Between(px, py, a.x, a.y) < dist;
    let t = ((px - a.x) * (b.x - a.x) + (py - a.y) * (b.y - a.y)) / len2;
    t = Math.max(0, Math.min(1, t));
    const nx = a.x + t * (b.x - a.x), ny = a.y + t * (b.y - a.y);
    return Phaser.Math.Distance.Between(px, py, nx, ny) < dist;
  }

  placeTower(x, y, type) {
    if (this.towersOfType(type) >= this.MAX_PER_TYPE) {
      sfx(this, 'error');
      this.flashText(`¡Máx ${this.MAX_PER_TYPE} de este tipo!`, 0xff4444);
      return;
    }
    const t = this.TOWER_TYPES[type];
    this.coins -= t.cost; this.updateUI();
    const tg = this.add.graphics().setDepth(5);
    tg.fillStyle(C.darkbrown); tg.fillCircle(0, 0, 18);
    tg.fillStyle(t.color); tg.fillCircle(0, 0, 13);
    tg.fillStyle(0xffffff, 0.3); tg.fillCircle(-4, -4, 5);
    tg.setPosition(x, y);
    const icons = { brasa: '🔥', chorizo: '🌭', empanada: '🥟', quincho: '🏠' };
    const iconTxt = this.add.text(x, y - 22, icons[type], { fontSize: '12px' }).setOrigin(0.5).setDepth(6);
    const towerObj = { x, y, type, graphic: tg, iconText: iconTxt, cooldown: 0, data: Object.assign({}, t), level: 1, blocked: false };
    this.towers.push(towerObj);
    this.cancelPlacing();
    sfx(this, 'build');
    this.addParticle(x, y, t.color, 8, 40);
    this.flashText('¡Torre colocada!', 0x44ff44, x, y - 30);
    tg.setScale(0.5);
    this.tweens.add({ targets: tg, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.updateTowerCountUI();
  }

  sellTower(ht) {
    const refund = Math.floor(ht.data.cost * 0.5);
    this.coins += refund; this.updateUI();
    this.flashText(`💰 Vendida +$${refund}`, C.yellow, ht.x, ht.y - 30);
    this.addParticle(ht.x, ht.y, C.gold, 8, 40);
    sfx(this, 'build');
    ht.graphic.destroy();
    if (ht.iconText) ht.iconText.destroy();
    this.towers = this.towers.filter(tw => tw !== ht);
    this.updateTowerCountUI();
  }

  startWave() {
    if (!this.waveReady) return;
    if (!window.hardcoreMode && this.wave >= this.WAVES.length) return;

    sfx(this, 'wave');
    this.waveReady = false; this.waveBtn.setVisible(false);

    const baseWave = this.wave % this.WAVES.length;
    const loopNum = Math.floor(this.wave / this.WAVES.length);
    const mult = Math.pow(window.hardcoreMode ? 1.75 : 1.40, loopNum);
    const waveData = this.WAVES[baseWave];

    const parts = waveData.name.split(':');
    let txt = `Oleada ${this.wave + 1}:${parts[1] || ''}`;
    if (loopNum > 0) txt = `💀 [LOOP ${loopNum + 1}] ` + txt;
    this.waveText.setText(txt);

    this.wave++;
    let delay = 0;
    waveData.enemies.forEach((eData) => {
      const cappedMult = Math.pow(1.20, loopNum);
      const buffedEnemy = {
        ...eData,
        hp: Math.floor(eData.hp * mult),
        speed: Math.min(eData.speed * cappedMult, 300),
        reward: Math.floor(eData.reward * mult)
      };
      this.time.delayedCall(delay, () => this.spawnEnemy(buffedEnemy));
      delay += Phaser.Math.Between(800, 1500) / (1 + loopNum * 0.15);
    });
    this.time.delayedCall(delay + 2000, () => this.checkWaveEnd());
  }

  togglePause() {
    if (this.paused) {
      this.paused = false;
      this.pauseContainer.setVisible(false);
      this.ticker.paused = false;
    } else {
      this.paused = true;
      this.pauseContainer.setVisible(true);
      this.ticker.paused = true;
    }
  }

  checkWaveEnd() {
    const wait = () => {
      if (this.enemies.length === 0) {
        if (!window.hardcoreMode && this.wave >= this.WAVES.length) {
          this.time.delayedCall(1500, () => this.endGame(true));
        } else {
          sfx(this, 'wave');
          this.waveReady = true; this.waveBtn.setVisible(true);
          // Desbloquear quinchos bloqueados al final de la oleada
          this.blockedQuinchos = new Set();
          this.towers.forEach(t => { if (t.blocked) { t.blocked = false; if (t.graphic) { t.graphic.setAlpha(1); } } });
          const reward = 20 + this.wave * 10;
          this.coins += reward; this.updateUI();
          this.waveText.setText(`¡Oleada superada! +$${reward}`);
          this.time.delayedCall(2000, () => this.waveText.setText(`Oleada ${this.wave + 1} lista`));
        }
      } else {
        this.time.delayedCall(500, wait);
      }
    };
    wait();
  }

  spawnEnemy(eData, tPath = null, idx = 1, sx = null, sy = null) {
    if (this.lives <= 0) return;
    const path = tPath || this.PATH;
    const px = sx !== null ? sx : path[0].x;
    const py = sy !== null ? sy : path[0].y;
    const sprite = this.add.image(px, py, eData.type).setDepth(4);
    const hbBg = this.add.graphics().setDepth(7);
    const hbFg = this.add.graphics().setDepth(7);

    this.tweens.add({
      targets: sprite, angle: { from: -12, to: 12 },
      yoyo: true, repeat: -1, duration: Phaser.Math.Between(250, 350), ease: 'Sine.easeInOut'
    });

    this.enemies.push({
      sprite, hbBg, hbFg,
      hp: eData.hp, maxHp: eData.hp, speed: eData.speed, reward: eData.reward,
      type: eData.type, pathIdx: idx, dead: false, slow: 0, pathArray: path, spawnOnDeath: eData.spawnOnDeath
    });
  }

  // ── Update: manejo de inputs de gabinete ────────────────
  update(time, delta) {
    const dt = delta / 1000;

    // Pausa con START1
    if (pressed(this, 'START1')) {
      if (this.waveReady && !this.placing) {
        this.startWave(); // START arranca oleada si está disponible y no estás colocando
      } else {
        this.togglePause();
      }
      return;
    }
    
    if (this.paused) {
      if (pressed(this, 'START2')) {
        sfx(this, 'error');
        this.scene.start('Menu');
      }
      return;
    }

    // Selección de torre con B1-B4
    const tKeys = ['P1_1', 'P1_2', 'P1_3', 'P1_4'];
    tKeys.forEach((code, i) => {
      if (pressed(this, code)) this.selectTower(this.TOWER_ORDER[i]);
    });

    let dx = 0, dy = 0;
    if (held(this, 'P1_L')) dx = -1;
    if (held(this, 'P1_R')) dx = 1;
    if (held(this, 'P1_U')) dy = -1;
    if (held(this, 'P1_D')) dy = 1;
    if (dx !== 0 || dy !== 0) {
      this.cur.x = Phaser.Math.Clamp(this.cur.x + dx * CURSOR_SPEED * dt, 20, W - 20);
      this.cur.y = Phaser.Math.Clamp(this.cur.y + dy * CURSOR_SPEED * dt, 55, H - 85);
      this.drawGhost();
    }

    if (this.placing) {
      if (pressed(this, 'P1_5')) {
        if (this.canPlace(this.cur.x, this.cur.y)) {
          this.placeTower(this.cur.x, this.cur.y, this.selectedTower);
        } else {
          sfx(this, 'error');
          this.flashText('¡No se puede colocar aquí!', 0xff4444, this.cur.x, this.cur.y - 30);
        }
      }
      if (pressed(this, 'P1_6')) {
        sfx(this, 'error');
        this.cancelPlacing();
      }
    } else {
      if (pressed(this, 'P1_6')) {
        const ht = this.towers.find(tw => Phaser.Math.Distance.Between(this.cur.x, this.cur.y, tw.x, tw.y) < 25);
        const MAX_LVL = 5;
        if (ht) {
          if (window.hardcoreMode && ht.level < MAX_LVL) {
            const upg = this.upgradeCost(ht);
            if (this.coins >= upg) {
              this.coins -= upg;
              ht.level++;
              ht.data = { ...ht.data, dmg: Math.floor(ht.data.dmg * 1.4), range: Math.floor(ht.data.range * 1.2) };
              const sc = 1 + (ht.level - 1) * 0.2;
              ht.graphic.setScale(sc);
              const lvlColors = ['#ffffff','#88ffaa','#ffff44','#ff8800','#ff2222'];
              if (ht.iconText) ht.iconText.setColor(lvlColors[ht.level - 1] || '#ff2222');
              sfx(this, 'build');
              this.addParticle(ht.x, ht.y, C.gold, 12, 50);
              const lvlNames = ['','','★ Nivel 2','★★ Nivel 3','★★★ Nivel 4','★★★★ Nivel 5 MAX'];
              this.flashText(lvlNames[ht.level] || `Nivel ${ht.level}`, 0xffcc00, ht.x, ht.y - 30);
              this.updateUI();
            } else {
              sfx(this, 'error'); this.flashText(`¡Faltan $${upg - this.coins}!`, 0xff4444, ht.x, ht.y - 30);
            }
          } else {
            this.sellTower(ht);
          }
        }
      }
    }
  }

  gameTick() {
    if (this.lives <= 0 || this.paused) return;
    const dt = 16 / 1000;
    this.enemies.forEach(e => this.moveEnemy(e, dt));

    // ── Auras visuales ──────────────────────────────────
    if (!this.inspAuraGfx) this.inspAuraGfx = this.add.graphics().setDepth(3);
    if (!this.dangerGfx) this.dangerGfx = this.add.graphics().setDepth(3);
    this.inspAuraGfx.clear(); this.dangerGfx.clear();
    const _t0 = Date.now();
    const _pulse = 0.25 + 0.2 * Math.sin(_t0 * 0.005);
    const _jefe = this.enemies.find(e => e.type === 'jefe' && !e.dead);
    this.enemies.forEach(e => {
      if (e.dead || e.type !== 'inspector') return;
      this.inspAuraGfx.lineStyle(2, 0xff3300, _pulse);
      this.inspAuraGfx.strokeCircle(e.sprite.x, e.sprite.y, 100);
      this.inspAuraGfx.fillStyle(0xff2200, _pulse * 0.05);
      this.inspAuraGfx.fillCircle(e.sprite.x, e.sprite.y, 100);
    });
    if (_jefe) {
      const _dp = 0.4 + 0.4 * Math.sin(_t0 * 0.012);
      this.towers.forEach(t => {
        if (Phaser.Math.Distance.Between(_jefe.sprite.x, _jefe.sprite.y, t.x, t.y) < 80) {
          this.dangerGfx.lineStyle(3, 0xff0000, _dp);
          this.dangerGfx.strokeCircle(t.x, t.y, 22);
        }
      });
    }

    // ── Interacciones enemigo↔torre ────────────────────────
    this.enemies.forEach(e => {
      if (e.dead) return;

      // Inspector paraliza torres cercanas (aura 100px)
      if (e.type === 'inspector') {
        this.towers.forEach(t => {
          if (Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y) < 100) {
            t._inspectorDisabled = true;
            if (Math.random() < 0.08) this.addParticle(t.x, t.y, 0xdddddd, 2, 25);
          }
        });
      }

      // Piquetero come chorizo o empanada al pasar por ellos
      if (e.type === 'piquetero') {
        for (let i = this.towers.length - 1; i >= 0; i--) {
          const t = this.towers[i];
          if ((t.type === 'chorizo' || t.type === 'empanada') && !t._eaten &&
              Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y) < 55) {
            t._eaten = true;
            const label = t.type === 'chorizo' ? '🌭 ¡Chorizo devorado!' : '🥟 ¡Empanada devorada!';
            this.flashText(label, 0xff6600, t.x, t.y - 30);
            this.addParticle(t.x, t.y, C.chorizo, 12, 40);
            sfx(this, 'hit');
            const refund = Math.floor(t.data.cost / 4);
            this.coins += refund;
            this.flashText(`+$${refund} (resto)`, C.yellow, t.x, t.y - 50);
            t.graphic.destroy();
            if (t.iconText) t.iconText.destroy();
            this.towers.splice(i, 1);
            this.updateTowerCountUI();
          }
        }
      }

      // Vegetariano bloquea quincho al pasar por él (por 1 oleada)
      if ((e.type === 'vegano' || e.type === 'vegano_gordo')) {
        this.towers.forEach(t => {
          if (t.type === 'quincho' && !t.blocked && !this.blockedQuinchos.has(t) &&
              Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y) < 55) {
            t.blocked = true;
            this.blockedQuinchos.add(t);
            t.graphic.setAlpha(0.35);
            this.flashText('🏠 ¡Quincho bloqueado!', 0x88ff88, t.x, t.y - 30);
            sfx(this, 'error');
          }
        });
      }

      // Lluvia destruye torres Brasa (fuego) al pasar por ellas
      if (e.type === 'lluvia') {
        for (let i = this.towers.length - 1; i >= 0; i--) {
          const t = this.towers[i];
          if (t.type === 'brasa' && !t._wetDestroyed &&
              Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y) < 55) {
            t._wetDestroyed = true;
            this.flashText('💧 ¡Fuego apagado!', 0x4488cc, t.x, t.y - 30);
            this.addParticle(t.x, t.y, C.rain, 12, 40);
            this.addParticle(t.x, t.y, C.smoke, 6, 50);
            sfx(this, 'error');
            const refund = Math.floor(t.data.cost / 4);
            this.coins += refund;
            this.flashText(`+$${refund} (resto)`, C.yellow, t.x, t.y - 50);
            t.graphic.destroy();
            if (t.iconText) t.iconText.destroy();
            this.towers.splice(i, 1);
            this.updateTowerCountUI();
          }
        }
      }

      // Boss destruye torres al pasar cerca
      if (e.type === 'jefe') {
        for (let i = this.towers.length - 1; i >= 0; i--) {
          const t = this.towers[i];
          if (Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, t.x, t.y) < 45) {
            this.flashText('💥 ¡Torre destruida!', 0xff2222, t.x, t.y - 30);
            this.addParticle(t.x, t.y, t.data.color, 14, 45);
            sfx(this, 'error');
            const refund = Math.floor(t.data.cost / 4);
            this.coins += refund;
            this.flashText(`+$${refund} refuerzo`, C.yellow, t.x, t.y - 48);
            t.graphic.destroy();
            if (t.iconText) t.iconText.destroy();
            this.towers.splice(i, 1);
            this.updateTowerCountUI();
            this.cameras.main.shake(150, 0.012);
          }
        }
      }
    });

    // ── Disparo de torres ───────────────────────────────────
    this.towers.forEach(t => {
      // Resetear flag al inicio de cada tick
      const disabled = t._inspectorDisabled || t.blocked;
      t._inspectorDisabled = false;
      if (!disabled) t.cooldown--;
      if (t.cooldown <= 0 && !disabled) {
        const target = this.findTarget(t);
        if (target) { this.shoot(t, target); t.cooldown = t.data.rate; }
      }
    });
    this.projectiles.forEach(p => this.moveProjectile(p));
    this.smokeParticles.forEach(s => {
      s.y -= 0.5; s.alpha -= 0.008; s.x += Math.sin(s.y * 0.05) * 0.3;
    });
    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.smokeParticles = this.smokeParticles.filter(s => s.alpha > 0);
    this.smokeParticles.forEach(s => s.g.setPosition(s.x, s.y).setAlpha(s.alpha));
    this.particles = this.particles.filter(p => {
      p.life--; p.x += p.vx; p.y += p.vy; p.vy += 0.1;
      p.g.setPosition(p.x, p.y).setAlpha(p.life / p.maxLife);
      if (p.life <= 0) { p.g.destroy(); return false; }
      return true;
    });
    this.updateUI();
  }

  moveEnemy(e, dt) {
    if (e.dead) return;
    const path = e.pathArray;
    if (e.pathIdx >= path.length) {
      e.dead = true;
      e.sprite.destroy(); e.hbBg.destroy(); e.hbFg.destroy();
      this.lives--;

      const loss = Math.min(this.score, 50);
      if (loss > 0) {
        this.score -= loss;
        this.flashText(`-${loss} pts`, 0xff2222, W - 65, H - 50);
      }
      this.updateUI();

      if (this.lives <= 0) { sfx(this, 'error'); this.endGame(false); }
      else { sfx(this, 'error'); this.cameras.main.shake(200, 0.01); }
      return;
    }
    const target = path[e.pathIdx];
    const speed = e.slow > 0 ? e.speed * 0.4 : e.speed;
    const dx = target.x - e.sprite.x, dy = target.y - e.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) { e.pathIdx++; }
    else {
      const step = speed * dt;
      e.sprite.x += (dx / dist) * step; e.sprite.y += (dy / dist) * step;
      e.sprite.setFlipX(dx < 0);
    }
    e.slow = Math.max(0, e.slow - 1);
    const bw = e.type === 'jefe' ? 48 : (e.type === 'vegano_gordo' ? 32 : 24);
    const pct = e.hp / e.maxHp;
    const ex = e.sprite.x, ey = e.sprite.y - e.sprite.height / 2 - 5;
    e.hbBg.clear(); e.hbBg.fillStyle(0x333333); e.hbBg.fillRect(ex - bw / 2, ey, bw, 4);
    e.hbFg.clear(); e.hbFg.fillStyle(pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffcc00 : 0xff2222);
    e.hbFg.fillRect(ex - bw / 2, ey, bw * pct, 4);
  }

  findTarget(tower) {
    let best = null, bestIdx = -1;
    this.enemies.forEach(e => {
      if (e.dead) return;
      const d = Phaser.Math.Distance.Between(tower.x, tower.y, e.sprite.x, e.sprite.y);
      if (d < tower.data.range && e.pathIdx > bestIdx) { bestIdx = e.pathIdx; best = e; }
    });
    return best;
  }

  shoot(tower, enemy) {
    sfx(this, 'shoot');
    this.tweens.add({
      targets: tower.graphic,
      scaleX: 1.25, scaleY: 1.25,
      yoyo: true, duration: 70
    });

    const texMap = { brasa: 'proj_brasa', chorizo: 'proj_chorizo', empanada: 'proj_empanada', quincho: 'proj_quincho' };
    const proj = this.add.image(tower.x, tower.y, texMap[tower.type]).setDepth(6);
    if (tower.type === 'empanada' || tower.type === 'chorizo') {
      this.tweens.add({ targets: proj, angle: 360, repeat: -1, duration: 400 });
    }
    const dx = enemy.sprite.x - tower.x, dy = enemy.sprite.y - tower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.projectiles.push({
      sprite: proj, vx: (dx / dist) * 220 / 60, vy: (dy / dist) * 220 / 60,
      target: enemy, type: tower.type, dmg: tower.data.dmg, dead: false,
      aoe: tower.type === 'quincho',
    });
  }

  moveProjectile(p) {
    if (p.dead) return;
    p.sprite.x += p.vx; p.sprite.y += p.vy;
    if (p.target && !p.target.dead) {
      const d = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, p.target.sprite.x, p.target.sprite.y);
      if (d < 20) { this.hitEnemy(p); return; }
    } else { p.dead = true; p.sprite.destroy(); }
    if (p.sprite.x < -20 || p.sprite.x > W + 20 || p.sprite.y < -20 || p.sprite.y > H + 20) {
      p.dead = true; p.sprite.destroy();
    }
  }

  hitEnemy(proj) {
    proj.dead = true;
    sfx(this, 'hit');
    const px = proj.sprite.x, py = proj.sprite.y;
    proj.sprite.destroy();
    const effColor = { brasa: C.ember, chorizo: C.chorizo, empanada: C.yellow, quincho: C.orange }[proj.type];
    this.addParticle(px, py, effColor, 6, 25);
    if (proj.aoe) {
      this.enemies.forEach(e => {
        if (!e.dead && Phaser.Math.Distance.Between(px, py, e.sprite.x, e.sprite.y) < 80)
          this.damageEnemy(e, proj.dmg * 0.6);
      });
      this.addParticle(px, py, C.orange, 15, 35);
      this.cameras.main.shake(80, 0.005);
    } else {
      this.damageEnemy(proj.target, proj.dmg);
      if (proj.type === 'empanada') proj.target.slow = 60;
    }
  }

  damageEnemy(enemy, dmg) {
    if (!enemy || enemy.dead) return;
    enemy.hp -= dmg;
    enemy.sprite.setTint(0xff0000);
    this.time.delayedCall(80, () => {
      if (enemy.sprite && enemy.sprite.active) enemy.sprite.clearTint();
    });
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.score += enemy.reward;
      this.coins += Math.floor(enemy.reward / 2);
      this.addParticle(enemy.sprite.x, enemy.sprite.y, C.yellow, 10, 30);
      this.flashText(`+$${Math.floor(enemy.reward / 2)}`, C.yellow, enemy.sprite.x, enemy.sprite.y - 20);
      if (enemy.spawnOnDeath) {
        for (let i = 0; i < 3; i++) {
          this.spawnEnemy({ type: 'piquetero', hp: 80, speed: enemy.speed * 1.5, reward: 0 }, enemy.pathArray, enemy.pathIdx, enemy.sprite.x + Math.random() * 40 - 20, enemy.sprite.y + Math.random() * 40 - 20);
        }
      }
      enemy.sprite.destroy(); enemy.hbBg.destroy(); enemy.hbFg.destroy();
    }
  }

  addParticle(x, y, color, count, maxLife) {
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics().setDepth(9);
      g.fillStyle(color); g.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      g.setPosition(x, y);
      const angle = Math.random() * Math.PI * 2;
      const spd = Phaser.Math.Between(1, 4);
      this.particles.push({ g, x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 2, life: maxLife, maxLife });
    }
  }

  spawnSmoke() {
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(C.smoke, 0.3); g.fillCircle(0, 0, 8);
    const sx = W - 65 + Phaser.Math.Between(-30, 30);
    g.setPosition(sx, H - 105);
    this.smokeParticles.push({ g, x: sx, y: H - 105, alpha: 0.3 });
  }

  flashText(msg, color, x = W / 2, y = H / 2 - 50) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(x, y, msg, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold',
      color: hex, stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  updateUI() {
    this.livesText.setText(`❤️ ${this.lives}`);
    this.coinsText.setText(`💰 ${this.coins}`);
    this.scoreText.setText(`⭐ ${this.score}`);
    this.towerButtons.forEach(({ key, t, label }) => {
      const canAfford = this.coins >= t.cost;
      const atMax = this.towersOfType(key) >= this.MAX_PER_TYPE;
      label.setColor(canAfford && !atMax ? '#ffdd88' : '#664444');
    });
    this.updateTowerCountUI();
  }

  endGame(win) {
    this.paused = true;
    this.scene.pause();
    this.scene.launch('End', { win, score: this.score, wave: this.wave, gs: this });
  }
}

// ── Escena: FIN ─────────────────────────────────────────────
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  init(data) { this.d = data; }
  create() {
    createControls(this);

    this.g = this.add.graphics();
    this.g.fillStyle(0x000000, 0.90); this.g.fillRect(0, 0, W, H);

    this.resTitle = this.add.text(W / 2, 200, this.d.win ? '🥩 ¡ASADO EXITOSO! 🥩' : '💀 LA PARRILLA CAYÓ 💀', {
      fontSize: '48px', fontFamily: 'monospace', fontStyle: 'bold',
      color: this.d.win ? '#ff6600' : '#ff2222', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5);

    if (this.d.win) {
      this.resTip = this.add.text(W / 2, 260, '(O no...?)', { fontSize: '14px', fontFamily: 'monospace', color: '#aaa' }).setOrigin(0.5);
    }

    this.resScore = this.add.text(W / 2, 330, `Puntuación: ${this.d.score} pts`, { fontSize: '28px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5);

    this.state = 'result';
    this.names = [];
    this.charIdx = 0;
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

    loadHS().then(list => {
      this.list = list;
    });

    this.time.delayedCall(5000, () => {
      if (this.state === 'result') {
        this.resTitle.destroy();
        this.resScore.destroy();
        if (this.resTip) this.resTip.destroy();
        this.g.clear();
        this.g.fillStyle(0x000000, 0.95); this.g.fillRect(0, 0, W, H);

        if (this.list && (this.d.score > (this.list[4]?.s || 0) || this.list.length < 5)) {
          this.state = 'enter_initials';
          this.renderInitials();
        } else {
          this.state = 'show_board';
          this.renderBoard();
        }
      }
    });
  }

  renderInitials() {
    this.initText = this.add.text(W / 2, 250, '¡NUEVO RECORD!\nIngresá tus iniciales (3 letras):', { fontSize: '22px', fontFamily: 'monospace', color: '#fff', align: 'center' }).setOrigin(0.5);
    this.chars = ['A', 'A', 'A'];
    this.curChar = 0;
    this.charDisplays = this.chars.map((c, i) => {
      return this.add.text(W / 2 - 50 + i * 50, 330, c, { fontSize: '42px', fontFamily: 'monospace', fontStyle: 'bold', color: i === 0 ? '#ff0000' : '#ffcc00' }).setOrigin(0.5);
    });
    this.add.text(W / 2, 420, 'WASD (UDLR) para letras · [B1/E] confirmar', { fontSize: '14px', fontFamily: 'monospace', color: '#888' }).setOrigin(0.5);
  }

  renderBoard() {
    if (this.initText) this.initText.destroy();
    if (this.charDisplays) this.charDisplays.forEach(c => c.destroy());

    this.add.text(W / 2, 230, 'RANKING HISTÓRICO', { fontSize: '26px', fontFamily: 'monospace', color: '#ffaa44', fontStyle: 'bold' }).setOrigin(0.5);
    if (this.list) {
      this.list.forEach((e, i) => {
        this.add.text(W / 2 - 120, 280 + i * 35, `#${i + 1} ${e.n}`, { fontSize: '22px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0, 0.5);
        this.add.text(W / 2 + 120, 280 + i * 35, `${e.s} pts`, { fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(1, 0.5);
      });
    }
    this.add.text(W / 2, 520, '[START] Volver al Menú', { fontSize: '18px', fontFamily: 'monospace', color: '#888' }).setOrigin(0.5);
  }

  update() {
    if (this.d.win && window.hardcoreMode) return;
    if (this.state === 'result') return;

    if (this.state === 'enter_initials') {
      let moved = false;
      if (pressed(this, 'P1_U') || pressed(this, 'P2_U')) { this.charIdx--; moved = true; }
      if (pressed(this, 'P1_D') || pressed(this, 'P2_D')) { this.charIdx++; moved = true; }
      if (moved) {
        if (this.charIdx < 0) this.charIdx = this.alphabet.length - 1;
        if (this.charIdx >= this.alphabet.length) this.charIdx = 0;
        this.chars[this.curChar] = this.alphabet[this.charIdx];
        this.charDisplays[this.curChar].setText(this.chars[this.curChar]);
      }

      if (pressed(this, 'P1_1') || pressed(this, 'START1')) {
        sfx(this, 'build');
        this.charDisplays[this.curChar].setColor('#ffcc00');
        this.curChar++;
        if (this.curChar >= 3) {
          this.state = 'saving';
          saveHS(this.chars.join(''), this.d.score).then(() => {
            loadHS().then(l => { this.list = l; this.state = 'show_board'; this.renderBoard(); });
          });
        } else {
          this.charIdx = this.alphabet.indexOf(this.chars[this.curChar]);
          this.charDisplays[this.curChar].setColor('#ff0000');
        }
      }
    } else if (this.state === 'show_board') {
      if (pressed(this, 'START1') || pressed(this, 'START2') || pressed(this, 'P1_1')) {
        sfx(this, 'build');
        this.scene.stop('Game');
        this.scene.start('Menu');
      }
    }
  }
}

// ── High Score helpers ──────────────────────────────────────
const HS_KEY = 'asado-arcade-top5';
async function loadHS() {
  try {
    const r = await window.platanusArcadeStorage.get(HS_KEY);
    if (r && r.found && Array.isArray(r.value)) return r.value;
  } catch (_) { }
  return [{ n: 'D10', s: 1000 }, { n: 'ASD', s: 500 }, { n: 'PLT', s: 200 }];
}
async function saveHS(name, score) {
  try {
    const list = await loadHS();
    list.push({ n: name, s: score });
    list.sort((a, b) => b.s - a.s);
    await window.platanusArcadeStorage.set(HS_KEY, list.slice(0, 5));
  } catch (_) { }
}

// ── Phaser Config ───────────────────────────────────────────
new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#1a0a00',
  parent: 'game-root',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, GameScene, EndScene],
});
