const startButton = document.getElementById("startButton");
const audioStatus = document.getElementById("audioStatus");
const instrumentSelect = document.getElementById("instrument");
const octaveSlider = document.getElementById("octave");
const octaveValue = document.getElementById("octaveValue");
const octavesCountSlider = document.getElementById("octavesCount");
const octavesCountValue = document.getElementById("octavesCountValue");
const volumeSlider = document.getElementById("volume");
const sustainToggle = document.getElementById("sustain");
const reverbToggle = document.getElementById("reverb");
const piano = document.getElementById("piano");
const keyboardContainer = document.getElementById("keyboard");

let synth = null;
let reverb = null;
let volume = null;
let synthType = "poly";
let sustainEnabled = true;
const sustainedNotes = new Set();
const sustainTimers = new Map();
const activeKeys = new Set();
const activeNotes = new Map();

const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_NOTES = ["C#", "D#", "F#", "G#", "A#"];
const BLACK_POSITIONS = [0, 1, 3, 4, 5];

const keyMap = {
    a: "C",
    s: "D",
    d: "E",
    f: "F",
    g: "G",
    h: "A",
    j: "B",
    w: "C#",
    e: "D#",
    t: "F#",
    y: "G#",
    u: "A#"
};

const instrumentOptions = {
    poly: () => new Tone.PolySynth(Tone.Synth, {
        volume: -8,
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.4, release: 0.6 }
    }),
    fm: () => new Tone.PolySynth(Tone.FMSynth, {
        volume: -10,
        harmonicity: 2,
        modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.35, release: 0.7 }
    }),
    mono: () => new Tone.MonoSynth({
        volume: -8,
        oscillator: { type: "sawtooth" },
        filter: { Q: 2, type: "lowpass", rolloff: -24 },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.4 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.4, baseFrequency: 220, octaves: 2.2 }
    }),
    am: () => new Tone.PolySynth(Tone.AMSynth, {
        volume: -9,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.6 }
    })
};

function buildKeyboard(octaves) {
    keyboardContainer.innerHTML = "";

    for (let octave = 1; octave <= octaves; octave += 1) {
        const octaveBlock = document.createElement("div");
        octaveBlock.className = "octave";

        const whiteKeysContainer = document.createElement("div");
        whiteKeysContainer.className = "white-keys";

        const blackKeysContainer = document.createElement("div");
        blackKeysContainer.className = "black-keys";

        WHITE_NOTES.forEach((noteName) => {
            const button = document.createElement("button");
            const fullNote = `${noteName}${octave}`;
            button.className = "key white";
            button.dataset.note = fullNote;
            button.setAttribute("aria-label", fullNote);
            button.textContent = noteName === "C" ? `C${octave}` : "";
            whiteKeysContainer.appendChild(button);
        });

        BLACK_NOTES.forEach((noteName, index) => {
            const button = document.createElement("button");
            const fullNote = `${noteName}${octave}`;
            button.className = "key black";
            button.dataset.note = fullNote;
            button.dataset.between = `${BLACK_POSITIONS[index]}`;
            button.setAttribute("aria-label", fullNote);
            button.textContent = noteName;
            blackKeysContainer.appendChild(button);
        });

        octaveBlock.appendChild(whiteKeysContainer);
        octaveBlock.appendChild(blackKeysContainer);
        keyboardContainer.appendChild(octaveBlock);
    }

    attachPointerHandlers();
    requestAnimationFrame(positionBlackKeys);
}
function positionBlackKeys() {
    const octaveBlocks = Array.from(keyboardContainer.querySelectorAll(".octave"));
    octaveBlocks.forEach((block) => {
        const whiteKeys = Array.from(block.querySelectorAll(".key.white"));
        const blackKeys = Array.from(block.querySelectorAll(".key.black"));
        if (whiteKeys.length === 0 || blackKeys.length === 0) {
            return;
        }
        const blackWidth = parseFloat(getComputedStyle(blackKeys[0]).width) || 30;
        const gapValue = getComputedStyle(block.querySelector(".white-keys")).columnGap;
        const gap = parseFloat(gapValue) || 4;
        blackKeys.forEach((key) => {
            const leftIndex = parseInt(key.dataset.between, 10);
            const leftKey = whiteKeys[leftIndex];
            if (!leftKey) {
                return;
            }
            const left = leftKey.offsetLeft + leftKey.offsetWidth - blackWidth / 2 + gap / 2;
            key.style.left = `${left}px`;
        });
    });
}

async function setupAudioChain() {
    if (synth) {
        synth.dispose();
    }

    if (!volume) {
        volume = new Tone.Volume(parseFloat(volumeSlider.value));
        volume.toDestination();
    }

    if (!reverb) {
        reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.02, wet: 0.35 });
        await reverb.generate();
    }

    synth = instrumentOptions[instrumentSelect.value]();
    synthType = instrumentSelect.value;

    if (reverbToggle.checked) {
        synth.connect(reverb);
        reverb.connect(volume);
    } else {
        synth.connect(volume);
    }
}

function updateSustain() {
    const releaseTime = sustainToggle.checked ? 0.9 : 0.25;
    sustainEnabled = sustainToggle.checked;
    if (synth && synth.set) {
        synth.set({ envelope: { release: releaseTime } });
    }

    if (!sustainEnabled) {
        sustainedNotes.forEach((note) => {
            if (synthType === "mono") {
                synth.triggerRelease();
            } else {
                synth.triggerRelease(note);
            }
        });
        sustainedNotes.clear();
        sustainTimers.forEach((timerId) => clearTimeout(timerId));
        sustainTimers.clear();
    }
}

