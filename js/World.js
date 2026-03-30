import * as THREE from 'three';

export class Wormhole {
    constructor(scene) {
        
        // Create the Geometry
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(5, 5, -50),
            new THREE.Vector3(-5, -5, -100),
            new THREE.Vector3(0, 0, -150),
            new THREE.Vector3(0, 0, -250)
        ]);

        const geometry = new THREE.TubeGeometry(curve, 100, 20, 16, false);

        // Create a wireframe material for a vector look
        this.material = new THREE.MeshBasicMaterial({
            color: 0x00AAFF,
            wireframe: true,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.5
        });

        this.tunnel = new THREE.Mesh(geometry, this.material);
        scene.add(this.tunnel);
    }

    update(speed = 0.01) {
        // 1. Spin the tunnel for that dizzying "Warp" effect
        this.tunnel.rotation.z += 0.005; 

        this.material.map?.offset.set(0, this.material.map.offset.y + playerSpeed);
    }
}