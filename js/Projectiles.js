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
        const bolt = new THREE.Mesh(this.geometry, this.material);

        // Calculate the "Target Point" (Where the crosshair is looking)
        // 60 is How far out the lasers "zero" in
        const targetPoint = new THREE.Vector3(0, 0, -60).applyQuaternion(camera.quaternion).add(camera.position);

        // Position the bolt at the wingtip
        const offset = new THREE.Vector3(1.8 * this.sideToggle, -1.5, -3).applyQuaternion(camera.quaternion);
        
        bolt.position.copy(camera.position).add(offset);
        bolt.lookAt(targetPoint); //Aim the bolt at the target point (Convergence)
        bolt.rotation.x += Math.PI / 2; // Standard GLTF/Cylinder rotation fix (if your model is vertical)

        // Save the direction for the update loop
        // Instead of camera direction, we use the vector from spawn to target
        bolt.userData.direction = new THREE.Vector3().subVectors(targetPoint, bolt.position).normalize();

        this.scene.add(bolt);
        this.bolts.push(bolt);
        this.sideToggle *= -1; // Switch sides for the next shot
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