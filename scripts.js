// Variables globales
let scene, camera, renderer;
let paperGroup, paperSheet;
let foxModel = null;
let isAnimating = false;
let currentStep = 1;
let totalSteps = 5;
let raycaster, mouse;
let currentSection = 'home';

// Thème actuel et couleur du renard
let currentTheme = 'dark';
let foxColor = '#ff7e5f';

// Sons pour l'origami
let soundEnabled = false;
const sounds = {
    fold1: null,
    fold2: null,
    fold3: null,
    fold4: null,
    reset: null
};

// Correspondance entre étapes et sections
const stepToSection = {
    1: 'home',
    2: 'about',
    3: 'skills',
    4: 'portfolio',
    5: 'contact'
};

// Initialisation après chargement
window.addEventListener('load', () => {
    init();
    animate();
    
    // Masquer l'écran de chargement
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 800);
    }, 1500);
    
    // Masquer l'instruction après un moment
    setTimeout(() => {
        document.getElementById('instruction').classList.add('fade');
    }, 8000);
    
    // Bouton étape suivante
    document.getElementById('next-button').addEventListener('click', () => {
        if (!isAnimating) {
            advanceToNextStep();
        }
    });
    
    // Bouton reset
    document.getElementById('reset-button').addEventListener('click', () => {
        if (!isAnimating) {
            resetOrigami();
        }
    });
    
    // Initialiser les sons
    initSounds();
    
    // Bouton de thème
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Options de couleurs du renard
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            changeFoxColor(color);
        });
    });
    
    // Bouton de son
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
    
    // Ouverture des modals de projets
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project');
            openProjectModal(projectId);
        });
    });
    
    // Fermeture de la modal de projet
    document.getElementById('modal-close').addEventListener('click', closeProjectModal);
    document.getElementById('project-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeProjectModal();
        }
    });
    
    // Fermeture avec la touche Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('project-modal').classList.contains('active')) {
            closeProjectModal();
        }
    });
    
    // Gestion des onglets de portfolio
    document.querySelectorAll('.portfolio-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Récupérer la catégorie ciblée
            const category = this.getAttribute('data-category');
            
            // Mettre à jour les onglets actifs
            document.querySelectorAll('.portfolio-tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // Mettre à jour les conteneurs de projets visibles
            document.querySelectorAll('.portfolio-category-container').forEach(container => {
                container.classList.remove('active');
            });
            document.getElementById(`${category}-projects`).classList.add('active');
        });
    });
});

function updateSceneColors() {
    // Mettre à jour la couleur de fond
    const bgColorValue = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
    scene.background = new THREE.Color(bgColorValue);
    
    // Améliorer le contraste du modèle en mode clair
    if (currentTheme === 'light' && foxModel) {
        // Augmenter les ombres pour plus de contraste
        scene.children.forEach(child => {
            if (child.isDirectionalLight && child.castShadow) {
                child.shadow.bias = -0.001;
                child.shadow.mapSize.width = 1024;
                child.shadow.mapSize.height = 1024;
            }
        });
        
        // Ajouter une lumière d'accentuation pour améliorer la visibilité
        const accentLight = scene.children.find(child => 
            child.isPointLight && child.position.y > 0
        );
        
        if (accentLight) {
            accentLight.intensity = 1.4;
        }
    }
}

// Initialisation
function init() {
    // Créer la scène Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);
    
    // Créer la caméra
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    
    // Créer le renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.getElementById('scene-container').appendChild(renderer.domElement);
    
    // Ajouter l'éclairage
    setupLighting();
    
    // Créer la feuille de papier initiale
    createInitialPaper();
    
    // Raycaster pour l'interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Événements
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    
    // Navigation
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            navigateToSection(section);
            
            // Mettre à jour les boutons actifs
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
}

// Configuration de l'éclairage
function setupLighting() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Lumière principale
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Lumière secondaire
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);
    
    // Lumière d'accent orange
    const accentLight = new THREE.PointLight(0xff7e5f, 1, 20);
    accentLight.position.set(0, 5, 2);
    scene.add(accentLight);
}

// Création de la feuille de papier initiale
function createInitialPaper() {
    // Groupe pour contenir la feuille et ses transformations
    paperGroup = new THREE.Group();
    
    // Texture de papier
    const paperTexture = createPaperTexture();
    
    // Matériau pour la feuille
    const paperMaterial = new THREE.MeshPhongMaterial({
        color: 0xf8f8f8,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    // Créer une feuille carrée
    const paperGeometry = new THREE.PlaneGeometry(4, 4, 10, 10);
    paperSheet = new THREE.Mesh(paperGeometry, paperMaterial);
    paperSheet.castShadow = true;
    paperSheet.receiveShadow = true;
    
    // Ajouter la feuille au groupe
    paperGroup.add(paperSheet);
    
    // Faire une rotation légère pour un meilleur angle de vue
    paperGroup.rotation.x = -0.2;
    
    // Ajouter le groupe à la scène
    scene.add(paperGroup);
}

// Créer une texture de papier
function createPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Fond blanc
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ajouter une légère texture
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
        ctx.fill();
    }
    
    // Ajouter quelques "fibres"
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#888888';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const length = Math.random() * 20 + 5;
        const angle = Math.random() * Math.PI * 2;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + Math.cos(angle) * length,
            y + Math.sin(angle) * length
        );
        ctx.stroke();
    }
    
    // Créer la texture
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Avancer à l'étape suivante du pliage
function advanceToNextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        executeOrigamiFoldStep(currentStep);
        updateStepIndicator();
        navigateToSection(stepToSection[currentStep]);
        
        // Mettre à jour les boutons de navigation
        document.querySelectorAll('.nav-button').forEach(button => {
            if (button.getAttribute('data-section') === stepToSection[currentStep]) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Afficher le bouton reset
        document.getElementById('reset-button').classList.add('visible');
        
        // Cacher le bouton next à la dernière étape
        if (currentStep === totalSteps) {
            document.getElementById('next-button').classList.remove('visible');
        }
    }
}

