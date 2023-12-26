// app.js
let scene, camera, renderer, controls;
let userInteracted = false;
let currentModel = {};
let lights = [];
let directionalLightHelper = [];
let lastLoaded = '';
let width = document.getElementById('canvas').offsetWidth;
let height = document.getElementById('canvas').offsetHeight;
let animationCooldown = 300;
let isCameraMoving = false;
const cameraMoveSpeed = 0.1;
let targetCameraPosition = new THREE.Vector3();

let hand = document.getElementById("hand");
hand.style.top = '55%';

function init() {
    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    camera.position.set(0, 0, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff);
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas').appendChild(renderer.domElement);

    const composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

// Add desired post-processing passes here
// e.g., composer.addPass(new THREE.BloomPass());

// Set the final pass in the composer
    const finalPass = new THREE.ShaderPass(THREE.CopyShader);
    finalPass.renderToScreen = true;
    composer.addPass(finalPass);

    // Create controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; // Enable rotation
    controls.enablePan = false; // Disable panning
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI; // Limit vertical rotation
    controls.minPolarAngle = 0;
    controls.rotateSpeed = 0.7;

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 6);
    scene.add(ambientLight);
    lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[ 0 ].position.set( 0, 10, 0 );
    scene.add( lights[ 0 ] );
    directionalLightHelper[0] = new THREE.PointLightHelper(lights[0], 1);
    scene.add( directionalLightHelper[0] );

    const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
    directionalLight.position.set(1, 5, 1).normalize();
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load default model
    loadModel('assets/steampunk_underwater_explorer/scene.gltf');

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('mousedown', onUserInteraction);
}

function onUserInteraction() {
    // Update the flag to indicate user interaction
    userInteracted = true;
    hand.style.display = "none";

    // Remove the event listener to stop the automatic rotation
    renderer.domElement.removeEventListener('mousedown', onUserInteraction);
}

function loadModel(modelPath) {
    animationCooldown = 800;
    lastLoaded = modelPath;
    // Use GLTFLoader to load 3D model
    const loader = new THREE.GLTFLoader();
    loader.load(modelPath, (gltf) => {
        currentModel = gltf.scene;
        //TODO: Comment out if there is no need for model to to cast shadow on itself
        // currentModel.traverse(function (child) {
        //     if (child instanceof THREE.Mesh) {
        //         child.castShadow = true;
        //         child.receiveShadow = true;
        //     }
        // });

        const boundingBox = new THREE.Box3().setFromObject(gltf.scene);

        // Calculate the center of the bounding box
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // Set the controls target to the center of the model
        controls.target.copy(center);

        // Calculate the distance from the center to the camera based on the bounding box size
        const boundingBoxSize = new THREE.Vector3();
        boundingBox.getSize(boundingBoxSize);
        const distance = Math.max(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z) * 1.5;

        scene.rotation.y = 0;
        scene.rotation.x = 0;
        scene.rotation.z = 0;
        // Set the camera position to look at the center of the model
        targetCameraPosition.copy(center.clone().add(new THREE.Vector3(0, boundingBoxSize.y/0.9, distance)));
        isCameraMoving = true;
        // camera.lookAt(center);

        scene.add(gltf.scene);
    });
}

function onWindowResize() {
    width = document.getElementById('canvas').offsetWidth;
    height = document.getElementById('canvas').offsetHeight;
    camera.aspect = (width) / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    // Check if the user has interacted
    if (!userInteracted) {
        // Rotate the scene or model slowly
        // scene.rotation.y += 0.0013; // Adjust the rotation speed as needed

        if (animationCooldown <= 0 ) {

            // Apply faster rotation for a short duration
            const originalRotationSpeed = 0.0013;
            const fasterRotationSpeed = 0.003;
            const duration = 333; // frames
            animationCooldown = 1000;

            let frame = 0;
            let handX = width / 2;

            const fasterRotate = () => {
                if (userInteracted) {
                    return;
                }
                let direction = 1;
                if (frame <= duration / 3) {
                    direction = 1;
                } else if (frame <= (duration * 2) / 3) {
                    direction = -1;
                }
                let speedModifier = direction === -1 ? originalRotationSpeed : -1 * originalRotationSpeed;
                scene.rotation.y += direction * (fasterRotationSpeed + speedModifier);
                frame++;
                handX += direction * 0.55; // Adjust hand speed
                hand.style.left = (parseInt(handX) + 2) + "px";

                // Check if the faster rotation duration is reached
                if (frame < duration) {
                    if (hand.style.display !== "block") {
                        hand.style.display = "block";
                    }
                    requestAnimationFrame(fasterRotate);
                }
            };

            // Start the faster rotation animation
            fasterRotate();
        } else {
            scene.rotation.y += 0.0013;
            hand.style.display = "none";
        }

        animationCooldown--;
    }

    // Update controls only if user has interacted
    if (userInteracted) {
        hand.style.display = "none";
        controls.update();
    }

    if (isCameraMoving) {
        camera.position.lerp(targetCameraPosition, cameraMoveSpeed);

        // Check if the camera is close enough to the target position
        if (camera.position.distanceTo(targetCameraPosition) < 0.01) {
            isCameraMoving = false;
        }

        // Update the camera's look-at direction
        camera.lookAt(targetCameraPosition);

        if (isCameraMoving === false) {
            targetCameraPosition = new THREE.Vector3();
        }
    }

    renderer.render(scene, camera);
}

init();
animate();

function changeModel(path) {
    if (path === lastLoaded) {
        return;
    }

    // Clear the scene
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);


    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(24, 60, 0).normalize();
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;


    userInteracted = false;
    renderer.domElement.addEventListener('mousedown', onUserInteraction);

    // Load the selected model
    loadModel(path);
}

function showHidePart(name) {
    let visibleMesh;
    let show = false;

    currentModel.traverse((child) => {
        if (child.isMesh) {
            console.log(child.name);
            if (child.name === name) {
                child.visible = !child.visible;
                show = !child.visible;
                visibleMesh = child;
            }
        }
    });

    let boundingBox = undefined;

    if (visibleMesh) {
        boundingBox = new THREE.Box3().setFromObject(show ? visibleMesh : currentModel);
    }

    if (boundingBox) {
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Set the camera position and look at the center of the bounding box
        const boundingBoxSize = new THREE.Vector3();
        boundingBox.getSize(boundingBoxSize);
        const distance = Math.max(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z) * 1.5;
        targetCameraPosition.copy(center.clone().add(new THREE.Vector3(0, boundingBoxSize.y / 0.9, distance)));
        isCameraMoving = true;
    }
}
