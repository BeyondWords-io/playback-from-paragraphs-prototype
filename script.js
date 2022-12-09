const settingsFunctions = {};
const timeUpdateFunctions = {};

const main = async () => {
  const data = await fetch("data.json").then(r => r.json());
  const checkboxes = document.querySelectorAll("#prototype-settings > input[type='checkbox']")

  checkboxes.forEach(c => c.checked && applySetting(c, data));
  checkboxes.forEach(c => c.onchange = () => applySetting(c, data));

  const audioPlayer = document.getElementById("audio-player");
  audioPlayer.ontimeupdate = () => applyTimeUpdate(audioPlayer, data);
  audioPlayer.onplay = () => {
    setupVisualiser(audioPlayer, data);
    applySetting(document.getElementById("WaveformVisualiser"), data)
  };

  document.getElementById("show-logo").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("show-text").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("number-of-bars").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("max-bar-height").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("relative-gap-width").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("max-frequency").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("time-smoothing").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("bar-color-1").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("bar-color-2").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);
  document.getElementById("bar-opacity").oninput = () => applySetting(document.getElementById("WaveformVisualiser"), data);

  const container = document.getElementById("audio-player-container");
  container.style.height = `${audioPlayer.getBoundingClientRect().height}px`;

  addEventListener("scroll", fixAudioPlayerToBottom);
  fixAudioPlayerToBottom();
};

const fixAudioPlayerToBottom = () => {
  const audioPlayer = document.getElementById("audio-player");
  const { y } = audioPlayer.getBoundingClientRect();

  const isMobile = window.innerWidth < 1000;
  const isVideo = document.getElementById("WaveformVisualiser").checked;

  let yLimit = isMobile ? 650 : 140;
  if (isVideo) { yLimit += 220; }

  if (window.scrollY < yLimit) {
    audioPlayer.parentNode.classList.remove('fix-to-bottom');
  } else {
    audioPlayer.parentNode.classList.add('fix-to-bottom');
  }
};

const setupVisualiser = (audioPlayer, data) => {
  const canvas = document.getElementById("visualiser");
  const canvasContext = canvas.getContext("2d");

  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") { return; }

  const source = audioContext.createMediaElementSource(audioPlayer);
  const analyser = audioContext.createAnalyser();

  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const frequencies = new Uint8Array(analyser.frequencyBinCount);

  data.visualiser = { canvas, canvasContext, analyser, frequencies };
};

const applySetting = (checkbox, data) => {
  if (checkbox.checked) {
    settingsFunctions[`enable${checkbox.id}`](data);
  } else {
    settingsFunctions[`disable${checkbox.id}`](data);
  }
};

const applyTimeUpdate = (audioPlayer, data) => {
  Object.values(timeUpdateFunctions).forEach(f => f(audioPlayer, data));
};

settingsFunctions.enableButtonsBetweenParagraphs = async (data) => {
  const audioPlayer = document.getElementById("audio-player");
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach((paragraph, i) => {
    if (i === 0) { return; }

    const marker = paragraph.dataset.beyondwordsMarker;
    const timestamp = data.timestamps[marker];

    const playButton = document.createElement("button");
    playButton.classList.add("button-between-paragraphs");
    paragraph.parentNode.insertBefore(playButton, paragraph);

    const minutes = String(Math.floor(timestamp / 60)).padStart(2, "0");
    const seconds = String(Math.floor(timestamp % 60)).padStart(2, "0");

    playButton.innerText = `${minutes}:${seconds}`;
    playButton.onclick = () => {
      audioPlayer.currentTime = timestamp;
      audioPlayer.play();
    }
  });
};

settingsFunctions.disableButtonsBetweenParagraphs = () => {
  const playButtons = document.querySelectorAll(".button-between-paragraphs");
  playButtons.forEach(b => b.remove());
};

const currentMarker = (audioPlayer, data) => {
  let marker;
  for (const [key, value] of Object.entries(data.timestamps)) {
    if (value < audioPlayer.currentTime + 0.5) {
      marker = key;
    }  else {
      break;
    }
  }

  return marker;
};

const currentVideoText = (audioPlayer, data) => {
  let text;
  for (const arr of data.videoText) {
    const [time, t] = arr;

    if (time < audioPlayer.currentTime + 0.5) {
      text = t;
    }  else {
      break;
    }
  }

  return text;
};

settingsFunctions.enableHighlightCurrentParagraph = (data) => {
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  timeUpdateFunctions.highlightParagraph = (audioPlayer) => {
    const current = currentMarker(audioPlayer, data);

    paragraphs.forEach(paragraph => {
      const marker = paragraph.getAttribute("data-beyondwords-marker");
      const child = paragraph.children[0];
      const hasMarker = child && child.classList.contains("beyondwords-current");

      if (marker === current && !hasMarker) {
        const markElement = document.createElement("mark");
        markElement.classList.add("beyondwords-current");
        moveChildren(paragraph, markElement);
        paragraph.append(markElement);
      } else if (marker !== current && hasMarker) {
        moveChildren(child, paragraph);
        child.remove();
      }
    });
  }

  const audioPlayer = document.getElementById("audio-player");
  timeUpdateFunctions.highlightParagraph(audioPlayer);
};