// Exécuter une étape de pliage
function executeOrigamiFoldStep(step) {
    isAnimating = true;
    
    // Retirer l'ancien modèle si nécessaire
    if (foxModel) {
        paperGroup.remove(foxModel);
        foxModel = null;
    }
    
    // Cacher la feuille initiale à l'étape 2 et au-delà
    if (step > 1) {
        paperSheet.visible = false;
    }
    
    // Créer le modèle d'origami selon l'étape
    switch (step) {
        case 2:
            createFoxStep2();
            break;
        case 3:
            createFoxStep3();
            break;
        case 4:
            createFoxStep4();
            break;
        case 5:
            createFoxStep5();
            break;
    }
    
    // Animation d'apparition
    if (foxModel) {
        foxModel.scale.set(0, 0, 0);
        const duration = 1000;
        const startTime = Date.now();
        
        function animateScale() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic ease out pour une animation plus naturelle
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            foxModel.scale.set(easedProgress, easedProgress, easedProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animateScale);
            } else {
                isAnimating = false;
            }
        }
        
        animateScale();
        
        // Jouer le son de pliage
        playFoldSound(step);
    } else {
        isAnimating = false;
    }
    
    // Afficher le bouton "Étape suivante" sauf à la dernière étape
    if (step < totalSteps) {
        document.getElementById('next-button').classList.add('visible');
    }
}

function createImprovedPaperSound(pitch, duration) {
    return {
        play: function() {
            if (!soundEnabled) return;
            
            try {
                const oscillator = window.audioContext.createOscillator();
                const gainNode = window.audioContext.createGain();
                
                // Son plus doux et plus naturel
                oscillator.type = 'sine'; // 'sine' est plus doux que 'triangle'
                oscillator.frequency.setValueAtTime(pitch, window.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(
                    pitch * 0.8, 
                    window.audioContext.currentTime + duration * 0.8
                );
                
                // Volume plus faible
                gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001, 
                    window.audioContext.currentTime + duration
                );
                
                oscillator.connect(gainNode);
                gainNode.connect(window.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(window.audioContext.currentTime + duration);
            } catch (e) {
                console.error("Erreur lors de la lecture du son:", e);
            }
        }
    };
}

// Création du modèle de renard à l'étape 2 (premier pliage)
function createFoxStep2() {
    // Texture de papier
    const paperTexture = createPaperTexture();
    
    // Matériau pour l'origami
    const paperMaterial = new THREE.MeshPhongMaterial({
        color: 0xf8f8f8,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    // Groupe pour le modèle de renard
    foxModel = new THREE.Group();
    
    // Forme de base pliée (triangle)
    const triangleGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        0, 0, 0,        // Centre
        -2, -2, 0,      // Coin bas gauche
        2, -2, 0,       // Coin bas droit
        0, 2, 0         // Sommet
    ]);
    
    const indices = [
        0, 1, 2,        // Triangle bas
        0, 2, 3,        // Triangle droite
        0, 3, 1         // Triangle gauche
    ];
    
    triangleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    triangleGeometry.setIndex(indices);
    triangleGeometry.computeVertexNormals();
    
    const triangle = new THREE.Mesh(triangleGeometry, paperMaterial);
    triangle.castShadow = true;
    triangle.receiveShadow = true;
    
    foxModel.add(triangle);
    
    // Ajouter une ligne de pli
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000, 
        opacity: 0.2, 
        transparent: true 
    });
    
    const foldGeometry = new THREE.BufferGeometry();
    foldGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0,
        0, 2, 0
    ], 3));
    
    const foldLine = new THREE.Line(foldGeometry, lineMaterial);
    foxModel.add(foldLine);
    
    // Ajouter le modèle au groupe
    paperGroup.add(foxModel);
}

// Création du modèle de renard à l'étape 3 (pliage intermédiaire)
function createFoxStep3() {
    // Texture de papier
    const paperTexture = createPaperTexture();
    
    // Matériau pour l'origami
    const paperMaterial = new THREE.MeshPhongMaterial({
        color: 0xf8f8f8,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    // Groupe pour le modèle de renard
    foxModel = new THREE.Group();
    
    // Base du renard (forme de diamant)
    const baseGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        0, 0, 0,        // Centre
        -1.5, 0, 0,     // Gauche
        0, 2, 0,        // Haut
        1.5, 0, 0,      // Droite
        0, -2, 0        // Bas
    ]);
    
    const indices = [
        0, 1, 2,        // Triangle haut gauche
        0, 2, 3,        // Triangle haut droite
        0, 3, 4,        // Triangle bas droite
        0, 4, 1         // Triangle bas gauche
    ];
    
    baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    baseGeometry.setIndex(indices);
    baseGeometry.computeVertexNormals();
    
    const base = new THREE.Mesh(baseGeometry, paperMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    
    foxModel.add(base);
    
    // Ajouter des lignes de pli
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000, 
        opacity: 0.2, 
        transparent: true 
    });
    
    // Pli vertical
    const verticalFoldGeometry = new THREE.BufferGeometry();
    verticalFoldGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, -2, 0,
        0, 2, 0
    ], 3));
    
    const verticalFold = new THREE.Line(verticalFoldGeometry, lineMaterial);
    foxModel.add(verticalFold);
    
    // Pli horizontal
    const horizontalFoldGeometry = new THREE.BufferGeometry();
    horizontalFoldGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
        -1.5, 0, 0,
        1.5, 0, 0
    ], 3));
    
    const horizontalFold = new THREE.Line(horizontalFoldGeometry, lineMaterial);
    foxModel.add(horizontalFold);
    
    // Ajouter le modèle au groupe
    paperGroup.add(foxModel);
}

