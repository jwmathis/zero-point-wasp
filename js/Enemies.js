/**
 * Enemies.js - Manages enemy spawning, behavior, and collision.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class EnemySystem {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyProjectiles = [];

        // Asset storage
        this.strikerModel = null;
        this.seekerModel = null;
        this.mineModel = null;

        this.loader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();

        // Fallback models
        this.geos = {
            mine: new THREE.IcosahedronGeometry(1, 0),
            seeker: new THREE.OctahedronGeometry(1.2, 0),
            striker: new THREE.TetrahedronGeometry(1.5, 0)
        };
        
        // Start loading the striker ship
        this.loadAssets();

        // Auto-spawn timer
        setInterval(() => this.spawnRandom(), 4000);
    }

    loadAssets() {
        // --- STRIKER ---
        const strikerTex = this.textureLoader.load('./assets/striker/Textures/Striker_Purple.png');
        this.loader.load('./assets/striker/Striker.gltf', (gltf) => {
            this.strikerModel = this.prepareModel(gltf.scene, strikerTex, 0.8);
            console.log("Striker Ready");
        });

        // --- SEEKER ---
        const seekerTex = this.textureLoader.load('./assets/seeker/Textures/Insurgent_Red.png');
        this.loader.load('./assets/seeker/Insurgent.gltf', (gltf) => {
            this.seekerModel = this.prepareModel(gltf.scene, seekerTex, 0.5);
            console.log("Seeker Ready");
        });

        // --- MINE ---
        const mineTex = this.textureLoader.load('./assets/mine/Textures/material_1_baseColor.png');
        this.loader.load('./assets/mine/crate.gltf', (gltf) => {
            this.mineModel = this.prepareModel(gltf.scene, mineTex, 1.5);
            console.log("Mine Ready");
        });
    }

    prepareModel(scene, texture, scale) {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: texture,
                    metalness: 0.6,
                    roughness: 0.4
                });
                child.frustumCulled = false;
            }
        });
        scene.scale.set(scale, scale, scale);
        return scene;
    }

    spawnRandom() {
        if (!window.gameState.hasStarted || window.gameState.isPaused) return;
        const types = ['mine', 'seeker', 'striker'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawn(type, new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, -150));
    }

    spawn(type, position) {
        let mesh;

        // Check which model to clone
        if (type === 'striker' && this.strikerModel) {
            mesh = this.strikerModel.clone();
        } else if (type === 'seeker' && this.seekerModel) {
            mesh = this.seekerModel.clone();
        } else if (type === 'mine' && this.mineModel) {
            mesh = this.mineModel.clone();
            // Add a random scale variation between 80% and 120% of the base size
            const randomScale = 0.8 + Math.random() * 0.4;
            mesh.scale.multiplyScalar(randomScale);
        } else {
            // Fallback to geometric wireframes if models aren't ready
            const material = new THREE.MeshBasicMaterial({
                color: type === 'striker' ? 0xFF00FF : 0xFF5500,
                wireframe: true
            });
            mesh = new THREE.Mesh(this.geos[type], material);
        }

        mesh.position.copy(position);
        mesh.userData = { type, health: 1, lastShot: 0 };

        this.scene.add(mesh);
        this.enemies.push(mesh);
    }

    checkHits(projectileSystem) {
        projectileSystem.bolts.forEach((bolt, bIdx) => {
            this.enemies.forEach((enemy, eIdx) => {
                if (bolt.position.distanceTo(enemy.position) < 3.5) {
                    // 1. Calculate Score
                    const pointsMap = { 'mine': 100, 'seeker': 250, 'striker': 500 };
                    const points = pointsMap[enemy.userData.type] || 100;
                    
                    window.gameState.score += points;
                    
                    
                    // Trigger Explosion
                    const enemyColor = enemy.userData.type === 'striker' ? 0xff00ff : 0x00ffff;
                    this.createExplosion(enemy.position, enemyColor);
                    
                    // Brief "hit-stop" effect
                    const originalSpeed = this.moveSpeed;
                    this.moveSpeed = 0.05; // Slow down
                    setTimeout(() => { this.moveSpeed = 0.5; }, 50); // Snap back after 50ms

                    // 2. Trigger the Floating Text
                    if (window.createScorePopup) {
                        window.createScorePopup(enemy.position, points);
                    }


                    // 3. Cleanup and Feedback
                    this.removeEnemy(enemy, eIdx);
                    this.scene.remove(bolt);
                    projectileSystem.bolts.splice(bIdx, 1);
                    
                    const ch = document.getElementById('crosshair');
                    ch.classList.add('hit');
                    setTimeout(() => ch.classList.remove('hit'), 100);
                }
            });
        });
    }

    createExplosion(position, color = 0xff0055) {
        const particleCount = 20;
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            
            // Start at enemy position
            particle.position.copy(position);

            // Give it a random velocity vector
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );

            // Life management
            particle.userData.alive = true;
            particle.userData.timer = 0;

            this.scene.add(particle);
            
            // We need a way to track these to update them
            if (!this.particles) this.particles = [];
            this.particles.push(particle);
        }
    }

    update(camera, now) {
        // Update Enemies
        this.enemies.forEach((enemy, index) => {
            const dist = enemy.position.distanceTo(camera.position);

            // Some rotation to the enemies so they don't look static
            if (enemy.userData.type === 'striker') {
                enemy.rotation.z += 0.01; // Barrel roll
            } else if (enemy.userData.type === 'mine') {
                enemy.rotation.y += 0.02; // Spinning menace
                enemy.rotation.x += 0.01;
            } else if (enemy.userData.type === 'seeker') {
                // Seekers look cool if they "wobble" towards the player
                enemy.rotation.z = Math.sin(Date.now() * 0.005) * 0.2;
            }

            if (enemy.userData.type === 'seeker') {
                const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
                enemy.position.addScaledVector(dir, 0.25);
            } else if (enemy.userData.type === 'striker' && dist < 100) { // Distance enemy is from player before firing
                if (now - enemy.userData.lastShot > 3000) { //3 seconds between bursts
                    this.fireBurst(enemy, camera);
                    enemy.userData.lastShot = now;
                }
            }

            enemy.position.z += 0.5; // Approach player

            if (dist < 3.0) { // Crash collision
                this.damagePlayer(enemy.userData.type);
                this.removeEnemy(enemy, index);
            }
            if (enemy.position.z > 10) this.removeEnemy(enemy, index);

            if (this.particles) {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.position.add(p.userData.velocity);
                    p.userData.timer++;

                    // Shrink them over time
                    p.scale.multiplyScalar(0.95);

                    // Remove after 30 frames or when too small
                    if (p.userData.timer > 30 || p.scale.x < 0.01) {
                        this.scene.remove(p);
                        this.particles.splice(i, 1);
                    }
                }
            }

        });

        // Update Enemy Bullets
        this.enemyProjectiles.forEach((p, i) => {
            p.position.addScaledVector(p.userData.dir, 0.5);
            if (p.position.distanceTo(camera.position) < 1.5) {
                this.damagePlayer('bolt');
                this.scene.remove(p);
                this.enemyProjectiles.splice(i, 1);
            }
        });
    }

    fireAtPlayer(enemy, camera) {
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        bullet.position.copy(enemy.position);
        bullet.userData.dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
    }

    fireAtPlayer2(enemy, camera) {
        // Create a small red glowing sphere for the enemy bolt
        const bulletGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);
        
        bullet.position.copy(enemy.position);

        // Calculate direction to player
        const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        
        // OPTIONAL: Add slight randomness so shots aren't 100% perfect
        dir.x += (Math.random() - 0.5) * 0.05;
        dir.y += (Math.random() - 0.5) * 0.05;

        bullet.userData.dir = dir;
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
    }


    fireBurst(enemy, camera) {
        const shotCount = 3; // Number of shots in the burst
        const delayBetweenShots = 150; // Milliseconds between each shot

        for (let i = 0; i < shotCount; i++) {
            setTimeout(() => {
                // Check if the enemy still exists before firing (prevents errors if destroyed mid-burst)
                if (this.enemies.includes(enemy)) {
                    this.fireAtPlayer(enemy, camera);
                }
            }, i * delayBetweenShots);
        }
    }

    damagePlayer(source) {
        const damageMap = { mine: 25, seeker: 35, striker: 20, bolt: 10 };
        window.gameState.health -= damageMap[source] || 10;
        // Getting hit by an enemy resets your multiplier
        window.gameState.multiplier = 1;
        window.gameState.health -= damageMap[source] || 10;
    }

    removeEnemy(enemy, index) {
        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }
}