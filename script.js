const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings and state
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

let state = {
    current: 'START', // START, PLAYING, GAMEOVER
    score: 0,
    hiScore: 0,
    attempts: 1,
    frames: 0,
    gameSpeed: 6,
    levelSection: 'CUBE', // tracks upcoming obstacles mode
    gameOverTime: 0,
    spawnCooldown: 0,
    spawnIndex: 0,
    isVictory: false,
    currentPercent: 0,
    currentLevel: 1, // default
    isPractice: false,
    lastRespawnTime: 0,
    stars: parseInt(localStorage.getItem('gd_stars')) || 0,
    beatenLevels: JSON.parse(localStorage.getItem('gd_beaten') || '{}')
};

let checkpoints = [];
let globalIsHolding = false;
let currentColorIndex = parseInt(localStorage.getItem('gd_color')) || 0;
let unlockedColors = ['#4ade80']; // base color

let levelStats = JSON.parse(localStorage.getItem('gd_stats')) || {
    1: { hiScore: 0, attempts: 1 },
    2: { hiScore: 0, attempts: 1 },
    3: { hiScore: 0, attempts: 1 }
};

// Physics and Environment
const gravity = 0.6;
const groundHeight = 50;
const groundY = GAME_HEIGHT - groundHeight;

// Player Object
const player = {
    x: 100,
    y: 0,
    width: 40,
    height: 40,
    dy: 0,
    jumpForce: 10.5,
    grounded: true,
    rotation: 0,
    color: '#4ade80', // neon green
    mode: 'CUBE', // CUBE, SHIP, BALL
    isHolding: false,
    shipGravity: 0.4,
    shipThrust: 0.6,
    gravityDir: 1 // 1 for down, -1 for up (BALL mode)
};

// UI Elements
const scoreValEl = document.getElementById('score-value');
const hiScoreValEl = document.getElementById('hi-score-value');
const finalScoreEl = document.getElementById('final-score');
const attemptCountEl = document.getElementById('attempt-count');
const progressValEl = document.getElementById('progress-value');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const menuBtn = document.getElementById('menu-btn');
const restartBtn = document.getElementById('restart-btn');
const gameoverMenuBtn = document.getElementById('gameover-menu-btn');
const bgMusic = document.getElementById('bgMusic');

const practiceToggle = document.getElementById('practice-toggle');
const practiceUi = document.getElementById('practice-ui');
const addCpBtn = document.getElementById('add-cp-btn');
const remCpBtn = document.getElementById('rem-cp-btn');

const colorBtn = document.getElementById('color-btn');
const starCountEl = document.getElementById('star-count');
const rewardTextEl = document.getElementById('reward-text');

// Environment variables
let obstacles = [];

// Predefined Level sequence replacing infinite run
const LEVEL_MAP_1 = [
    // Intro CUBE basic
    'BLOCK', 'SPIKE', 'SPIKE', 'DOUBLE_SPIKE', 'BLOCK', 'PILLAR_JUMP',

    // Introducing basic mechanics
    'JUMP_PAD', 'SPIKE', 'JUMP_ORB', 'DOUBLE_SPIKE',

    // Harder mechanics
    'BLOCK_TO_ORB', 'MIX_PILLAR_PAD', 'MIX_PAD_TO_ORB',

    // Introduces Gravity CUBE
    'MIX_GRAVITY',

    // Transition to SHIP
    'PORTAL_SHIP',
    'SHIP_GAP', 'SHIP_GAP', 'PORTAL_GRAV_UP', 'SHIP_GAP', 'SHIP_GAP', 'PORTAL_GRAV_DOWN',

    // Transition to BALL
    'PORTAL_BALL',
    'BALL_OBSTACLE', 'BALL_PAD_TRAP', 'BALL_ORB_TRAP', 'BALL_FAKE_ORB_TRAP', 'BALL_PORTAL_TRAP', 'BALL_MIX_TRAP',

    // Transition to UFO
    'PORTAL_UFO',
    'UFO_TRAP', 'UFO_TRAP', 'PORTAL_GRAV_UP', 'UFO_TRAP', 'PORTAL_GRAV_DOWN',

    // Transition to WAVE
    'PORTAL_WAVE',
    'WAVE_TUNNEL', 'WAVE_TUNNEL', 'WAVE_TUNNEL', 'WAVE_TUNNEL', 'WAVE_TUNNEL',

    // Back to CUBE for final challenge
    'PORTAL_CUBE',
    'MIX_PAD_TO_ORB', 'MIX_GRAVITY',

    // FINISH
    'PORTAL_END'
];

const LEVEL_MAP_2 = [
    // Harder, faster CUBE start 
    'TRIPLE_SPIKE', 'JUMP_PAD', 'SPIKE', 'JUMP_ORB',
    'PORTAL_GRAV_UP', 'SPIKE_INV', 'SPIKE_INV', 'PORTAL_GRAV_DOWN',
    'PILLAR_JUMP', 'TRIPLE_SPIKE', 'MIX_PILLAR_PAD',

    // Hectic WAVE intro with gravity madness
    'PORTAL_WAVE',
    'WAVE_TUNNEL', 'WAVE_TUNNEL', 'PORTAL_GRAV_UP', 'WAVE_TUNNEL', 'WAVE_TUNNEL', 'PORTAL_GRAV_DOWN', 'WAVE_TUNNEL', 'WAVE_TUNNEL',

    // Rapid SHIP section with Orbs and Gravity 
    'PORTAL_SHIP',
    'SHIP_ORB_TRAP', 'PORTAL_GRAV_UP', 'SHIP_SPIKE_GAP', 'PORTAL_GRAV_DOWN', 'SHIP_ORB_TRAP', 'PORTAL_GRAV_UP', 'SHIP_SPIKE_GAP', 'PORTAL_GRAV_DOWN',

    // Brutal BALL traps
    'PORTAL_BALL',
    'BALL_HARD_ZIGZAG', 'BALL_DBL_ORB_TRAP', 'BALL_MIX_TRAP', 'BALL_FAKE_ORB_TRAP',

    // Double UFO mix 
    'PORTAL_UFO',
    'UFO_TRAP', 'PORTAL_GRAV_UP', 'UFO_TRAP', 'PORTAL_GRAV_DOWN', 'UFO_TRAP', 'PORTAL_GRAV_UP', 'UFO_TRAP', 'PORTAL_GRAV_DOWN',

    // Epic CUBE finish
    'PORTAL_CUBE',
    'BLOCK_TO_ORB', 'MIX_PAD_TO_ORB', 'MIX_GRAVITY', 'MIX_GRAVITY', 'TRIPLE_SPIKE',

    // FINISH
    'PORTAL_END'
];

const LEVEL_MAP_3 = [
    // Demon Cube
    'DOUBLE_SPIKE', 'CUBE_DEMON_TRAP', 'PILLAR_JUMP', 'CUBE_DEMON_TRAP', 'PORTAL_GRAV_UP', 'MIX_GRAVITY', 'PORTAL_GRAV_DOWN',

    // Wave
    'PORTAL_WAVE',
    'WAVE_TUNNEL', 'PORTAL_GRAV_UP', 'WAVE_TUNNEL', 'WAVE_TUNNEL', 'PORTAL_GRAV_DOWN', 'WAVE_TUNNEL',

    // Ball
    'PORTAL_BALL',
    'BALL_HARD_ZIGZAG', 'BALL_DBL_ORB_TRAP', 'PORTAL_GRAV_UP', 'BALL_MIX_TRAP', 'PORTAL_GRAV_DOWN', 'BALL_FAKE_ORB_TRAP',

    // UFO
    'PORTAL_UFO',
    'UFO_TRAP', 'PORTAL_GRAV_UP', 'UFO_TRAP', 'UFO_TRAP', 'PORTAL_GRAV_DOWN',

    // Ship
    'PORTAL_SHIP',
    'SHIP_CORRIDOR_OF_DEATH', 'PORTAL_GRAV_UP', 'SHIP_SPIKE_GAP', 'PORTAL_GRAV_DOWN', 'SHIP_ORB_TRAP', 'SHIP_CORRIDOR_OF_DEATH',

    // Cube Drop Out
    'PORTAL_CUBE',
    'CUBE_DEMON_TRAP', 'TRIPLE_SPIKE', 'TRIPLE_SPIKE',

    'PORTAL_END'
];