// Création du modèle de renard à l'étape 4 (forme presque complète)
function createFoxStep4() {
    // Texture de papier
    const paperTexture = createPaperTexture();
    
    // Matériaux pour l'origami
    const paperMaterial = new THREE.MeshPhongMaterial({
        color: 0xf8f8f8,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    const accentMaterial = new THREE.MeshPhongMaterial({
        color: foxColor,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    // Groupe pour le modèle de renard
    foxModel = new THREE.Group();
    
    // Corps du renard
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVertices = new Float32Array([
        0, 0, 0,        // Centre
        -1, 0, 0.5,     // Gauche
        0, 1, 0.2,      // Haut
        1, 0, 0.5,      // Droite
        0, -1, 0        // Bas
    ]);
    
    const bodyIndices = [
        0, 1, 2,        // Triangle haut gauche
        0, 2, 3,        // Triangle haut droite
        0, 3, 4,        // Triangle bas droite
        0, 4, 1         // Triangle bas gauche
    ];
    
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVertices, 3));
    bodyGeometry.setIndex(bodyIndices);
    bodyGeometry.computeVertexNormals();
    
    const body = new THREE.Mesh(bodyGeometry, paperMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    
    foxModel.add(body);
    
    // Tête (forme triangulaire)
    const headGeometry = new THREE.BufferGeometry();
    const headVertices = new Float32Array([
        0, 1, 0.2,      // Base
        -0.6, 1.5, 0.3, // Gauche
        0.6, 1.5, 0.3   // Droite
    ]);
    
    const headIndices = [0, 1, 2];
    
    headGeometry.setAttribute('position', new THREE.Float32BufferAttribute(headVertices, 3));
    headGeometry.setIndex(headIndices);
    headGeometry.computeVertexNormals();
    
    const head = new THREE.Mesh(headGeometry, paperMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    
    foxModel.add(head);
    
    // Oreilles
    const earSize = 0.3;
    
    // Oreille gauche
    const leftEarGeometry = new THREE.BufferGeometry();
    const leftEarVertices = new Float32Array([
        -0.6, 1.5, 0.3,             // Base
        -0.8, 1.8, 0.4,             // Pointe extérieure
        -0.4, 1.7, 0.4              // Pointe intérieure
    ]);
    
    const earIndices = [0, 1, 2];
    
    leftEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftEarVertices, 3));
    leftEarGeometry.setIndex(earIndices);
    leftEarGeometry.computeVertexNormals();
    
    const leftEar = new THREE.Mesh(leftEarGeometry, accentMaterial);
    leftEar.castShadow = true;
    leftEar.receiveShadow = true;
    
    foxModel.add(leftEar);
    
    // Oreille droite
    const rightEarGeometry = new THREE.BufferGeometry();
    const rightEarVertices = new Float32Array([
        0.6, 1.5, 0.3,              // Base
        0.8, 1.8, 0.4,              // Pointe extérieure
        0.4, 1.7, 0.4               // Pointe intérieure
    ]);
    
    rightEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightEarVertices, 3));
    rightEarGeometry.setIndex(earIndices);
    rightEarGeometry.computeVertexNormals();
    
    const rightEar = new THREE.Mesh(rightEarGeometry, accentMaterial);
    rightEar.castShadow = true;
    rightEar.receiveShadow = true;
    
    foxModel.add(rightEar);
    
    // Queue
    const tailGeometry = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
        0, -1, 0,               // Base
        -0.5, -1.5, 0.3,        // Pointe gauche
        0.5, -1.5, 0.3          // Pointe droite
    ]);
    
    tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailVertices, 3));
    tailGeometry.setIndex(earIndices);
    tailGeometry.computeVertexNormals();
    
    const tail = new THREE.Mesh(tailGeometry, accentMaterial);
    tail.castShadow = true;
    tail.receiveShadow = true;
    
    foxModel.add(tail);
    
    // Ajouter le modèle au groupe
    paperGroup.add(foxModel);
}

