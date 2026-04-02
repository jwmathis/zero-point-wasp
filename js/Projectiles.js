import * as THREE from 'three';

export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.bolts = [];
        this.sideToggle = 1; 

        this.geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        this.material = new THREE.MeshBasicMaterial({ color: 0xFF0055, transparent: true, opacity: 0.8});
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

    update() {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const b = this.bolts[i];
            // FASTER LASERS: Increased from 4.5 to 8.0 for precise aiming
            b.position.addScaledVector(b.userData.direction, 8.0);
            
            if (b.position.lengthSq() > 90000) { 
                this.scene.remove(b);
                this.bolts.splice(i, 1);
            }
        }
    }
}