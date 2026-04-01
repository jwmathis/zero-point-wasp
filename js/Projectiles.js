import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.sideToggle = 1; // 1 for right, -1 for left

        // Simple glowing cylinder for the bolt
        this.geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        this.material = new THREE.MeshBasicMaterial({ color: 0xFF0055, transparent: true, opacity: 0.8});
    }

    fire(camera) {
        let wingOffsets = []; // Right and Left offsets

        if (window.gameState && window.gameState.twinShot) {
            wingOffsets = [1.8, -1.8]; // Fire both sides
        } else {
            wingOffsets = [1.8 * this.sideToggle]; // Fire alternating sides
            this.sideToggle *= -1; // Flip for next shot
        }
        
        wingOffsets.forEach(sideOffset => {
            const bolt = new THREE.Mesh(this.geometry, this.material);

            // Calculate the "Target Point" (Where the crosshair is looking)
            const targetPoint = new THREE.Vector3(0, 0, -60).applyQuaternion(camera.quaternion).add(camera.position);

            // Position the bolt at the specific wingtip
            const offset = new THREE.Vector3(sideOffset, -1.5, -3).applyQuaternion(camera.quaternion);
            
            bolt.position.copy(camera.position).add(offset);
            bolt.lookAt(targetPoint);
            bolt.rotation.x += Math.PI / 2; // Cylinder orientation fix

            // Save direction for the update loop
            bolt.userData.direction = new THREE.Vector3().subVectors(targetPoint, bolt.position).normalize();

            this.scene.add(bolt);
            this.bolts.push(bolt);
        });
    }

    update() {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const b = this.bolts[i];
            b.position.addScaledVector(b.userData.direction, 4.5);
            
            if (b.position.lengthSq() > 90000) { // 300 units squared
                this.scene.remove(b);
                this.bolts.splice(i, 1);
            }
        }
    }
}