// Création du modèle de renard final (étape 5)
function createFoxStep5() {
    // Texture de papier
    const paperTexture = createPaperTexture();
    
    // Matériaux pour l'origami
    const paperMaterial = new THREE.MeshPhongMaterial({
        color: 0xf8f8f8,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    const accentMaterial = new THREE.MeshPhongMaterial({
        color: foxColor,
        map: paperTexture,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    const darkMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
        shininess: 10
    });
    
    // Groupe pour le modèle de renard
    foxModel = new THREE.Group();
    
    // Corps du renard
    const bodyGeometry = new THREE.BufferGeometry();
    const bodyVertices = new Float32Array([
        0, 0, 0.5,        // Centre
        -1.2, -0.2, 0.5,  // Gauche
        0, 1.2, 0.5,      // Haut
        1.2, -0.2, 0.5,   // Droite
        0, -1.2, 0.3      // Bas
    ]);
    
    const bodyIndices = [
        0, 1, 2,        // Triangle haut gauche
        0, 2, 3,        // Triangle haut droite
        0, 3, 4,        // Triangle bas droite
        0, 4, 1         // Triangle bas gauche
    ];
    
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVertices, 3));
    bodyGeometry.setIndex(bodyIndices);
    bodyGeometry.computeVertexNormals();
    
    const body = new THREE.Mesh(bodyGeometry, paperMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    
    foxModel.add(body);
    
    // Tête (forme triangulaire affinée)
    const headGeometry = new THREE.BufferGeometry();
    const headVertices = new Float32Array([
        0, 1.2, 0.5,        // Base
        -0.7, 1.8, 0.7,     // Gauche
        0, 2.0, 0.8,        // Milieu
        0.7, 1.8, 0.7       // Droite
    ]);
    
    const headIndices = [
        0, 1, 2,
        0, 2, 3
    ];
    
    headGeometry.setAttribute('position', new THREE.Float32BufferAttribute(headVertices, 3));
    headGeometry.setIndex(headIndices);
    headGeometry.computeVertexNormals();
    
    const head = new THREE.Mesh(headGeometry, paperMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    
    foxModel.add(head);
    
    // Oreilles plus définies
    // Oreille gauche
    const leftEarGeometry = new THREE.BufferGeometry();
    const leftEarVertices = new Float32Array([
        -0.7, 1.8, 0.7,             // Base
        -1.0, 2.3, 0.9,             // Pointe extérieure
        -0.5, 2.1, 0.8              // Pointe intérieure
    ]);
    
    const earIndices = [0, 1, 2];
    
    leftEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftEarVertices, 3));
    leftEarGeometry.setIndex(earIndices);
    leftEarGeometry.computeVertexNormals();
    
    const leftEar = new THREE.Mesh(leftEarGeometry, accentMaterial);
    leftEar.castShadow = true;
    leftEar.receiveShadow = true;
    
    foxModel.add(leftEar);
    
    // Oreille droite
    const rightEarGeometry = new THREE.BufferGeometry();
    const rightEarVertices = new Float32Array([
        0.7, 1.8, 0.7,              // Base
        1.0, 2.3, 0.9,              // Pointe extérieure
        0.5, 2.1, 0.8               // Pointe intérieure
    ]);
    
    rightEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightEarVertices, 3));
            rightEarGeometry.setIndex(earIndices);
            rightEarGeometry.computeVertexNormals();
            
            const rightEar = new THREE.Mesh(rightEarGeometry, accentMaterial);
            rightEar.castShadow = true;
            rightEar.receiveShadow = true;
            
            foxModel.add(rightEar);
            
            // Queue
            const tailGeometry = new THREE.BufferGeometry();
            const tailVertices = new Float32Array([
                0, -1, 0,               // Base
                -0.5, -1.5, 0.3,        // Pointe gauche
                0.5, -1.5, 0.3          // Pointe droite
            ]);
            
            tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailVertices, 3));
            tailGeometry.setIndex(earIndices);
            tailGeometry.computeVertexNormals();
            
            const tail = new THREE.Mesh(tailGeometry, accentMaterial);
            tail.castShadow = true;
            tail.receiveShadow = true;
            
            foxModel.add(tail);
            
            // Ajouter le modèle au groupe
            paperGroup.add(foxModel);
        }
        
        // Création du modèle de renard final (étape 5)
        function createFoxStep5() {
            // Texture de papier
            const paperTexture = createPaperTexture();
            
            // Matériaux pour l'origami
            const paperMaterial = new THREE.MeshPhongMaterial({
                color: 0xf8f8f8,
                map: paperTexture,
                side: THREE.DoubleSide,
                shininess: 10
            });
            
            const accentMaterial = new THREE.MeshPhongMaterial({
                color: foxColor,
                map: paperTexture,
                side: THREE.DoubleSide,
                shininess: 10
            });
            
            const darkMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333,
                side: THREE.DoubleSide,
                shininess: 10
            });
            
            // Groupe pour le modèle de renard
            foxModel = new THREE.Group();
            
            // Corps du renard
            const bodyGeometry = new THREE.BufferGeometry();
            const bodyVertices = new Float32Array([
                0, 0, 0.5,        // Centre
                -1.2, -0.2, 0.5,  // Gauche
                0, 1.2, 0.5,      // Haut
                1.2, -0.2, 0.5,   // Droite
                0, -1.2, 0.3      // Bas
            ]);
            
            const bodyIndices = [
                0, 1, 2,        // Triangle haut gauche
                0, 2, 3,        // Triangle haut droite
                0, 3, 4,        // Triangle bas droite
                0, 4, 1         // Triangle bas gauche
            ];
            
            bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVertices, 3));
            bodyGeometry.setIndex(bodyIndices);
            bodyGeometry.computeVertexNormals();
            
            const body = new THREE.Mesh(bodyGeometry, paperMaterial);
            body.castShadow = true;
            body.receiveShadow = true;
            
            foxModel.add(body);
            
            // Tête (forme triangulaire affinée)
            const headGeometry = new THREE.BufferGeometry();
            const headVertices = new Float32Array([
                0, 1.2, 0.5,        // Base
                -0.7, 1.8, 0.7,     // Gauche
                0, 2.0, 0.8,        // Milieu
                0.7, 1.8, 0.7       // Droite
            ]);
            
            const headIndices = [
                0, 1, 2,
                0, 2, 3
            ];
            
            headGeometry.setAttribute('position', new THREE.Float32BufferAttribute(headVertices, 3));
            headGeometry.setIndex(headIndices);
            headGeometry.computeVertexNormals();
            
            const head = new THREE.Mesh(headGeometry, paperMaterial);
            head.castShadow = true;
            head.receiveShadow = true;
            
            foxModel.add(head);
            
            // Oreilles plus définies
            // Oreille gauche
            const leftEarGeometry = new THREE.BufferGeometry();
            const leftEarVertices = new Float32Array([
                -0.7, 1.8, 0.7,             // Base
                -1.0, 2.3, 0.9,             // Pointe extérieure
                -0.5, 2.1, 0.8              // Pointe intérieure
            ]);
            
            const earIndices = [0, 1, 2];
            
            leftEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftEarVertices, 3));
            leftEarGeometry.setIndex(earIndices);
            leftEarGeometry.computeVertexNormals();
            
            const leftEar = new THREE.Mesh(leftEarGeometry, accentMaterial);
            leftEar.castShadow = true;
            leftEar.receiveShadow = true;
            
            foxModel.add(leftEar);
            
            // Oreille droite
            const rightEarGeometry = new THREE.BufferGeometry();
            const rightEarVertices = new Float32Array([
                0.7, 1.8, 0.7,              // Base
                1.0, 2.3, 0.9,              // Pointe extérieure
                0.5, 2.1, 0.8               // Pointe intérieure
            ]);
            
            rightEarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightEarVertices, 3));
            rightEarGeometry.setIndex(earIndices);
            rightEarGeometry.computeVertexNormals();
            
            const rightEar = new THREE.Mesh(rightEarGeometry, accentMaterial);
            rightEar.castShadow = true;
            rightEar.receiveShadow = true;
            
            foxModel.add(rightEar);
            
            // Museau
            const muzzleGeometry = new THREE.BufferGeometry();
            const muzzleVertices = new Float32Array([
                0, 1.6, 0.8,                // Base
                -0.3, 1.3, 1.0,             // Gauche
                0, 1.2, 1.1,                // Bas
                0.3, 1.3, 1.0               // Droite
            ]);
            
            const muzzleIndices = [
                0, 1, 2,
                0, 2, 3
            ];
            
            muzzleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(muzzleVertices, 3));
            muzzleGeometry.setIndex(muzzleIndices);
            muzzleGeometry.computeVertexNormals();
            
            const muzzle = new THREE.Mesh(muzzleGeometry, accentMaterial);
            muzzle.castShadow = true;
            muzzle.receiveShadow = true;
            
            foxModel.add(muzzle);
            
            // Yeux
            const eyeGeometry = new THREE.CircleGeometry(0.1, 16);
            
            // Œil gauche
            const leftEye = new THREE.Mesh(eyeGeometry, darkMaterial);
            leftEye.position.set(-0.3, 1.7, 0.9);
            leftEye.lookAt(new THREE.Vector3(0, 0, 5)); // Pour qu'il soit orienté vers la caméra
            foxModel.add(leftEye);
            
            // Œil droit
            const rightEye = new THREE.Mesh(eyeGeometry, darkMaterial);
            rightEye.position.set(0.3, 1.7, 0.9);
            rightEye.lookAt(new THREE.Vector3(0, 0, 5)); // Pour qu'il soit orienté vers la caméra
            foxModel.add(rightEye);
            
            // Nez
            const noseGeometry = new THREE.CircleGeometry(0.07, 16);
            const nose = new THREE.Mesh(noseGeometry, darkMaterial);
            nose.position.set(0, 1.3, 1.1);
            nose.lookAt(new THREE.Vector3(0, 0, 5)); // Pour qu'il soit orienté vers la caméra
            foxModel.add(nose);
            
            // Queue améliorée (version de renard, pas de poisson)
            const tailGeometry = new THREE.BufferGeometry();
            // Forme plus allongée et pointue comme une queue de renard
            const tailVertices = new Float32Array([
                0, -1.2, 0.3,               // Base
                -0.3, -1.8, 0.4,            // Milieu gauche
                0, -2.2, 0.5,               // Pointe (plus longue et effilée)
                0.3, -1.8, 0.4              // Milieu droit
            ]);
            
            const tailIndices = [
                0, 1, 2,
                0, 2, 3
            ];
            
            tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailVertices, 3));
            tailGeometry.setIndex(tailIndices);
            tailGeometry.computeVertexNormals();
            
            const tail = new THREE.Mesh(tailGeometry, accentMaterial);
            tail.castShadow = true;
            tail.receiveShadow = true;
            
            foxModel.add(tail);
            
            // Ajouter quelques détails de pli à la queue pour plus de réalisme
            const tailLineGeometry = new THREE.BufferGeometry();
            tailLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                0, -1.2, 0.3,
                0, -2.2, 0.5
            ], 3));
            
            const tailLine = new THREE.Line(
                tailLineGeometry,
                new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
            );
            foxModel.add(tailLine);
            
            // Ajouter le modèle au groupe
            paperGroup.add(foxModel);
        }

        // Réinitialiser l'origami à l'état initial
        function resetOrigami() {
            isAnimating = true;
            
            // Masquer le modèle de renard actuel s'il existe
            if (foxModel) {
                // Animation de disparition
                const duration = 500;
                const startTime = Date.now();
                const startScale = foxModel.scale.clone();
                
                function animateDisappear() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Cubic ease in pour une animation plus naturelle
    const easedProgress = Math.pow(progress, 3);
    
    foxModel.scale.set(
        startScale.x * (1 - easedProgress),
        startScale.y * (1 - easedProgress),
        startScale.z * (1 - easedProgress)
    );
    
    if (progress < 1) {
        requestAnimationFrame(animateDisappear);
    } else {
        // Retirer le modèle de renard
        paperGroup.remove(foxModel);
        foxModel = null;
        
        // Afficher la feuille initiale
        paperSheet.visible = true;
        
        // Réinitialiser l'étape
        currentStep = 1;
        updateStepIndicator();
        
        // Naviguer vers la page d'accueil
        navigateToSection('home');
        
        // Mettre à jour les boutons de navigation
        document.querySelectorAll('.nav-button').forEach(button => {
            if (button.getAttribute('data-section') === 'home') {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Masquer les boutons
        document.getElementById('next-button').classList.remove('visible');
        document.getElementById('reset-button').classList.remove('visible');
        
        isAnimating = false;
        
        // Jouer le son de réinitialisation
        playFoldSound('reset');
    }
}

animateDisappear();
} else {
    isAnimating = false;
}
}

// Fonction pour mettre à jour l'indicateur d'étape amélioré
function updateStepIndicator() {
    // Déterminer le nom de l'étape
    let stepName = "";
    switch (currentStep) {
        case 1:
            stepName = "Feuille de départ";
            break;
        case 2:
            stepName = "Premier pliage";
            break;
        case 3:
            stepName = "Forme de base";
            break;
        case 4:
            stepName = "Détails du renard";
            break;
        case 5:
            stepName = "Renard complet";
            break;
    }
    
    // Mettre à jour la description
    document.getElementById('step-description').textContent = stepName;
    
    // Mettre à jour les points de progression
    const stepDots = document.querySelectorAll('.step-dot');
    stepDots.forEach(dot => {
        const step = parseInt(dot.getAttribute('data-step'));
        
        // Réinitialiser les classes
        dot.classList.remove('active', 'completed');
        
        // Ajouter les classes appropriées
        if (step === currentStep) {
            dot.classList.add('active');
        } else if (step < currentStep) {
            dot.classList.add('completed');
        }
    });
}

// Ajouter l'interaction des points d'étape (cliquer pour aller à une étape spécifique)
document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', function() {
        if (isAnimating) return;
        
        const targetStep = parseInt(this.getAttribute('data-step'));
        
        // Si on clique sur une étape précédente ou l'étape actuelle
        if (targetStep <= currentStep) {
            // Si c'est une étape précédente, revenir à cette étape
            if (targetStep < currentStep) {
                // Réinitialiser d'abord
                resetOrigami();
                
                // Puis avancer jusqu'à l'étape cible
                setTimeout(() => {
                    let step = 1;
                    function advanceToTarget() {
                        if (step < targetStep) {
                            step++;
                            advanceToNextStep();
                            setTimeout(advanceToTarget, 1000); // Délai entre les étapes
                        }
                    }
                    setTimeout(advanceToTarget, 500);
                }, 500);
            }
        }
        // Si on clique sur une étape future mais pas trop loin
        else if (targetStep === currentStep + 1) {
            advanceToNextStep();
        }
    });
});