let ACTIVE_LEVEL_MAP = LEVEL_MAP_1;

function spawnObstacle() {
    if (state.spawnIndex >= ACTIVE_LEVEL_MAP.length) return;

    let type = ACTIVE_LEVEL_MAP[state.spawnIndex];
    state.spawnIndex++;

    if (type === 'PORTAL_END') {
        obstacles.push({
            type: 'PORTAL_END',
            x: GAME_WIDTH,
            y: 0,
            width: 80,
            height: GAME_HEIGHT,
            color: '#10b981' // emerald finish line
        });
        return;
    }

    if (type === 'BALL_OBSTACLE') {
        let sWidth = 30;
        let sHeight = 40;
        let r = Math.random();

        let color = '#ef4444'; // red spike

        if (r > 0.75) {
            // Tunnel: Top, Bottom, Top
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH, y: 50, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 300, y: groundY - sHeight, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 600, y: 50, width: sWidth, height: sHeight, color: color });
            state.spawnCooldown = 80;
        } else if (r > 0.5) {
            // Tunnel: Bottom, Top, Bottom
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH, y: groundY - sHeight, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 300, y: 50, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 600, y: groundY - sHeight, width: sWidth, height: sHeight, color: color });
            state.spawnCooldown = 80;
        } else if (r > 0.25) {
            // Triple spike
            let yPos = Math.random() > 0.5 ? 50 : groundY - sHeight;
            let spikeType = yPos === 50 ? 'SPIKE_INV' : 'SPIKE';
            obstacles.push({ type: spikeType, x: GAME_WIDTH, y: yPos, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: spikeType, x: GAME_WIDTH + sWidth, y: yPos, width: sWidth, height: sHeight, color: color });
            obstacles.push({ type: spikeType, x: GAME_WIDTH + sWidth * 2, y: yPos, width: sWidth, height: sHeight, color: color });
            state.spawnCooldown = 30;
        } else {
            // normal single
            let yPos = Math.random() > 0.5 ? 50 : groundY - sHeight;
            let spikeType = yPos === 50 ? 'SPIKE_INV' : 'SPIKE';
            obstacles.push({ type: spikeType, x: GAME_WIDTH, y: yPos, width: sWidth, height: sHeight, color: color });
        }
        return;
    }

    if (type === 'BALL_PAD_TRAP') {
        let pWidth = 40; let pHeight = 10;
        let sWidth = 30; let sHeight = 40;

        // Pad on the floor
        obstacles.push({ type: 'JUMP_PAD', x: GAME_WIDTH, y: groundY - pHeight, width: pWidth, height: pHeight, color: '#eab308', isActive: true });

        // Big spikes on the floor to jump over
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 150, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 180, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 210, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });

        // A ceiling spike just to make it tricky
        obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 180, y: 50, width: sWidth, height: sHeight, color: '#ef4444' });

        state.spawnCooldown = 90;
        return;
    }

    if (type === 'BALL_FAKE_ORB_TRAP') {
        let sWidth = 30; let sHeight = 40;

        // Zkrácená verze bodáků pro fake orb
        for (let i = 0; i < 8; i++) {
            // na zemi uvolníme první tři pro odraz
            if (i > 2) {
                obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
            }
            // na stropě uvolníme hned 5 bodáků na začátku
            if (i > 4) {
                obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + (i * sWidth), y: 50, width: sWidth, height: sHeight, color: '#ef4444' });
            }
        }

        // 1 pravý orb, 1 falešný orb hned za ním, aby zmátl hráče v kuličce
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 140, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });
        // fake orb (black and red danger) hodne oddaleny na reakci
        obstacles.push({ type: 'DEATH_ORB', x: GAME_WIDTH + 320, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#ef4444', used: false });

        state.spawnCooldown = 130;
        return;
    }

    if (type === 'BALL_ORB_TRAP') {
        let sWidth = 30; let sHeight = 40;

        // Zkrácená verze bodáků pro snazší překonání
        for (let i = 0; i < 10; i++) {
            // na zemi uvolníme první tři pro odraz
            if (i > 2) {
                obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
            }
            // na stropě uvolníme hned 5 bodáků na začátku
            if (i > 4) {
                obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + (i * sWidth), y: 50, width: sWidth, height: sHeight, color: '#ef4444' });
            }
        }

        // Orb nahoru pro přeskočení mezer
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 140, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 400, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });

        state.spawnCooldown = 150;
        return;
    }

    if (type === 'CUBE_DEMON_TRAP') {
        let sWidth = 30; let sHeight = 40;

        // Pad to bounce
        obstacles.push({ type: 'JUMP_PAD', x: GAME_WIDTH, y: groundY - 10, width: 40, height: 10, color: '#eab308', isActive: true });

        // Massive spike wall below you as you bounce
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 100, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 140, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 180, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 220, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });

        // Two Orbs in the air. You must hit both.
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 120, y: groundY - 120, width: 30, height: 30, color: '#a855f7', used: false });
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 200, y: groundY - 120, width: 30, height: 30, color: '#a855f7', used: false });

        state.spawnCooldown = 110;
        return;
    }

    if (type === 'SHIP_CORRIDOR_OF_DEATH') {
        // Tight continuous passage with spikes on the edges.
        let space = 130;

        // top block
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: 0, width: 50, height: 120, color: '#4c1d95' }); // deep purple
        obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 10, y: 120, width: 30, height: 40, color: '#ef4444' });

        // bottom block
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: 120 + space, width: 50, height: groundY - (120 + space), color: '#4c1d95' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 10, y: 120 + space - 40, width: 30, height: 40, color: '#ef4444' });

        state.spawnCooldown = 40;
        return;
    }

    if (type === 'BALL_PORTAL_TRAP') {
        let pWidth = 40;

        // Zeď na zemi
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH + 300, y: groundY - 150, width: 40, height: 150, color: '#ef4444' });

        // Žlutý portál před zdí
        obstacles.push({ type: 'PORTAL_GRAV_UP', x: GAME_WIDTH + 150, y: groundY - 120, width: pWidth, height: 120, color: '#facc15' }); // yellow

        // Zeď na stropě kousek za tím
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH + 600, y: 50, width: 40, height: 150, color: '#ef4444' });

        // Modrý portál před stropní zdí
        obstacles.push({ type: 'PORTAL_GRAV_DOWN', x: GAME_WIDTH + 450, y: 50, width: pWidth, height: 120, color: '#3b82f6' }); // blue

        state.spawnCooldown = 160;
        return;
    }

    if (type === 'BALL_MIX_TRAP') {
        let pWidth = 40;
        let sWidth = 30; let sHeight = 40;

        // 1. Dlouhá vyvýšená platforma obklopená ostny
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: groundY - 100, width: 250, height: 100, color: '#10b981', isPlatform: true });
        for (let i = 0; i < 3; i++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 250 + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // 2. Na konci platformy je žlutý gravity portál
        obstacles.push({ type: 'PORTAL_GRAV_UP', x: GAME_WIDTH + 250, y: groundY - 100 - 120, width: pWidth, height: 120, color: '#facc15' });

        // 3. Po průletu portálem nahoru čeká na stropě Orb
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 450, y: 120, width: 30, height: 30, color: '#eab308', used: false });

        // 4. Pokud se neodrazí z orbu, narazí do modré stěny na stropě
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH + 550, y: 50, width: 40, height: 120, color: '#ef4444' });

        // 5. Dole v bezpečí na zemi modrý portál pro vrácení
        obstacles.push({ type: 'PORTAL_GRAV_DOWN', x: GAME_WIDTH + 650, y: groundY - 120, width: pWidth, height: 120, color: '#3b82f6' });

        state.spawnCooldown = 200;
        return;
    }

    if (type === 'BALL_HARD_ZIGZAG') {
        let sWidth = 30;
        let sHeight = 40;
        let gap = 200; // Extrémně krátký čas na prokliknutí na hranu

        // 1. Spikes na zemi, musíš skočit na strop
        for (let j = 0; j < 3; j++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + j * sWidth, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // 2. Spikes na stropě hned potom, musíš se vrátit dolů
        for (let j = 0; j < 3; j++) {
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + gap + j * sWidth, y: 50, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // 3. Spikes na zemi potřetí
        for (let j = 0; j < 3; j++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + gap * 2 + j * sWidth, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // 4. Spikes naposledy na stropě
        for (let j = 0; j < 3; j++) {
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + gap * 3 + j * sWidth, y: 50, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        state.spawnCooldown = 120; // Okamžitě na to navazuje další sekce!
        return;
    }

    if (type === 'BALL_DBL_ORB_TRAP') {
        let sWidth = 30; let sHeight = 40;

        // Dlouhá podlaha z bodáků (7 kusů = 210px) - nedá se na ni šlápnout
        for (let i = 0; i < 7; i++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // Strop je taky smrt - žádné kutálení nikde
        for (let i = 0; i < 7; i++) {
            obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + (i * sWidth), y: 50, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // Hráč MUSÍ perfektně trefit trojici Orbů, kterými se přehoupne mezi smrtí
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 60, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 140, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 220, y: (groundY + 50) / 2 - 15, width: 30, height: 30, color: '#eab308', used: false });

        state.spawnCooldown = 90;
        return;
    }

    if (type === 'SHIP_GAP') {
        let gapSize = 140;
        // The playable area is groundY (e.g., 350). Gap starts min 20, max groundY - gapSize - 20
        let gapY = Math.random() * (groundY - gapSize - 40) + 20;

        let width = 50;
        let color = '#3b82f6'; // blue pillars

        // Top pillar
        obstacles.push({
            type: 'BLOCK',
            x: GAME_WIDTH,
            y: 0,
            width: width,
            height: gapY,
            color: color
        });

        // Bottom pillar
        obstacles.push({
            type: 'BLOCK',
            x: GAME_WIDTH,
            y: gapY + gapSize,
            width: width,
            height: groundY - (gapY + gapSize),
            color: color
        });
        return; // Gap adds two blocks, so we stop here
    }

    if (type === 'SHIP_SPIKE_GAP') {
        let gapSize = 160;
        // Generování masivních bodáků trčící ze stropu a ze země s mezerou uprostřed
        let gapY = Math.random() * (groundY - gapSize - 80) + 40;

        let width = 70; // Širší bodáky
        let color = '#ef4444'; // červená jako bodáky

        // Top massive spike
        obstacles.push({
            type: 'SPIKE_INV',
            x: GAME_WIDTH,
            y: 0,
            width: width,
            height: gapY,
            color: color
        });

        // Bottom massive spike
        obstacles.push({
            type: 'SPIKE',
            x: GAME_WIDTH,
            y: gapY + gapSize,
            width: width,
            height: groundY - (gapY + gapSize),
            color: color
        });

        state.spawnCooldown = 40; // odstup mezi spiky v lodičce
        return;
    }

    if (type === 'SHIP_ORB_TRAP') {
        let wallW = 50;

        // Velká překážka ze stropu, nutí loď podletět nízko nad zemí
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: 0, width: wallW, height: 180, color: '#2563eb' });
        obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 10, y: 180, width: 30, height: 40, color: '#ef4444' });

        // Velká překážka na zemi. Zvětšená mezera na 270 (posunuto o další blok)
        let baseHeight = 160;
        let diffY = groundY - baseHeight; // 190
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH + 270, y: diffY, width: wallW, height: baseHeight, color: '#2563eb' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 280, y: diffY - 40, width: 30, height: 40, color: '#ef4444' });

        // Záchranný Orb posunutý aby seděl před druhý sloup
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 145, y: groundY - 145, width: 30, height: 30, color: '#eab308', used: false });

        // Prodloužen cooldown po celé sekvenci, aby byl čas po přeletu
        state.spawnCooldown = 110;
        return;
    }

    // Handle new types
    if (type === 'JUMP_ORB') {
        let sWidth = 30;
        let sHeight = 40;
        let numSpikes = 8;

        // Base spikes that force you to jump over them using the orb
        for (let i = 0; i < numSpikes; i++) {
            obstacles.push({
                type: 'SPIKE',
                x: GAME_WIDTH + (i * sWidth),
                y: groundY - sHeight,
                width: sWidth,
                height: sHeight,
                color: '#ef4444'
            });
        }

        let size = 30;
        obstacles.push({
            type: 'ORB',
            x: GAME_WIDTH + (sWidth * numSpikes / 2) - (size / 2),
            y: groundY - 110, // Floating above the center of the spikes
            width: size,
            height: size,
            color: '#eab308', // yellow ring
            used: false
        });
        return;
    }

    if (type === 'BLOCK_TO_ORB') {
        // Obří kombinace: 1. dlouhý blok (platforma) -> 2. ostny dole -> 3. orb ve vzduchu
        let blockWidth = 120;
        let blockHeight = 80;
        let pColor = '#10b981'; // emerald

        // Nástupní platforma
        obstacles.push({
            type: 'BLOCK',
            x: GAME_WIDTH,
            y: groundY - blockHeight,
            width: blockWidth,
            height: blockHeight,
            color: pColor,
            isPlatform: true
        });

        let sWidth = 30;
        let sHeight = 40;
        let numSpikes = 6;

        // Past (série bodáků hned za platformou)
        for (let i = 0; i < numSpikes; i++) {
            obstacles.push({
                type: 'SPIKE',
                x: GAME_WIDTH + blockWidth + (i * sWidth),
                y: groundY - sHeight,
                width: sWidth,
                height: sHeight,
                color: '#ef4444'
            });
        }

        // Záchranný Orb ve výšce na který hráč skočí z okraje platformy
        let orbSize = 30;
        obstacles.push({
            type: 'ORB',
            x: GAME_WIDTH + blockWidth + (sWidth * numSpikes / 2) - (orbSize / 2),
            y: groundY - blockHeight - 90,
            width: orbSize,
            height: orbSize,
            color: '#eab308', // yellow
            used: false
        });

        // Add extra free space (cooldown frames) after this huge trap
        state.spawnCooldown = 90;
        return;
    }

    if (type === 'JUMP_PAD') {
        let width = 40;
        let height = 15; // thin pad on the ground
        obstacles.push({
            type: 'PAD',
            x: GAME_WIDTH,
            y: groundY - height,
            width: width,
            height: height,
            color: '#facc15', // bright yellow
            used: false
        });

        // Pad is usually followed by some danger or empty space
        state.spawnCooldown = 20;
        return;
    }

    if (type === 'MIX_PAD_TO_ORB') {
        // Obří mix: Žlutý Pad dole hodí hráče do vzduchu, tam ho chytí Orb a pošle přes rudou zeď smrti
        let padW = 40;
        let padH = 15;
        let wallW = 50;
        let wallH = 170; // velmi vysoká zeď, přeskočit bez orbu je nemožné
        let orbSize = 30;

        // 1. the Pad
        obstacles.push({ type: 'PAD', x: GAME_WIDTH, y: groundY - padH, width: padW, height: padH, color: '#facc15', used: false });

        // 2. the Wall following later
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH + 260, y: groundY - wallH, width: wallW, height: wallH, color: '#ef4444' });

        // 3. the Orb in the mid-air between them, high up
        obstacles.push({ type: 'ORB', x: GAME_WIDTH + 140, y: groundY - 210, width: orbSize, height: orbSize, color: '#eab308', used: false });

        state.spawnCooldown = 110;
        return;
    }

    if (type === 'MIX_PILLAR_PAD') {
        // Střední mix: Smaragdový sloup, na jehož konci číhá Pad... který tě přehodí přes sérii špiček
        let pWidth = 140;
        let pHeight = 90;
        let padH = 15;
        let sWidth = 30;
        let sHeight = 40;

        // 1. Nástupní sloup
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: groundY - pHeight, width: pWidth, height: pHeight, color: '#10b981', isPlatform: true });

        // 2. Pad usazený na horním okraji sloupu úplně vzadu!
        obstacles.push({ type: 'PAD', x: GAME_WIDTH + pWidth - 40, y: groundY - pHeight - padH, width: 40, height: padH, color: '#facc15', used: false });

        // 3. Pekelné údolí hned za sloupem
        for (let i = 0; i < 5; i++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + pWidth + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        state.spawnCooldown = 90;
        return;
    }

    if (type === 'MIX_GRAVITY') {
        let pWidth = 40;
        let sWidth = 30;
        let sHeight = 40;
        let ceilingY = 50;

        // 1. Zlutý portál na zemi (Portal nahoru)
        obstacles.push({ type: 'PORTAL_GRAV_UP', x: GAME_WIDTH, y: groundY - 120, width: pWidth, height: 120, color: '#facc15' }); // yellow

        // 2. Ostny nahoře (ceiling), s OBŘÍM rozestupem od portálu i mezi sebou
        obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 500, y: ceilingY, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE_INV', x: GAME_WIDTH + 900, y: ceilingY, width: sWidth, height: sHeight, color: '#ef4444' });

        // Zabiják dole, abysme nespadli omylem dolu mimo portal (jáma nyní ještě širší)
        for (let i = 0; i < 40; i++) {
            obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + 80 + (i * sWidth), y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        }

        // 3. Modrý portál zpět dolů, znatelně dál, aby měl hráč čas
        obstacles.push({ type: 'PORTAL_GRAV_DOWN', x: GAME_WIDTH + 1300, y: ceilingY, width: pWidth, height: 120, color: '#3b82f6' }); // blue

        state.spawnCooldown = 240;
        return;
    }

    if (type === 'UFO_TRAP') {
        let gapSize = 130;
        let gapY = Math.random() * (groundY - gapSize - 40) + 20;

        let width = 50;
        let color = '#ec4899'; // pinkish/magenta pillars for UFO

        // Top pillar
        obstacles.push({
            type: 'BLOCK',
            x: GAME_WIDTH,
            y: 0,
            width: width,
            height: gapY,
            color: color
        });

        // Bottom pillar
        obstacles.push({
            type: 'BLOCK',
            x: GAME_WIDTH,
            y: gapY + gapSize,
            width: width,
            height: groundY - (gapY + gapSize),
            color: color
        });

        state.spawnCooldown = 90;
        return;
    }

    if (type === 'WAVE_TUNNEL') {
        let gapSize = 150;
        // Vytvoř klikatý CikCak styl nahoru a dolů (pseudo-náhodně)
        // Wave je velmi rychlá v horizontále, potřebuje těsnější ale delší blocky
        let gapY = Math.random() * (groundY - gapSize - 60) + 30;
        let width = 60;
        let color = '#2dd4bf'; // tyrkysová pro Wave themering

        // Stropní blok
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: 0, width: width, height: gapY, color: color });
        // Spodní blok
        obstacles.push({ type: 'BLOCK', x: GAME_WIDTH, y: gapY + gapSize, width: width, height: groundY - (gapY + gapSize), color: color });

        // Zkratíme cooldown, ať z toho vyleze těsný zubatý tunel
        state.spawnCooldown = 45;
        return;
    }

    if (type === 'PILLAR_JUMP') {
        let width = 60;
        let pHeight = 80;
        obstacles.push({
            type: 'BLOCK', // We can treat it as a block for drawing/collision
            x: GAME_WIDTH,
            y: groundY - pHeight,
            width: width,
            height: pHeight,
            color: '#10b981', // emerald color
            isPlatform: true // allows landing on top
        });
        return;
    }

    if (type === 'DOUBLE_SPIKE') {
        let sWidth = 30;
        let sHeight = 40;
        // First spike
        obstacles.push({
            type: 'SPIKE',
            x: GAME_WIDTH,
            y: groundY - sHeight,
            width: sWidth,
            height: sHeight,
            color: '#ef4444'
        });
        // Second spike immediately after
        obstacles.push({
            type: 'SPIKE',
            x: GAME_WIDTH + sWidth, // connected
            y: groundY - sHeight,
            width: sWidth,
            height: sHeight,
            color: '#ef4444'
        });
        return;
    }

    if (type === 'TRIPLE_SPIKE') {
        let sWidth = 30;
        let sHeight = 40;
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + sWidth, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        obstacles.push({ type: 'SPIKE', x: GAME_WIDTH + sWidth * 2, y: groundY - sHeight, width: sWidth, height: sHeight, color: '#ef4444' });
        return;
    }

    let isAnyPortal = type.includes('PORTAL');
    // Vary size slightly
    let width = isAnyPortal ? 40 : (type === 'SPIKE' ? 30 : 40);
    // Všechny portály nyní zabírají výšku celé obrazovky, čímž se opravuje podlet/nadlet
    let height = isAnyPortal ? GAME_HEIGHT : 40;

    let color = '#f59e0b';
    if (type === 'SPIKE' || type === 'SPIKE_INV') color = '#ef4444';
    if (type === 'PORTAL_SHIP') color = '#d946ef'; // pinkish
    if (type === 'PORTAL_CUBE') color = '#06b6d4'; // cyan
    if (type === 'PORTAL_BALL') color = '#f97316'; // orange
    if (type === 'PORTAL_UFO') color = '#ec4899'; // magenta portal
    if (type === 'PORTAL_WAVE') color = '#2dd4bf'; // teal portal
    if (type === 'PORTAL_GRAV_UP') color = '#facc15'; // yellow portal
    if (type === 'PORTAL_GRAV_DOWN') color = '#3b82f6'; // blue portal

    // Portal sits perfectly on the ground
    let yPos = groundY - height;
    if (isAnyPortal) yPos = 0; // span from top for ALL portals to prevent missing
    else if (type === 'SPIKE_INV') yPos = 50;

    let obstacle = {
        type: type,
        x: GAME_WIDTH,
        y: yPos,
        width: width,
        height: height,
        color: color
    };

    obstacles.push(obstacle);
}

