/**
 * Player.js - Manages the pilot's ship (The Wasp)
 * Handles movement, boundary constraints, and visual feedback (haze/vibration).
 */
import * as THREE from 'three';

export class Player {
    constructor(camera, hazeElement) {
        this.camera = camera;
        this.hazeEl = hazeElement;
        
        // Flight constraints
        this.limit = 10;
        this.buffer = 0.2;
        this.moveSpeed = 0.5;
        
        // Banking/Roll settings
        this.rollIntensity = 0.02;
    }

    update(keys, gameState, updateHUDCallback) {
        // 1. Move based on keys passed from main.js
        if (keys.a) this.camera.position.x -= this.moveSpeed;
        if (keys.d) this.camera.position.x += this.moveSpeed;
        if (keys.w) this.camera.position.y += this.moveSpeed;
        if (keys.s) this.camera.position.y -= this.moveSpeed;

        // 2. Check for the "Scrape" (Wall Hit)
        const isClipping = Math.abs(this.camera.position.x) > (this.limit - this.buffer) || 
                           Math.abs(this.camera.position.y) > (this.limit - this.buffer);

        if (isClipping) {
            this.triggerScrapeEffect(gameState, updateHUDCallback);
        } else {
            this.hazeEl.classList.remove('active');
        }

        // 3. Apply Hard Constraints
        this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -this.limit, this.limit);
        this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, -this.limit, this.limit);
        
        // 4. Aesthetic Roll (Banking into turns)
        this.camera.rotation.z = -this.camera.position.x * this.rollIntensity;
    }

    triggerScrapeEffect(gameState, updateHUDCallback) {
        // Show the Red Haze
        this.hazeEl.style.display = 'block';
        this.hazeEl.classList.add('active');

        // Neural Link Vibration (Camera Shake)
        this.camera.position.x += (Math.random() - 0.5) * 0.15;
        this.camera.position.y += (Math.random() - 0.5) * 0.15;

        // Integrity Damage
        gameState.multiplier = 1;
        gameState.health -= 0.2;
        updateHUDCallback();
    }
}