// Redimensionnement de la fenêtre
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Gestion du mouvement de la souris
function onMouseMove(event) {
    // Coordonnées normalisées de la souris
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Effet de parallaxe léger
    if (!isAnimating) {
        paperGroup.rotation.y = mouse.x * 0.2;
        paperGroup.rotation.x = -0.2 + mouse.y * 0.2;
    }
    
    // Raycasting pour détecter si on survole le papier
    raycaster.setFromCamera(mouse, camera);
    
    // Déterminer quel objet est survolé
    let targetObject = paperSheet;
    if (foxModel && paperSheet.visible === false) {
        // Utiliser le modèle du renard si la feuille est cachée
        const intersects = raycaster.intersectObjects(foxModel.children);
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
            return;
        }
    } else if (paperSheet.visible) {
        // Utiliser la feuille de papier si elle est visible
        const intersects = raycaster.intersectObject(paperSheet);
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
            return;
        }
    }
    
    document.body.style.cursor = 'default';
}

// Gestion des clics
function onClick(event) {
    // Vérifier si on clique sur le papier
    raycaster.setFromCamera(mouse, camera);
    
    // Détecter le clic sur la feuille ou sur le modèle de renard
    let intersects = [];
    if (foxModel && paperSheet.visible === false) {
        intersects = raycaster.intersectObjects(foxModel.children);
    } else if (paperSheet.visible) {
        intersects = raycaster.intersectObject(paperSheet);
    }
    
    if (intersects.length > 0 && !isAnimating) {
        advanceToNextStep();
    }
}

