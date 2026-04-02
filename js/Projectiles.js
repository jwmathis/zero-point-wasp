import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.surges = []; // NEW: Array to hold giant beams
        this.sideToggle = 1; 

        // Standard Laser
        this.geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        this.material = new THREE.MeshBasicMaterial({ color: 0xFF0055, transparent: true, opacity: 0.8});

        // SURGE BEAM: Massive glowing cylinder
        this.surgeGeo = new THREE.CylinderGeometry(6, 6, 15, 16);
        this.surgeMat = new THREE.MeshBasicMaterial({ 
            color: 0xFF00FF, 
            transparent: true, 
            opacity: 0.8, 
            blending: THREE.AdditiveBlending 
        });
    }

    fire(camera) {
        let wingOffsets = []; 

        if (window.gameState && window.gameState.twinShot) {
            wingOffsets = [1.8, -1.8]; 
        } else {
            wingOffsets = [1.8 * this.sideToggle]; 
            this.sideToggle *= -1; 
        }
        
        wingOffsets.forEach(sideOffset => {
            const bolt = new THREE.Mesh(this.geometry, this.material);
            const targetPoint = new THREE.Vector3(0, 0, -60).applyQuaternion(camera.quaternion).add(camera.position);
            const offset = new THREE.Vector3(sideOffset, -1.5, -3).applyQuaternion(camera.quaternion);
            
            bolt.position.copy(camera.position).add(offset);
            bolt.lookAt(targetPoint);
            bolt.rotation.x += Math.PI / 2; 

            bolt.userData.direction = new THREE.Vector3().subVectors(targetPoint, bolt.position).normalize();

            this.scene.add(bolt);
            this.bolts.push(bolt);
        });
    }

    // NEW: Fire massive piercing beam
    fireSurge(camera) {
        const surge = new THREE.Mesh(this.surgeGeo, this.surgeMat);
        const targetPoint = new THREE.Vector3(0, 0, -100).applyQuaternion(camera.quaternion).add(camera.position);
        
        // Spawn slightly ahead of camera
        surge.position.copy(camera.position).add(new THREE.Vector3(0, -1.5, -5).applyQuaternion(camera.quaternion));
        surge.lookAt(targetPoint);
        surge.rotation.x += Math.PI / 2; 

        surge.userData.direction = new THREE.Vector3().subVectors(targetPoint, surge.position).normalize();
        
        this.scene.add(surge);
        this.surges.push(surge);

        // Play an aggressive combination of laser and explosion for the BFG sound
        if (window.sfx) {
            if (window.sfx.laser) window.sfx.laser.play();
            if (window.sfx.explosion) window.sfx.explosion.play();
        }
    }

    update() {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const b = this.bolts[i];
            b.position.addScaledVector(b.userData.direction, 8.0); // Fast lasers
            
            if (b.position.lengthSq() > 90000) { 
                this.scene.remove(b);
                this.bolts.splice(i, 1);
            }
        }

        // NEW: Update Surge Beams
        for (let i = this.surges.length - 1; i >= 0; i--) {
            const s = this.surges[i];
            s.position.addScaledVector(s.userData.direction, 5.0); 
            s.scale.x += 0.05; // Visually expand width as it travels
            s.scale.z += 0.05; // Visually expand depth
            
            if (s.position.lengthSq() > 150000) { 
                this.scene.remove(s);
                this.surges.splice(i, 1);
            }
        }
    }
}