settingsFunctions.disableHighlightCurrentParagraph = () => {
  delete timeUpdateFunctions.highlightParagraph;

  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    const child = paragraph.children[0];
    const hasMarker = child && child.classList.contains("beyondwords-current");

    if (hasMarker) {
      moveChildren(child, paragraph);
      child.remove();
    }
  });
};

const moveChildren = (fromNode, toNode) => {
  while (fromNode.childNodes.length) {
    toNode.appendChild(fromNode.firstChild);
  }
};

settingsFunctions.enableHighlightHoveredParagraph = () => {
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    const child = paragraph.children[0];
    const hasOtherMarker = child && child.classList.contains("beyondwords-current");
    const parentNode = hasOtherMarker ? child : paragraph;

    const markElement = document.createElement("mark");
    markElement.classList.add("hover-marker");
    moveChildren(parentNode, markElement);
    parentNode.append(markElement);
  });
};

settingsFunctions.disableHighlightHoveredParagraph = () => {
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    const markers = document.querySelectorAll(".hover-marker");
    markers.forEach(marker => {
      moveChildren(marker, marker.parentNode);
      marker.remove();
    });
  });
};

settingsFunctions.enableLeftButtonWhenHovering = (data) => {
  const audioPlayer = document.getElementById("audio-player");
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(hoveredParagraph => {
    hoveredParagraph.onmouseover = () => {
      const current = currentMarker(audioPlayer, data);

      paragraphs.forEach(paragraph => {
        const hasButton = paragraph.querySelector('.button-left-of-paragraph');

        if (paragraph === hoveredParagraph && !hasButton) {
          const playButton = document.createElement("button");
          const marker = paragraph.getAttribute("data-beyondwords-marker");

          const { height } = paragraph.getBoundingClientRect();
          const marginTop = height / 2 - 16;
          playButton.style.marginTop = `${marginTop}px`;

          playButton.classList.add("button-left-of-paragraph");
          if (marker === current && !audioPlayer.paused) {
            playButton.classList.add("pause");
          }
          paragraph.append(playButton);

          const timestamp = data.timestamps[marker];

          playButton.onclick = (event) => {
            const current = currentMarker(audioPlayer, data);

            if (marker !== current) {
              audioPlayer.currentTime = timestamp;
            }

            if (playButton.classList.contains("pause")) {
              audioPlayer.pause();
            } else {
              audioPlayer.play();
            }

            event.stopPropagation();
          }
        } else if (paragraph !== hoveredParagraph && hasButton) {
          paragraph.querySelector('.button-left-of-paragraph').remove();
        }
      });
    };
  });

  timeUpdateFunctions.leftButton = () => {
    const current = currentMarker(audioPlayer, data);

    paragraphs.forEach(paragraph => {
      const playButton = paragraph.querySelector('.button-left-of-paragraph');
      if (!playButton) { return; }

      const marker = paragraph.dataset.beyondwordsMarker;
      if (marker === current && !audioPlayer.paused) {
        playButton.classList.add("pause");
      } else {
        playButton.classList.remove("pause");
      }
    });
  };
};

settingsFunctions.disableLeftButtonWhenHovering = () => {
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    paragraph.onmouseover = () => {};

    const playButton = paragraph.querySelector('.button-left-of-paragraph');

    if (playButton) {
      playButton.remove();
    }
  });

  delete timeUpdateFunctions.leftButton;
};

settingsFunctions.enableClickParagraphText = (data) => {
  const audioPlayer = document.getElementById("audio-player");
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    paragraph.onclick = () => {
      const marker = paragraph.dataset.beyondwordsMarker;
      const timestamp = data.timestamps[marker];
      const current = currentMarker(audioPlayer, data);

      if (marker === current && audioPlayer.paused) {
        audioPlayer.play()
      } else if (marker === current && !audioPlayer.paused) {
        audioPlayer.pause()
      } else {
        audioPlayer.currentTime = timestamp;
        audioPlayer.play()
      }
    };

    paragraph.classList.add("click-to-play");
  });
};

settingsFunctions.disableClickParagraphText = () => {
  const paragraphs = document.querySelectorAll("[data-beyondwords-marker]");

  paragraphs.forEach(paragraph => {
    paragraph.onclick = () => {};
    paragraph.classList.remove("click-to-play");
  });
};

