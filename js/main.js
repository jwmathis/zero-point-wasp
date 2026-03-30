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
    regenInterval: 3000 // Recharge 1 segment every 3 seconds (3000ms)

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
scene.add(stars);


/// --- PROJECTILES ---
const projectiles = new ProjectileSystem(scene);
// Mouse CLick Listener
window.addEventListener('mousedown', () => {
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

/// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
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
    wormhole.update();

    enemies.update(camera, now);
    projectiles.update();
    
    // Check if player projectiles hit enemies
    projectiles.bolts.forEach((bolt, bIdx) => {
        enemies.enemies.forEach((enemy, eIdx) => {
            if (bolt.position.distanceTo(enemy.position) < 2) {
                enemies.removeEnemy(enemy, eIdx);
                scene.remove(bolt);
                projectiles.bolts.splice(bIdx, 1);
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
    
    // Rotate camera to follow mouse
    camera.rotation.y = -x * 0.5;
    camera.rotation.x = y * 0.5;
});
