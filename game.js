// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ========== AUDIO SYSTEM ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let bgmGain = null;
let sfxGain = null;
let currentBGM = null;
let bgmStarted = false;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioCtx();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.3;
    bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(audioCtx.destination);
}

// Sound effect: short synthesized sound
function playSFX(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);

    switch (type) {
        case 'shoot':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'hit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'damage':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'jump':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
        case 'heal':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
        case 'gameover':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
            break;
        case 'clear':
            osc.type = 'sine';
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                osc.frequency.setValueAtTime(freq, now + i * 0.15);
            });
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.setValueAtTime(0.4, now + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
            break;
        case 'powerup':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.1);
            osc.frequency.setValueAtTime(659, now + 0.2);
            osc.frequency.setValueAtTime(880, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
}

// BGM system using oscillators
function startBGM(type) {
    if (!audioCtx) return;
    stopBGM();

    const tempo = type === 'boss2' ? 160 : type === 'boss' ? 140 : 120;
    const beatDuration = 60 / tempo;

    const melodies = {
        normal: [
            261, 329, 392, 329, 261, 329, 392, 523,
            440, 392, 349, 329, 261, 329, 392, 261
        ],
        boss: [
            165, 196, 220, 165, 196, 247, 220, 165,
            196, 220, 262, 247, 220, 196, 165, 196
        ],
        boss2: [
            130, 155, 165, 196, 130, 155, 165, 220,
            130, 165, 196, 262, 247, 220, 196, 165
        ]
    };

    const melody = melodies[type] || melodies.normal;
    let noteIndex = 0;
    let bgmInterval;

    function playNote() {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // Melody
        const osc1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        osc1.connect(g1);
        g1.connect(bgmGain);
        osc1.type = type === 'normal' ? 'triangle' : 'sawtooth';
        osc1.frequency.value = melody[noteIndex % melody.length];
        g1.gain.setValueAtTime(0.2, now);
        g1.gain.exponentialRampToValueAtTime(0.01, now + beatDuration * 0.9);
        osc1.start(now);
        osc1.stop(now + beatDuration * 0.9);

        // Bass (every 2 beats)
        if (noteIndex % 2 === 0) {
            const osc2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            osc2.connect(g2);
            g2.connect(bgmGain);
            osc2.type = 'sine';
            osc2.frequency.value = melody[noteIndex % melody.length] / 2;
            g2.gain.setValueAtTime(0.15, now);
            g2.gain.exponentialRampToValueAtTime(0.01, now + beatDuration * 1.8);
            osc2.start(now);
            osc2.stop(now + beatDuration * 1.8);
        }

        // Percussion (kick-like)
        if (noteIndex % 4 === 0) {
            const osc3 = audioCtx.createOscillator();
            const g3 = audioCtx.createGain();
            osc3.connect(g3);
            g3.connect(bgmGain);
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(150, now);
            osc3.frequency.exponentialRampToValueAtTime(30, now + 0.1);
            g3.gain.setValueAtTime(0.3, now);
            g3.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc3.start(now);
            osc3.stop(now + 0.1);
        }

        noteIndex++;
    }

    playNote();
    bgmInterval = setInterval(playNote, beatDuration * 1000);
    currentBGM = { interval: bgmInterval, type };
}

function stopBGM() {
    if (currentBGM) {
        clearInterval(currentBGM.interval);
        currentBGM = null;
    }
}

// Game state
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('gravityHighScore')) || 0;
let cameraY = 0;
let lowestPlayerY = 0;
let gameCleared = false;
let fullAuto = false; // Full-auto gun after boss 1
let fullAutoTimer = 0;
let mouseDown = false; // Track mouse held down

// Mouse position for aiming
let mouseX = 0;
let mouseY = 0;

// Goal and Boss settings
const GOAL_HEIGHT_1 = 350; // 350m boss 1
const GOAL_HEIGHT_2 = 750; // 750m boss 2
let bossSpawned = false;
let bossDefeated = false;
let boss2Spawned = false;
let boss2Defeated = false;

// Boss
const boss = {
    x: 0,
    y: 0,
    baseY: 0, // Reference Y for hovering
    width: 150,
    height: 150,
    hp: 1000,
    maxHp: 1000,
    speed: 3,
    direction: 1,
    velocityX: 0,
    velocityY: 0,
    active: false,
    attackTimer: 0,
    isCharging: false,
    chargeSpeed: 10,
    attackPattern: 0, // 0=hover, 1=dive, 2=sweep, 3=slam
    hoverAngle: 0 // For floating animation
};

// Update high score display
document.getElementById('high-score').textContent = highScore;

// Load enemy image
const enemyImage = new Image();
enemyImage.src = 'images/enemy.png';
let enemyImageLoaded = false;
enemyImage.onload = () => {
    enemyImageLoaded = true;
};

// Load gun image
const gunImage = new Image();
gunImage.src = 'images/gun.png';
let gunImageLoaded = false;
gunImage.onload = () => {
    gunImageLoaded = true;
};

// Load boss image
const bossImage = new Image();
bossImage.src = 'images/doragon syotaro.png';
let bossImageLoaded = false;
bossImage.onload = () => {
    bossImageLoaded = true;
};

// Load boss 2 image
const boss2Image = new Image();
boss2Image.src = 'images/doragon.png';
let boss2ImageLoaded = false;
boss2Image.onload = () => {
    boss2ImageLoaded = true;
};

// Boss 2 (Stronger)
const boss2 = {
    x: 0,
    y: 0,
    baseY: 0,
    width: 250,
    height: 250,
    hp: 3000,
    maxHp: 3000,
    speed: 6,
    direction: 1,
    velocityX: 0,
    velocityY: 0,
    active: false,
    attackTimer: 0,
    isCharging: false,
    chargeSpeed: 18,
    attackPattern: 0,
    hoverAngle: 0
};

