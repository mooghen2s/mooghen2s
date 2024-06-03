// Setup Cubism Model and Pixi live2d
const cubismModel = "test/hijiki.model3.json";
const live2d = PIXI.live2d;
var model_proxy;
var audio, audioContext, source, analyser, dataArray, bufferLength;

(async function main() {
  const app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    resizeTo: window,
    backgroundColor: 0x333333
  });

  const models = await Promise.all([live2d.Live2DModel.from(cubismModel)]);
  const model = models[0];
  model_proxy = model;
  app.stage.addChild(model);

  // Scale the model
  const scaleX = innerWidth * 0.6 / model.width;
  const scaleY = innerHeight * 0.9 / model.height;
  model.scale.set(Math.min(scaleX, scaleY));
  model.y = innerHeight * 0.1;

  draggable(model);
  addFrame(model);

  // handle tapping
  model.on("hit", hitAreas => {
    if (hitAreas.includes("Body")) {
      model.motion("tap");
    }
    if (hitAreas.includes("Head")) {
      model.expression();
    }
  });

  // Setup audio context for lip-sync
  setupAudioContext('audio/test.wav');
})();

function draggable(model) {
  model.buttonMode = true;
  model.on("pointerdown", e => {
    model.dragging = true;
    model._pointerX = e.data.global.x - model.x;
    model._pointerY = e.data.global.y - model.y;
  });
  model.on("pointermove", e => {
    if (model.dragging) {
      model.position.x = e.data.global.x - model._pointerX;
      model.position.y = e.data.global.y - model._pointerY;
    }
  });
  model.on("pointerupoutside", () => model.dragging = false);
  model.on("pointerup", () => model.dragging = false);
}

function addFrame(model) {
  const foreground = PIXI.Sprite.from(PIXI.Texture.WHITE);
  foreground.width = model.internalModel.width;
  foreground.height = model.internalModel.height;
  foreground.alpha = 0.2;
  model.addChild(foreground);
  checkbox("Model Frames", checked => foreground.visible = checked);
}

function checkbox(name, onChange) {
  const id = name.replace(/\W/g, "").toLowerCase();
  let checkbox = document.getElementById(id);
  if (!checkbox) {
    const p = document.createElement("p");
    p.innerHTML = `<input type="checkbox" id="${id}"> <label for="${id}">${name}</label>`;
    document.getElementById("control").appendChild(p);
    checkbox = p.firstChild;
  }
  checkbox.addEventListener("change", () => {
    onChange(checkbox.checked);
  });
  onChange(checkbox.checked);
}

async function setupAudioContext(audioUrl) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audio = new Audio(audioUrl);
  source = audioContext.createMediaElementSource(audio);
  analyser = audioContext.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  audio.play();

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  document.getElementById('play-button').addEventListener('click', () => {
    audio.play();
  });
  document.getElementById('pause-button').addEventListener('click', () => {
    audio.pause();
  });

  function animate() {
    analyser.getByteFrequencyData(dataArray);
    const avgFrequency = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

    // Map avgFrequency to mouth shape
    model_proxy.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", avgFrequency / 255);

    requestAnimationFrame(animate);
  }
  animate();
}
