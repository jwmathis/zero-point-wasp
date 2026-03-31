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
    ammo: 5,
    maxAmmo: 5,
    lastRegen: 0,
    regenInterval: 1500, // Recharge 1 segment every 1.5s
    isPaused: false,
    hasStarted: false,
    isDead: false,
    keys: { w: false, a: false, s: false, d: false, t: false},
    moveSpeed: 0.5,
    score: 0,
    multiplier: 1,
};

// Global access for EnemySystem and ProjectileSystem to read state
window.gameState = gameState; 

// --- UI ELEMENT CACHING ---
// Caching elements prevents expensive DOM lookups every frame
const hudHealth = document.getElementById('health-bar');
const hazeEl = document.getElementById('damage-haze');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const light = new THREE.AmbientLight(0xffffff, 0.5); // Base light for non-metallic parts
scene.add(light);
// Directional Light is the "Sun"
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(5, 10, 7.5);
scene.add(sunLight);

const playerLight = new THREE.PointLight(0x00ffff, 10, 50); 
camera.add(playerLight); 
playerLight.position.set(0, 0, -3); // Moved to -3 so it's right in front of the ship

const headlight = new THREE.PointLight(0xffffff, 5, 20); 
camera.add(headlight);
headlight.position.set(0, 0, -2); // Directly illuminating the hull

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
// Use a neutral scene for reflections so the metal actually "shines"
scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x000000, 0.015);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// --- MODULE INITIALIZATION ---
const wormhole = new Wormhole(scene);
const projectiles = new ProjectileSystem(scene);
const enemies = new EnemySystem(scene);
const player = new Player(scene, camera, hazeEl); // The Wasp Pilot
const powerUps = new PowerUpSystem(scene);

// Set initial pilot orientation
camera.position.set(0, 0, 5);
camera.rotation.order = 'YXZ';

// --- STARFIELD (Atmospheric Background) ---
const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 5000; i++) {
    starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xFFFFFF }));
scene.add(stars);

// --- CORE UTILITY FUNCTIONS ---

function updateHUD() {
    // Sync the HTML health bar with internal state
    hudHealth.style.width = `${gameState.health}%`;
    
    // Sync energy segments
    const segments = document.querySelectorAll('.segment');
    segments.forEach((seg, i) => {
        i < gameState.ammo ? seg.classList.add('active') : seg.classList.remove('active');
    });
}

function checkGameOver() {
    if (gameState.health <= 0 && !gameState.isDead) {
        gameState.isDead = true;
        gameState.health = 0;
        updateHUD();
        document.getElementById('final-score-value').innerText = gameState.score; // Dsiplay final score
        gameOverScreen.style.display = 'flex'; // Trigger Pilot KIA screen
    }
}

function updateStars() {
    const positions = stars.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 2.5; // Move stars toward camera
        if (positions[i + 2] > 10) positions[i + 2] = -1000; // Reset star to distance
    }
    stars.geometry.attributes.position.needsUpdate = true;
}

/**
 * Project 3D coordinates to 2D screen space to show floating score numbers
 */
function createScorePopup(position, points) {
    const vector = position.clone();
    vector.project(camera); // Convert 3D to Normalized Device Coordinates (-1 to +1)

    // Convert to pixel coordinates
    const x = (vector.x * .5 + .5) * window.innerWidth;
    const y = (vector.y * -.5 + .5) * window.innerHeight;

    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.innerText = `+${points}`;

    document.body.appendChild(popup);

    // Remove from DOM after animation finishes
    setTimeout(() => popup.remove(), 800);
}

// Attach to window so Enemies.js can call it
window.createScorePopup = createScorePopup;

// --- INPUT HANDLERS ---

document.getElementById('start-button').addEventListener('click', () => {
    renderer.domElement.requestPointerLock();

    startScreen.style.display = 'none';
    setTimeout(() => { gameState.hasStarted = true; }, 100);
});

document.getElementById('restart-button').addEventListener('click', () => window.location.reload());

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Handle Pause
    if (key === 'p' && gameState.hasStarted) {
        gameState.isPaused = !gameState.isPaused;
        pauseScreen.style.display = gameState.isPaused ? 'flex' : 'none';
    }
    // Handle Movement Inputs
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = false;
});

window.addEventListener('mousedown', (e) => {
    // Guard clause: Prevent shooting while dead, paused, or clicking UI
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest("#ui-layer")) return;

    if (gameState.ammo > 0) {
        projectiles.fire(camera);
        camera.position.z += 0.1; // Slight kickback
        setTimeout(() => { camera.position.z -= 0.1; }, 50);
        gameState.ammo--;
        updateHUD();
        
        // Weapon flash effect
        light.intensity = 5.0;
        setTimeout(() => { light.intensity = 1.5; }, 100);
    }
});

// --- MAIN ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    // Stop processing if game is inactive
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;

    const now = performance.now();

    // Zero-Point Energy Regeneration
    if (gameState.ammo < gameState.maxAmmo && now - gameState.lastRegen > gameState.regenInterval) {
        gameState.ammo++;
        gameState.lastRegen = now;
        updateHUD();
    }

    // UPDATE PHASE
    wormhole.update(gameState);
    updateStars();
    player.update(gameState.keys, gameState, updateHUD);
    powerUps.update(camera, gameState, updateHUD);
    checkGameOver();
    enemies.update(camera, now);
    projectiles.update();
    // Passive scoring: +1 point per frame while alive
    if (gameState.hasStarted && !gameState.isPaused && !gameState.isDead) {
        gameState.score += 1;
        document.getElementById('score-display').innerText = gameState.score.toString().padStart(6, '0');
    }

    // COLLISION PHASE
    // Check if player bolts hit any enemies
    enemies.checkHits(projectiles);

    // RENDER PHASE
    renderer.render(scene, camera);
}

animate();

// Responive window handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const crosshair = document.getElementById('crosshair');
// Mouse-based camera look (Neural Link feel)
window.addEventListener('mousemove', (e) => {
    if (gameState.isPaused || gameState.isDead || !gameState.hasStarted) {
        crosshair.style.display = 'none';
        return;
    }

    if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.002;
        camera.rotation.y -= e.movementX * sensitivity;
        camera.rotation.x -= e.movementY * sensitivity;

        // Optional: Clamp the vertical look so they can't flip the camera upside down
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -0.5, 0.5);
    }
    crosshair.style.display = 'block';
    crosshair.style.left = `${e.clientX}px`;
    crosshair.style.top = `${e.clientY}px`;

    // const x = (e.clientX / window.innerWidth) * 2 - 1;
    // const y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // camera.rotation.y = -x * 0.3;
    // camera.rotation.x = y * 0.3;
    // camera.rotation.z = -x * 0.1; // Banking effect for the mouse
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement && gameState.hasStarted) {
        // Pointer was unlocked (user hit Esc)
        gameState.isPaused = true;
        pauseScreen.style.display = 'flex';
    }
});