// --- Game Logic functions --- //

function init() {
    // Basic setup
    bindEvents();
    requestAnimationFrame(gameLoop);
}

function saveCheckpoint() {
    if (!state.isPractice || state.current !== 'PLAYING') return;

    // Přidáme vizuální kostičku (krystal) do pole překážek ještě před uložením stavu
    obstacles.push({
        type: 'CHECKPOINT_MARKER',
        x: player.x + player.width / 2 - 15,
        y: player.y + player.height / 2 - 15,
        width: 30,
        height: 30,
        color: '#4ade80'
    });

    // Deep copy player, state and obstacles
    checkpoints.push({
        player: JSON.parse(JSON.stringify(player)),
        stateObj: JSON.parse(JSON.stringify(state)),
        obstacles: JSON.parse(JSON.stringify(obstacles))
    });

    // Malý vizuální efekt na hráči (bliknutí)
    player.color = '#fff';
    setTimeout(() => {
        if (player.mode === 'SHIP') player.color = '#4ade80';
        else player.color = '#4ade80';
    }, 100);
}

function removeLastCheckpoint() {
    if (!state.isPractice || state.current !== 'PLAYING') return;
    if (checkpoints.length > 0) {
        checkpoints.pop();

        // Odstranit marker posledního checkpointu ze světa
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].type === 'CHECKPOINT_MARKER') {
                obstacles.splice(i, 1);
                break;
            }
        }

        // Malý vizuální efekt na hráči (červené bliknutí)
        player.color = '#ef4444';
        setTimeout(() => { player.color = '#4ade80'; }, 100);
    }
}

