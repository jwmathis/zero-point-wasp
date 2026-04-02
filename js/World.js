/**
 * World.js - Manages the Infinite Tunnel (Wormhole) and Speed Effects
 * Uses a "treadmill" approach to move the world toward the player.
 */
import * as THREE from 'three';

export class Wormhole {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.numSegments = 25;   
        this.spacing = 15;      
        this.tunnelRadius = 24;  
        this.baseSpeed = 1.1;    
        this.speedLines = [];
        
        this.init();
    }

    init() {
        const ringGeo = new THREE.TorusGeometry(this.tunnelRadius, 0.15, 16, 100);
        
        for (let i = 0; i < this.numSegments; i++) {
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
            const ring = new THREE.Mesh(ringGeo, material);
            ring.position.z = -i * this.spacing;
            this.scene.add(ring);
            this.segments.push(ring);
        }

        const lineGeo = new THREE.BoxGeometry(0.05, 0.05, 15);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });

        for (let i = 0; i < 40; i++) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            this.resetSpeedLine(line);
            line.position.z = Math.random() * -300;  
            this.scene.add(line);
            this.speedLines.push(line);
        }
    }

    resetSpeedLine(line) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 20; 
        line.position.x = Math.cos(angle) * radius;
        line.position.y = Math.sin(angle) * radius;
        line.position.z = -300;
    }

    update(gameState) {
        const timeSec = performance.now() * 0.001;

        // UPDATE TUNNEL RINGS
        this.segments.forEach((ring, i) => {
            ring.position.z += gameState.moveSpeed;

            ring.rotation.z += 0.005;
            const scale = 1 + Math.sin(timeSec + i) * 0.05;
            ring.scale.set(scale, scale, 1);

            // Synchronized curve formula matches main.js dynamic boundaries
            const curveMod = 1.5 + ((gameState.difficultyLevel || 0) * 0.2);
            ring.position.x = Math.sin(ring.position.z * 0.02 + timeSec * 1.5) * curveMod;
            ring.position.y = Math.cos(ring.position.z * 0.02 + timeSec * 1.5) * curveMod;

            if (ring.position.z > 20) {
                ring.position.z -= (this.numSegments * this.spacing);
                
                const hue = (0.6 - ((gameState.difficultyLevel || 0) * 0.05) + (i * 0.01)) % 1;
                ring.material.color.setHSL(hue, 0.8, 0.5);
            }
        });

        // UPDATE SPEED LINES
        this.speedLines.forEach(line => {
            line.position.z += gameState.moveSpeed * 6; 
            if (line.position.z > 20) { this.resetSpeedLine(line); }
        });
    }
}