// Player
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 50,
    velocityX: 0,
    velocityY: 0,
    speed: 8,
    jumpPower: -18,
    gravity: 0.6,
    onGround: false,
    canDoubleJump: true,
    color: '#00f5ff',
    glowColor: 'rgba(0, 245, 255, 0.5)',
    facingRight: true,
    hp: 10,
    maxHp: 10,
    invincible: false,
    invincibleTimer: 0
};

// Ammo system
let ammo = 0;
let bullets = [];
const bulletSpeed = 15;
const bulletSize = 8;

// Ammo items on platforms
let ammoItems = [];
const ammoItemSize = 25;
const ammoSpawnChance = 0.4; // 40% chance to spawn ammo on platform

// Heal items (dropped by boss)
let healItems = [];
const healItemSize = 20;
const healDropChance = 0.15; // 15% chance to drop heal on boss hit

// Platforms
let platforms = [];
const platformColors = [
    { main: '#ff6b6b', glow: 'rgba(255, 107, 107, 0.4)' },
    { main: '#4ecdc4', glow: 'rgba(78, 205, 196, 0.4)' },
    { main: '#ffe66d', glow: 'rgba(255, 230, 109, 0.4)' },
    { main: '#95e1d3', glow: 'rgba(149, 225, 211, 0.4)' },
    { main: '#ff8a5c', glow: 'rgba(255, 138, 92, 0.4)' },
    { main: '#a8e6cf', glow: 'rgba(168, 230, 207, 0.4)' },
    { main: '#dda0dd', glow: 'rgba(221, 160, 221, 0.4)' },
    { main: '#87ceeb', glow: 'rgba(135, 206, 235, 0.4)' }
];

// Enemies
let enemies = [];
const enemySize = 50;
const enemySpawnChance = 0.3; // 30% chance to spawn enemy on platform

// Stars for background
let stars = [];

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    f: false
};

let canShoot = true;

// Mouse event listeners
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mouseDown = true;
        if (gameRunning && canShoot) {
            shoot();
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        mouseDown = false;
    }
});

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (key === ' ' || e.code === 'Space') {
        keys.space = true;
        e.preventDefault();
    }
    if (key === 'f') {
        keys.f = true;
        if (gameRunning && canShoot) {
            shoot();
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (key === ' ' || e.code === 'Space') keys.space = false;
    if (key === 'f') {
        keys.f = false;
    }
});

// Calculate angle to mouse
function getAngleToMouse() {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    return Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);
}

// Shoot function - shoots towards mouse cursor
function shoot() {
    // Unlimited ammo at boss stage or full-auto mode, otherwise need ammo
    if (!bossSpawned && !fullAuto && ammo <= 0) return;

    canShoot = false;

    // Only consume ammo if not at boss stage and not full auto
    if (!bossSpawned && !fullAuto) {
        ammo--;
        updateAmmoDisplay();
    }

    const angle = getAngleToMouse();
    const bullet = {
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        velocityX: Math.cos(angle) * bulletSpeed,
        velocityY: Math.sin(angle) * bulletSpeed
    };
    bullets.push(bullet);
    playSFX('shoot');

    // Full auto: reset canShoot quickly
    if (fullAuto) {
        setTimeout(() => { canShoot = true; }, 80); // Fast fire rate
    } else {
        setTimeout(() => { canShoot = true; }, 200); // Normal fire rate
    }
}

// Update ammo display
function updateAmmoDisplay() {
    if (fullAuto) {
        document.getElementById('ammo').textContent = 'AUTO';
    } else if (bossSpawned || boss2Spawned) {
        document.getElementById('ammo').textContent = '∞';
    } else {
        document.getElementById('ammo').textContent = ammo;
    }
}

// Update HP display
function updateHPDisplay() {
    const hpPercent = (player.hp / player.maxHp) * 100;
    document.getElementById('hp-bar').style.width = hpPercent + '%';
    document.getElementById('hp-text').textContent = player.hp + '/' + player.maxHp;
}

// Initialize platforms
function initPlatforms() {
    platforms = [];
    enemies = [];
    ammoItems = [];

    // Starting platform (ground)
    platforms.push({
        x: canvas.width / 2 - 150,
        y: canvas.height - 100,
        width: 300,
        height: 20,
        color: platformColors[0]
    });

    // Generate initial platforms
    for (let i = 1; i < 20; i++) {
        generatePlatform(canvas.height - 100 - i * 120, i > 3); // No enemies on first 3 platforms
    }
}

function generatePlatform(y, canSpawnEnemy = true) {
    const width = 80 + Math.random() * 120;
    const x = Math.random() * (canvas.width - width);
    const colorIndex = Math.floor(Math.random() * platformColors.length);

    const platform = {
        x: x,
        y: y,
        width: width,
        height: 15,
        color: platformColors[colorIndex]
    };

    platforms.push(platform);

    // Spawn enemy on platform with certain chance
    if (canSpawnEnemy && Math.random() < enemySpawnChance && width >= 100) {
        spawnEnemy(platform);
    }

    // Spawn ammo item on platform with certain chance
    if (Math.random() < ammoSpawnChance) {
        spawnAmmoItem(platform);
    }
}

// Spawn ammo item on a platform
function spawnAmmoItem(platform) {
    const item = {
        x: platform.x + Math.random() * (platform.width - ammoItemSize),
        y: platform.y - ammoItemSize,
        width: ammoItemSize,
        height: ammoItemSize
    };
    ammoItems.push(item);
}

// Spawn enemy on a platform
function spawnEnemy(platform) {
    const enemy = {
        x: platform.x + platform.width / 2 - enemySize / 2,
        y: platform.y - enemySize,
        width: enemySize,
        height: enemySize,
        platformX: platform.x,
        platformWidth: platform.width,
        speed: 1 + Math.random() * 1.5,
        direction: Math.random() < 0.5 ? 1 : -1
    };
    enemies.push(enemy);
}