function loadLastCheckpoint() {
    if (checkpoints.length === 0) {
        startGame(state.currentLevel); // plný restart
        return;
    }

    let cp = checkpoints[checkpoints.length - 1];

    // Restore z deep copy
    Object.assign(player, JSON.parse(JSON.stringify(cp.player)));
    Object.assign(state, JSON.parse(JSON.stringify(cp.stateObj)));
    obstacles = JSON.parse(JSON.stringify(cp.obstacles));

    state.current = 'PLAYING';

    // Obnovit stav přesně podle toho, jestli hráč zrovna fyzicky drží tlačítko
    player.isHolding = globalIsHolding;

    // Flash obrazovky / hráče k označení respawnu
    player.color = '#eab308'; // žlutá
    setTimeout(() => { player.color = '#4ade80'; }, 300);

    state.lastRespawnTime = Date.now();
}

function update() {
    if (state.current === 'RESPAWNING') {
        if (Date.now() - state.gameOverTime > 300) {
            loadLastCheckpoint();
        }
        return;
    }

    if (state.current !== 'PLAYING') return;

    // Player physics
    if (player.mode === 'CUBE') {
        player.dy += gravity * player.gravityDir;
        player.y += player.dy;

        let onPlatform = false;

        // Check platform collisions FIRST
        for (let obs of obstacles) {
            if (obs.isPlatform) {
                // If moving down and bottom of player crosses top of platform
                if (
                    player.gravityDir === 1 &&
                    player.dy >= 0 &&
                    player.y + player.height >= obs.y &&
                    player.y + player.height - player.dy <= obs.y + 15 &&
                    player.x + player.width > obs.x &&
                    player.x < obs.x + obs.width
                ) {
                    player.y = obs.y - player.height;
                    player.dy = 0;
                    player.grounded = true;
                    onPlatform = true;
                    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
                }
                // If moving up and top of player crosses bottom of platform
                else if (
                    player.gravityDir === -1 &&
                    player.dy <= 0 &&
                    player.y <= obs.y + obs.height &&
                    player.y - player.dy >= obs.y + obs.height - 15 &&
                    player.x + player.width > obs.x &&
                    player.x < obs.x + obs.width
                ) {
                    player.y = obs.y + obs.height;
                    player.dy = 0;
                    player.grounded = true;
                    onPlatform = true;
                    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
                }
            }
        }

        let ceilingY = 50;
        // Ground/ceiling collision for CUBE
        if (player.gravityDir === 1) {
            if (!onPlatform && player.y + player.height >= groundY) {
                player.y = groundY - player.height;
                player.dy = 0;
                player.grounded = true;
                player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
            } else if (!onPlatform) {
                player.grounded = false;
                player.rotation += 0.12;
            }
        } else {
            // Inverted gravity collision
            if (!onPlatform && player.y <= ceilingY) {
                player.y = ceilingY;
                player.dy = 0;
                player.grounded = true;
                player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
            } else if (!onPlatform) {
                player.grounded = false;
                player.rotation -= 0.12; // rotate opposite visually?
            }
        }
    } else if (player.mode === 'SHIP') {
        if (player.isHolding) {
            player.dy -= player.shipThrust * player.gravityDir;
        } else {
            player.dy += player.shipGravity * player.gravityDir;
        }

        // Clamp velocity (ale plynule brzdíme, pokud jsme vystřeleni orbem nad limit!)
        let thrustLimit = 7;
        if (player.dy > thrustLimit) {
            player.dy -= 0.5; // plynulé zpomalení z rychlého pádu
            if (player.dy < thrustLimit) player.dy = thrustLimit;
        } else if (player.dy < -thrustLimit) {
            player.dy += 0.5; // plynulé zpomalení z orbového výstřelu
            if (player.dy > -thrustLimit) player.dy = -thrustLimit;
        }

        player.y += player.dy;
        player.rotation = player.dy * 0.08 * player.gravityDir; // tilt ship based on vertical speed depending on gravity

        let shipCeilingY = player.gravityDir === -1 ? 50 : 0;

        // Ground and ceiling collision
        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
            player.dy = 0;
        } else if (player.y <= shipCeilingY) {
            player.y = shipCeilingY;
            player.dy = 0;
        }
    } else if (player.mode === 'BALL') {
        // Ball physics: drops up or down
        player.dy += (gravity * 1.2) * player.gravityDir;
        player.y += player.dy;

        let ballCeilingY = 50;
        let onPlatform = false;

        // Check platform collisions FIRST
        for (let obs of obstacles) {
            if (obs.isPlatform) {
                // If moving down and bottom of player crosses top of platform
                if (
                    player.gravityDir === 1 &&
                    player.dy >= 0 &&
                    player.y + player.height >= obs.y &&
                    player.y + player.height - player.dy <= obs.y + 15 &&
                    player.x + player.width > obs.x &&
                    player.x < obs.x + obs.width
                ) {
                    player.y = obs.y - player.height;
                    player.dy = 0;
                    player.grounded = true;
                    onPlatform = true;
                }
                // If moving up and top of player crosses bottom of platform
                else if (
                    player.gravityDir === -1 &&
                    player.dy <= 0 &&
                    player.y <= obs.y + obs.height &&
                    player.y - player.dy >= obs.y + obs.height - 15 &&
                    player.x + player.width > obs.x &&
                    player.x < obs.x + obs.width
                ) {
                    player.y = obs.y + obs.height;
                    player.dy = 0;
                    player.grounded = true;
                    onPlatform = true;
                }
            }
        }

        // Ground/ceiling collision
        if (!onPlatform && player.y + player.height >= groundY) {
            if (player.gravityDir === 1) {
                player.y = groundY - player.height;
                player.dy = 0;
                player.grounded = true;
            }
        } else if (!onPlatform && player.y <= ballCeilingY) {
            if (player.gravityDir === -1) {
                player.y = ballCeilingY;
                player.dy = 0;
                player.grounded = true;
            }
        } else if (!onPlatform) {
            player.grounded = false;
        }

        // Rolling rotation
        if (player.grounded) {
            player.rotation += (player.gravityDir === 1 ? 0.15 : -0.15);
        } else {
            player.rotation += (player.gravityDir === 1 ? 0.05 : -0.05);
        }
    } else if (player.mode === 'UFO') {
        // UFO physics: drops down continuously, jumps on click
        player.dy += (gravity * 0.8) * player.gravityDir;
        if (player.dy > 8) player.dy = 8;
        if (player.dy < -8) player.dy = -8;

        player.y += player.dy;

        let ufoCeilingY = player.gravityDir === -1 ? 50 : 0;

        // Ground/ceiling collision
        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
            player.dy = 0;
            player.grounded = true;
        } else if (player.y <= ufoCeilingY) {
            player.y = ufoCeilingY;
            player.dy = 0;
        } else {
            player.grounded = false;
        }

        // UFO rotation (slight tilt based on vertical speed)
        player.rotation = player.dy * 0.05 * player.gravityDir;
    } else if (player.mode === 'WAVE') {
        // Wave nemá gravitaci padání zrychlující časem, jde o konstantní šikmé směry.
        // Snížená rychlost na žádost uživatele pro plavnější/méně ostré stoupání a klesání
        let waveSpeed = state.gameSpeed * 0.85;

        if (player.isHolding) {
            player.dy = -waveSpeed * player.gravityDir; // letí šikmo mírněji nahoru
        } else {
            player.dy = waveSpeed * player.gravityDir; // letí šikmo mírněji dolů
        }

        player.y += player.dy;

        let waveCeilingY = player.gravityDir === -1 ? 50 : 0;

        // Zastavení o hrany - ve standardním GD často wave exploduje o strop a zem
        // Zde si udržíme plynulost zastavením namísto smrti ke zjednodušení učebnice
        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
            player.dy = 0;
            player.grounded = true;
        } else if (player.y <= waveCeilingY) {
            player.y = waveCeilingY;
            player.dy = 0;
        } else {
            player.grounded = false;
        }

        // Značně vizuální rotace odpovídající přímo dráze šipky (cca 45°)
        let targetRotation = player.dy < 0 ? -Math.PI / 4 : Math.PI / 4;
        player.rotation += (targetRotation - player.rotation) * 0.3; // vyhlazování odrážení
    }

    state.frames++;

    // Obstacle logic
    // Increase game speed slightly over time
    if (state.frames % 600 === 0) {
        state.gameSpeed += 0.5;
    }

    // Spawning is now only delayed by cooldown, basic rate doesn't need to scale down since map is fixed
    if (state.spawnCooldown > 0) {
        state.spawnCooldown--;
    } else {
        // Base spawn spacing, you can adjust this logic, but lets keep it mostly static since it's a fixed map
        let spawnRate = 80; // pevný rozestup mezi překážkami pro spolehlivý design
        if (state.frames % spawnRate === 0) {
            spawnObstacle();
        }
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= state.gameSpeed;

        // Custom collision detection (AABB with some tolerance)
        let pPadX = 6; // Player padding
        let pPadY = 6;
        let oPadX = 0; // Obstacle padding
        let oPadY = 0;

        if (obs.type === 'SPIKE') {
            oPadX = 10; // Zúží hitbox bodáku z boku
            // Pro normální bodák (špička nahoře, základna dole):
            // Posune vrchní hranu hitboxu níž (oPadY se přičte k obs.y)
            oPadY = 16; 
        } else if (obs.type === 'SPIKE_INV') {
            oPadX = 10;
            // Pro obrácený bodák (špička dole, základna nahoře):
            // Zde bychom ideálně potřebovali odříznout spodní část, ale pro zjednodušení
            // AABB použijeme obecné zmenšení. 
            oPadY = 16;
        }

        if (
            obs.type !== 'ORB' &&
            obs.type !== 'DEATH_ORB' &&
            obs.type !== 'CHECKPOINT_MARKER' &&
            player.x + pPadX < obs.x + obs.width - oPadX &&
            player.x + player.width - pPadX > obs.x + oPadX &&
            // U SPIKE (base is bottom), top is obs.y -> my oPadY zkracujeme top hranu. 
            // U SPIKE_INV (base is top), bottom is obs.y + obs.height. Zjednodušeně posunujeme obě hrany o trochu:
            player.y + pPadY < obs.y + obs.height - (obs.type==='SPIKE'?0:oPadY) &&
            player.y + player.height - pPadY > obs.y + (obs.type==='SPIKE_INV'?0:oPadY)
        ) {
            if (obs.type === 'PAD') {
                // Auto boost jump heavily and mark used. Platí nyní pro všechny, nejen kostku.
                if (!obs.used) {
                    player.dy = -player.jumpForce * 1.4 * player.gravityDir; // super high jump
                    player.grounded = false;
                    obs.used = true;
                    obs.color = '#ef4444'; // turns red to signify it has been used
                }
            } else {
                // If it's a platform/block and we are ON it (or rolling under it depending on gravity), skip death
                let isStandingOnIt = obs.isPlatform && player.grounded && (
                    (player.gravityDir === 1 && Math.abs((player.y + player.height) - obs.y) < 2) ||
                    (player.gravityDir === -1 && Math.abs(player.y - (obs.y + obs.height)) < 2)
                );

                if (!isStandingOnIt) {
                    if (obs.type === 'PORTAL_END') {
                        levelComplete();
                        return; // Stop updating after win
                    } else if (obs.type.includes('PORTAL')) {
                        // Change mode on portal hit
                        if (obs.type === 'PORTAL_SHIP' && player.mode !== 'SHIP') {
                            player.mode = 'SHIP';
                            player.gravityDir = 1;
                            player.y -= 10; // small bump to avoid clipping floor with ship nose
                        } else if (obs.type === 'PORTAL_CUBE' && player.mode !== 'CUBE') {
                            player.mode = 'CUBE';
                            player.gravityDir = 1;
                        } else if (obs.type === 'PORTAL_BALL' && player.mode !== 'BALL') {
                            player.mode = 'BALL';
                            player.gravityDir = 1;
                        } else if (obs.type === 'PORTAL_UFO' && player.mode !== 'UFO') {
                            player.mode = 'UFO';
                            player.gravityDir = 1;
                        } else if (obs.type === 'PORTAL_WAVE' && player.mode !== 'WAVE') {
                            player.mode = 'WAVE';
                            player.gravityDir = 1;
                        } else if (obs.type === 'PORTAL_GRAV_UP') {
                            player.gravityDir = -1;
                        } else if (obs.type === 'PORTAL_GRAV_DOWN') {
                            player.gravityDir = 1;
                        }
                    } else {
                        gameOver();
                        return; // Stop updating after collision
                    }
                }
            }
        }

        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--;
        }
    }

    // Percentage update
    let targetPercent = (state.spawnIndex / ACTIVE_LEVEL_MAP.length) * 100;
    if (state.isVictory) targetPercent = 100;
    else if (targetPercent > 99) targetPercent = 99; // Cap at 99% until beat

    if (targetPercent > state.currentPercent) {
        state.currentPercent += 0.05; // fill up gradually
        if (state.currentPercent > targetPercent) state.currentPercent = targetPercent;
    }
    progressValEl.textContent = Math.floor(state.currentPercent);

    // Score updates every x frames roughly
    if (state.frames % 10 === 0) {
        state.score++;
        scoreValEl.textContent = state.score;
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw background/floor
    ctx.fillStyle = '#1e293b'; // slate color
    ctx.fillRect(0, groundY, GAME_WIDTH, groundHeight);

    // Draw neon line for floor edge
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(GAME_WIDTH, groundY);
    ctx.stroke();

    // If BALL mode, or inverted gravity, draw ceiling boundary
    if (player.mode === 'BALL' || state.levelSection === 'BALL' || player.gravityDir === -1) {
        ctx.fillStyle = '#1e293b'; // slate background chunk up top
        ctx.fillRect(0, 0, GAME_WIDTH, 50);

        ctx.strokeStyle = '#f97316'; // orange neon line
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(GAME_WIDTH, 50);
        ctx.stroke();
    }

    ctx.shadowBlur = 0; // reset shadow just in case

    // Draw player
    ctx.save();
    // Move to center of player to rotate properly
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);

    // Obrať vizualizaci modelů lodičky a ufo pro prevenci letu kabinkou dolů, když jsme přehození gravitací!
    if (player.gravityDir === -1 && (player.mode === 'SHIP' || player.mode === 'UFO')) {
        ctx.scale(1, -1);
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color === '#111111' ? '#ef4444' : player.color; // Demon skin má červenou auru

    if (player.mode === 'CUBE') {
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

        // Inner box detail
        ctx.fillStyle = '#0f172a';
        ctx.shadowBlur = 0;
        ctx.fillRect(-player.width / 4, -player.height / 4, player.width / 2, player.height / 2);

        // Demon Ikonka
        if (player.color === '#111111') {
            ctx.fillStyle = '#ef4444'; // Red glowing eyes
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            // Oči
            ctx.fillRect(-10, -10, 6, 4);
            ctx.fillRect(4, -10, 6, 4);
            // Zuby/Úsměv
            ctx.fillRect(-8, 2, 16, 3);
            ctx.fillRect(-8, 5, 3, 3);
            ctx.fillRect(5, 5, 3, 3);
            
            // Neonový rám
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);
        }

    } else if (player.mode === 'SHIP') {
        // Draw ship shaped polygon
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0); // nose
        ctx.lineTo(-player.width / 2, player.height / 2); // bottom tail
        ctx.lineTo(-player.width / 4, 0); // inner tail
        ctx.lineTo(-player.width / 2, -player.height / 2); // top tail
        ctx.closePath();
        ctx.fill();

        // If holding, draw flame
        if (player.isHolding) {
            ctx.fillStyle = '#ef4444'; // red flame
            ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(-player.width / 2, -player.height / 4);
            ctx.lineTo(-player.width, 0); // flame tip
            ctx.lineTo(-player.width / 2, player.height / 4);
            ctx.closePath();
            ctx.fill();
        }

        if (player.color === '#111111') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.stroke(); // Nakreslí červený okraj na lodi
            // Oči
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-5, -6, 4, 3);
            ctx.fillRect(8, -6, 4, 3);
        }
    } else if (player.mode === 'BALL') {
        // Draw a circle for the ball
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(0, 0, player.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner detail so we can see it rotating
        ctx.fillStyle = '#0f172a';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, player.width / 4, 0, Math.PI); // Half inner circle
        ctx.fill();

        // Add a line inside to make spin very obvious
        ctx.strokeStyle = player.color === '#111111' ? '#ef4444' : '#0f172a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-player.width / 2, 0);
        ctx.lineTo(player.width / 2, 0);
        ctx.stroke();

        if (player.color === '#111111') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, player.width / 2, 0, Math.PI * 2);
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.stroke(); // Červený okraj koule
        }
    } else if (player.mode === 'UFO') {
        ctx.fillStyle = player.color;
        // Draw saucer base (ellipse-like)
        ctx.beginPath();
        ctx.ellipse(0, 5, player.width / 2 + 5, player.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw dome (glass)
        ctx.fillStyle = '#38bdf8'; // light blue dome
        ctx.beginPath();
        ctx.arc(0, -player.height / 6, player.width / 2 - 5, Math.PI, 0); // half circle top
        ctx.fill();

        // Add outline to dome
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else if (player.mode === 'WAVE') {
        // Vykreslíme malý kompaktní trojúhelník - Šipku
        ctx.fillStyle = player.color;

        ctx.beginPath();
        ctx.moveTo(player.width / 2 + 5, 0); // Ostrá špička dopředu (pravá strana)
        ctx.lineTo(-player.width / 2 + 5, player.height / 2 - 5);  // Levý dolní roh
        ctx.lineTo(-player.width / 4, 0);    // Vnitřní drobný výřez
        ctx.lineTo(-player.width / 2 + 5, -player.height / 2 + 5); // Levý horní roh
        ctx.closePath();
        ctx.fill();

        // Svítící linka na zadku šipky napodobující zážeh
        ctx.strokeStyle = player.color === '#111111' ? '#ef4444' : '#2dd4bf'; // tyrkysová nebo červená
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-player.width / 2 + 5, player.height / 2 - 5);
        ctx.lineTo(-player.width / 4, 0);
        ctx.lineTo(-player.width / 2 + 5, -player.height / 2 + 5);
        ctx.stroke();
        
        if (player.color === '#111111') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(player.width / 2 + 5, 0);
            ctx.lineTo(-player.width / 2 + 5, player.height / 2 - 5);
            ctx.lineTo(-player.width / 2 + 5, -player.height / 2 + 5);
            ctx.closePath();
            ctx.stroke(); // Červený obrys šipky
        }
    }

    ctx.restore();

    // Draw obstacles
    for (let obs of obstacles) {
        ctx.fillStyle = obs.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = obs.color;

        if (obs.type === 'SPIKE') {
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y); // top tip
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height); // bottom right
            ctx.lineTo(obs.x, obs.y + obs.height); // bottom left
            ctx.closePath();
            ctx.fill();

            // Outer glowing line
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.type === 'SPIKE_INV') {
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y + obs.height); // bottom tip
            ctx.lineTo(obs.x + obs.width, obs.y); // top right
            ctx.lineTo(obs.x, obs.y); // top left
            ctx.closePath();
            ctx.fill();

            // Outer glowing line
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.type === 'BLOCK') {
            // Block
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Inner block details
            ctx.fillStyle = '#0f172a';
            ctx.shadowBlur = 0;
            // Add safe padding to draw inner detail to prevent negative width
            let innerPaddingX = Math.min(8, obs.width / 4);
            let innerPaddingY = Math.min(8, obs.height / 4);
            ctx.fillRect(obs.x + innerPaddingX, obs.y + innerPaddingY, obs.width - innerPaddingX * 2, obs.height - innerPaddingY * 2);

            ctx.strokeStyle = obs.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === 'DEATH_ORB') {
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a'; // black body
            ctx.fill();

            ctx.strokeStyle = obs.color; // red line
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = obs.color; // red middle dot
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw an outer ring for interaction radius indicator
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // faint red
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 100, 0, Math.PI * 2);
            ctx.stroke();
        } else if (obs.type === 'ORB') {
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            ctx.strokeStyle = obs.color;
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw an outer ring for interaction radius indicator
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)'; // faint yellow
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 100, 0, Math.PI * 2);
            ctx.stroke();
        } else if (obs.type === 'PAD') {
            // Drawn as a sleek yellow plate on the ground
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.roundRect(obs.x, obs.y, obs.width, obs.height, [8, 8, 0, 0]); // top rounded
            ctx.fill();

            // Upward pointing inner arrows
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(obs.x + 10, obs.y + obs.height - 4);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + 4);
            ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height - 4);
            ctx.stroke();
        } else if (obs.type.includes('PORTAL')) {
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // inner glow
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 4, obs.height / 2 - 15, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (obs.type === 'CHECKPOINT_MARKER') {
            ctx.save();
            ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
            ctx.rotate(Math.PI / 4); // otočíme o 45 stupňů (do tvaru diamantu)
            ctx.fillStyle = 'rgba(74, 222, 128, 0.4)'; // poloprůhledná zelená
            ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
            ctx.strokeStyle = '#22c55e'; // plná zelená ohrada
            ctx.lineWidth = 2;
            ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
            ctx.restore();
        } else if (obs.type === 'PORTAL_END') {
            // Draw a huge glowing stripe for finish
            ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 4;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

            // Text "FINISH" inside the portal
            ctx.save();
            ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
            // rotate 90 deg down
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#fff';
            ctx.font = '24px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("FINISH", 0, 0);
            ctx.restore();
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Interaction / Events --- //

function togglePause() {
    if (state.current === 'PLAYING') {
        state.current = 'PAUSED';
        bgMusic.pause();
        pauseScreen.classList.add('active');
        pauseBtn.style.display = 'none';
    } else if (state.current === 'PAUSED') {
        state.current = 'PLAYING';
        bgMusic.play();
        pauseScreen.classList.remove('active');
        pauseBtn.style.display = 'flex';
    }
}

function returnToMenu() {
    state.current = 'START';
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active'); // OPRAVA: Skrytí Game Over obrazovky po stisknutí tlačítka Menu
    startScreen.classList.add('active');
    bgMusic.pause();
    bgMusic.currentTime = 0;
    pauseBtn.style.display = 'none';

    // Clear canvas basic view
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, GAME_WIDTH, groundHeight);

    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(GAME_WIDTH, groundY);
    ctx.stroke();
}

function startGame(levelNumber) {
    // Odstraní "focus" (zaměření) z HTML tlačítek. Pokud hráč klikne myší na tlačítko levelu a pak mačká mezerník k výskoku, prohlížeč si pamatuje posledně kliknuté tlačítko a při puštění mezerníku by úroveň restartoval!
    if (document.activeElement) {
        document.activeElement.blur();
    }

    if (levelNumber) {
        state.currentLevel = levelNumber;
    }

    if (state.currentLevel === 1) ACTIVE_LEVEL_MAP = LEVEL_MAP_1;
    else if (state.currentLevel === 2) ACTIVE_LEVEL_MAP = LEVEL_MAP_2;
    else ACTIVE_LEVEL_MAP = LEVEL_MAP_3; // Demon level!

    state.isPractice = practiceToggle.checked;

    // Načteme pokroky pro daný level z paměti
    if (!levelStats[state.currentLevel]) levelStats[state.currentLevel] = { hiScore: 0, attempts: 1 };
    state.hiScore = levelStats[state.currentLevel].hiScore;
    state.attempts = levelStats[state.currentLevel].attempts;

    state.current = 'PLAYING';
    state.score = 0;
    state.frames = 0;
    state.levelSection = 'CUBE';
    state.spawnCooldown = 0;
    state.spawnIndex = 0;
    state.currentPercent = 0;
    scoreValEl.textContent = state.score;
    hiScoreValEl.textContent = state.hiScore;
    attemptCountEl.textContent = state.attempts;
    progressValEl.textContent = '0';

    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    pauseBtn.style.display = 'flex';

    if (state.isPractice) {
        practiceUi.style.display = 'block';
        checkpoints = []; // Vyprázdnit staré checkpointy
    } else {
        practiceUi.style.display = 'none';
    }

    const title = gameOverScreen.querySelector('h1');
    title.textContent = "Game Over";
    title.style.color = ""; // reset color

    if (state.isVictory) {
        state.isVictory = false;
    }

    // Reset player
    player.y = groundY - player.height;
    player.dy = 0;
    player.rotation = 0;
    player.grounded = true;
    player.mode = 'CUBE';
    player.isHolding = false;
    player.gravityDir = 1; // RESET gravitace na stardardní směrem dolů

    // Reset obstacles and speed
    obstacles = [];
    if (state.currentLevel === 1) state.gameSpeed = 6;
    else if (state.currentLevel === 2) state.gameSpeed = 7.5;
    else state.gameSpeed = 9; // Demon speed!

    // Play background music optionally
    bgMusic.currentTime = 0;
    if (state.isPractice) {
        bgMusic.pause(); // V practice modu budeme potichu, aby to nerušilo, nebo můžete dodat custom loop
    } else {
        let playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => { console.log('Auto-play was prevented', error) });
        }
    }
}

