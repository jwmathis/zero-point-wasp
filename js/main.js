/**
 * main.js - The Core Game Director
 * Coordinates the scene, game state, and high-level animation loop.
 * Part of the "Zero-Point: The Wasp Protocol" Capstone Project.
 */
import * as THREE from 'three';
import { Wormhole } from './World.js';
import { ProjectileSystem } from './Projectiles.js';    
import { EnemySystem } from './Enemies.js';
import { Player } from './Player.js';
import { PowerUpSystem } from './PowerUps.js';

// --- INITIAL GAME STATE ---
const gameState = {
    health: 100,
    isPaused: false,
    hasStarted: false,
    isDead: false,
   keys: { w: false, a: false, s: false, d: false, q: false, e: false, shift: false, ' ': false },
    moveSpeed: 0.4, 
    score: 0,
    multiplier: 1,
    lastEnemySpawn: 0,
    lastPowerUpSpawn: 0,
    twinShot: false 
};
window.gameState = gameState;  

const listener = new THREE.AudioListener();
const soundLoader = new THREE.AudioLoader();
window.sfx = {};
function loadSFX(name, path, volume = 0.5, loop = false) {
    const sound = new THREE.Audio(listener);
    soundLoader.load(path, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);
    });
    sfx[name] = sound;
}

// --- UI ELEMENT CACHING ---
const hudHealth = document.getElementById('health-bar');
const hazeEl = document.getElementById('damage-haze');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const howToPlayScreen = document.getElementById('how-to-play-screen');
const splashOverlay = document.getElementById('splash-overlay');
const initializeBtn = document.getElementById('initialize-btn');

loadSFX('laser', './assets/sounds/laser.wav', 0.3);
loadSFX('explosion', './assets/sounds/explosion.wav', 0.6);
loadSFX('powerup', './assets/sounds/powerup.wav', 0.5);
loadSFX('intro', './assets/sounds/game_intro.wav', 0.5, true);
loadSFX('theme', './assets/sounds/game_theme.wav', 0.5, true);
loadSFX('player_damage', './assets/sounds/player_damage.wav', 0.4);

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const light = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(light);
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5); 
sunLight.position.set(5, 10, 7.5);
scene.add(sunLight);

const playerLight = new THREE.PointLight(0x00ffff, 10, 50); 
camera.add(playerLight); 
playerLight.position.set(0, 0, -3); 

const headlight = new THREE.PointLight(0xffffff, 5, 20); 
camera.add(headlight);
headlight.position.set(0, 0, -2); 

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture; 

scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x000000, 0.015);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(camera); 
camera.add(listener);

// --- MODULE INITIALIZATION ---
const wormhole = new Wormhole(scene);
const projectiles = new ProjectileSystem(scene);
const enemies = new EnemySystem(scene);
const player = new Player(scene, camera, hazeEl); 
const powerUps = new PowerUpSystem(scene);

window.player = player;
window.projectiles = projectiles;

camera.position.set(0, 0, 5);
camera.rotation.order = 'YXZ';

// --- STARFIELD ---
const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
const starSpeeds = [];
for (let i = 0; i < 4000; i++) {
    starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000);
    starSpeeds.push(1 + Math.random() * 3); 
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
starGeometry.setAttribute('speed', new THREE.Float32BufferAttribute(starSpeeds, 1));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xFFFFFF }));
scene.add(stars);

// --- CORE UTILITY FUNCTIONS ---
function updateHUD() {
    hudHealth.style.width = `${gameState.health}%`; 
}

function checkGameOver() {
    if (gameState.health <= 0 && !gameState.isDead) {
        gameState.isDead = true;
        gameState.health = 0;
        updateHUD();
        document.getElementById('final-score-value').innerText = gameState.score; 
        document.exitPointerLock(); 
        gameOverScreen.style.display = 'flex'; 
    }
}

function updateStars() {
    const positions = stars.geometry.attributes.position.array;
    const speeds = stars.geometry.attributes.speed.array;
    for (let i = 0; i < positions.length; i += 3) {
        const speedIndex = i / 3;
        positions[i + 2] += (2.0 * speeds[speedIndex]); 
        if (positions[i + 2] > 10) positions[i + 2] = -1000; 
    }
    stars.geometry.attributes.position.needsUpdate = true;
}