// Initialize stars
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 3 - canvas.height * 2,
            size: Math.random() * 3 + 1,
            brightness: Math.random(),
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// Initialize game
function initGame() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 160;
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    player.hp = player.maxHp;
    player.invincible = false;
    player.invincibleTimer = 0;

    score = 0;
    cameraY = 0;
    lowestPlayerY = player.y;
    ammo = 0;
    bullets = [];
    healItems = [];

    // Reset boss
    bossSpawned = false;
    bossDefeated = false;
    gameCleared = false;
    fullAuto = false;
    fullAutoTimer = 0;
    boss.active = false;
    boss.hp = boss.maxHp;
    boss.velocityX = 0;
    boss.velocityY = 0;
    boss.attackPattern = 0;
    boss.hoverAngle = 0;
    boss.attackTimer = 0;

    // Reset boss 2
    boss2Spawned = false;
    boss2Defeated = false;
    boss2.active = false;
    boss2.hp = boss2.maxHp;
    boss2.velocityX = 0;
    boss2.velocityY = 0;
    boss2.attackPattern = 0;
    boss2.hoverAngle = 0;
    boss2.attackTimer = 0;

    initPlatforms();
    initStars();

    document.getElementById('score').textContent = '0';
    updateHPDisplay();
    updateAmmoDisplay();
    document.getElementById('clear-screen').classList.add('hidden');
}

// Update player
function updatePlayer() {
    // Horizontal movement
    if (keys.a) {
        player.velocityX = -player.speed;
        player.facingRight = false;
    } else if (keys.d) {
        player.velocityX = player.speed;
        player.facingRight = true;
    } else {
        player.velocityX *= 0.85; // Friction
    }

    // Jump (W key or Space) - supports double jump
    if (keys.w || keys.space) {
        if (player.onGround) {
            player.velocityY = player.jumpPower;
            player.onGround = false;
            player.canDoubleJump = true;
            playSFX('jump');
        } else if (player.canDoubleJump) {
            player.velocityY = player.jumpPower;
            player.canDoubleJump = false;
            playSFX('jump');
        }
        keys.w = false; // Prevent holding
        keys.space = false;
    }

    // Apply gravity
    player.velocityY += player.gravity;

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Screen wrapping
    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }

    // Reset ground state
    player.onGround = false;

    // Platform collision
    for (const platform of platforms) {
        const screenY = platform.y - cameraY;

        if (player.velocityY >= 0 &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height >= platform.y - cameraY &&
            player.y + player.height <= platform.y - cameraY + platform.height + player.velocityY) {

            player.y = platform.y - cameraY - player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    }

    // Update camera to always follow player (both up and down)
    const targetScreenY = canvas.height / 2.5;
    const playerScreenY = player.y;

    // Camera follows player both up and down
    if (playerScreenY < targetScreenY) {
        const diff = targetScreenY - playerScreenY;
        cameraY -= diff;
        player.y = targetScreenY;
    } else if (playerScreenY > canvas.height / 1.5 && cameraY < 0) {
        // Follow player down (but not below start position)
        const diff = playerScreenY - canvas.height / 1.5;
        cameraY += diff;
        player.y = canvas.height / 1.5;
        // Don't let camera go below start
        if (cameraY > 0) cameraY = 0;
    }

    // Update score (max 800m for boss 2 floor)
    const currentHeight = Math.floor(-cameraY / 10);
    score = Math.max(score, Math.min(currentHeight, 800));
    document.getElementById('score').textContent = score;

    // Generate new platforms as player goes up
    const highestPlatform = Math.min(...platforms.map(p => p.y));

    // Check if we should spawn boss 1 platform
    if (!bossSpawned && score >= GOAL_HEIGHT_1 - 50) {
        // Create boss arena with multiple platforms
        const bossPlatformY = highestPlatform - 200;

        // Main ground platform (wide)
        platforms.push({
            x: canvas.width / 2 - 300,
            y: bossPlatformY,
            width: 600,
            height: 30,
            color: { main: '#ff0000', glow: 'rgba(255, 0, 0, 0.6)' },
            isBossPlatform: true
        });

        // Left middle platform
        platforms.push({
            x: 30,
            y: bossPlatformY - 150,
            width: 180,
            height: 20,
            color: { main: '#ff4444', glow: 'rgba(255, 68, 68, 0.5)' },
            isBossPlatform: true
        });

        // Right middle platform
        platforms.push({
            x: canvas.width - 210,
            y: bossPlatformY - 150,
            width: 180,
            height: 20,
            color: { main: '#ff4444', glow: 'rgba(255, 68, 68, 0.5)' },
            isBossPlatform: true
        });

        // Center high platform
        platforms.push({
            x: canvas.width / 2 - 100,
            y: bossPlatformY - 300,
            width: 200,
            height: 20,
            color: { main: '#ff6600', glow: 'rgba(255, 102, 0, 0.5)' },
            isBossPlatform: true
        });

        // Left high platform
        platforms.push({
            x: 60,
            y: bossPlatformY - 400,
            width: 150,
            height: 20,
            color: { main: '#ff6600', glow: 'rgba(255, 102, 0, 0.5)' },
            isBossPlatform: true
        });

        // Right high platform
        platforms.push({
            x: canvas.width - 210,
            y: bossPlatformY - 400,
            width: 150,
            height: 20,
            color: { main: '#ff6600', glow: 'rgba(255, 102, 0, 0.5)' },
            isBossPlatform: true
        });

        // Spawn boss (start hovering above center)
        boss.x = canvas.width / 2 - boss.width / 2;
        boss.y = bossPlatformY - 350;
        boss.baseY = boss.y;
        boss.active = true;
        boss.velocityX = 0;
        boss.velocityY = 0;
        boss.attackPattern = 0;
        boss.hoverAngle = 0;
        bossSpawned = true;
        startBGM('boss');
        updateAmmoDisplay(); // Show unlimited ammo

        // Teleport player to boss platform
        player.x = canvas.width / 2 - player.width / 2;
        player.y = bossPlatformY - cameraY - player.height;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = true;
    }

    // Check if we should spawn boss 2 platform
    if (bossDefeated && !boss2Spawned && score >= GOAL_HEIGHT_2 - 50) {
        const boss2PlatformY = highestPlatform - 200;

        // Main wide platform
        platforms.push({
            x: canvas.width / 2 - 350,
            y: boss2PlatformY,
            width: 700,
            height: 30,
            color: { main: '#8800ff', glow: 'rgba(136, 0, 255, 0.6)' },
            isBossPlatform: true
        });

        // 3-level arena with more platforms
        const levels = [-150, -300, -450];
        const positions = [
            [{ x: 20, w: 160 }, { x: canvas.width - 180, w: 160 }],
            [{ x: canvas.width / 2 - 120, w: 240 }],
            [{ x: 50, w: 140 }, { x: canvas.width / 2 - 70, w: 140 }, { x: canvas.width - 190, w: 140 }]
        ];

        levels.forEach((ly, li) => {
            positions[li].forEach(p => {
                platforms.push({
                    x: p.x,
                    y: boss2PlatformY + ly,
                    width: p.w,
                    height: 20,
                    color: { main: '#aa44ff', glow: 'rgba(170, 68, 255, 0.5)' },
                    isBossPlatform: true
                });
            });
        });

        // Spawn boss 2
        boss2.x = canvas.width / 2 - boss2.width / 2;
        boss2.y = boss2PlatformY - 400;
        boss2.baseY = boss2.y;
        boss2.active = true;
        boss2.velocityX = 0;
        boss2.velocityY = 0;
        boss2.attackPattern = 0;
        boss2.hoverAngle = 0;
        boss2Spawned = true;
        startBGM('boss2');

        // Teleport player
        player.x = canvas.width / 2 - player.width / 2;
        player.y = boss2PlatformY - cameraY - player.height;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = true;
    }

    // Only generate normal platforms if no boss active
    if (!bossSpawned && highestPlatform - cameraY > -200) {
        generatePlatform(highestPlatform - 100 - Math.random() * 50);
    }
    // Continue generating after boss 1 defeated but before boss 2
    if (bossDefeated && !boss2Spawned && highestPlatform - cameraY > -200) {
        generatePlatform(highestPlatform - 100 - Math.random() * 50);
    }

    // Keep all platforms (do not remove off-screen platforms)

    // Remove enemies far below screen
    enemies = enemies.filter(e => e.y - cameraY < canvas.height + 500);

    // Remove ammo items far below screen
    ammoItems = ammoItems.filter(item => item.y - cameraY < canvas.height + 500);

    // Collect ammo items
    for (let i = ammoItems.length - 1; i >= 0; i--) {
        const item = ammoItems[i];
        const itemScreenY = item.y - cameraY;

        if (player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < itemScreenY + item.height &&
            player.y + player.height > itemScreenY) {
            ammo += 5;
            updateAmmoDisplay();
            ammoItems.splice(i, 1);
        }
    }

    // Update invincibility timer
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }

    // Game over check (fell below start position or HP depleted)
    // Start position is at cameraY = 0, so check if player fell below original ground level
    const fallLimit = canvas.height - 100 - cameraY; // Original ground level in world coordinates
    if (player.y > canvas.height + 100 || player.hp <= 0) {
        // Also check if player fell below the starting area (when cameraY < 0)
        gameOver();
    }

    // Prevent falling below start position (respawn at start if needed)
    if (cameraY < 0 && player.y > canvas.height + 50) {
        gameOver();
    }
}

