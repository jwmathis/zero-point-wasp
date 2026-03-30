import * as THREE from 'three';

export class EnemySystem {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyProjectiles = [];
        
        // Geometries for different types
        this.geos = {
            mine: new THREE.IcosahedronGeometry(1, 0),   // Static jagged shape
            seeker: new THREE.OctahedronGeometry(1.2, 0), // Moves toward player
            striker: new THREE.TetrahedronGeometry(1.5, 0) // Shoots at player
        };
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

    update(camera, now) {
        this.enemies.forEach((enemy, index) => {
            const dist = enemy.position.distanceTo(camera.position);

            // 1. BEHAVIOR LOGIC
            if (enemy.userData.type === 'seeker') {
                // Move slowly toward the player
                const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
                enemy.position.addScaledVector(dir, 0.15);
            } 
            else if (enemy.userData.type === 'striker' && dist < 50) {
                // Shoot every 2 seconds if close enough
                if (now - enemy.userData.lastShot > 2000) {
                    this.fireAtPlayer(enemy, camera);
                    enemy.userData.lastShot = now;
                }
            }

            // 2. COLLISION: Enemy hits player
            if (dist < 2.5) {
                this.damagePlayer(enemy.userData.type);
                this.removeEnemy(enemy, index);
            }

            // Cleanup if they go way behind the player
            if (enemy.position.z > 10) this.removeEnemy(enemy, index);
        });

        // Update enemy bullets
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
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.3), 
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        bullet.position.copy(enemy.position);
        bullet.userData.dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        this.scene.add(bullet);
        this.enemyProjectiles.push(bullet);
    }

    damagePlayer(source) {
        const damageMap = { mine: 10, seeker: 20, striker: 15, bolt: 5 };
        window.gameState.health -= damageMap[source] || 5;
    }

    removeEnemy(enemy, index) {
        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }
}