function gameOver() {
    if (state.isPractice) {
        // Anti-Death Loop: Pokud hráč zemře fyzicky do 250ms od oživení (není v lidských silách zareagovat a zachránit to)
        if (state.lastRespawnTime && Date.now() - state.lastRespawnTime < 250) {
            removeLastCheckpoint();
        }

        state.current = 'RESPAWNING';
        state.gameOverTime = Date.now();
        state.attempts++;
        levelStats[state.currentLevel].attempts = state.attempts;
        localStorage.setItem('gd_stats', JSON.stringify(levelStats));

        attemptCountEl.textContent = state.attempts;
        return; // Nevyvolávat Game Over obrazovku
    }

    state.current = 'GAMEOVER';
    state.gameOverTime = Date.now();
    state.attempts++;

    levelStats[state.currentLevel].attempts = state.attempts;

    if (state.score > state.hiScore) {
        state.hiScore = state.score;
        levelStats[state.currentLevel].hiScore = state.hiScore;
        hiScoreValEl.textContent = state.hiScore;
    }

    localStorage.setItem('gd_stats', JSON.stringify(levelStats));

    if (rewardTextEl) rewardTextEl.style.display = 'none'; // Schovat text odměny pokud umřete

    finalScoreEl.textContent = state.score;
    attemptCountEl.textContent = state.attempts;

    gameOverScreen.classList.add('active');
    pauseBtn.style.display = 'none';
    bgMusic.pause();
}

