import * as THREE from 'three';

export class PowerUpSystem {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = [];
        
        this.geos = {
            health: new THREE.TorusGeometry(0.5, 0.2, 8, 24),
            surge: new THREE.IcosahedronGeometry(0.7, 0) 
        };

        this.mats = {
            surge: new THREE.MeshBasicMaterial({ color: 0xFF0055, wireframe: true }),
            health: new THREE.MeshBasicMaterial({ color: 0x00FFFF, wireframe: true }),
        };
    }

    spawn() {
        const types = ['surge', 'health'];
        const type = types[Math.floor(Math.random() * types.length)];
        const mesh = new THREE.Mesh(this.geos[type], this.mats[type]);

        mesh.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            -150
        );

        mesh.userData = { type };
        mesh.scale.set(1.5, 1.5, 1.5);
        this.scene.add(mesh);
        this.powerUps.push(mesh);
    }

    update(camera, gameState, updateHUD) {
        const shipPos = new THREE.Vector3(0, -1.5, -4).applyMatrix4(camera.matrixWorld);

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];

            p.position.z += window.gameState.moveSpeed * 1.2; 
            p.rotation.y += 0.05;

            const distSq = p.position.distanceToSquared(shipPos);
            
            if (distSq < 12) { 
                // Passed camera here to use for the beam trajectory
                this.collect(p, gameState, updateHUD, camera);
                this.remove(p, i);
                continue;
            }

            if (p.position.z > 10) {
                this.remove(p, i);
            }
        }
    }

    collect(p, gameState, updateHUD, camera) {
        if (p.userData.type === 'surge' || p.userData.type === 'ammo') { 
            gameState.score += 1000;
            gameState.multiplier = 5.0;
            if (window.createScorePopup) window.createScorePopup(p.position, 1000);
            
            // FIRE THE MASSIVE SURGE CANNON
            if (window.projectiles) window.projectiles.fireSurge(camera);

            const reloadHaze = document.getElementById('reload-haze');
            if (reloadHaze) {
                reloadHaze.style.display = 'block';
                setTimeout(() => { reloadHaze.style.display = 'none'; }, 1000);
            }

        } else if (p.userData.type === 'health') {
            gameState.health = Math.min(gameState.health + 25, 100);
            const healHaze = document.getElementById('heal-haze');
            if (healHaze) {
                healHaze.style.display = 'block';
                setTimeout(() => { healHaze.style.display = 'none'; }, 1000);
            }
        }
        if (window.sfx && window.sfx.powerup) window.sfx.powerup.play();
        if (updateHUD) updateHUD();
    }

    remove(p, index) {
        this.scene.remove(p);
        this.powerUps.splice(index, 1);
    }
}