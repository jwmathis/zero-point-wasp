import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.speed = 2.0;

        // Simple glowing cylinder for the bolt
        this.geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xFFFF00, // Bright yellow bolt
            transparent: true,
            opacity: 0.8
        });
    }


    fire(camera) {
        const bolt = new THREE.Mesh(this.geometry, this.material);

        // Sttart at camera position
        bolt.position.copy(camera.position);
        //Align with camera rotation to point where user looks
        bolt.rotation.copy(camera.rotation);
        bolt.translateZ(-2);
        //Rotate the cylinder to point forward instead of standing up by default
        bolt.rotation.x += Math.PI / 2;

        bolt.translateY(5);
        
        this.scene.add(bolt);
        this.bolts.push(bolt);
        console.log("Bolt fired.")
    }

    update() {
        this.bolts.forEach((bolt, index) => {
            // Move forward (negative Z is away from the screen)
            bolt.translateY(this.speed);

            // Remove bolts that are too far away (150 units)
            if (bolt.position.distanceTo(this.scene.position) > 1000) {
                this.scene.remove(bolt);
                this.bolts.splice(index, 1);
            }
        });
    }
}