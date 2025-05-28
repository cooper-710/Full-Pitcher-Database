import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js';

let scene, camera, renderer, pitchData = {}, balls = [];
let activeTypes = new Set(), playing = true;
const clock = new THREE.Clock();

async function loadPitchData() {
  const res = await fetch('./pitch_data.json');
  return await res.json();
}

function createHalfColorMaterial(pitchType) {
  const colorMap = {
    FF: '#FF0000', SL: '#0000FF', CH: '#00FF00', KC: '#4B0082',
    SI: '#8B4513', CU: '#8A2BE2', FC: '#FF8C00', ST: '#800000',
    FS: '#008B8B', EP: '#FFD700', KN: '#AAAAAA', SC: '#E9967A',
    SV: '#F08080', CS: '#A52A2A', FO: '#DAA520'
  };
  const hex = colorMap[pitchType] || '#888888';

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');

  // Top half — pitch color
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 2, 1);

  // Bottom half — white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 1, 2, 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.4,
    metalness: 0.1
  });
}

function setupScene() {
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2.5, -65);
  camera.lookAt(0, 2.5, 0);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(-10, 15, -25);
  scene.add(dirLight);
  const plateLight = new THREE.PointLight(0xffffff, 0.6, 100);
  plateLight.position.set(0, 3, -60.5);
  scene.add(plateLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1e472d, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const zone = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.42, 2.0)),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  zone.position.set(0, 2.5, -60.5);
  scene.add(zone);

  const shape = new THREE.Shape();
  shape.moveTo(-0.85, 0);
  shape.lineTo(0.85, 0);
  shape.lineTo(0.85, 0.5);
  shape.lineTo(0, 1.0);
  shape.lineTo(-0.85, 0.5);
  shape.lineTo(-0.85, 0);
  const plate = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(0, 0.011, -60.5);
  scene.add(plate);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function clearBalls() {
  for (let ball of balls) scene.remove(ball);
  balls = [];
  activeTypes.clear();
  document.getElementById('pitchCheckboxes').innerHTML = '';
}

function addCheckboxes(pitcherData, pitcher) {
  const container = document.getElementById('pitchCheckboxes');
  for (let type in pitcherData[pitcher]) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = type;
    checkbox.checked = false;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeTypes.add(type);
        addBall(pitcherData[pitcher][type], type);
      } else {
        activeTypes.delete(type);
        removeBall(type);
      }
    });

    const label = document.createElement('label');
    label.htmlFor = type;
    label.textContent = type;

    container.appendChild(checkbox);
    container.appendChild(label);
  }
}

function populateDropdowns(data) {
  const teamSelect = document.getElementById('teamSelect');
  const pitcherSelect = document.getElementById('pitcherSelect');

  for (let team in data) {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    teamSelect.appendChild(option);
  }

  teamSelect.addEventListener('change', () => {
    pitcherSelect.innerHTML = '';
    const team = teamSelect.value;
    for (let pitcher in data[team]) {
      const opt = document.createElement('option');
      opt.value = pitcher;
      opt.textContent = pitcher;
      pitcherSelect.appendChild(opt);
    }
    pitcherSelect.dispatchEvent(new Event('change'));
  });

  pitcherSelect.addEventListener('change', () => {
    clearBalls();
    const team = teamSelect.value;
    const pitcher = pitcherSelect.value;
    addCheckboxes(data[team], pitcher);
  });

  teamSelect.selectedIndex = 0;
  teamSelect.dispatchEvent(new Event('change'));
}

function addBall(pitch, pitchType) {
  const ballGeo = new THREE.SphereGeometry(0.145, 32, 32);
  const mat = createHalfColorMaterial(pitchType);
  const ball = new THREE.Mesh(ballGeo, mat);
  ball.castShadow = true;

  const t0 = clock.getElapsedTime();

  ball.userData = {
    type: pitchType,
    t0: t0,
    release: {
      x: -pitch.release_pos_x,
      y: pitch.release_pos_z + 0.65,
      z: -2.03
    },
    velocity: {
      x: -pitch.vx0,
      y: pitch.vz0,
      z: pitch.vy0
    },
    accel: {
      x: -pitch.ax,
      y: pitch.az,
      z: pitch.ay
    }
  };

  ball.position.set(
    ball.userData.release.x,
    ball.userData.release.y,
    ball.userData.release.z
  );

  balls.push(ball);
  scene.add(ball);
}

function removeBall(pitchType) {
  balls = balls.filter(ball => {
    if (ball.userData.type === pitchType) {
      scene.remove(ball);
      return false;
    }
    return true;
  });
}

function animate() {
  const now = clock.getElapsedTime();
  for (let ball of balls) {
    const { t0, release, velocity, accel } = ball.userData;
    const t = now - t0;
    const z = release.z + velocity.z * t + 0.5 * accel.z * t * t;
    if (z <= -60.5) continue;

    ball.position.x = release.x + velocity.x * t + 0.5 * accel.x * t * t;
    ball.position.y = release.y + velocity.y * t + 0.5 * accel.y * t * t;
    ball.position.z = z;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

document.getElementById('toggleBtn').addEventListener('click', () => {
  playing = !playing;
  document.getElementById('toggleBtn').textContent = playing ? 'Pause' : 'Play';
  playing ? clock.start() : clock.stop();
});

(async () => {
  setupScene();
  pitchData = await loadPitchData();
  populateDropdowns(pitchData);
  animate();
})();
