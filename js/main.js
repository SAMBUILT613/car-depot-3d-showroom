import * as THREE from 'three';
import { initScene } from './scene.js';
import { loadCarModel } from './carModel.js';
import { initScrollAnimations } from './scrollAnimations.js';
import { initMobileNav } from './mobile-nav.js';

// Shared namespace
window.CD3D = window.CD3D || {};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Three.js Scene
    const { scene, camera, renderer, ring } = initScene();

    // 2. Load Car Model
    await loadCarModel(scene);

    // 3. Initialize Mobile Navigation
    initMobileNav();

    // 4. Initialize Scroll Animations (GSAP)
    initScrollAnimations();

    // 5. Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Pulsing ring effect
        if (window.CD3D.ring) {
            window.CD3D.ring.material.opacity = 0.3 + Math.sin(elapsedTime * 2) * 0.2;
            const scale = 1 + Math.sin(elapsedTime * 2) * 0.05;
            window.CD3D.ring.scale.set(scale, scale, 1);
        }

        // Idle car rotation (if not being controlled)
        if (window.CD3D.car && !window.CD3D.isUserInteracting) {
            window.CD3D.car.rotation.y += 0.005;
        }

        // Update controls if they exist
        if (window.CD3D.controls) {
            window.CD3D.controls.update();
        }

        renderer.render(scene, camera);
    }

    animate();
});