function noteForKey(noteName) {
    const octave = parseInt(octaveSlider.value, 10);
    return `${noteName}${octave}`;
}

function playNote(noteName, sourceKey) {
    if (!synth) {
        return;
    }
    const note = noteForKey(noteName);
    if (activeNotes.has(sourceKey)) {
        return;
    }
    synth.triggerAttack(note);
    activeNotes.set(sourceKey, note);
}

function playNoteFull(note, sourceKey) {
    if (!synth) {
        return;
    }
    if (activeNotes.has(sourceKey)) {
        return;
    }
    synth.triggerAttack(note);
    activeNotes.set(sourceKey, note);
}

function releaseNote(sourceKey) {
    if (!synth) {
        return;
    }
    const note = activeNotes.get(sourceKey);
    if (!note) {
        return;
    }
    if (sustainEnabled) {
        sustainedNotes.add(note);
        const timerId = setTimeout(() => {
            if (sustainedNotes.has(note)) {
                if (synthType === "mono") {
                    synth.triggerRelease();
                } else {
                    synth.triggerRelease(note);
                }
                sustainedNotes.delete(note);
            }
            sustainTimers.delete(note);
        }, 2000);
        sustainTimers.set(note, timerId);
        activeNotes.delete(sourceKey);
        return;
    }
    if (synthType === "mono") {
        synth.triggerRelease();
    } else {
        synth.triggerRelease(note);
    }
    activeNotes.delete(sourceKey);
}

function setKeyActive(button, isActive) {
    if (isActive) {
        button.classList.add("is-active");
    } else {
        button.classList.remove("is-active");
    }
}

function handlePointerDown(event) {
    const button = event.currentTarget;
    const note = button.dataset.note;
    const keyId = `ptr-${note}`;
    button.setPointerCapture(event.pointerId);
    playNoteFull(note, keyId);
    setKeyActive(button, true);
}

function handlePointerUp(event) {
    const button = event.currentTarget;
    const note = button.dataset.note;
    const keyId = `ptr-${note}`;
    releaseNote(keyId);
    setKeyActive(button, false);
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (!keyMap[key] || activeKeys.has(key)) {
        return;
    }
    activeKeys.add(key);
    const noteName = keyMap[key];
    const button = Array.from(document.querySelectorAll(".key")).find((item) => {
        return item.dataset.note === `${noteName}${octaveSlider.value}`;
    });
    playNote(noteName, key);
    if (button) {
        setKeyActive(button, true);
    }
}

function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (!keyMap[key]) {
        return;
    }
    activeKeys.delete(key);
    const noteName = keyMap[key];
    const button = Array.from(document.querySelectorAll(".key")).find((item) => {
        return item.dataset.note === `${noteName}${octaveSlider.value}`;
    });
    releaseNote(key);
    if (button) {
        setKeyActive(button, false);
    }
}

async function startAudio() {
    await Tone.start();
    await setupAudioChain();
    updateSustain();
    startButton.textContent = "Audio ativo";
    startButton.disabled = true;
    startButton.classList.add("is-active");
    if (audioStatus) {
        audioStatus.textContent = "Audio liberado";
    }
}

startButton.addEventListener("click", startAudio);

instrumentSelect.addEventListener("change", () => {
    if (!Tone.context.state || Tone.context.state === "suspended") {
        return;
    }
    setupAudioChain();
    updateSustain();
});

octaveSlider.addEventListener("input", () => {
    octaveValue.textContent = octaveSlider.value;
});

octavesCountSlider.addEventListener("input", () => {
    const value = parseInt(octavesCountSlider.value, 10);
    octavesCountValue.textContent = value;
    buildKeyboard(value);
});

volumeSlider.addEventListener("input", () => {
    if (volume) {
        volume.volume.value = parseFloat(volumeSlider.value);
    }
});

sustainToggle.addEventListener("change", updateSustain);

reverbToggle.addEventListener("change", () => {
    if (!synth) {
        return;
    }
    setupAudioChain();
    updateSustain();
});

function attachPointerHandlers() {
    const keys = Array.from(document.querySelectorAll(".key"));
    keys.forEach((button) => {
        button.addEventListener("pointerdown", handlePointerDown);
        button.addEventListener("pointerup", handlePointerUp);
        button.addEventListener("pointerleave", handlePointerUp);
    });
}


window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

octaveValue.textContent = octaveSlider.value;
octavesCountValue.textContent = octavesCountSlider.value;
buildKeyboard(parseInt(octavesCountSlider.value, 10));
window.addEventListener("resize", positionBlackKeys);

function positionBlackKeys() {
    if (blackKeys.length === 0 || whiteKeys.length === 0) {
        return;
    }
    const whiteKey = whiteKeys[0];
    const whiteWidth = whiteKey.getBoundingClientRect().width;
    const gapValue = getComputedStyle(document.querySelector(".white-keys")).columnGap;
    const whiteGap = parseFloat(gapValue) || 0;
    const blackWidth = blackKeys[0].getBoundingClientRect().width || whiteWidth * 0.6;
    blackKeys.forEach((key) => {
        const position = parseFloat(key.dataset.position);
        const left = (whiteWidth + whiteGap) * position - blackWidth / 2 + whiteGap / 2;
        key.style.left = `${left}px`;
    });
}

window.addEventListener("resize", positionBlackKeys);
window.addEventListener("load", positionBlackKeys);