// Navigation entre les sections
function navigateToSection(section) {
    // Mettre à jour le contenu visible
    document.querySelectorAll('.section').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(section + '-section').classList.add('active');
    
    // Mettre à jour la section active
    currentSection = section;
}

// Initialisation des sons
function initSounds() {
    try {
        // Création d'un contexte audio pour les sons
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn("AudioContext non supporté par ce navigateur");
            return;
        }
        
        const audioContext = new AudioContext();
        window.audioContext = audioContext;
        
        // Fonction pour créer un son de papier plié
        function createPaperSound(pitch, duration) {
            return {
                play: function() {
                    if (!soundEnabled) return;
                    
                    try {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.type = 'triangle';
                        oscillator.frequency.setValueAtTime(pitch, audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.5, audioContext.currentTime + duration * 0.8);
                        
                        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + duration);
                    } catch (e) {
                        console.error("Erreur lors de la lecture du son:", e);
                    }
                }
            };
        }
        
        // Créer différents sons pour chaque étape de pliage
        sounds.fold1 = createPaperSound(300, 0.8);
        sounds.fold2 = createPaperSound(350, 0.7);
        sounds.fold3 = createPaperSound(400, 0.6);
        sounds.fold4 = createPaperSound(450, 0.5);
        sounds.reset = createPaperSound(250, 1.2);
    } catch (e) {
        console.warn("L'initialisation des sons a échoué:", e);
        soundEnabled = false;
    }
}

// Fonction pour jouer un son de pliage
function playFoldSound(step) {
    if (!sounds.fold1) {
        initSounds();
    }
    
    if (!soundEnabled) return;
    
    switch(step) {
        case 2:
            sounds.fold1.play();
            break;
        case 3:
            sounds.fold2.play();
            break;
        case 4:
            sounds.fold3.play();
            break;
        case 5:
            sounds.fold4.play();
            break;
        case 'reset':
            sounds.reset.play();
            break;
    }
}

// Fonction pour basculer le thème
function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    currentTheme = newTheme;
    
    // Mettre à jour l'icône du thème
    const themeIcon = document.getElementById('theme-icon');
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />`;
    } else {
        themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
    
    // Mettre à jour les couleurs de la scène
    updateSceneColors();
    
    // Réappliquer la couleur d'accent actuelle
    setTimeout(() => {
        changeFoxColor(foxColor);
    }, 100);
}

// Fonction pour mettre à jour les couleurs de la scène
function updateSceneColors() {
    // Mettre à jour la couleur de fond
    const bgColorValue = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
    scene.background = new THREE.Color(bgColorValue);
    
    // Mettre à jour l'éclairage en fonction du thème
    scene.children.forEach(child => {
        if (child.isLight) {
            if (child.isAmbientLight) {
                child.intensity = currentTheme === 'dark' ? 0.4 : 0.6;
            } 
            else if (child.isDirectionalLight) {
                child.intensity = currentTheme === 'dark' ? 0.8 : 1.0;
            }
        }
    });
}

// Fonction pour changer la couleur du renard et des éléments d'interface
function changeFoxColor(color) {
    foxColor = color;
    
    // Mettre à jour la variable CSS pour la couleur d'accent
    document.documentElement.style.setProperty('--accent-color', color);
    
    // Si le modèle de renard existe, mettre à jour sa couleur
    if (foxModel) {
        foxModel.traverse(function(child) {
            if (child.isMesh && child.material && child.material.color) {
                const hexColor = '#' + child.material.color.getHexString();
                if (hexColor === '#ff7e5f' || 
                    hexColor === '#5f9fff' || 
                    hexColor === '#5fff7e' || 
                    hexColor === '#ff5fd0' || 
                    hexColor === '#ffdb5f') {
                    child.material.color.set(color);
                }
            }
        });
    }
    
    // Mettre à jour la couleur des lumières d'accent dans la scène
    scene.children.forEach(light => {
        if (light.isPointLight) {
            light.color.set(color);
        }
    });
}

// Fonction pour activer/désactiver le son
function toggleSound() {
    soundEnabled = !soundEnabled;
    
    // Mettre à jour l'icône de son
    const soundIcon = document.getElementById('sound-icon');
    if (soundEnabled) {
        soundIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        `;
    } else {
        soundIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
    }
}