function updateColorsStore() {
    unlockedColors = ['#4ade80']; // Zelená (default)
    let colorNames = ['Zelená'];
    if (state.stars >= 1) { unlockedColors.push('#3b82f6'); colorNames.push('Modrá'); }
    if (state.stars >= 2) { unlockedColors.push('#a855f7'); colorNames.push('Fialová'); }
    if (state.stars >= 3) { unlockedColors.push('#ef4444'); colorNames.push('Červená'); unlockedColors.push('#eab308'); colorNames.push('Zlatá'); }

    if (state.beatenLevels && state.beatenLevels[3]) {
        unlockedColors.push('#111111');
        colorNames.push('Demon Ikonka');
    }

    if (currentColorIndex >= unlockedColors.length) currentColorIndex = 0;
    player.color = unlockedColors[currentColorIndex];
    if (colorBtn) {
        // Hraj pro dalsi text should only appear if the user selected the last currently unlocked skin, but there are more skins to unlock!
        let hasMaxSkins = (state.stars >= 3 && state.beatenLevels[3]);
        let lockStr = (!hasMaxSkins && currentColorIndex === unlockedColors.length - 1) ? ' (Hraj pro další)' : '';
        colorBtn.textContent = `Barva: ${colorNames[currentColorIndex]}${lockStr}`;
    }
}

