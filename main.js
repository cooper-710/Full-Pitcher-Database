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

  for (const pitch of pitchData) {
    const colorHex = pitchColors[pitch.pitch_type] || '#FFFFFF';
    const color = new THREE.Color(colorHex);
    const geometry = new THREE.SphereGeometry(0.7, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color });

    const ball = new THREE.Mesh(geometry, material);
    ball.userData = {
      points: pitch.points,
      frame: 0,
      pitch_type: pitch.pitch_type
    };
    scene.add(ball);
    balls.push(ball);
  }
}
function buildUI() {
  const uiPanel = document.getElementById('ui-panel');
  const types = [...new Set(pitchData.map(p => p.pitch_type))];

  types.forEach(type => {
    activeTypes.add(type);

    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" data-pitch="${type}" checked> ${type}`;
    label.querySelector('input').addEventListener('change', e => {
      const val = e.target.dataset.pitch;
      if (e.target.checked) activeTypes.add(val);
      else activeTypes.delete(val);
    });

    uiPanel.appendChild(label);
    uiPanel.appendChild(document.createElement('br'));
  });

  document.getElementById('play-pause').addEventListener('click', () => {
    playing = !playing;
    document.getElementById('play-pause').textContent = playing ? 'Pause' : 'Play';
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (playing) {
    for (const ball of balls) {
      if (!activeTypes.has(ball.userData.pitch_type)) {
        ball.visible = false;
        continue;
      }

      ball.visible = true;
      const pts = ball.userData.points;
      if (ball.userData.frame < pts.length) {
        const pt = pts[ball.userData.frame];
        ball.position.set(pt.x, pt.y, pt.z);
        ball.userData.frame++;
      } else {
        ball.userData.frame = 0;
      }
    }
  }

  renderer.render(scene, camera);
}
