import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.speed = 4.0;
        this.sideToggle = 1; // 1 for right, -1 for left

        // Simple glowing cylinder for the bolt
        this.geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xFF0000, // Bright yellow bolt
            transparent: true,
            opacity: 0.8
        });
    }

    fire(camera) {
        const bolt = new THREE.Mesh(this.geometry, this.material);

        // 1. Calculate the "Target Point" (Where the crosshair is looking)
        const targetDistance = 60; // How far out the lasers "zero" in
        const targetPoint = new THREE.Vector3(0, 0, -targetDistance);
        targetPoint.applyQuaternion(camera.quaternion);
        targetPoint.add(camera.position);

        // 2. Position the bolt at the wingtip
        // Adjusted Y to -1.5 to match your ship's lowered position
        const wingOffset = new THREE.Vector3(1.8 * this.sideToggle, -1.5, -3);
        wingOffset.applyQuaternion(camera.quaternion);
        
        bolt.position.copy(camera.position).add(wingOffset);

        // 3. Aim the bolt at the target point (Convergence)
        bolt.lookAt(targetPoint);
        
        // Standard GLTF/Cylinder rotation fix (if your model is vertical)
        bolt.rotation.x += Math.PI / 2;

        // 4. Save the direction for the update loop
        // Instead of camera direction, we use the vector from spawn to target
        bolt.userData.direction = new THREE.Vector3()
            .subVectors(targetPoint, bolt.position)
            .normalize();

        // Switch sides for the next shot
        this.sideToggle *= -1; 

        this.scene.add(bolt);
        this.bolts.push(bolt);
    }

    update() {
        this.bolts.forEach((bolt, index) => {
            // Move forward (negative Z is away from the screen)
            bolt.position.addScaledVector(bolt.userData.direction, this.speed);

            // Remove bolts that are too far away (150 units)
            if (bolt.position.length() > 500) {
                this.scene.remove(bolt);
                this.bolts.splice(index, 1);
            }
        });
    }
}