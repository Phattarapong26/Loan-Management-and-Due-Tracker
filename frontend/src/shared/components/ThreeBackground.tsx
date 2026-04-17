import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const shapesRef = useRef<THREE.Mesh[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f2fe, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Create Particles (Starfield effect)
    const particlesGeometry = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x4facfe,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Add random geometric shapes
    const geometries = [
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.TorusGeometry(0.15, 0.05, 16, 100),
      new THREE.OctahedronGeometry(0.2, 0),
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0x00f2fe : 0x4facfe,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });

      const mesh = new THREE.Mesh(
        geometries[Math.floor(Math.random() * geometries.length)],
        material
      );

      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      const scale = Math.random() * 2 + 0.5;
      mesh.scale.set(scale, scale, scale);

      mesh.userData = {
        rotationSpeedX: Math.random() * 0.01,
        rotationSpeedY: Math.random() * 0.01,
      };

      shapes.push(mesh);
      scene.add(mesh);
    }
    shapesRef.current = shapes;

    // Mouse move handler
    const onDocumentMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX - windowHalfX) / 100;
      mouseRef.current.y = (event.clientY - windowHalfY) / 100;
    };

    // Window resize handler
    const onWindowResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const mouse = mouseRef.current;
      mouse.targetX += (mouse.x - mouse.targetX) * 0.05;
      mouse.targetY += (mouse.y - mouse.targetY) * 0.05;

      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.001;
        particlesRef.current.rotation.x = mouse.targetY * 0.2;
        particlesRef.current.rotation.y = mouse.targetX * 0.2;
      }

      shapesRef.current.forEach((shape) => {
        shape.rotation.x += shape.userData.rotationSpeedX;
        shape.rotation.y += shape.userData.rotationSpeedY;
        shape.position.x += (mouse.targetX * 0.01) * 0.1;
        shape.position.y -= (mouse.targetY * 0.01) * 0.1;
      });

      if (cameraRef.current) {
        cameraRef.current.rotation.x = -mouse.targetY * 0.05;
        cameraRef.current.rotation.y = -mouse.targetX * 0.05;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    document.addEventListener('mousemove', onDocumentMouseMove);
    window.addEventListener('resize', onWindowResize);
    animate();

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', onDocumentMouseMove);
      window.removeEventListener('resize', onWindowResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      particlesGeometry.dispose();
      particlesMaterial.dispose();
      
      shapesRef.current.forEach((shape) => {
        shape.geometry.dispose();
        (shape.material as THREE.Material).dispose();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: '#09325cff' }}
    />
  );
}