function levelComplete() {
    state.current = 'GAMEOVER';
    state.gameOverTime = Date.now();
    state.isVictory = true;
    state.currentPercent = 100;
    progressValEl.textContent = '100';

    if (state.score > state.hiScore) {
        state.hiScore = state.score;
        levelStats[state.currentLevel].hiScore = state.hiScore;
        hiScoreValEl.textContent = state.hiScore;
        localStorage.setItem('gd_stats', JSON.stringify(levelStats));
    }

    finalScoreEl.textContent = state.score;
    attemptCountEl.textContent = state.attempts;

    const title = gameOverScreen.querySelector('h1');
    title.textContent = "LEVEL BEATEN!";
    title.style.color = "#4ade80"; // victory distinct green color

    if (rewardTextEl) rewardTextEl.style.display = 'none';

    // Reward system
    if (!state.isPractice && !state.beatenLevels[state.currentLevel]) {
        let reward = state.currentLevel; // Lvl 1 = 1 star, Lvl 2 = 2 stars
        state.stars += reward;
        state.beatenLevels[state.currentLevel] = true;

        localStorage.setItem('gd_stars', state.stars);
        localStorage.setItem('gd_beaten', JSON.stringify(state.beatenLevels));

        if (rewardTextEl) {
            rewardTextEl.textContent = `+${reward} ⭐ Odměna za 1. vítězství!`;
            rewardTextEl.style.display = 'block';
        }
        if (starCountEl) starCountEl.textContent = state.stars;
        updateColorsStore(); // refresh unlocks
    }

    gameOverScreen.classList.add('active');
    pauseBtn.style.display = 'none';
    bgMusic.pause();
}

