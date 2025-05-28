import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js';

let scene, camera, renderer, clock;
let balls = [];
let pitchData = {};
let activeTypes = new Set();
let playing = true;

const pitchColors = {
  FF: '#FF0000', FT: '#8B0000', SI: '#FFA500', FC: '#808080',
  SL: '#0000FF', ST: '#008080', CU: '#800080', KC: '#4B0082',
  CH: '#008000', FS: '#00CED1', FO: '#B8860B', SC: '#D2691E',
  EP: '#FFD700', KN: '#7FFFD4', SV: '#4682B4', CS: '#CD5C5C'
};

init();

async function init() {
  pitchData = await loadPitchData();
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 65);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  addLighting();
  addStrikeZone();
  createBalls();
  buildUI();
  animate();
}

async function loadPitchData() {
  const res = await fetch('pitch_data.json');
  return await res.json();
}

function addLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(0, 50, 50);
  scene.add(ambient, dir);
}

function addStrikeZone() {
  const geometry = new THREE.BoxGeometry(17, 30, 0.2);
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
  line.position.set(0, 0, -60.5);
  scene.add(line);
}

function createBalls() {
  balls = [];
  for (const team in pitchData) {
    for (const pitcher in pitchData[team]) {
      const pitches = pitchData[team][pitcher];
      for (const pitchType in pitches) {
        const pitch = pitches[pitchType];
        const color = new THREE.Color(pitchColors[pitchType] || '#FFFFFF');
        const geometry = new THREE.SphereGeometry(0.7, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color });
        const ball = new THREE.Mesh(geometry, material);

        const spinRateRPS = (pitch.release_spin_rate || 0) / 60; // rev/s
        const spinAxisRad = (pitch.spin_axis || 0) * (Math.PI / 180);
        const axis = new THREE.Vector3(
          Math.cos(spinAxisRad), 0, Math.sin(spinAxisRad)
        ).normalize();

        ball.userData = {
          pitch_type: pitchType,
          vx0: pitch.vx0,
          vy0: pitch.vy0,
          vz0: pitch.vz0,
          ax: pitch.ax,
          ay: pitch.ay,
          az: pitch.az,
          t: 0,
          release_x: pitch.release_pos_x,
          release_y: -2.03,
          release_z: pitch.release_pos_z,
          spin_axis: axis,
          spin_rate: spinRateRPS * 2 * Math.PI // radians per second
        };

        ball.position.set(pitch.release_pos_x, pitch.release_pos_z, -2.03);
        scene.add(ball);
        balls.push(ball);
        activeTypes.add(pitchType);
      }
    }
  }
}

function buildUI() {
  const panel = document.getElementById('ui-panel');
  activeTypes.forEach(pitchType => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" data-pitch="${pitchType}" checked> ${pitchType}`;
    label.querySelector('input').addEventListener('change', e => {
      const val = e.target.dataset.pitch;
      if (e.target.checked) activeTypes.add(val);
      else activeTypes.delete(val);
    });
    panel.appendChild(label);
    panel.appendChild(document.createElement('br'));
  });

  document.getElementById('play-pause').addEventListener('click', () => {
    playing = !playing;
    document.getElementById('play-pause').textContent = playing ? 'Pause' : 'Play';
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (playing) {
    for (const ball of balls) {
      if (!activeTypes.has(ball.userData.pitch_type)) {
        ball.visible = false;
        continue;
      }
      ball.visible = true;

      ball.userData.t += dt;
      const t = ball.userData.t;

      const x = ball.userData.release_x + ball.userData.vx0 * t + 0.5 * ball.userData.ax * t * t;
      const y = ball.userData.release_y + ball.userData.vy0 * t + 0.5 * ball.userData.ay * t * t;
      const z = ball.userData.release_z + ball.userData.vz0 * t + 0.5 * ball.userData.az * t * t;

      ball.position.set(x, z, y);

      // Apply spin
      const angle = ball.userData.spin_rate * dt;
      ball.rotateOnAxis(ball.userData.spin_axis, angle);

      if (y < -60.5) ball.userData.t = 0;
    }
  }

  renderer.render(scene, camera);
}