// Update enemies
function updateEnemies() {
    for (const enemy of enemies) {
        // Move enemy
        enemy.x += enemy.speed * enemy.direction;

        // Bounce off platform edges
        if (enemy.x <= enemy.platformX) {
            enemy.x = enemy.platformX;
            enemy.direction = 1;
        } else if (enemy.x + enemy.width >= enemy.platformX + enemy.platformWidth) {
            enemy.x = enemy.platformX + enemy.platformWidth - enemy.width;
            enemy.direction = -1;
        }

        // Check collision with player (only if not invincible)
        if (!player.invincible) {
            const enemyScreenY = enemy.y - cameraY;
            if (player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemyScreenY + enemy.height &&
                player.y + player.height > enemyScreenY) {
                // Take damage
                player.hp--;
                updateHPDisplay();
                playSFX('damage');
                player.invincible = true;
                player.invincibleTimer = 90; // 1.5 seconds at 60fps

                // Knockback
                player.velocityY = -10;
                player.velocityX = player.x < enemy.x ? -8 : 8;
            }
        }
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        // Remove if off screen
        if (bullet.x < -50 || bullet.x > canvas.width + 50 ||
            bullet.y < -50 || bullet.y > canvas.height + 50) {
            bullets.splice(i, 1);
            continue;
        }

        // Check collision with boss 1
        if (boss.active && !bossDefeated) {
            const bossScreenY = boss.y - cameraY;
            if (bullet.x < boss.x + boss.width &&
                bullet.x + bulletSize > boss.x &&
                bullet.y < bossScreenY + boss.height &&
                bullet.y + bulletSize > bossScreenY) {
                boss.hp -= 10;
                playSFX('hit');
                bullets.splice(i, 1);

                // Chance to drop heal item
                if (Math.random() < healDropChance) {
                    healItems.push({
                        x: boss.x + boss.width / 2 - healItemSize / 2,
                        y: boss.y + boss.height,
                        width: healItemSize,
                        height: healItemSize,
                        velocityY: 2
                    });
                }

                if (boss.hp <= 0) {
                    bossDefeated = true;
                    boss.active = false;
                    fullAuto = true;
                    playSFX('powerup');
                    stopBGM();
                    startBGM('normal');
                    player.hp = player.maxHp;
                    updateHPDisplay();
                }
                continue;
            }
        }

        // Check collision with boss 2
        if (boss2.active && !boss2Defeated) {
            const boss2ScreenY = boss2.y - cameraY;
            if (bullet.x < boss2.x + boss2.width &&
                bullet.x + bulletSize > boss2.x &&
                bullet.y < boss2ScreenY + boss2.height &&
                bullet.y + bulletSize > boss2ScreenY) {
                boss2.hp -= 10;
                playSFX('hit');
                bullets.splice(i, 1);

                // Higher chance to drop heal item
                if (Math.random() < healDropChance * 1.5) {
                    healItems.push({
                        x: boss2.x + boss2.width / 2 - healItemSize / 2,
                        y: boss2.y + boss2.height,
                        width: healItemSize,
                        height: healItemSize,
                        velocityY: 2
                    });
                }

                if (boss2.hp <= 0) {
                    boss2Defeated = true;
                    boss2.active = false;
                    playSFX('clear');
                    gameClear();
                }
                continue;
            }
        }

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const enemyScreenY = enemy.y - cameraY;

            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bulletSize > enemy.x &&
                bullet.y < enemyScreenY + enemy.height &&
                bullet.y + bulletSize > enemyScreenY) {
                // Enemy hit - remove both bullet and enemy
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                break;
            }
        }
    }
}

