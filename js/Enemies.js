/**
 * Enemies.js - Manages enemy spawning, behavior, and collision.
 */
import * as THREE from 'three';

export class EnemySystem {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.geos = {
            mine: new THREE.IcosahedronGeometry(1, 0),
            seeker: new THREE.OctahedronGeometry(1.2, 0),
            striker: new THREE.TetrahedronGeometry(1.5, 0)
        };
        
        // Auto-spawn timer
        setInterval(() => this.spawnRandom(), 4000);
    }

    spawnRandom() {
        if (!window.gameState.hasStarted || window.gameState.isPaused) return;
        const types = ['mine', 'seeker', 'striker'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawn(type, new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, -150));
    }

    spawn(type, position) {
        const material = new THREE.MeshBasicMaterial({ 
            color: type === 'striker' ? 0xff00ff : 0xff5500, 
            wireframe: true 
        });
        const mesh = new THREE.Mesh(this.geos[type], material);
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

    update(camera, now) {
        // Update Enemies
        this.enemies.forEach((enemy, index) => {
            const dist = enemy.position.distanceTo(camera.position);

            if (enemy.userData.type === 'seeker') {
                const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
                enemy.position.addScaledVector(dir, 0.25);
            } else if (enemy.userData.type === 'striker' && dist < 50) {
                if (now - enemy.userData.lastShot > 2000) {
                    this.fireAtPlayer(enemy, camera);
                    enemy.userData.lastShot = now;
                }
            }

            enemy.position.z += 0.5; // Approach player

            if (dist < 2.5) { // Crash collision
                this.damagePlayer(enemy.userData.type);
                this.removeEnemy(enemy, index);
            }
            if (enemy.position.z > 10) this.removeEnemy(enemy, index);
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
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bullet.position.copy(enemy.position);
        bullet.userData.dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
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