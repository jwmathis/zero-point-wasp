import * as THREE from 'three';
import { Wormhole } from './World.js';
import { ProjectileSystem } from './Projectiles.js';    

/// Global state for the Wasp protocol
const gameState = {
    health: 100,
    ammo: 5, // 5 segments
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

/// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const light = new THREE.AmbientLight(0xffffff, 1);

scene.background = new THREE.Color(0x111111);
scene.add(light);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.fog = new THREE.FogExp2(0x000000, 0.015);

// Initialize the wormhole
const wormhole = new Wormhole(scene);

// Position the camera inside the tunnel
camera.position.set(0,0,5);
camera.lookAt(0,0,0);

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
    }
    
});

/// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    // update the tunnel animation
    wormhole.update();
    projectiles.update();
    updateHUD();
    
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})