settingsFunctions.enableWaveformVisualiser = (data) => {
  document.getElementById("WaveformVideo").checked = false;
  settingsFunctions.disableWaveformVideo(data);

  document.getElementById("waveform-settings").style.display = "block";
  document.getElementById("visualiser-container").style.display = "block";

  const audioPlayer = document.getElementById("audio-player");
  const visualiserLogo = document.getElementById("visualiser-logo");
  const visualiserText = document.getElementById("visualiser-text");
  const showLogo = document.getElementById("show-logo");
  const showText = document.getElementById("show-text");

  timeUpdateFunctions.visualisationText = (audioPlayer, data) => {
    if (showLogo.checked) {
      visualiserLogo.style.display = "block";
    } else {
      visualiserLogo.style.display = "none";
    }

    if (showText.checked) {
      visualiserText.innerText = currentVideoText(audioPlayer, data);
    } else {
      visualiserText.innerText = "";
    }
  };

  timeUpdateFunctions.visualisationText(audioPlayer, data);

  const visualiser = data.visualiser;
  if (!visualiser) { return; }

  const { canvas, canvasContext: context, analyser, frequencies } = visualiser;

  canvas.style.display = "block";

  const maxBarHeightV = document.getElementById("max-bar-height").value;
  const maxBarHeight = Math.max(0, Math.min(1, parseFloat(maxBarHeightV) || 0.25));

  const gradient = context.createLinearGradient(0, canvas.height, 0, canvas.height - canvas.height * maxBarHeight);
  gradient.addColorStop(0, document.getElementById("bar-color-1").value);
  gradient.addColorStop(1, document.getElementById("bar-color-2").value);
  context.fillStyle = gradient;

  context.globalAlpha = parseFloat(document.getElementById("bar-opacity").value) || 0.6;

  const timeSmoothingV = document.getElementById("time-smoothing").value;
  const timeSmoothing = Math.max(0, Math.min(1, parseFloat(timeSmoothingV) || 0.9));
  analyser.smoothingTimeConstant = timeSmoothing;

  const maxFrequencyV = document.getElementById("max-frequency").value;
  const maxFrequency = Math.max(0, Math.min(20, parseFloat(maxFrequencyV) || 8));
  const maxIndex = Math.round(frequencies.length * (maxFrequency / 20));

  const numberOfBarsV = document.getElementById("number-of-bars").value;
  const numberOfBars = Math.max(1, Math.min(500, parseInt(numberOfBarsV) || 70));

  const numberOfGaps = numberOfBars - 1;

  const relativeGapWidthV = document.getElementById("relative-gap-width").value;
  const relativeGapWidth = Math.max(0, Math.min(100, parseFloat(relativeGapWidthV) || 0.3));

  const barsAndGapsWidth = numberOfBars + numberOfGaps * relativeGapWidth;

  const widthScale = canvas.width / barsAndGapsWidth;
  const indexScale = maxIndex / numberOfBars;

  const barWidth = widthScale;
  const gapWidth = widthScale * relativeGapWidth;

  const render = () => {
    if (canvas.style.display === "none") { return; }

    analyser.getByteFrequencyData(frequencies);
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let bar = 0; bar < numberOfBars; bar += 1) {
      const indexFrom = Math.round(bar * indexScale);
      const indexTo = Math.round(indexFrom + indexScale);

      let sum = 0;
      for (let i = indexFrom; i < indexTo; i += 1) { sum += frequencies[i]; }
      const frequency = sum / indexScale;

      const barHeight = frequency / 255 * canvas.height * maxBarHeight;
      const barLeft = bar * (barWidth + gapWidth);

      context.fillRect(barLeft, canvas.height - barHeight, barWidth, barHeight);
    }

    requestAnimationFrame(render);
  };


  render();
};

settingsFunctions.disableWaveformVisualiser = ({ visualiser }) => {
  document.getElementById("waveform-settings").style.display = "none";
  document.getElementById("visualiser-container").style.display = "none";

  if (visualiser) {
    visualiser.canvas.style.display = "none";
  }

  delete timeUpdateFunctions.visualisationText;
};

settingsFunctions.enableWaveformVideo = (data) => {
  document.getElementById("WaveformVisualiser").checked = false;
  settingsFunctions.disableWaveformVisualiser(data);

  document.getElementById("video-player-container").style.display = "block";
  document.getElementById("audio-player-container").style.display = "none";

  const videoPlayer = document.getElementById("video-player");
  const audioPlayer = document.getElementById("audio-player");

  videoPlayer.currentTime = audioPlayer.currentTime;

  if (audioPlayer.paused) {
    videoPlayer.pause();
  } else {
    videoPlayer.play();
  }

  audioPlayer.pause();
};

settingsFunctions.disableWaveformVideo = (data) => {
  if (document.getElementById("video-player-container").style.display === "none") { return; }

  document.getElementById("video-player-container").style.display = "none";
  document.getElementById("audio-player-container").style.display = "block";

  const videoPlayer = document.getElementById("video-player");
  const audioPlayer = document.getElementById("audio-player");

  audioPlayer.currentTime = videoPlayer.currentTime;

  if (videoPlayer.paused) {
    audioPlayer.pause();
  } else {
    audioPlayer.play();
  }

  videoPlayer.pause();
};

main();
