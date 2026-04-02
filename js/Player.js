/**
 * Player.js - Manages the pilot's ship (Star Sparrow)
 * Handles GLTF loading, movement, boundary constraints, and visual feedback.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, hazeElement) {
        this.scene = scene;
        this.camera = camera;
        this.hazeEl = hazeElement;
        this.mesh = null; 
        this.mixer = null; 
        this.limit = 18; 
        this.buffer = 1.5;     
        this.moveSpeed = 0.05;
        this.rollIntensity = 0.05;
        this.velocity = new THREE.Vector2(0, 0);
        this.friction = 0.88;

        // Barrel Roll mechanics
        this.rollFrames = 0;
        this.rollDir = 1;
        this.isInvulnerable = false;
        
        // Multi-Engine Thruster array
        this.thrusters = [];

        this.ships = [
            { time: 0.74, scale: 0.5, y: -0.8, name: "Main Shuttle" },
            { time: 3.15, scale: 0.8, y: -0.6, name: "X-Wing" },
            { time: 5.77, scale: 0.8, y: -0.5, name: "Hyper Shuttle" },
            { time: 8.26, scale: 0.8, y: -1.0, name: "Jet" },
        ];        
        this.currentShipIndex = 1; 

        this.loadModel();
    }

    applyShipStats() {
        if (!this.mesh || !this.mixer) return;
        const stats = this.ships[this.currentShipIndex];
        this.mixer.setTime(stats.time); 
        this.mesh.position.set(0, -1.5, -4); 
        this.mesh.scale.set(stats.scale, stats.scale, stats.scale);
    }

    loadModel() {
        new GLTFLoader().load('./assets/star_sparrow.glb', (gltf) => {
            const shipSource = gltf.scene;

            this.mixer = new THREE.AnimationMixer(shipSource);
            if (gltf.animations.length > 0) {
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
            }

            const pivot = new THREE.Group();
            shipSource.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(shipSource);
            const center = box.getCenter(new THREE.Vector3());
            shipSource.position.set(-center.x, -center.y, -center.z);
            
            pivot.add(shipSource);
            pivot.rotation.y = Math.PI; 
            
            this.mesh = pivot;
            this.camera.add(this.mesh); 

            shipSource.traverse(child => { 
                if (child.isMesh) {
                    child.frustumCulled = false; 
                    child.material.metalness = 0.6;
                    child.material.roughness = 0.4;
                    child.material.emissive = new THREE.Color(0x00ffff);
                    child.material.emissiveIntensity = 0.4;
                    child.material.needsUpdate = true;
                }
            });

            // MULTI-ENGINE SETUP: Shared geometry/material for efficiency
            const engineGeo = new THREE.ConeGeometry(0.3, 2.0, 8);
            engineGeo.translate(0, -1.0, 0); // Origin at base
            engineGeo.rotateX(-Math.PI / 2); // Point backward
            
            const engineMat = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.8, 
                blending: THREE.AdditiveBlending 
            });

            // Adjusted Positions: Brought the X coordinates INWARD so they sit tighter to the fuselage
            const positions = [
                { x: 0, y: -0.3, z: -1.0 },     // Main fuselage (Center)
                { x: -0.85, y: -0.75, z: -0.8 },  // Left outer nozzle (Brought inward)
                { x: 0.85, y: -0.75, z: -0.8 }    // Right outer nozzle (Brought inward)
            ];

            positions.forEach(pos => {
                const t = new THREE.Mesh(engineGeo, engineMat);
                t.position.set(pos.x, pos.y, pos.z);
                this.mesh.add(t);
                this.thrusters.push(t);
            });

            this.applyShipStats();
        });
    }

    flashRed() {
        if (!this.mesh) return;

        this.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff0000); 
            }
        });
        
        // Flash all engine plumes red simultaneously
        if (this.thrusters.length > 0) {
            this.thrusters.forEach(t => t.material.color.setHex(0xff0000)); 
        }

        setTimeout(() => {
            if (this.mesh) {
                this.mesh.traverse(child => {
                    if (child.isMesh && child.material && child.material.emissive) {
                        child.material.emissive.setHex(0x00ffff); 
                    }
                });
                if (this.thrusters.length > 0) {
                    this.thrusters.forEach(t => t.material.color.setHex(0x00ffff)); 
                }
            }
        }, 200);
    }

    update(keys, gameState, updateHUDCallback, tunnelX = 0, tunnelY = 0) {
        if (!this.mesh) return;

        if (keys.a) this.velocity.x -= this.moveSpeed;
        if (keys.d) this.velocity.x += this.moveSpeed;
        if (keys.w) this.velocity.y += this.moveSpeed;
        if (keys.s) this.velocity.y -= this.moveSpeed;

        this.velocity.multiplyScalar(this.friction);

        this.camera.position.x += this.velocity.x;
        this.camera.position.y += this.velocity.y;

        const shipPos = new THREE.Vector3(0, -1.5, -4).applyMatrix4(this.camera.matrixWorld);
        const distSq = (shipPos.x - tunnelX) ** 2 + (shipPos.y - tunnelY) ** 2;
        const radiusSq = Math.pow(this.limit - this.buffer, 2);

        if (distSq > radiusSq && !this.isInvulnerable) {
            this.triggerScrapeEffect(gameState, updateHUDCallback);
        } else {
            this.hazeEl.classList.remove('active');
        }

        if (this.camera.position.x <= tunnelX - this.limit || this.camera.position.x >= tunnelX + this.limit) this.velocity.x = 0;
        if (this.camera.position.y <= tunnelY - this.limit || this.camera.position.y >= tunnelY + this.limit) this.velocity.y = 0;

        this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, tunnelX - this.limit, tunnelX + this.limit);
        this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, tunnelY - this.limit, tunnelY + this.limit);
        
        this.camera.rotation.z = -this.camera.position.x * 0.02;

        if (this.rollFrames > 0) {
            this.mesh.rotation.z += (Math.PI * 2 / 20) * this.rollDir; 
            this.rollFrames--;
            this.isInvulnerable = true;
        } else {
            this.isInvulnerable = false;
            if (keys.q) { this.rollFrames = 20; this.rollDir = 1; keys.q = false; }
            if (keys.e) { this.rollFrames = 20; this.rollDir = -1; keys.e = false; }
            
            const targetRoll = keys.a ? 0.4 : (keys.d ? -0.4 : 0);
            this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetRoll, 0.1);
        }

        // UPDATE ALL THRUSTERS: Shared animation logic
        if (this.thrusters.length > 0) {
            this.thrusters.forEach(t => {
                const tLen = keys.shift ? 2.5 : (keys[' '] ? 0.3 : 1.0 + Math.random() * 0.4);
                const tWid = keys.shift ? 1.5 : 0.8 + Math.random() * 0.2;
                t.scale.set(tWid, tWid, tLen);
                t.material.opacity = 0.4 + Math.random() * 0.6;
            });
        }
    }

    triggerScrapeEffect(gameState, updateHUDCallback) {
        this.hazeEl.classList.add('active');

        this.camera.position.x += (Math.random() - 0.5) * 0.2;
        this.camera.position.y += (Math.random() - 0.5) * 0.2;

        gameState.health -= 0.01; 
        updateHUDCallback();
    }
}