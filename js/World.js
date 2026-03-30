import * as THREE from 'three';

export class Wormhole {
    constructor(scene) {
        
        // Create the Geometry
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(5, 5, -50),
            new THREE.Vector3(-5, -5, -100),
            new THREE.Vector3(0, 0, -150)

            // new THREE.Vector3(0, 0, 0),
            // new THREE.Vector3(2, 2, -20),
            // new THREE.Vector3(-2, -2, -40),
            // new THREE.Vector3(0, 0, -60)
        ]);

        const geometry = new THREE.TubeGeometry(curve, 100, 20, 16, false);

        // Create a wireframe material for a vector look
        const material = new THREE.MeshBasicMaterial({
            color: 0x00AAFF,
            wireframe: true,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.5
        });

        this.tunnel = new THREE.Mesh(geometry, material);
        scene.add(this.tunnel);

        const backMaterial = new THREE.MeshBasicMaterial({
            color:0x000000,
            side: THREE.BackSide
        });

        const backTunnel = new THREE.Mesh(geometry. backMaterial);
        backTunnel.scale.set(1.01, 1.01, 1.01);
        scene.add(backTunnel);


    }

    update(speed) {
        // Move the tecture or the mesh to simulate forward flight
        // Since its a wireframe, rotating it provides a spinning effect
        this.tunnel.rotation.z += 0.001;

        // To simulate inifinte travel, "reset" the Z position
        // once it moves too far, or just move the texture offset.
    }
}