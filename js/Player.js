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

        //Ship library
        this.ships = [
            { time: 0.74, scale: 100, y: -1.5, name: "Main Shuttle" },
            { time: 3.15, scale: 50, y: -1.2, name: "X-Wing" },
            { time: 5.77, scale: 30, y: -0.7, name: "Hyper Shuttle" },
            { time: 8.26, scale: 100, y: -1.5, name: "Jet" },
        ]
        this.currentShipIndex = 1; //Default to X-wing (Index 1)
        this.canSwitchShip = true;

        this.mesh = null; // This will hold the Pivot Group
        this.mixer = null;
        this.clock = new THREE.Clock();
        

        // 2. FLIGHT CONSTRAINTS (Original Wasp Settings)
        this.limit = 10;
        this.buffer = 0.2;
        this.moveSpeed = 0.5;
        this.rollIntensity = 0.02;

        // 3. INITIALIZE MODEL
        this.loadModel();
    }

    applyShipStats() {
        if (!this.mesh || !this.mixer) return;

        const stats = this.ships[this.currentShipIndex];

        // Set animation time
        this.mixer.setTime(stats.time);
        this.mixer.update(0);

        // Adjust position and scale based on the specific ship
        this.mesh.position.set(0, stats.y, -3.5);

        //Calculate scale for each model
        this.mesh.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(this.mesh.children[0]); // Measure the inner ship
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scaleFactor = stats.scale / maxDim;
        this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

        console.log(`Switched to: ${stats.name} (Time: ${stats.time})`);
        
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.load('./assets/star_sparrow.glb', (gltf) => {
            const shipSource = gltf.scene;

            // Setup Mixer
            this.mixer = new THREE.AnimationMixer(shipSource);
            const action = this.mixer.clipAction(gltf.animations[0]);
            action.play();

            // Create Pivot
            const pivot = new THREE.Group();
            
            // Initial Centering of the raw geometry
            shipSource.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(shipSource);
            const center = box.getCenter(new THREE.Vector3());
            shipSource.position.set(-center.x, -center.y, -center.z);
            
            pivot.add(shipSource);
            pivot.rotation.y = Math.PI; 
            
            this.mesh = pivot;
            //Link camera to ship
            this.camera.add(this.mesh); 

            // Apply the default ship stats
            this.applyShipStats();

            shipSource.traverse(child => { if(child.isMesh) child.frustumCulled = false; });
        });
    }

    update(keys, gameState, updateHUDCallback) {

        if (!this.mesh) return;

        // --- DEVELOPMENT TOGGLE: SHIP SWITCHING ---
        // You can comment this block out for the final game
        if (keys.t) {
            if (this.canSwitchShip) {
                this.currentShipIndex = (this.currentShipIndex + 1) % this.ships.length;
                this.applyShipStats();
                this.canSwitchShip = false; // Lock switching until key is released
            }
        } else {
            this.canSwitchShip = true; // Reset lock when key is up
        }

        // 2. MOVE CAMERA
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