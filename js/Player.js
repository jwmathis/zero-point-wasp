/**
 * Player.js - Manages the pilot's ship (Star Sparrow)
 * Handles GLTF loading, movement, boundary constraints, and visual feedback.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, camera, hazeElement) {
        this.scene = scene;
        this.camera = camera;
        this.hazeEl = hazeElement;
        
        // 1. MODEL & ANIMATION PROPERTIES
        this.mesh = null; // This will hold the Pivot Group
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.targetTime = 4.3; // Your chosen ship design timestamp

        // 2. FLIGHT CONSTRAINTS (Original Wasp Settings)
        this.limit = 10;
        this.buffer = 0.2;
        this.moveSpeed = 0.5;
        this.rollIntensity = 0.02;

        // 3. INITIALIZE MODEL
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load('./assets/star_sparrow.glb', (gltf) => {
            const shipSource = gltf.scene;

            // --- A. ANIMATION SETUP ---
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(shipSource);
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
                this.mixer.setTime(this.targetTime);
                this.mixer.update(0); // Force bone calculation immediately
            }

            // --- B. MEASURE & CENTER ---
            shipSource.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(shipSource);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // --- C. PIVOT & ORIENTATION ---
            shipSource.position.set(-center.x, -center.y, -center.z);
            
            const pivot = new THREE.Group();
            pivot.add(shipSource);
            pivot.rotation.y = Math.PI; // Face forward

            // --- D. SCALE & HIERARCHY ---
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const scaleFactor = 30 / maxDim; // Adjusted scale to fit cockpit view
            pivot.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Position the ship slightly in front of and below the camera
            pivot.position.set(0, -1.5, -2.5); 
            
            this.mesh = pivot;
            
            // Link the ship to the camera so it follows the pilot
            this.camera.add(this.mesh); 
            
            // Safety: Ensure ship doesn't vanish
            shipSource.traverse((child) => {
                if (child.isMesh) child.frustumCulled = false;
            });

            console.log("Star Sparrow Integrated with Flight Systems.");
        });
    }

    update(keys, gameState, updateHUDCallback) {
        // 1. UPDATE ANIMATION (Keeps skinned mesh visible)
        if (this.mixer) {
            this.mixer.setTime(this.targetTime);
        }

        // 2. MOVE CAMERA (Original Wasp Logic)
        if (keys.a || keys.ArrowLeft)  this.camera.position.x -= this.moveSpeed;
        if (keys.d || keys.ArrowRight) this.camera.position.x += this.moveSpeed;
        if (keys.w || keys.ArrowUp)    this.camera.position.y += this.moveSpeed;
        if (keys.s || keys.ArrowDown)  this.camera.position.y -= this.moveSpeed;

        // 3. BOUNDARY & SCRAPE CHECK
        const isClipping = Math.abs(this.camera.position.x) > (this.limit - this.buffer) || 
                           Math.abs(this.camera.position.y) > (this.limit - this.buffer);

        if (isClipping) {
            this.triggerScrapeEffect(gameState, updateHUDCallback);
        } else {
            this.hazeEl.classList.remove('active');
        }

        // 4. APPLY CONSTRAINTS
        this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -this.limit, this.limit);
        this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, -this.limit, this.limit);
        
        // 5. AESTHETIC ROLL & TILT
        // Tilts the camera for banking feel
        this.camera.rotation.z = -this.camera.position.x * this.rollIntensity;
        
        // If ship is loaded, add a slight independent banking to the mesh
        if (this.mesh) {
            this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, (keys.a ? 0.3 : keys.d ? -0.3 : 0), 0.1);
        }
    }

    triggerScrapeEffect(gameState, updateHUDCallback) {
        this.hazeEl.style.display = 'block';
        this.hazeEl.classList.add('active');

        // Camera Shake
        this.camera.position.x += (Math.random() - 0.5) * 0.15;
        this.camera.position.y += (Math.random() - 0.5) * 0.15;

        // Damage Logic
        gameState.multiplier = 1;
        gameState.health -= 0.2;
        updateHUDCallback();
    }
}