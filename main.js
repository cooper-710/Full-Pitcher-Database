
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js';
import { loadPitchData } from './data.js';

let scene, camera, renderer, pitchData = {}, balls = [];
let activeTypes = new Set();
let playing = true;

const clock = new THREE.Clock();

const pitchColors = {
  FF: '#FF0000',
  SI: '#FFFF00',
  SL: '#0000FF',
  CH: '#00FF00',
  CU: '#800080',
  KC: '#4B0082',
  FC: '#FFA500',
  ST: '#00CED1',
  CS: '#A52A2A',
  EP: '#808000'
};

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, -65);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(0, 5, -5);
  scene.add(light);

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.01, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  plate.position.set(0, 0, -60.5);
  scene.add(plate);

  animate();
}

function addBall(pitchType, points) {
  const ballColor = new THREE.Color(pitchColors[pitchType] || '#FFFFFF');
  const ballGeo = new THREE.SphereGeometry(0.145, 32, 32);
  const ball = new THREE.Mesh(
    ballGeo,
    new THREE.MeshStandardMaterial({ color: ballColor })
  );

  let i = 0;
  function move() {
    if (!playing) return;
    if (i >= points.length) return;

    ball.position.set(points[i].x, points[i].y, points[i].z);
    i++;
    requestAnimationFrame(move);
  }

  scene.add(ball);
  move();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function createDropdown() {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.background = '#fff';
  container.style.padding = '10px';
  container.style.borderRadius = '5px';
  container.style.zIndex = '1';

  const title = document.createElement('div');
  title.innerText = 'Select Pitch Type:';
  container.appendChild(title);

  Object.keys(pitchColors).forEach(type => {
    const label = document.createElement('label');
    label.style.display = 'block';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    activeTypes.add(type);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeTypes.add(type);
      } else {
        activeTypes.delete(type);
      }
      reloadScene();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + type));
    container.appendChild(label);
  });

  const playPauseBtn = document.createElement('button');
  playPauseBtn.innerText = 'Pause';
  playPauseBtn.style.marginTop = '10px';
  playPauseBtn.onclick = () => {
    playing = !playing;
    playPauseBtn.innerText = playing ? 'Pause' : 'Play';
    if (playing) reloadScene();
  };
  container.appendChild(playPauseBtn);

  document.body.appendChild(container);
}

function reloadScene() {
  balls.forEach(ball => scene.remove(ball));
  balls = [];

  Object.entries(pitchData).forEach(([pitchType, pitches]) => {
    if (!activeTypes.has(pitchType)) return;
    pitches.forEach(points => {
      addBall(pitchType, points);
    });
  });
}

loadPitchData().then(data => {
  pitchData = data;
  init();
  createDropdown();
  reloadScene();
});