// Données des projets pour la vue détaillée
const projectsData = {
    // PROJETS PERSONNELS
    origami: {
        title: "Origami Interactif",
        description: `
            <p>Ce projet est le portfolio interactif que vous consultez actuellement ! J'ai créé cette expérience immersive en utilisant Three.js et WebGL pour simuler le pliage d'origami d'un renard, une technique traditionnelle japonaise réinterprétée en 3D.</p>
            <p>L'interface guide les visiteurs à travers mon profil tout en révélant progressivement un modèle d'origami, avec des animations fluides et des transitions élégantes. J'ai implémenté des contrôles intuitifs permettant de changer les couleurs du renard et de basculer entre les thèmes clair et sombre.</p>
            <p>La conception responsive assure une expérience optimale sur tous les appareils, tandis que l'aspect ludique encourage l'exploration de mon travail de manière innovante et mémorable.</p>
        `,

        images: [
            "/Site-Perso/assets/Load.png",  // Image principale du projet
            "/Site-Perso/assets/site2.png",  // Deuxième vue du projet
            "/Site-Perso/assets/site3.png"   // Troisième vue du projet
        ],
        technologies: ["Three.js", "WebGL", "JavaScript", "HTML5", "CSS3"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/Site-Perso" },
            { text: "Démo Live", url: "https://douniahlt.github.io/Site-Perso/" }
        ]
    },

    portfolio3d: {
        title: "Portfolio 3D",
        description: `
            <p>Ce portfolio 3D alternatif présente mes projets dans un environnement virtuel immersif. Inspiré par les jeux vidéo d'exploration, il permet aux visiteurs de se déplacer librement dans un espace interactif représentant mon univers créatif.</p>
            <p>Chaque zone thématique expose différents aspects de mon travail, avec des objets interactifs révélant des informations détaillées sur mes projets.</p>
            <p>Ce projet démontre ma passion pour la conception d'espaces virtuels et l'intégration harmonieuse d'éléments 3D et d'interactions utilisateur innovantes.</p>
        `,

        images: [
            "/Site-Perso/assets/site4.png",
            "/Site-Perso/assets/site5.png",
            "/Site-Perso/assets/site6.png"
        ],
        technologies: ["Blender", "Unreal Engine", "Modeling 3D", "Three.js"],

        links: [
            { text: "Voir la démo", url: "https://douniahlt.github.io/Portfolio3D/" },
            {text: "Code Source", url: "https://github.com/Douniahlt/Portfolio3D"}

        ]
    },
    visualization: {
        title: "Oiseau Raylib",
        description: `
            <p>Ce projet est une simulation en <strong>C++</strong> d'un <strong>essaim d'oiseaux</strong> utilisant la bibliothèque <strong>Raylib</strong>. Il applique les <strong>règles de Boids</strong> pour générer un comportement réaliste des oiseaux en vol. L'affichage et les interactions sont réalisés avec <strong>Raylib</strong>.</p
        `,

        images: [
            "/Site-Perso/assets/oiseau1.png",  // Exemple de visualisation de données
            "/Site-Perso/assets/oiseau2.png",  // Interface utilisateur du projet
            "/Site-Perso/assets/oiseau3.png"   // Détail d'une visualisation
        ],
        technologies: ["Raylib", "C++", "Raymath", "rlgl"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/Oiseau-Raylib" },
        ]
    },
    dessin: {
        title: "Portfolio Créatif",
        description: `
            <p>Mon portfolio créatif au style arcade présentant mes compétences et projets à travers une interface interactive et ludique inspirée des salles d'arcade.</p>
        `,

        images: [
            "/Site-Perso/assets/Creatif1.png",
            "/Site-Perso/assets/Creatif2.png",
            "/Site-Perso/assets/Creatif3.png",
            "/Site-Perso/assets/Creatif4.png",
            "/Site-Perso/assets/Creatif5.png"
        ],
        technologies: ["HTML/CSS", "JavaScript", "Blender", "Unreal Engine", "Raylib", "C/C++", "GL4D", "Traditionnel", "Digital", "Krita"],

        links: [
            { text: "Voir le site", url: "https://douniahlt.github.io/Portfolio-Creatif/" },
            { text: "Code source", url: "https://github.com/Douniahlt/Portfolio-Creatif" }
        ]
    },

    // PROJETS ACADÉMIQUES
    ludo: {
        title: "Jeu du Ludo en Python",
        description: `
            <p>Ce projet académique est une implémentation complète du jeu de plateau Ludo (Petits Chevaux) en Python. J'ai conçu une interface graphique avec Tkinter qui reproduit fidèlement le plateau de jeu classique, tout en ajoutant des fonctionnalités modernes.</p>
            <p>Le jeu permet de jouer à plusieurs sur un même ordinateur ou contre différents niveaux d'IA. L'intelligence artificielle utilise un algorithme d'évaluation de position avec recherche arborescente pour prendre des décisions stratégiques en fonction de la configuration du plateau et des probabilités de lancer de dés.</p>
            <p>Ce projet m'a permis d'approfondir mes connaissances en algorithmique, en programmation orientée objet et en développement d'interfaces utilisateur.</p>
        `,
 
        images: [
            "/Site-Perso/assets/ludo.png",  // Interface du jeu
        ],
        technologies: ["Python", "Tkinter", "Algorithmes", "IA", "Pygame"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/LudoGame" },
        ]
    },
    ecosystem: {
        title: "Écosystème Simulé",
        description: `
            <p>Cette simulation d'écosystème en C++ modélise les interactions complexes entre différentes espèces animales et végétales. Le programme simule un environnement où chaque organisme possède son propre ensemble de comportements et réagit aux conditions environnementales dynamiques.</p>
            <p>La simulation intègre des concepts avancés comme les algorithmes génétiques permettant aux espèces d'évoluer en réponse aux pressions environnementales, et un modèle physique simplifié pour simuler les interactions entre organismes. Une interface de visualisation en temps réel permet d'observer l'évolution de l'écosystème sur plusieurs générations.</p>
            <p>Ce projet démontre ma capacité à concevoir des systèmes complexes et à implémenter des concepts d'IA, tout en créant une visualisation claire de phénomènes dynamiques.</p>
        `,

        images: [
            "/Site-Perso/assets/ecos.png",  // Vue générale de la simulation
        ],
        technologies: ["C++", "OpenGL", "Algorithmes génétiques", "Simulation de vie artificielle", "Visualisation de données"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/Ecosysteme" },
        ]
    },
    godot: {
        title: "Jeux 2D avec Godot",
        description: `
            <p>FireflyDream est un jeu captivant centré sur le monde fascinant des lucioles. Plongez dans un univers magique où la lumière joue un rôle central. Explorez des niveaux et découvrez des secrets tout en profitant d'une ambiance visuelle en pixel art et d'une bande-son unique créée spécialement pour le jeu.</p>
        `,

        images: [
            "/Site-Perso/assets/firefly2.png",  // Screenshot du jeu de plateforme
            "/Site-Perso/assets/firefly1.png",  // Screenshot du puzzle game
            "/Site-Perso/assets/firefly3.png"   // Screenshot de l'endless runner
        ],
        technologies: ["Godot", "GDScript", "Pixel Art", "Animation 2D"],

        links: [
            { text: "Jouer aux jeux", url: "https://github.com/Douniahlt/FireflyDreams" },
        ]
    },
    interactive: {
        title: "Article Interactif",
        description: `
            <p>Color Perception est une expérience interactive qui explore la manière dont notre cerveau interprète (et parfois déforme) les couleurs en fonction de leur environnement. À travers une narration progressive et une série de mini-jeux inspirés de The Evolution of Trust, les utilisateurs découvrent des illusions comme le contraste simultané et l’adaptation chromatique. Ce projet combine pédagogie, interactivité et design immersif pour rendre accessible un phénomène scientifique fascinant.</p>
            <p>Ce projet démontre ma capacité à vulgariser des concepts techniques complexes et à créer des expériences pédagogiques engageantes en combinant texte explicatif et interactivité.</p>
        `,

        images: [
            "/Site-Perso/assets/tut.png",  // Vue générale de l'article
            "images/interactive/image2.jpg"   // Exemple d'interaction
        ],
        technologies: ["JavaScript", "Three.js", "HTML Canvas", "Vulgarisation scientifique"],

        links: [
            { text: "Voir l'article", url: "https://douniahlt.github.io/projet_tutore/" },
            { text: "Code Source", url: "https://github.com/Douniahlt/projet_tutore" }
        ]
    },

    F1: {
        title: "F1 Racing Game",
        description: `
            <p>F1 Racing Game est un simulateur de course où le joueur peut piloter une voiture de Formule 1 sur différents circuits contre des adversaires contrôlés par l'IA. Le jeu propose un rendu 3D réaliste des voitures et des circuits, ainsi qu'un système de physique permettant des collisions et des dégâts réalistes.</p>
        `,
        images: [
            "/Site-Perso/assets/F12.png",  // Vue générale de l'article
            "/Site-Perso/assets/F13.png",  // Exemple d'interaction
        ],
        technologies: ["GL4d", "OpenGL", "C", "C++"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/F1-RacingGame" }
        ]
    },

    tictactoe: {
        title: "Ultimate Tic Tac Toe",
        description: `
            <p>Cette implémentation avancée du jeu Ultimate Tic Tac Toe combine programmation en C et intelligence artificielle. Le jeu consiste en un méta-plateau de 9 cases, chacune contenant un jeu de morpion classique, créant ainsi un défi stratégique complexe.</p>
            <p>L'IA que j'ai développée utilise l'algorithme Minimax avec élagage alpha-bêta, capable d'explorer l'arbre des possibilités à plusieurs coups d'avance tout en optimisant les performances de calcul. Elle analyse la position globale et locale pour déterminer les coups optimaux, offrant un adversaire redoutable même pour des joueurs expérimentés.</p>
            <p>L'interface en mode texte (NCurses) permet une visualisation claire des plateaux imbriqués et facilite l'interaction. Ce projet démontre mes compétences en algorithmique, en théorie des jeux et en optimisation.</p>
        `,

        images: [
            "/Site-Perso/assets/Tictactoe.png",  // Interface du jeu
        ],
        technologies: ["C", "Algorithme Minimax", "Élagage alpha-bêta", "NCurses", "Théorie des jeux"],

        links: [
            { text: "Code Source", url: "https://github.com/Douniahlt/Ultimate-TicTacToe" },
        ]
    },
    app: {
        title: "Application QUEENDOM",
        description: `
            <p>QUEENDOM est une application Android éducative sur les échecs, conçue pour introduire les joueurs aux fondamentaux du jeu d'échecs. L'application présente les règles de base, les mouvements des pièces et les stratégies d'ouverture dans une interface simple et intuitive.</p>
        `,
   
        images: [
            "/Site-Perso/assets/Appli.png",  // Écran d'accueil de l'application
            "/Site-Perso/assets/app2.png",  // Interface de méditation
            "/Site-Perso/assets/app3.png"
        ],
        technologies: ["Kotlin", "AndroidStudio", "Prototypage", "UI"],

        links: [
            { text: "Code source", url: "https://github.com/Douniahlt/QUEENDOM" }
        ]
    },

    Colt: {
        title: "Colt Express",
        description: `
            <p>Ce projet est une version numérique simplifiée du jeu Colt Express, développé en Python avec Tkinter et Pygame pour l'interface graphique et les sons. Il permet aux joueurs d'incarner des bandits dans un train en mouvement, où ils doivent récupérer un maximum de butins tout en évitant le Marshall.</p>
        `,
        images: [
            "/Site-Perso/assets/Colt.jpeg",
            "/Site-Perso/assets/Colt2.jpg",
        ],
        technologies: ["Python", "Pygame", "Tkinter"],

        links: [
            { text: "Code source", url: "https://github.com/Douniahlt/ColtExpress" },
        ]
}
}

