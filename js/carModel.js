import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export async function loadCarModel(scene) {
    const loader = new GLTFLoader();
    const loaderFill = document.querySelector('#loader-fill');
    const loadingOverlay = document.querySelector('#loading-overlay');

    return new Promise((resolve, reject) => {
        loader.load(
            'assets/models/car.glb',
            (gltf) => {
                const car = gltf.scene;
                
                // Center and scale model
                const box = new THREE.Box3().setFromObject(car);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                car.position.x += (car.position.x - center.x);
                car.position.y += (car.position.y - box.min.y);
                car.position.z += (car.position.z - center.z);
                
                // Scale to fit nicely (assuming the ring is radius 4)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 5 / maxDim;
                car.scale.set(scale, scale, scale);

                car.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(car);
                window.CD3D.car = car;

                // Setup OrbitControls
                const controls = new OrbitControls(window.CD3D.camera, window.CD3D.renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 5;
                controls.maxDistance = 15;
                controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below floor
                controls.enablePan = false;
                
                controls.addEventListener('start', () => {
                    window.CD3D.isUserInteracting = true;
                });
                controls.addEventListener('end', () => {
                    window.CD3D.isUserInteracting = false;
                });

                window.CD3D.controls = controls;

                // Hide loader
                gsap.to(loadingOverlay, {
                    opacity: 0,
                    duration: 1,
                    onComplete: () => {
                        loadingOverlay.style.display = 'none';
                    }
                });

                resolve(car);
            },
            (xhr) => {
                const percent = (xhr.loaded / xhr.total) * 100;
                if (loaderFill) loaderFill.style.width = percent + '%';
            },
            (error) => {
                console.error('An error happened', error);
                reject(error);
            }
        );
    });
}
