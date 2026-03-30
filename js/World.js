/**
 * World.js - Generates the infinite tunnel environment.
 */
import * as THREE from 'three';

export class Wormhole {
    constructor(scene) {
        // Procedural curve for the tunnel
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(5, 5, -50),
            new THREE.Vector3(-5, -5, -100),
            new THREE.Vector3(0, 0, -150),
            new THREE.Vector3(0, 0, -250)
        ]);

        const geometry = new THREE.TubeGeometry(curve, 100, 20, 16, false);

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
        // Spin the tunnel
        this.tunnel.rotation.z += 0.005; 
        
        // Offset texture if a map exists
        if (this.material.map) {
            this.material.map.offset.y += speed * 0.01;
        }
    }
}