// Update boss
function updateBoss() {
    if (!boss.active || bossDefeated) return;

    const bossScreenY = boss.y - cameraY;
    const isEnraged = boss.hp <= boss.maxHp / 2;

    // Speed multiplier in phase 2
    const speedMult = isEnraged ? 1.8 : 1.0;
    const attackInterval = isEnraged ? 100 : 200;

    boss.attackTimer++;
    boss.hoverAngle += 0.03;

    // Attack pattern state machine
    switch (boss.attackPattern) {
        case 0: // HOVER - float around menacingly
            // Sinusoidal hovering movement
            boss.x += Math.sin(boss.hoverAngle * 1.5) * 2 * speedMult;
            boss.y = boss.baseY + Math.sin(boss.hoverAngle) * 40;

            // Slowly drift toward player horizontally
            const playerCX = player.x + player.width / 2;
            const bossCX = boss.x + boss.width / 2;
            boss.x += (playerCX > bossCX ? 0.5 : -0.5) * speedMult;

            // Switch to attack after interval
            if (boss.attackTimer > attackInterval) {
                boss.attackTimer = 0;
                // Pick random attack (1=dive, 2=sweep, 3=slam)
                boss.attackPattern = Math.floor(Math.random() * 3) + 1;
                if (isEnraged && Math.random() < 0.3) {
                    boss.attackPattern = 3; // More slams when enraged
                }
            }
            break;

        case 1: // DIVE - fly up then dive at player
            if (boss.attackTimer < 30) {
                // Fly upward
                boss.y -= 6 * speedMult;
            } else if (boss.attackTimer < 35) {
                // Pause at top, aim at player
                boss.velocityX = (player.x + player.width / 2 - boss.x - boss.width / 2) * 0.1 * speedMult;
                boss.velocityY = 12 * speedMult;
            } else if (boss.attackTimer < 70) {
                // Dive down
                boss.x += boss.velocityX;
                boss.y += boss.velocityY;
            } else {
                // Return to hover
                boss.attackPattern = 0;
                boss.attackTimer = 0;
                boss.y = boss.baseY;
            }
            break;

        case 2: // SWEEP - figure-8 pattern across arena
            const sweepProgress = boss.attackTimer / 120;
            if (sweepProgress < 1.0) {
                const t = sweepProgress * Math.PI * 2;
                const arenaWidth = canvas.width - boss.width - 100;
                const arenaHeight = 300;
                // Figure-8 / lemniscate pattern
                boss.x = (canvas.width - boss.width) / 2 + Math.sin(t) * (arenaWidth / 2) * 0.8;
                boss.y = boss.baseY + Math.sin(t * 2) * arenaHeight / 2;
            } else {
                boss.attackPattern = 0;
                boss.attackTimer = 0;
                boss.y = boss.baseY;
            }
            break;

        case 3: // SLAM - hover above player then slam down
            if (boss.attackTimer < 40) {
                // Move above player
                const targetX = player.x + player.width / 2 - boss.width / 2;
                boss.x += (targetX - boss.x) * 0.08;
                boss.y = boss.baseY - 100;
            } else if (boss.attackTimer < 45) {
                // Wind up (shake)
                boss.x += (Math.random() - 0.5) * 10;
            } else if (boss.attackTimer < 65) {
                // SLAM DOWN
                boss.y += 18 * speedMult;
            } else if (boss.attackTimer < 90) {
                // Stay on ground briefly
            } else if (boss.attackTimer < 120) {
                // Rise back up
                boss.y -= 8;
            } else {
                boss.attackPattern = 0;
                boss.attackTimer = 0;
                boss.y = boss.baseY;
            }
            break;
    }

    // Keep boss within screen bounds
    if (boss.x < 10) boss.x = 10;
    if (boss.x + boss.width > canvas.width - 10) boss.x = canvas.width - 10 - boss.width;

    // Check collision with player
    if (!player.invincible) {
        const currentBossScreenY = boss.y - cameraY;
        if (player.x < boss.x + boss.width &&
            player.x + player.width > boss.x &&
            player.y < currentBossScreenY + boss.height &&
            player.y + player.height > currentBossScreenY) {
            // More damage during attacks
            const damage = boss.attackPattern === 3 ? 3 : 2;
            player.hp -= damage;
            updateHPDisplay();
            playSFX('damage');
            player.invincible = true;
            player.invincibleTimer = 90;

            // Strong knockback
            player.velocityY = -18;
            player.velocityX = player.x < boss.x ? -15 : 15;
        }
    }
}

