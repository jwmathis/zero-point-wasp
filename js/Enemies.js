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
        this.particles = [];
        
        this.strikerModel = null;
        this.seekerModel = null;
        this.mineModel = null;

        this.loader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();

        this.geos = { // Default geometries if models aren't loaded yet
            mine: new THREE.IcosahedronGeometry(1, 0),
            seeker: new THREE.OctahedronGeometry(1.2, 0),
            striker: new THREE.TetrahedronGeometry(1.5, 0)
        };
        
        this.loadAssets();
    }

    loadAssets() {
        // --- STRIKER ---
        const strikerTex = this.textureLoader.load('./assets/future_drone/textures/Material_1001_baseColor.png');
        this.loader.load('./assets/future_drone/scene.gltf', (gltf) => {
            this.strikerModel = this.prepareModel(gltf.scene, strikerTex, 0.1);
        });

        // --- SEEKER ---
        const seekerTex = this.textureLoader.load('./assets/scifi_drone/textures/M2Robot_baseColor>.png');
        this.loader.load('./assets/scifi_drone/scene.gltf', (gltf) => {
            this.seekerModel = this.prepareModel(gltf.scene, seekerTex, 0.1);
        });

        // --- MINE ---
        const mineTex = this.textureLoader.load('./assets/mine/Textures/material_1_baseColor.png');
        this.loader.load('./assets/mine/crate.gltf', (gltf) => {
            this.mineModel = this.prepareModel(gltf.scene, mineTex, 0.6);
        });
    }

    prepareModel(scene, texture, scale) {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: texture, metalness: 0.6, roughness: 0.4
                });
                child.frustumCulled = false;
            }
        });
        scene.scale.set(scale, scale, scale);
        return scene;
    }

    spawnRandom() {
        const types = ['mine', 'seeker', 'striker'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawn(type, new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, -150));
    }

    spawn(type, position) {
        let mesh;
        if (type === 'striker' && this.strikerModel) {
            mesh = this.strikerModel.clone();
        } else if (type === 'seeker' && this.seekerModel) {
            mesh = this.seekerModel.clone();
        } else if (type === 'mine' && this.mineModel) {
            mesh = this.mineModel.clone();
            mesh.scale.multiplyScalar(0.8 + Math.random() * 0.4);
        } else {
            const material = new THREE.MeshBasicMaterial({
                color: type === 'striker' ? 0xFF00FF : 0xFF5500, wireframe: true
            });
            mesh = new THREE.Mesh(this.geos[type], material);
        }

        mesh.position.copy(position);
        mesh.userData = { type, health: 1, lastShot: 0 };
        this.scene.add(mesh);
        this.enemies.push(mesh);
    }

    checkHits(projectileSystem) {
            for (let bIdx = projectileSystem.bolts.length - 1; bIdx >= 0; bIdx--) {
                const bolt = projectileSystem.bolts[bIdx];
                
                for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
                    const enemy = this.enemies[eIdx];
                    
                    if (bolt.position.distanceToSquared(enemy.position) < 25) { // Change this value for hitbox size (3.5^2 = 12.25)
                        const pointsMap = { 'mine': 100, 'seeker': 250, 'striker': 500 };
                        const points = pointsMap[enemy.userData.type] || 100;
                        
                        window.gameState.score += points;
                        
                        const enemyColor = enemy.userData.type === 'striker' ? 0xff00ff : 0x00ffff;
                        this.createExplosion(enemy.position, enemyColor);
                        
                        if (window.createScorePopup) window.createScorePopup(enemy.position, points);

                        this.removeEnemy(enemy, eIdx);
                        this.scene.remove(bolt);
                        projectileSystem.bolts.splice(bIdx, 1);
                        
                        const ch = document.getElementById('crosshair');
                        if(ch) {
                            ch.classList.add('hit');
                            setTimeout(() => ch.classList.remove('hit'), 100);
                        }
                        break; 
                    }
                }
            }
        }

    createExplosion(position, color = 0xff0055) {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < 20; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            particle.userData.timer = 0;
            this.scene.add(particle);
            this.particles.push(particle);
            if (sfx.explosion) sfx.explosion.play();
        }
    }

    update(camera, now, gameState) {

        // Update Enemies
        for (let index = this.enemies.length - 1; index >= 0; index--) {
            const enemy = this.enemies[index];
            // Basic movement toward player
            enemy.position.z += gameState.moveSpeed * 2;

            // DIVING BEHAVIOR: 
            // If it's a diver, swoop down as it gets closer to the player
            if (enemy.userData.behavior === 'seeker' && enemy.position.z > -80) {
                enemy.position.y -= 0.12; // Descent speed
                enemy.rotation.x = THREE.MathUtils.lerp(enemy.rotation.x, Math.PI / 6, 0.05); // Tilt nose down
            }

            const distSq = enemy.position.distanceToSquared(camera.position);

            if (enemy.userData.type === 'striker') {
                enemy.rotation.z += 0.01; 
                // Fire logic
                if (distSq < 10000 && now - enemy.userData.lastShot > 3000) { 
                    this.fireBurst(enemy, camera);
                    enemy.userData.lastShot = now;
                }
            } else if (enemy.userData.type === 'mine') {
                enemy.rotation.y += 0.02; 
                enemy.rotation.x += 0.01;
            } else if (enemy.userData.type === 'seeker') {
                //enemy.rotation.z = Math.sin(Date.now() * 0.005) * 0.2;
                enemy.rotation.z += 0.01; 
                const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
                enemy.position.addScaledVector(dir, 0.25);
            }

            enemy.position.z += window.gameState.moveSpeed * 1.5;

            if (distSq < 9.0) { // Crash distance
                this.damagePlayer(enemy.userData.type);
                this.removeEnemy(enemy, index);
                continue;
            }
            if (enemy.position.z > 10) this.removeEnemy(enemy, index);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.userData.velocity);
            p.userData.timer++;
            p.scale.multiplyScalar(0.95);

            if (p.userData.timer > 30 || p.scale.x < 0.01) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }

        // Update Enemy Bullets
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.position.addScaledVector(p.userData.dir, 0.6);
            
            if (p.position.distanceToSquared(camera.position) < 1.44) { // 1.5 units hitbox, squared for performance, decrease if you want it easier
                this.damagePlayer('bolt');
                this.scene.remove(p);
                this.enemyProjectiles.splice(i, 1);
            } else if (p.position.z > 20) {
                this.scene.remove(p);
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    spawnFormation(type = 'striker') {
        const formations = {
            'V': [{x: 0, y: 0, z: 0}, {x: -8, y: 4, z: -15}, {x: 8, y: 4, z: -15}],
            'Line': [{x: -10, y: 0, z: 0}, {x: 0, y: 0, z: 0}, {x: 10, y: 0, z: 0}]
        };

        const keys = Object.keys(formations);
        const selectedPattern = formations[keys[Math.floor(Math.random() * keys.length)]];
        const behavior = Math.random() > 0.5 ? 'diver' : 'standard';

        selectedPattern.forEach(offset => {
            // FIX: Calculate proper position Vector before passing to spawn()
            const spawnPos = new THREE.Vector3(
                (Math.random() - 0.5) * 10 + offset.x,
                (Math.random() - 0.5) * 10 + offset.y,
                -250 + offset.z // Spawn deep in the distance
            );
            
            // Use the standard spawn function so they get properly registered
            const mesh = this.spawn(type, spawnPos);
            
            // Override with formation-specific stats
            mesh.userData.behavior = behavior;
            mesh.userData.health = 2;
        });
    }

    fireAtPlayer(enemy, camera) {
        const bulletGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);
        
        bullet.position.copy(enemy.position);
        const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        
        // Random Spread
        dir.x += (Math.random() - 0.5) * 0.05;
        dir.y += (Math.random() - 0.5) * 0.05;

        bullet.userData.dir = dir;
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
        if (sfx.laser) sfx.laser.play();
    }

    fireBurst(enemy, camera) {
        for (let i = 0; i < 3; i++) { // Fire 3 bullets in quick succession
            setTimeout(() => {
                if (this.enemies.includes(enemy)) {
                    this.fireAtPlayer(enemy, camera);
                }
            }, i * 150);
        }
    }

    damagePlayer(source) {
        const damageMap = { mine: 25, seeker: 35, striker: 20, bolt: 10 };
        window.gameState.health -= damageMap[source] || 10;
        window.gameState.multiplier = 1;
    }

    removeEnemy(enemy, index) {
        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }
}