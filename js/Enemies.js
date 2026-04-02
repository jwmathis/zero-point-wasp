import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class EnemySystem {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.models = { striker: null, seeker: null, mine: null };
        this.loader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.geos = { mine: new THREE.IcosahedronGeometry(1, 0), seeker: new THREE.OctahedronGeometry(1.2, 0), striker: new THREE.TetrahedronGeometry(1.5, 0) };
        this.loadAssets();
    }

    loadAssets() {
        const load = (path, texPath, type, scale) => {
            const tex = this.textureLoader.load(texPath);
            this.loader.load(path, (gltf) => {
                gltf.scene.traverse((c) => { if (c.isMesh) { c.material = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.4 }); c.frustumCulled = false; }});
                gltf.scene.scale.set(scale, scale, scale);
                this.models[type] = gltf.scene;
            });
        };
        load('./assets/future_drone/scene.gltf', './assets/future_drone/textures/Material_1001_baseColor.png', 'striker', 0.15);
        load('./assets/scifi_drone/scene.gltf', './assets/scifi_drone/textures/M2Robot_baseColor>.png', 'seeker', 0.15);
        load('./assets/mine/crate.gltf', './assets/mine/Textures/material_1_baseColor.png', 'mine', 0.6);
    }

    spawnRandom() {
        const types = ['mine', 'seeker', 'striker'];
        this.spawn(types[Math.floor(Math.random() * types.length)], new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, -250));
    }

    spawn(type, position) {
        let mesh = this.models[type] ? this.models[type].clone() : new THREE.Mesh(this.geos[type], new THREE.MeshBasicMaterial({ color: type === 'striker' ? 0xFF00FF : 0xFF5500, wireframe: true }));
        if (type === 'mine' && this.models.mine) mesh.scale.multiplyScalar(0.8 + Math.random() * 0.4);
        mesh.position.copy(position);
        mesh.userData = { type, health: 1, lastShot: 0 };
        this.scene.add(mesh);
        this.enemies.push(mesh);
        return mesh;
    }

    spawnFormation(type = 'striker') {
        const formations = [ [{x: 0, y: 0, z: 0}, {x: -8, y: 4, z: -15}, {x: 8, y: 4, z: -15}], [{x: -10, y: 0, z: 0}, {x: 0, y: 0, z: 0}, {x: 10, y: 0, z: 0}] ];
        const pattern = formations[Math.floor(Math.random() * formations.length)];
        const behavior = Math.random() > 0.5 ? 'diver' : 'standard';

        pattern.forEach((offset, idx) => {
            setTimeout(() => { 
                const pos = new THREE.Vector3((Math.random() - 0.5) * 10 + offset.x, (Math.random() - 0.5) * 10 + offset.y, -250 + offset.z);
                const mesh = this.spawn(type, pos);
                if (mesh) { mesh.userData.behavior = behavior; mesh.userData.health = 2; }
            }, idx * 300); 
        });
    }

    checkHits(projectileSystem) {
        // --- 1. NORMAL BOLT COLLISIONS ---
        for (let bIdx = projectileSystem.bolts.length - 1; bIdx >= 0; bIdx--) {
            const bolt = projectileSystem.bolts[bIdx];
            for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = this.enemies[eIdx];
                if (bolt.position.distanceToSquared(enemy.position) < 16) {
                    const pts = enemy.userData.type === 'striker' ? 500 : (enemy.userData.type === 'seeker' ? 250 : 100);
                    window.gameState.score += pts * Math.floor(window.gameState.multiplier);
                    this.createExplosion(enemy.position, enemy.userData.type === 'striker' ? 0xff00ff : 0x00ffff);
                    if (window.createScorePopup) window.createScorePopup(enemy.position, pts);
                    this.scene.remove(enemy); this.enemies.splice(eIdx, 1);
                    this.scene.remove(bolt); projectileSystem.bolts.splice(bIdx, 1);
                    const ch = document.getElementById('crosshair');
                    if (ch) { ch.classList.add('hit'); setTimeout(() => ch.classList.remove('hit'), 100); }
                    break;
                }
            }
        }

        // --- 2. MASSIVE SURGE BEAM COLLISIONS ---
        if (projectileSystem.surges) {
            for (let sIdx = projectileSystem.surges.length - 1; sIdx >= 0; sIdx--) {
                const surge = projectileSystem.surges[sIdx];
                for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
                    const enemy = this.enemies[eIdx];
                    // Distance of 400 = Radius of 20! Clears out the entire tunnel!
                    if (surge.position.distanceToSquared(enemy.position) < 400) {
                        const pts = enemy.userData.type === 'striker' ? 500 : (enemy.userData.type === 'seeker' ? 250 : 100);
                        window.gameState.score += pts * Math.floor(window.gameState.multiplier);
                        
                        // Surge death triggers a hot purple explosion
                        this.createExplosion(enemy.position, 0xff00ff); 
                        if (window.createScorePopup) window.createScorePopup(enemy.position, pts);
                        
                        this.scene.remove(enemy); 
                        this.enemies.splice(eIdx, 1);
                        // Do NOT remove the surge beam! It pierces through everything!
                        
                        const ch = document.getElementById('crosshair');
                        if (ch) { ch.classList.add('hit'); setTimeout(() => ch.classList.remove('hit'), 100); }
                    }
                }
            }
        }
    }

    createExplosion(pos, color = 0xff0055) {
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mat = new THREE.MeshBasicMaterial({ color });
        for (let i = 0; i < 20; i++) {
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            p.userData = { timer: 0, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5) };
            this.scene.add(p); this.particles.push(p);
        }
        if (window.sfx && window.sfx.explosion) window.sfx.explosion.play();
    }

    update(camera, now, gameState, updateHUD) {
        const shipPos = new THREE.Vector3(0, -1.5, -4).applyMatrix4(camera.matrixWorld);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const distSq = enemy.position.distanceToSquared(shipPos);

            if (enemy.position.z < -60) {
                enemy.position.z += window.gameState.moveSpeed * 3.5;
            } else if (enemy.position.z < -20 && enemy.userData.behavior !== 'diving') {
                if (enemy.userData.behavior === 'diver' && Math.random() < 0.005) {
                    enemy.userData.behavior = 'diving'; 
                    this.fireBurst(enemy, camera);
                }
            } else {
                // THE GALAGA DIVE: Enemies loop in a spiraling pattern!
                enemy.position.z += window.gameState.moveSpeed * 1.5;
                if (enemy.userData.behavior === 'diving') {
                    enemy.userData.diveTimer = (enemy.userData.diveTimer || 0) + 0.1;
                    enemy.position.y -= 0.15; 
                    enemy.position.x += Math.sin(enemy.userData.diveTimer) * 0.25; // Loop-de-loop math
                    enemy.rotation.x = THREE.MathUtils.lerp(enemy.rotation.x, Math.PI / 6, 0.1);
                    enemy.rotation.z = Math.sin(enemy.userData.diveTimer) * 1.5; // Visibly bank into the loop
                }
            }

            if (enemy.userData.type === 'striker') {
                if (enemy.userData.behavior !== 'diving') {
                    const sway = Math.sin(now * 0.003 + i);
                    enemy.rotation.z = sway * 0.5; 
                    enemy.position.x += sway * 0.08;
                }
                if (enemy.position.z > -60 && enemy.position.z < -20 && Math.random() < 0.002) { 
                    this.fireAtPlayer(enemy, camera); 
                }
            } else if (enemy.userData.type === 'mine') {
                enemy.rotation.y += 0.02; enemy.rotation.x += 0.01;
            } else if (enemy.userData.type === 'seeker') {
                enemy.rotation.z += 0.1; 
                const dir = new THREE.Vector3().subVectors(shipPos, enemy.position).normalize();
                const lunge = Math.max(0.10, 30 / Math.max(distSq, 1)); 
                enemy.position.addScaledVector(dir, Math.min(lunge, 0.4));
            }

            if (distSq < 6.0) { this.damagePlayer(enemy.userData.type, updateHUD); this.scene.remove(enemy); this.enemies.splice(i, 1); continue; }
            
            if (enemy.position.z > 10) { 
                enemy.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -250);
                enemy.userData.behavior = 'standard'; 
                enemy.rotation.set(0, 0, 0);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.userData.velocity);
            p.userData.timer++; p.scale.multiplyScalar(0.95);
            if (p.userData.timer > 30 || p.scale.x < 0.01) { this.scene.remove(p); this.particles.splice(i, 1); }
        }

        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.position.addScaledVector(p.userData.dir, 0.35);
            
            if (p.position.distanceToSquared(shipPos) < 2.0) { this.damagePlayer('bolt', updateHUD); this.scene.remove(p); this.enemyProjectiles.splice(i, 1); }
            else if (p.position.z > 20) { this.scene.remove(p); this.enemyProjectiles.splice(i, 1); }
        }
    }

    fireAtPlayer(enemy, camera) {
        const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 8), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        const shipPos = new THREE.Vector3(0, -1.5, -4).applyMatrix4(camera.matrixWorld);
        
        bullet.position.copy(enemy.position);
        bullet.lookAt(shipPos); 
        bullet.rotation.x += Math.PI / 2; 

        const dir = new THREE.Vector3().subVectors(shipPos, enemy.position).normalize();
        dir.x += (Math.random() - 0.5) * 0.05; dir.y += (Math.random() - 0.5) * 0.05;

        bullet.userData.dir = dir;
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
        if (window.sfx && window.sfx.laser) window.sfx.laser.play();
    }

    fireBurst(enemy, camera) {
        for (let i = 0; i < 3; i++) { setTimeout(() => { if (this.enemies.includes(enemy)) this.fireAtPlayer(enemy, camera); }, i * 300); }
    }

    damagePlayer(source, updateHUD) {
        // STAR FOX LOGIC: Do no damage if the player is currently barrel rolling
        if (window.player && window.player.isInvulnerable) {
            return;
        }

        const dmg = { mine: 25, seeker: 35, striker: 20, bolt: 5 };
        window.gameState.health = Math.max(0, window.gameState.health - (dmg[source] || 5));
        window.gameState.multiplier = 1; 
        
        if (window.sfx && window.sfx.player_damage) window.sfx.player_damage.play();
        if (window.player) {
            window.player.flashRed();
            window.player.camera.position.x += (Math.random() - 0.5) * 1.5;
            window.player.camera.position.y += (Math.random() - 0.5) * 1.5;
        }
        if (updateHUD) updateHUD();
    }
}