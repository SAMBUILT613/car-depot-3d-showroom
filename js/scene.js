import * as THREE from 'three';

// Shared namespace
window.CD3D = window.CD3D || {};

export function initScene() {
    const canvas = document.querySelector('#car-canvas');
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#0b0d10', 10, 50);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(8, 3, 8);

    // Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
    scene.add(ambientLight);

    const mainSpotlight = new THREE.SpotLight('#3b82f6', 20);
    mainSpotlight.position.set(5, 10, 5);
    mainSpotlight.angle = 0.5;
    mainSpotlight.penumbra = 0.5;
    mainSpotlight.castShadow = true;
    scene.add(mainSpotlight);

    const fillLight = new THREE.PointLight('#ffffff', 10);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#ff8844', 5);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Floor
    const floorGeometry = new THREE.CircleGeometry(20, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: '#111111',
        metalness: 0.8,
        roughness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Pulsing Ring
    const ringGeometry = new THREE.RingGeometry(3.8, 4, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: '#3b82f6',
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.01;
    scene.add(ring);

    // Window resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // Store in namespace
    window.CD3D.scene = scene;
    window.CD3D.camera = camera;
    window.CD3D.renderer = renderer;
    window.CD3D.ring = ring;

    return { scene, camera, renderer, ring };
}
