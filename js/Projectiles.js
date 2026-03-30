import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.speed = 2.0;
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
        bolt.position.copy(camera.position);
        bolt.rotation.copy(camera.rotation);
        bolt.rotation.x += Math.PI / 2;

        // Save direction for the update loop
        bolt.userData.direction = new THREE.Vector3();
        camera.getWorldDirection(bolt.userData.direction);

        // OFFSET LOGIC:
        // This moves the spawn point to the left or right 
        // relative to where the camera is facing.
        const sideOffset = new THREE.Vector3(1.5 * this.sideToggle, -0.8, -2);
        sideOffset.applyQuaternion(camera.quaternion);
        bolt.position.add(sideOffset);

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