// Fonction pour ouvrir la modal de projet
function openProjectModal(projectId) {
    const projectData = projectsData[projectId];
    if (!projectData) return;
    
    // Remplir la modal avec les données du projet
    document.getElementById('modal-title').textContent = projectData.title;
    document.getElementById('modal-description').innerHTML = projectData.description;
    
    // Remplir la galerie d'images
    const galleryEl = document.getElementById('modal-gallery');
    galleryEl.innerHTML = '';
    projectData.images.forEach(image => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'project-image';
        imgContainer.innerHTML = `<img src="${image}" alt="${projectData.title}">`;
        galleryEl.appendChild(imgContainer);
    });
    
    // Remplir les technologies
    const techEl = document.getElementById('modal-tech');
    techEl.innerHTML = '';
    projectData.technologies.forEach(tech => {
        const techTag = document.createElement('div');
        techTag.className = 'project-tech';
        techTag.textContent = tech;
        techEl.appendChild(techTag);
    });
    
    // Remplir les liens
    const linksEl = document.getElementById('modal-links');
    linksEl.innerHTML = '';
    projectData.links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.className = 'project-link';
        linkEl.href = link.url;
        linkEl.textContent = link.text;
        linkEl.target = '_blank';
        linksEl.appendChild(linkEl);
    });
    
    // Afficher la modal
    document.getElementById('project-modal').classList.add('active');
}

// Fonction pour fermer la modal de projet
function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
}


// Animation principale
function animate() {
    requestAnimationFrame(animate);
    
    // Animation d'idle légère
    if (!isAnimating) {
        paperGroup.position.y = Math.sin(Date.now() * 0.001) * 0.05;
    }
    
    // Rendu de la scène
    renderer.render(scene, camera);
}