function handleInputDown() {
    globalIsHolding = true;
    if (state.current === 'GAMEOVER') {
        // Zabrani okamzitemu restartu pri zmacknuti klavesy zrovna ve chvili smrti ("death skip")
        if (Date.now() - state.gameOverTime > 500) {
            startGame(state.currentLevel);
        }
        return;
    }

    if (state.current === 'PAUSED') {
        return;
    }

    if (state.current === 'PLAYING') {
        player.isHolding = true;
        // Handle jump for cube, ball, ufo, and now ship (orbs!)
        if (player.mode === 'CUBE' || player.mode === 'BALL' || player.mode === 'UFO' || player.mode === 'SHIP') {
            let orbHit = false;
            // Check distance to any unused orb
            for (let obs of obstacles) {
                if ((obs.type === 'ORB' || obs.type === 'DEATH_ORB') && !obs.used) {
                    let px = player.x + player.width / 2;
                    let py = player.y + player.height / 2;
                    let ox = obs.x + obs.width / 2;
                    let oy = obs.y + obs.height / 2;
                    let dist = Math.hypot(px - ox, py - oy);

                    if (dist < 100) { // Active radius defined by faint ring
                        if (obs.type === 'DEATH_ORB') {
                            obs.used = true;
                            gameOver();
                            return; // Stop jumping logic
                        }

                        if (player.mode === 'CUBE' || player.mode === 'UFO' || player.mode === 'SHIP') {
                            // Ship dostane o trochu silnější kopanec přes orb, vypadá to efektně a pomůže přeletět stěnu
                            let burst = player.mode === 'SHIP' ? 1.5 : 1;
                            player.dy = (-player.jumpForce * burst) * player.gravityDir; // boost!
                        } else if (player.mode === 'BALL') {
                            player.gravityDir *= -1; // Ball flips gravity mid-air on orb hit!
                            player.dy = 0;
                        }
                        player.grounded = false;
                        obs.used = true;
                        obs.color = '#4ade80'; // flash green to show used
                        orbHit = true;
                        break;
                    }
                }
            }

            if (!orbHit) {
                if (player.mode === 'UFO') {
                    player.dy = (-player.jumpForce * 0.8) * player.gravityDir; // Flappy bird jump
                    player.grounded = false;
                } else if (player.grounded) {
                    if (player.mode === 'CUBE') {
                        player.dy = (-player.jumpForce) * player.gravityDir;
                        player.grounded = false;
                    } else if (player.mode === 'BALL') {
                        // Ball flip gravity only if we didn't hit an orb this frame
                        player.gravityDir *= -1;
                        player.grounded = false;
                    }
                }
            }
        }
    }
}

function handleInputUp() {
    globalIsHolding = false;
    player.isHolding = false;
}

function bindEvents() {
    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        // Dev Secret: Ctrl/Cmd + K unlocks everything
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
            e.preventDefault();
            state.beatenLevels = { 1: true, 2: true, 3: true };
            state.stars = 6;
            localStorage.setItem('gd_stars', state.stars);
            localStorage.setItem('gd_beaten', JSON.stringify(state.beatenLevels));
            updateColorsStore();
            if (starCountEl) starCountEl.textContent = state.stars;
            alert('Secret Dev Code: Unlocking all levels and skins!');
            return;
        }

        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            e.preventDefault(); // Zabrání posouvání stránky
            if (state.current === 'START') {
                startGame(state.currentLevel); // Start the currently selected/default level
                return;
            }
            handleInputDown();
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
            togglePause();
        }
        if ((e.key === 'z' || e.key === 'Z') && state.isPractice) {
            saveCheckpoint();
        }
        if ((e.key === 'x' || e.key === 'X') && state.isPractice) {
            removeLastCheckpoint();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            e.preventDefault();
            handleInputUp();
        }
    });

    // Mouse/Touch listener on canvas
    canvas.addEventListener('mousedown', handleInputDown);
    canvas.addEventListener('mouseup', handleInputUp);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // prevent zoom etc
        handleInputDown();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleInputUp();
    }, { passive: false });

    // Restart button click
    restartBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // so it doesn't trigger canvas click
        // Only allow manual restart jump if not blocked by death-skip timer
        if (state.current !== 'GAMEOVER' || Date.now() - state.gameOverTime > 500) {
            startGame(state.currentLevel);
        }
    });

    if (gameoverMenuBtn) {
        gameoverMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            returnToMenu();
        });
    }

    // Pause buttons
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });

    resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        returnToMenu();
    });

    // Level selection buttons
    const levelBtns = document.querySelectorAll('.level-btn');
    levelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            let selectedLevel = parseInt(btn.getAttribute('data-level'));
            // Kliknutí na level rovnou hru spustí
            startGame(selectedLevel);
        });
    });

    // Practice UI Buttons
    addCpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveCheckpoint();
    });
    remCpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeLastCheckpoint();
    });

    if (colorBtn) {
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentColorIndex = (currentColorIndex + 1) % unlockedColors.length;
            localStorage.setItem('gd_color', currentColorIndex);
            updateColorsStore();
        });
    }
}

// Start execution
if (starCountEl) starCountEl.textContent = state.stars;
updateColorsStore();
init();
