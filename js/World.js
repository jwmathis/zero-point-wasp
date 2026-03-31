/**
 * World.js - Manages the Infinite Tunnel (Wormhole) and Speed Effects
 * Uses a "treadmill" approach to move the world toward the player.
 */
import * as THREE from 'three';

export class Wormhole {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.speedLines = [];
        
        // 1. TUNNEL CONFIGURATION
        this.numSegments = 25;   // Total rings in the scene
        this.spacing = 12;      // Distance between each ring
        this.tunnelRadius = 18;  // How wide the tunnel is
        this.baseSpeed = 1.1;    // Speed of travel
        
        this.init();
    }

    init() {
        // --- CREATE TUNNEL RINGS ---
        const ringGeo = new THREE.TorusGeometry(this.tunnelRadius, 0.15, 16, 64);
        
        for (let i = 0; i < this.numSegments; i++) {
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.4 
            });
            const ring = new THREE.Mesh(ringGeo, material);
            
            // Initial distribution along Z-axis
            ring.position.z = -i * this.spacing;
            
            this.scene.add(ring);
            this.segments.push(ring);
        }

        // --- CREATE SPEED LINES (The "Warp" Effect) ---
        const lineGeo = new THREE.BoxGeometry(0.05, 0.05, 15);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });

        for (let i = 0; i < 40; i++) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            this.resetSpeedLine(line);
            // Randomly scatter them initially
            line.position.z = Math.random() * -300; 
            
            this.scene.add(line);
            this.speedLines.push(line);
        }
    }

    /**
     * Resets a speed line to the far distance with a new random X/Y
     */
    resetSpeedLine(line) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 20; // Keep them outside the ship's path
        line.position.x = Math.cos(angle) * radius;
        line.position.y = Math.sin(angle) * radius;
        line.position.z = -300;
    }

    update(gameState) {
        const time = performance.now() * 0.001;
        const currentSpeed = this.baseSpeed * (gameState.multiplier || 1);

        // 1. UPDATE TUNNEL RINGS
        this.segments.forEach((ring, i) => {
            ring.position.z += currentSpeed;

            // Subtle rotation and "breathing" effect
            ring.rotation.z += 0.005;
            const scale = 1 + Math.sin(time + i) * 0.05;
            ring.scale.set(scale, scale, 1);

            // RECYCLE LOGIC: When a ring passes the camera
            if (ring.position.z > 15) {
                // Teleport to the back of the line
                ring.position.z = -((this.numSegments - 1) * this.spacing);
                
                // DYNAMIC CHANGE: Shift color based on "Sector" (Score)
                const hue = (gameState.score * 0.0001 + i * 0.02) % 1;
                ring.material.color.setHSL(hue, 0.8, 0.5);
                
                // Add a "Curvy Path" effect by offsetting far rings
                ring.position.x = Math.sin(time * 0.5) * 3;
                ring.position.y = Math.cos(time * 0.5) * 3;
            }
        });

        // 2. UPDATE SPEED LINES
        this.speedLines.forEach(line => {
            line.position.z += currentSpeed * 6; // Speed lines move much faster
            
            if (line.position.z > 20) {
                this.resetSpeedLine(line);
            }
        });
    }
}