// Update boss 2 (Dragon)
function updateBoss2() {
    if (!boss2.active || boss2Defeated) return;

    const isEnraged = boss2.hp <= boss2.maxHp / 2;
    const speedMult = isEnraged ? 2.5 : 1.3;
    const attackInterval = isEnraged ? 60 : 120;

    boss2.attackTimer++;
    boss2.hoverAngle += 0.04;

    switch (boss2.attackPattern) {
        case 0: // HOVER - aggressive tracking
            boss2.x += Math.sin(boss2.hoverAngle * 2) * 3 * speedMult;
            boss2.y = boss2.baseY + Math.sin(boss2.hoverAngle) * 50;

            const pCX = player.x + player.width / 2;
            const b2CX = boss2.x + boss2.width / 2;
            boss2.x += (pCX > b2CX ? 1.0 : -1.0) * speedMult;

            if (boss2.attackTimer > attackInterval) {
                boss2.attackTimer = 0;
                boss2.attackPattern = Math.floor(Math.random() * 3) + 1;
                if (isEnraged && Math.random() < 0.4) {
                    boss2.attackPattern = 3; // More slams
                }
            }
            break;

        case 1: // DIVE - faster, sharper dive
            if (boss2.attackTimer < 25) {
                boss2.y -= 8 * speedMult;
            } else if (boss2.attackTimer < 30) {
                boss2.velocityX = (player.x + player.width / 2 - boss2.x - boss2.width / 2) * 0.12 * speedMult;
                boss2.velocityY = 16 * speedMult;
            } else if (boss2.attackTimer < 60) {
                boss2.x += boss2.velocityX;
                boss2.y += boss2.velocityY;
            } else {
                boss2.attackPattern = 0;
                boss2.attackTimer = 0;
                boss2.y = boss2.baseY;
            }
            break;

        case 2: // SWEEP - tornado spiral
            const sp = boss2.attackTimer / 100;
            if (sp < 1.0) {
                const t = sp * Math.PI * 3;
                const arenaW = canvas.width - boss2.width - 60;
                const arenaH = 400;
                boss2.x = (canvas.width - boss2.width) / 2 + Math.sin(t) * (arenaW / 2) * 0.85;
                boss2.y = boss2.baseY + Math.cos(t * 1.5) * arenaH / 2;
            } else {
                boss2.attackPattern = 0;
                boss2.attackTimer = 0;
                boss2.y = boss2.baseY;
            }
            break;

        case 3: // METEOR SLAM - huge impact
            if (boss2.attackTimer < 35) {
                const tx = player.x + player.width / 2 - boss2.width / 2;
                boss2.x += (tx - boss2.x) * 0.1;
                boss2.y = boss2.baseY - 150;
            } else if (boss2.attackTimer < 42) {
                boss2.x += (Math.random() - 0.5) * 15;
                boss2.y -= 3;
            } else if (boss2.attackTimer < 55) {
                boss2.y += 25 * speedMult;
            } else if (boss2.attackTimer < 85) {
                // Stay
            } else if (boss2.attackTimer < 110) {
                boss2.y -= 10;
            } else {
                boss2.attackPattern = 0;
                boss2.attackTimer = 0;
                boss2.y = boss2.baseY;
            }
            break;
    }

    // Keep within bounds
    if (boss2.x < 10) boss2.x = 10;
    if (boss2.x + boss2.width > canvas.width - 10) boss2.x = canvas.width - 10 - boss2.width;

    // Check collision with player
    if (!player.invincible) {
        const b2sy = boss2.y - cameraY;
        if (player.x < boss2.x + boss2.width &&
            player.x + player.width > boss2.x &&
            player.y < b2sy + boss2.height &&
            player.y + player.height > b2sy) {
            const damage = boss2.attackPattern === 3 ? 6 : 4;
            player.hp -= damage;
            updateHPDisplay();
            playSFX('damage');
            player.invincible = true;
            player.invincibleTimer = 90;
            player.velocityY = -20;
            player.velocityX = player.x < boss2.x ? -18 : 18;
        }
    }
}

// Draw boss 2 (Dragon)
function drawBoss2() {
    if (!boss2.active || boss2Defeated) return;

    const screenY = boss2.y - cameraY;
    const isEnraged = boss2.hp <= boss2.maxHp / 2;

    ctx.save();

    // Glow effect (purple, red when enraged)
    if (isEnraged) {
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
    } else {
        ctx.shadowColor = 'rgba(136, 0, 255, 0.6)';
        ctx.shadowBlur = 20;
    }

    // Draw dragon image
    if (boss2ImageLoaded) {
        if (isEnraged && Math.random() < 0.15) {
            ctx.filter = 'hue-rotate(60deg) brightness(1.5)';
        }
        ctx.drawImage(boss2Image, boss2.x, screenY, boss2.width, boss2.height);
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = isEnraged ? '#ff0044' : '#8800ff';
        ctx.fillRect(boss2.x, screenY, boss2.width, boss2.height);
    }

    ctx.shadowBlur = 0;

    // HP Bar
    const hpBarWidth = boss2.width + 50;
    const hpBarX = boss2.x + boss2.width / 2 - hpBarWidth / 2;
    const hpBarY = screenY - 25;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, 15);

    const hpRatio = boss2.hp / boss2.maxHp;
    const hpColor = isEnraged ? '#ff0044' : '#8800ff';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, 15);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, 15);

    // Boss 2 name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DORAGON', boss2.x + boss2.width / 2, hpBarY - 5);

    ctx.restore();
}

// Update heal items
function updateHealItems() {
    for (let i = healItems.length - 1; i >= 0; i--) {
        const item = healItems[i];
        item.y += item.velocityY; // Fall down

        const itemScreenY = item.y - cameraY;

        // Remove if off screen
        if (itemScreenY > canvas.height + 100) {
            healItems.splice(i, 1);
            continue;
        }

        // Check collision with player
        if (player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < itemScreenY + item.height &&
            player.y + player.height > itemScreenY) {
            // Heal player
            player.hp = Math.min(player.hp + 2, player.maxHp);
            updateHPDisplay();
            playSFX('heal');
            healItems.splice(i, 1);
        }
    }
}

