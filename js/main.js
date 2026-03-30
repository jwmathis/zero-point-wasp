import * as THREE from 'three';

/// 1. SCENE SETUP
const scene = new THREE.scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/// 2. GAME LOOP

function animate() {
    requestAnimationFrame(animate);
    // Add game logic later
    renderer.render(scene, camera);
}