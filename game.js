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

// Update high score display
document.getElementById('high-score').textContent = highScore;

// Load enemy image
const enemyImage = new Image();
enemyImage.src = 'images/enemy.jpg';
let enemyImageLoaded = false;
enemyImage.onload = () => {
    enemyImageLoaded = true;
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
    color: '#00f5ff',
    glowColor: 'rgba(0, 245, 255, 0.5)',
    facingRight: true
};

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
    space: false
};

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
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (key === ' ' || e.code === 'Space') keys.space = false;
});

// Initialize platforms
function initPlatforms() {
    platforms = [];
    enemies = [];

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

    score = 0;
    cameraY = 0;
    lowestPlayerY = player.y;

    initPlatforms();
    initStars();

    document.getElementById('score').textContent = '0';
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

    // Jump (W key or Space)
    if ((keys.w || keys.space) && player.onGround) {
        player.velocityY = player.jumpPower;
        player.onGround = false;
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

    // Update camera and score
    const playerScreenY = player.y;
    if (playerScreenY < canvas.height / 2.5) {
        const diff = canvas.height / 2.5 - playerScreenY;
        cameraY -= diff;
        player.y = canvas.height / 2.5;

        // Update score
        score = Math.max(score, Math.floor(-cameraY / 10));
        document.getElementById('score').textContent = score;
    }

    // Generate new platforms as player goes up
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform - cameraY > -200) {
        generatePlatform(highestPlatform - 100 - Math.random() * 50);
    }

    // Remove platforms below screen
    platforms = platforms.filter(p => p.y - cameraY < canvas.height + 100);

    // Remove enemies below screen
    enemies = enemies.filter(e => e.y - cameraY < canvas.height + 100);

    // Game over check (fell too far)
    if (player.y > canvas.height + 100) {
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

        // Check collision with player
        const enemyScreenY = enemy.y - cameraY;
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemyScreenY + enemy.height &&
            player.y + player.height > enemyScreenY) {
            gameOver();
            return;
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

    // Trail effect when moving up
    if (player.velocityY < -5) {
        for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = `rgba(0, 245, 255, ${0.3 - i * 0.08})`;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + i * 15, player.width / 2 - i * 3, player.height / 2 - i * 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
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
    drawPlatforms();
    drawEnemies();
    drawPlayer();

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
    initGame();
    gameRunning = true;
    gameLoop();
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Allow starting with Space or Enter
document.addEventListener('keydown', (e) => {
    if (!gameRunning && (e.key === ' ' || e.key === 'Enter')) {
        if (!document.getElementById('start-screen').classList.contains('hidden') ||
            !document.getElementById('game-over-screen').classList.contains('hidden')) {
            startGame();
            e.preventDefault();
        }
    }
});