// Draw heal items
function drawHealItems() {
    for (const item of healItems) {
        const screenY = item.y - cameraY;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 255, 100, 0.8)';
        ctx.shadowBlur = 15;

        // Green cross shape
        ctx.fillStyle = '#00ff66';
        const cx = item.x + item.width / 2;
        const cy = screenY + item.height / 2;
        const s = item.width / 2;

        // Vertical bar
        ctx.fillRect(cx - s / 3, cy - s, s * 2 / 3, s * 2);
        // Horizontal bar
        ctx.fillRect(cx - s, cy - s / 3, s * 2, s * 2 / 3);

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Draw boss
function drawBoss() {
    if (!boss.active || bossDefeated) return;

    const screenY = boss.y - cameraY;

    ctx.save();

    // Glow effect
    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
    ctx.shadowBlur = 30;

    if (bossImageLoaded) {
        // Draw boss image
        ctx.drawImage(bossImage, boss.x, screenY, boss.width, boss.height);
    } else {
        // Fallback: draw boss body (dragon shotaro style - fierce look)
        ctx.fillStyle = boss.isCharging ? '#ff0000' : '#8b0000';
        ctx.beginPath();
        ctx.ellipse(boss.x + boss.width / 2, screenY + boss.height / 2, boss.width / 2, boss.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dragon horns
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(boss.x + 30, screenY + 20);
        ctx.lineTo(boss.x + 50, screenY - 30);
        ctx.lineTo(boss.x + 70, screenY + 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(boss.x + boss.width - 30, screenY + 20);
        ctx.lineTo(boss.x + boss.width - 50, screenY - 30);
        ctx.lineTo(boss.x + boss.width - 70, screenY + 20);
        ctx.fill();

        // Eyes (angry)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(boss.x + 50, screenY + 50, 15, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(boss.x + boss.width - 50, screenY + 50, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Angry pupils
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(boss.x + 50, screenY + 50, 8, 0, Math.PI * 2);
        ctx.arc(boss.x + boss.width - 50, screenY + 50, 8, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (angry teeth)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.rect(boss.x + 40, screenY + 90, boss.width - 80, 30);
        ctx.fill();
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(boss.x + 50 + i * 15, screenY + 90);
            ctx.lineTo(boss.x + 57 + i * 15, screenY + 105);
            ctx.lineTo(boss.x + 64 + i * 15, screenY + 90);
            ctx.fill();
        }
    }

    // Boss name
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DORAGON SYOTARO', boss.x + boss.width / 2, screenY - 40);

    // Boss HP bar
    const hpBarWidth = 200;
    const hpBarHeight = 15;
    const hpBarX = boss.x + boss.width / 2 - hpBarWidth / 2;
    const hpBarY = screenY - 25;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // HP
    const hpPercent = boss.hp / boss.maxHp;
    ctx.fillStyle = hpPercent > 0.3 ? '#ff0000' : '#ff6600';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    ctx.restore();
}

// Game clear
function gameClear() {
    gameCleared = true;
    gameRunning = false;
    stopBGM();
    document.getElementById('clear-score').textContent = score;
    document.getElementById('clear-screen').classList.remove('hidden');
}

// Draw bullets
function drawBullets() {
    for (const bullet of bullets) {
        ctx.save();

        // Glow effect
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 10;

        // Draw bullet
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bulletSize, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bulletSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Draw ammo items
function drawAmmoItems() {
    for (const item of ammoItems) {
        const screenY = item.y - cameraY;

        if (screenY > -item.height && screenY < canvas.height + item.height) {
            ctx.save();

            // Glow effect
            ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
            ctx.shadowBlur = 15;

            // Draw ammo box
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(item.x, screenY, item.width, item.height);

            // Draw bullet icon
            ctx.fillStyle = '#1a1a3a';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💥', item.x + item.width / 2, screenY + item.height / 2);

            ctx.restore();
        }
    }
}

// Draw enemies
function drawEnemies() {
    for (const enemy of enemies) {
        const screenY = enemy.y - cameraY;

        // Only draw if on screen
        if (screenY > -enemy.height && screenY < canvas.height + enemy.height) {
            ctx.save();

            // Glow effect
            ctx.shadowColor = 'rgba(255, 50, 50, 0.6)';
            ctx.shadowBlur = 15;

            if (enemyImageLoaded) {
                // Draw enemy image
                ctx.drawImage(enemyImage, enemy.x, screenY, enemy.width, enemy.height);
            } else {
                // Fallback: draw red circle if image not loaded
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width / 2, screenY + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}

// Draw background gradient
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    // Dynamic gradient based on height
    const heightFactor = Math.min(score / 1000, 1);

    if (heightFactor < 0.3) {
        gradient.addColorStop(0, '#1a1a3a');
        gradient.addColorStop(0.5, '#2a1a4a');
        gradient.addColorStop(1, '#0a0a1a');
    } else if (heightFactor < 0.6) {
        gradient.addColorStop(0, '#0a1a2a');
        gradient.addColorStop(0.5, '#1a2a4a');
        gradient.addColorStop(1, '#0a0a2a');
    } else {
        gradient.addColorStop(0, '#000010');
        gradient.addColorStop(0.5, '#0a0a20');
        gradient.addColorStop(1, '#050510');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw stars
function drawStars() {
    for (const star of stars) {
        const screenY = star.y - cameraY * star.speed;
        const wrappedY = ((screenY % (canvas.height * 2)) + canvas.height * 2) % (canvas.height * 2) - canvas.height / 2;

        const twinkle = Math.sin(Date.now() / 500 + star.x) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, wrappedY, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw platforms
function drawPlatforms() {
    for (const platform of platforms) {
        const screenY = platform.y - cameraY;

        // Glow effect
        ctx.shadowColor = platform.color.glow;
        ctx.shadowBlur = 20;

        // Platform body with rounded corners
        ctx.fillStyle = platform.color.main;
        ctx.beginPath();
        const radius = 8;
        ctx.roundRect(platform.x, screenY, platform.width, platform.height, radius);
        ctx.fill();

        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(platform.x + 2, screenY + 2, platform.width - 4, 4, radius / 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

// Draw player
function drawPlayer() {
    ctx.save();

    // Glow effect
    ctx.shadowColor = player.glowColor;
    ctx.shadowBlur = 25;

    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    // Body
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, player.width / 2, player.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    const gradient = ctx.createRadialGradient(
        centerX - 5, centerY - 10, 0,
        centerX, centerY, player.width / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, player.width / 2, player.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    const eyeY = centerY - 5;
    const eyeOffset = player.facingRight ? 5 : -5;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(centerX - 8 + eyeOffset, eyeY, 6, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + 8 + eyeOffset, eyeY, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#1a1a3a';
    const pupilOffset = player.facingRight ? 2 : -2;
    ctx.beginPath();
    ctx.arc(centerX - 8 + eyeOffset + pupilOffset, eyeY, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 8 + eyeOffset + pupilOffset, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw gun pointing towards mouse
    const gunAngle = getAngleToMouse();
    const gunLength = 45;
    const gunHeight = 25;
    const gunX = centerX;
    const gunY = centerY + 5;

    // Check if aiming left (flip gun vertically)
    const aimingLeft = mouseX < player.x + player.width / 2;

    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(gunAngle);

    // Flip vertically if aiming left
    if (aimingLeft) {
        ctx.scale(1, -1);
    }

    if (gunImageLoaded) {
        // Draw gun image
        ctx.drawImage(gunImage, 0, -gunHeight / 2, gunLength, gunHeight);
    } else {
        // Fallback: draw simple gun shape
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -gunHeight / 4, gunLength, gunHeight / 2);
        ctx.fillStyle = '#555';
        ctx.fillRect(gunLength - 5, -gunHeight / 4 - 2, 10, gunHeight / 2 + 4);
    }

    // Gun glow when has ammo or at boss stage
    if (ammo > 0 || bossSpawned) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(gunLength + 5, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Trail effect when moving up
    if (player.velocityY < -5) {
        for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = `rgba(0, 245, 255, ${0.3 - i * 0.08})`;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + i * 15, player.width / 2 - i * 3, player.height / 2 - i * 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Flash effect when invincible
    if (player.invincible && Math.floor(player.invincibleTimer / 5) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, player.width / 2, player.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Main game loop
function gameLoop() {
    if (!gameRunning) return;

    // Full-auto firing when mouse held down
    if (fullAuto && mouseDown && canShoot) {
        shoot();
    }
    // Also full-auto with F key
    if (fullAuto && keys.f && canShoot) {
        shoot();
    }

    drawBackground();
    drawStars();
    updatePlayer();
    updateEnemies();
    updateBoss();
    updateBoss2();
    updateBullets();
    updateHealItems();
    drawPlatforms();
    drawAmmoItems();
    drawHealItems();
    drawEnemies();
    drawBoss();
    drawBoss2();
    drawBullets();
    drawPlayer();

    // Draw crosshair (red when full-auto)
    ctx.save();
    ctx.strokeStyle = fullAuto ? 'rgba(255, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = fullAuto ? 3 : 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouseX - 15, mouseY);
    ctx.lineTo(mouseX - 5, mouseY);
    ctx.moveTo(mouseX + 5, mouseY);
    ctx.lineTo(mouseX + 15, mouseY);
    ctx.moveTo(mouseX, mouseY - 15);
    ctx.lineTo(mouseX, mouseY - 5);
    ctx.moveTo(mouseX, mouseY + 5);
    ctx.lineTo(mouseX, mouseY + 15);
    ctx.stroke();

    // Full-auto indicator
    if (fullAuto) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AUTO', mouseX, mouseY + 25);
    }
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    gameRunning = false;
    stopBGM();
    playSFX('gameover');

    // If fighting boss 2, show revival screen instead
    if (boss2Spawned && !boss2Defeated) {
        document.getElementById('revival-screen').classList.remove('hidden');
        return;
    }

    document.getElementById('final-score').textContent = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('gravityHighScore', highScore);
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('new-record').classList.remove('hidden');
    } else {
        document.getElementById('new-record').classList.add('hidden');
    }

    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Revival function
function revivePlayer() {
    document.getElementById('revival-screen').classList.add('hidden');
    player.hp = player.maxHp;
    updateHPDisplay();
    playSFX('powerup');
    player.invincible = true;
    player.invincibleTimer = 180; // 3 seconds of invincibility

    // Find a safe platform to respawn on
    const bossPlatforms = platforms.filter(p => p.isBossPlatform);
    if (bossPlatforms.length > 0) {
        const safePlatform = bossPlatforms[0]; // Main ground platform
        player.x = safePlatform.x + safePlatform.width / 2 - player.width / 2;
        player.y = safePlatform.y - cameraY - player.height;
    }
    player.velocityX = 0;
    player.velocityY = 0;

    gameRunning = true;
    startBGM('boss2');
    gameLoop();
}

// Give up function
function giveUpRevival() {
    document.getElementById('revival-screen').classList.add('hidden');

    document.getElementById('final-score').textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('gravityHighScore', highScore);
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('new-record').classList.remove('hidden');
    } else {
        document.getElementById('new-record').classList.add('hidden');
    }
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Start game
function startGame() {
    initAudio();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('clear-screen').classList.add('hidden');
    document.getElementById('revival-screen').classList.add('hidden');
    initGame();
    gameRunning = true;
    startBGM('normal');
    gameLoop();
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('clear-restart-btn').addEventListener('click', startGame);
document.getElementById('revival-btn').addEventListener('click', revivePlayer);
document.getElementById('revival-give-up-btn').addEventListener('click', giveUpRevival);

// Allow starting with Space or Enter
document.addEventListener('keydown', (e) => {
    if (!gameRunning && (e.key === ' ' || e.key === 'Enter')) {
        if (!document.getElementById('start-screen').classList.contains('hidden') ||
            !document.getElementById('game-over-screen').classList.contains('hidden') ||
            !document.getElementById('clear-screen').classList.contains('hidden')) {
            startGame();
            e.preventDefault();
        }
    }
});
