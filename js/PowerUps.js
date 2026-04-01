import * as THREE from 'three';

export class PowerUpSystem {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = [];

        
        this.geos = {
            health: new THREE.TorusGeometry(0.5, 0.2, 8, 24),
            ammo: new THREE.IcosahedronGeometry(0.7, 0)
        };

        // Materials with a neon glow
        this.mats = {
            ammo: new THREE.MeshBasicMaterial({ color: 0xFF0055, wireframe: true }),
            health: new THREE.MeshBasicMaterial({ color: 0x00FFFF, wireframe: true }),
        };
    }

    spawn() {
        const types = ['ammo', 'health'];
        const type = types[Math.floor(Math.random() * types.length)];
        const mesh = new THREE.Mesh(this.geos[type], this.mats[type]);

        // Spawn away in the distance
        mesh.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            -150
        );

        mesh.userData = { type };
        this.scene.add(mesh);
        this.powerUps.push(mesh);
    }

    update(camera, gameState, updateHUD) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];

            // Move toward the player
            p.position.z += window.gameState.moveSpeed * 1.2; // Speed matches world speed
            p.rotation.y += 0.05;

            // Collision Detection
            const distSq = p.position.distanceToSquared(camera.position);
            if (distSq < 9) { // 2 units away, squared for performance, adjust as needed for hitbox size
                this.collect(p, gameState, updateHUD);
                this.remove(p, i);
                continue;
            }

            // Cleanup if missed
            if (p.position.z > 10) {
                this.remove(p, i);
            }
        }
    }

    collect(p, gameState, updateHUD) {
        if (p.userData.type === 'ammo') {
            gameState.ammo = gameState.maxAmmo;
            const reloadHaze = document.getElementById('reload-haze');
            reloadHaze.style.display = 'block';
            setTimeout(() => { reloadHaze.style.display = 'none'; }, 1000);

        } else if (p.userData.type === 'health') {
            gameState.health = Math.min(gameState.health + 25, 100);
            const healHaze = document.getElementById('heal-haze');
            healHaze.style.display = 'block';
            setTimeout(() => { healHaze.style.display = 'none'; }, 1000);
        }
        updateHUD();
    }

    remove(p, index) {
        this.scene.remove(p);
        this.powerUps.splice(index, 1);
    }
}