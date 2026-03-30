import * as THREE from 'three';
import { Wormhole } from './World.js';
import { ProjectileSystem } from './Projectiles.js';    
import { EnemySystem } from './Enemies.js';

/// Global state for the Wasp protocol
const gameState = {
    health: 100,
    ammo: 5, // 5 segments
    maxAmmo: 5,
    lastRegen: 0,
    regenInterval: 1500, // Recharge 1 segment every 1.5 seconds (1500ms)
    isPaused: false,
    hasStarted: false,
    isDead: false,
    keys: {w: false, a: false, s: false, d: false },
    moveSpeed: 0.5,
};

/// Functions
function updateHUD() {
    // Update Health
    document.getElementById('health-bar').style.width = `${gameState.health}%`;
    
    // Update Ammo Segments
    const segments = document.querySelectorAll('.segment');
    segments.forEach((seg, index) => {
        if (index < gameState.ammo) {
            seg.classList.add('active');
        } else {
            seg.classList.remove('active');
        }
    });
}

window.gameState = gameState; 

// Handle the Start Button
document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    // Small delay to prevent the "click" from bleeding into the game
    setTimeout(() => {
        gameState.hasStarted = true;
    }, 100); 
});

// Handle Pause Toggle (P Key)
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' && gameState.hasStarted) {
        togglePause();
    }
});

// Handle Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    window.location.reload(); // Simplest way to reset a Three.js scene
});

function checkGameOver() {
    if (gameState.health <= 0 && !gameState.isDead) {
        gameState.isDead = true;
        gameState.health = 0; // Clamp at zero
        updateHUD();
        
        // Show the screen
        document.getElementById('game-over-screen').style.display = 'flex';
        
        // Optional: Stop the wormhole music or play a crash sound here
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pause-screen').style.display = gameState.isPaused ? 'flex' : 'none';
}

/// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const light = new THREE.AmbientLight(0xffffff, 1);
camera.rotation.order = 'YXZ';

scene.background = new THREE.Color(0x111111);
scene.add(light);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.fog = new THREE.FogExp2(0x000000, 0.015);

// Initialize the wormhole
const wormhole = new Wormhole(scene);

// Position the camera inside the tunnel
camera.position.set(0,0,5);
camera.lookAt(0,0,-100);

// Make stars
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF });

const starVertices = [];
for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 1000;
    const y = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    starVertices.push(x, y, z);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);

function updateStars() {
    const positions = stars.geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
        // Move star toward camera (Z increases)
        positions[i + 2] += 2.5; 

        // If star passes the camera (z > 5), reset it to the far back
        if (positions[i + 2] > 10) {
            positions[i + 2] = -1000;
            // Also randomize X and Y slightly to prevent "pattern" recognition
            positions[i] = (Math.random() - 0.5) * 1000;
            positions[i + 1] = (Math.random() - 0.5) * 1000;
        }
    }
    // Required to tell Three.js the stars moved
    stars.geometry.attributes.position.needsUpdate = true;
}
scene.add(stars);

/// --- PROJECTILES ---
const projectiles = new ProjectileSystem(scene);
// Mouse CLick Listener
window.addEventListener('mousedown', (event) => {
    // Only fire if the game has actually started and isn't paused
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;

    //Prevent firing if clicking on a button or the UI Layer
    if (event.target.tagName === 'BUTTON' || event.target.closest("ui-layer")) return;

    if (gameState.ammo > 0) {
        projectiles.fire(camera);
        gameState.ammo--; //Deplete an ammo segment
        updateHUD();

        light.intensity = 4.0;
        setTimeout(() => {
            light.intensity = 1.0; //return to normal after 50ms
        }, 50);

    }
    
});


/// --- ENEMIES ---
const enemies = new EnemySystem(scene);

setInterval(() => {
    const types = ['mine', 'seeker', 'striker'];
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.spawn(type, new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        -150 //spawn at the end of the tunnel
    ));
}, 4000);

const hazeEl = document.getElementById('damage-haze');

function updatePlayer() {
    const limit = 10; 
    const buffer = 0.1; // Detect the hit slightly before the hard stop

    // 1. Movement logic
    if (gameState.keys.a) camera.position.x -= gameState.moveSpeed;
    if (gameState.keys.d) camera.position.x += gameState.moveSpeed;
    if (gameState.keys.w) camera.position.y += gameState.moveSpeed;
    if (gameState.keys.s) camera.position.y -= gameState.moveSpeed;

    if (Math.abs(camera.position.x) > (limit - buffer) || Math.abs(camera.position.y) > (limit - buffer)) {
        
        // 1. Show the "Haze"
        hazeEl.style.display = 'block'; // Ensure it exists
        // Add the class AFTER ensuring display:block to trigger the fade transition
        setTimeout(() => hazeEl.classList.add('active'), 10);

        // 2. Heavy vibe/scrape vibration
        // Make it a bit stronger for impact
        camera.position.x += (Math.random() - 0.5) * 0.25;
        camera.position.y += (Math.random() - 0.5) * 0.25;
        
        // Damage (increased slightly for effect)
        gameState.health -= 0.3; 
        updateHUD();

    } else {
        // Clear the effect when moving away from the wall
        hazeEl.classList.remove('active');
        // Optional: Hide completely after fade-out to save browser resources
        // setTimeout(() => { if (!hazeEl.classList.contains('active')) hazeEl.style.display = 'none'; }, 200);
    }

    // 3. The Hard Wall (The Clamp)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, -limit, limit);
    
    // Aesthetic roll
    camera.rotation.z = -camera.position.x * 0.02;
}

/// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameState.hasStarted || gameState.isPaused || gameState.isDead) return;

    const now = performance.now();

    if (gameState.ammo < gameState.maxAmmo) {
        if (now - gameState.lastRegen > gameState.regenInterval) {
            gameState.ammo++;
            gameState.lastRegen = now;
            updateHUD();
        }
    } else {
        gameState.lastRegen = now;
    }

    // update the tunnel animation
    wormhole.update(1.2);
    updateStars();

    updatePlayer();
    checkGameOver();
    enemies.update(camera, now);
    projectiles.update();
    
    projectiles.bolts.forEach((bolt, bIdx) => {
        enemies.enemies.forEach((enemy, eIdx) => {
            // Increase the 2 to 3.5 for a "generous" hitbox
            // This compensates for high speeds and frame-rate skips
            if (bolt.position.distanceTo(enemy.position) < 3.5) {
                enemies.removeEnemy(enemy, eIdx);
                scene.remove(bolt);
                projectiles.bolts.splice(bIdx, 1);
                
                // Visual Feedback: Flash the crosshair or shake the camera
                document.getElementById('crosshair').classList.add('hit');
                setTimeout(() => document.getElementById('crosshair').classList.remove('hit'), 100);
            }
        });
    });

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    camera.rotation.y = -x * 0.3;
    camera.rotation.x = y * 0.3;
    // Add a slight "roll" (Z-rotation) when moving the mouse left/right
    camera.rotation.z = -x * 0.1; 
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.keys.hasOwnProperty(key)) gameState.keys[key] = false;
});