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
        
        // 1. SHIP CONFIGURATION
        this.ships = [
            { time: 0.74, scale: 1.5, y: -0.8, name: "Main Shuttle" },
            { time: 3.15, scale: 1.8, y: -0.6, name: "X-Wing" },
            { time: 5.77, scale: 1.2, y: -0.5, name: "Hyper Shuttle" },
            { time: 8.26, scale: 2.0, y: -1.0, name: "Jet" },
        ];
        
        this.currentShipIndex = 1; // Default to X-wing
        this.canSwitchShip = true;

        this.mesh = null; // The Pivot Group
        this.mixer = null;
        
        // 2. FLIGHT CONSTRAINTS
        this.limit = 12;      // How far the ship can fly from center
        this.buffer = 1.5;     // Boundary for the "scrape" effect
        this.moveSpeed = 0.25;
        this.rollIntensity = 0.05;

        // 3. INITIALIZE
        this.loadModel();
    }

    /**
     * Updates ship scale and animation state based on current selection
     */
    applyShipStats() {
        if (!this.mesh || !this.mixer) return;

        const stats = this.ships[this.currentShipIndex];

        // Seek the animation mixer to the specific frame for this ship model
        this.mixer.setTime(stats.time);
        
        // Adjust relative position and scale
        this.mesh.position.set(0, stats.y, -4);
        this.mesh.scale.set(stats.scale, stats.scale, stats.scale);

        console.log(`Neural Link Synced: ${stats.name}`);
    }

    loadModel() {
        const loader = new GLTFLoader();

        loader.load('./assets/star_sparrow.glb', (gltf) => {
            const shipSource = gltf.scene;

            // Setup Animation Mixer
            this.mixer = new THREE.AnimationMixer(shipSource);
            if (gltf.animations.length > 0) {
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
            }

            // Create Pivot (allows us to rotate/center the ship independently of its local coordinates)
            const pivot = new THREE.Group();
            
            // Center the geometry
            shipSource.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(shipSource);
            const center = box.getCenter(new THREE.Vector3());
            shipSource.position.set(-center.x, -center.y, -center.z);
            
            pivot.add(shipSource);
            pivot.rotation.y = Math.PI; // Face forward
            
            this.mesh = pivot;
            this.camera.add(this.mesh); // Attach ship to camera for cockpit-style movement

            // Apply Material Enhancements
            shipSource.traverse(child => { 
                if (child.isMesh) {
                    child.frustumCulled = false; 

                    child.material.metalness = 0.8; // Lowered from 0.8 to make it less mirror-like
                    child.material.roughness = 0.4; // Increased from 0.2 to catch more light
                    
                    // child.material.emissive = new THREE.Color(0x00ffff);
                    // child.material.emissiveIntensity = 0.6; // Boosted so you see the neon glow
                    
                    // This ensures the material handles the light correctly
                    child.material.needsUpdate = true;
                }
            });

            this.applyShipStats();
        });
    }

    update(keys, gameState, updateHUDCallback) {
        if (!this.mesh) return;

        // --- DEV TOOL: SHIP SWITCHING (T-KEY) ---
        if (keys.t) {
            if (this.canSwitchShip) {
                this.currentShipIndex = (this.currentShipIndex + 1) % this.ships.length;
                this.applyShipStats();
                this.canSwitchShip = false; 
            }
        } else {
            this.canSwitchShip = true; 
        }

        // 1. SHIP MOVEMENT
        if (keys.a) this.camera.position.x -= this.moveSpeed;
        if (keys.d) this.camera.position.x += this.moveSpeed;
        if (keys.w) this.camera.position.y += this.moveSpeed;
        if (keys.s) this.camera.position.y -= this.moveSpeed;

        // 2. BOUNDARY & DAMAGE CHECK
        const distFromCenter = Math.sqrt(this.camera.position.x ** 2 + this.camera.position.y ** 2);
        const isClipping = distFromCenter > (this.limit - this.buffer);

        if (isClipping) {
            this.triggerScrapeEffect(gameState, updateHUDCallback);
        } else {
            this.hazeEl.classList.remove('active');
        }

        // 3. APPLY HARD CONSTRAINTS
        this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -this.limit, this.limit);
        this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, -this.limit, this.limit);
        
        // 4. AESTHETIC TILT (Banking)
        // Camera banks slightly as you move
        this.camera.rotation.z = -this.camera.position.x * 0.02;
        
        // Mesh banks heavily based on key input for better "weight"
        const targetRoll = keys.a ? 0.4 : (keys.d ? -0.4 : 0);
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetRoll, 0.1);
    }

    triggerScrapeEffect(gameState, updateHUDCallback) {
        this.hazeEl.classList.add('active');

        // Physical Feedback: Camera Vibration
        this.camera.position.x += (Math.random() - 0.5) * 0.2;
        this.camera.position.y += (Math.random() - 0.5) * 0.2;

        // Mechanical Penalty: Health drain and score reset
        gameState.multiplier = 1;
        gameState.health -= 0.15;
        updateHUDCallback();
    }
}