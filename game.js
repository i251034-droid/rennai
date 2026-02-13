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

// Game state
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('gravityHighScore')) || 0;
let cameraY = 0;
let lowestPlayerY = 0;
let gameCleared = false;

// Mouse position for aiming
let mouseX = 0;
let mouseY = 0;

// Goal and Boss settings
const GOAL_HEIGHT = 350; // 350m goal
const BOSS_PLATFORM_Y = -GOAL_HEIGHT * 10; // Convert to game units
let bossSpawned = false;
let bossDefeated = false;

// Boss
const boss = {
    x: 0,
    y: 0,
    width: 150,
    height: 150,
    hp: 1000,
    maxHp: 1000,
    speed: 3,
    direction: 1,
    active: false,
    attackTimer: 0,
    isCharging: false,
    chargeSpeed: 10
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
    if (gameRunning && canShoot && e.button === 0) {
        shoot();
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        canShoot = true;
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
        canShoot = true;
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
    // Unlimited ammo at boss stage, otherwise need ammo
    if (!bossSpawned && ammo <= 0) return;

    canShoot = false;

    // Only consume ammo if not at boss stage
    if (!bossSpawned) {
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
}

// Update ammo display
function updateAmmoDisplay() {
    if (bossSpawned) {
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

    // Reset boss
    bossSpawned = false;
    bossDefeated = false;
    gameCleared = false;
    boss.active = false;
    boss.hp = boss.maxHp;

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
            player.canDoubleJump = true; // Reset double jump when on ground
        } else if (player.canDoubleJump) {
            player.velocityY = player.jumpPower;
            player.canDoubleJump = false; // Use double jump
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

    // Update score (max 400m for boss floor)
    const currentHeight = Math.floor(-cameraY / 10);
    score = Math.max(score, Math.min(currentHeight, 400));
    document.getElementById('score').textContent = score;

    // Generate new platforms as player goes up
    const highestPlatform = Math.min(...platforms.map(p => p.y));

    // Check if we should spawn boss platform
    if (!bossSpawned && score >= GOAL_HEIGHT - 50) {
        // Create boss platform
        const bossPlatformY = highestPlatform - 200;
        platforms.push({
            x: canvas.width / 2 - 300,
            y: bossPlatformY,
            width: 600,
            height: 30,
            color: { main: '#ff0000', glow: 'rgba(255, 0, 0, 0.6)' },
            isBossPlatform: true
        });

        // Spawn boss
        boss.x = canvas.width / 2 - boss.width / 2;
        boss.y = bossPlatformY - boss.height;
        boss.active = true;
        bossSpawned = true;
        updateAmmoDisplay(); // Show unlimited ammo

        // Teleport player to boss platform
        player.x = canvas.width / 2 - player.width / 2;
        player.y = bossPlatformY - cameraY - player.height;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = true;
    }

    // Only generate normal platforms if boss not spawned
    if (!bossSpawned && highestPlatform - cameraY > -200) {
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

        // Check collision with boss
        if (boss.active && !bossDefeated) {
            const bossScreenY = boss.y - cameraY;
            if (bullet.x < boss.x + boss.width &&
                bullet.x + bulletSize > boss.x &&
                bullet.y < bossScreenY + boss.height &&
                bullet.y + bulletSize > bossScreenY) {
                // Boss hit
                boss.hp -= 10;
                bullets.splice(i, 1);

                if (boss.hp <= 0) {
                    bossDefeated = true;
                    boss.active = false;
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

    // Boss movement
    boss.x += boss.speed * boss.direction;

    // Bounce off screen edges
    if (boss.x <= 50) {
        boss.x = 50;
        boss.direction = 1;
    } else if (boss.x + boss.width >= canvas.width - 50) {
        boss.x = canvas.width - 50 - boss.width;
        boss.direction = -1;
    }

    // Attack timer - occasionally charge at player
    boss.attackTimer++;
    if (boss.attackTimer > 180 && !boss.isCharging) { // Every 3 seconds
        boss.isCharging = true;
        boss.attackTimer = 0;
    }

    if (boss.isCharging) {
        // Charge toward player
        const chargeDir = player.x + player.width / 2 < boss.x + boss.width / 2 ? -1 : 1;
        boss.x += boss.chargeSpeed * chargeDir;

        if (boss.attackTimer > 30) {
            boss.isCharging = false;
        }
    }

    // Check collision with player
    if (!player.invincible) {
        if (player.x < boss.x + boss.width &&
            player.x + player.width > boss.x &&
            player.y < bossScreenY + boss.height &&
            player.y + player.height > bossScreenY) {
            // Take damage
            player.hp -= 2;
            updateHPDisplay();
            player.invincible = true;
            player.invincibleTimer = 90;

            // Knockback
            player.velocityY = -15;
            player.velocityX = player.x < boss.x ? -12 : 12;
        }
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

    drawBackground();
    drawStars();
    updatePlayer();
    updateEnemies();
    updateBoss();
    updateBullets();
    drawPlatforms();
    drawAmmoItems();
    drawEnemies();
    drawBoss();
    drawBullets();
    drawPlayer();

    // Draw crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
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
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    gameRunning = false;

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
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('clear-screen').classList.add('hidden');
    initGame();
    gameRunning = true;
    gameLoop();
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('clear-restart-btn').addEventListener('click', startGame);

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