window.createScorePopup = function(position, points) {
    const vector = position.clone();
    vector.project(camera); 
    const x = (vector.x * .5 + .5) * window.innerWidth;
    const y = (vector.y * -.5 + .5) * window.innerHeight;

    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.innerText = `+${points}`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

// --- INPUT HANDLERS ---
if (initializeBtn) {
    initializeBtn.addEventListener('click', () => {
        if (listener.context.state === 'suspended') { listener.context.resume(); }
        if (window.sfx.intro && !window.sfx.intro.isPlaying) { window.sfx.intro.play(); }
        splashOverlay.style.opacity = '0';
        setTimeout(() => { splashOverlay.style.display = 'none'; }, 1000);
    });
}

document.getElementById('start-button').addEventListener('click', () => {
    if (window.sfx.intro && window.sfx.intro.isPlaying) window.sfx.intro.stop();
    if (window.sfx.theme && !window.sfx.theme.isPlaying) window.sfx.theme.play();

    renderer.domElement.requestPointerLock();
    startScreen.style.display = 'none';
    setTimeout(() => { gameState.hasStarted = true; }, 100);
});

if (document.getElementById('how-to-play-button')) {
    document.getElementById('how-to-play-button').addEventListener('click', () => {
        if (listener.context.state === 'suspended') { listener.context.resume(); }
        if (sfx.intro && !sfx.intro.isPlaying && !gameState.hasStarted) { sfx.intro.play(); }

        startScreen.style.display = 'none';
        howToPlayScreen.style.display = 'flex';
    });
}

if (document.getElementById('back-button')) {
    document.getElementById('back-button').addEventListener('click', () => {
        howToPlayScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    });
}

document.getElementById('resume-button').addEventListener('click', () => {
    gameState.isPaused = false;
    pauseScreen.style.display = 'none';
    renderer.domElement.requestPointerLock(); 
});

document.getElementById('restart-button').addEventListener('click', () => window.location.reload());

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'p' && gameState.hasStarted) {
        gameState.isPaused = !gameState.isPaused;
        pauseScreen.style.display = gameState.isPaused ? 'flex' : 'none';

        if (gameState.isPaused) {
            document.exitPointerLock(); 
        } else {
            renderer.domElement.requestPointerLock();
        }
    }
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = false;
});

let lastFireTime = 0;
window.addEventListener('mousedown', (e) => {
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest("#ui-layer")) return;

    const now = performance.now();
    if (now - lastFireTime > 150) {
        projectiles.fire(camera);
        camera.position.z += 0.1; 
        setTimeout(() => { camera.position.z -= 0.1; }, 50);
        lastFireTime = now;
        
        if (sfx.laser) { sfx.laser.isPlaying && sfx.laser.stop(); sfx.laser.play(); }
        light.intensity = 5.0;
        setTimeout(() => { light.intensity = 1.5; }, 100);
    }
});


// --- MAIN ANIMATION LOOP ---
let lastDifficultyLevel = 0; 

function animate() {
    requestAnimationFrame(animate);
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;

    const now = performance.now();
    const timeSec = now * 0.001;
    
    const difficultyLevel = Math.floor(timeSec / 20); 
    gameState.difficultyLevel = difficultyLevel; 

    if (gameState.score >= 3000 && !gameState.twinShot) { gameState.twinShot = true; }

    // DEDICATED BOOST/BRAKE SYSTEM: Shift speeds up, Spacebar slows down
    const baseSpeed = Math.min(1.0, 0.4 + (difficultyLevel * 0.05));
    if (gameState.keys.shift) {
        gameState.moveSpeed = baseSpeed * 1.8; // Boost
    } else if (gameState.keys[' ']) {
        gameState.moveSpeed = baseSpeed * 0.4; // Brake
    } else {
        gameState.moveSpeed = baseSpeed;
    }

    const spawnInterval = Math.max(1000, 3000 - (difficultyLevel * 200));

    const curveMod = 1.5 + (difficultyLevel * 0.2);
    const tunnelX = Math.sin(timeSec * 1.5) * curveMod;
    const tunnelY = Math.cos(timeSec * 1.5) * curveMod;

    // UPDATE SYSTEMS
    wormhole.update(gameState);
    updateStars();
    player.update(gameState.keys, gameState, updateHUD, tunnelX, tunnelY);
    powerUps.update(camera, gameState, updateHUD);
    projectiles.update();

    if (now - gameState.lastEnemySpawn > spawnInterval) {
        if (gameState.score > 500 && Math.random() < 0.60) {
            enemies.spawnFormation('striker');
        } else {
            enemies.spawnRandom();
        }
        gameState.lastEnemySpawn = now;
    }

    if (now - gameState.lastPowerUpSpawn > 20000) { 
        powerUps.spawn();
        gameState.lastPowerUpSpawn = now;
    }

    enemies.update(camera, now, gameState, updateHUD);
    enemies.checkHits(projectiles);
    checkGameOver();

    if (gameState.multiplier < 5) { gameState.multiplier += 0.002; }

    document.getElementById('score-display').innerText = gameState.score.toString().padStart(6, '0');

    // Dynamic FOV expands significantly during a Boost
    const targetFOV = 100 + (gameState.moveSpeed * 25);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.05);
    camera.updateProjectionMatrix();

    if (difficultyLevel > lastDifficultyLevel) {
        hazeEl.classList.add('active'); 
        hazeEl.style.background = "radial-gradient(circle, transparent 20%, rgba(255, 255, 255, 0.4) 100%)";
        setTimeout(() => { 
            hazeEl.classList.remove('active'); 
            hazeEl.style.background = ""; 
        }, 150);
        lastDifficultyLevel = difficultyLevel;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const crosshair = document.getElementById('crosshair');
window.addEventListener('mousemove', (e) => {
    if (gameState.isPaused || gameState.isDead || !gameState.hasStarted) {
        crosshair.style.display = 'none';
        return;
    }

    if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.002;
        camera.rotation.y -= e.movementX * sensitivity;
        camera.rotation.x -= e.movementY * sensitivity;

        camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -0.6, 0.6); 
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -0.5, 0.5); 
    }
    crosshair.style.display = 'block';
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement && gameState.hasStarted && !gameState.isDead) {
        gameState.isPaused = true;
        pauseScreen.style.display = 'flex';
    }
});