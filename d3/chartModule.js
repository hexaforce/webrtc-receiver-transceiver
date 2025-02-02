function Scrubber(values, {
    format = (value) => value,
    initial = 0,
    direction = 1,
    delay = null,
    autoplay = true,
    loop = true,
    loopDelay = null,
    alternate = false
  } = {}) {
    values = Array.from(values);
    
    const form = document.createElement('form');
    form.style.cssText = "font: 12px sans-serif; display: flex; height: 33px; align-items: center;";
    
    const button = document.createElement('button');
    button.textContent = "Play";
    button.style.marginRight = "0.4em";
    button.style.width = "5em";
    form.appendChild(button);
    
    const label = document.createElement('label');
    label.style.display = "flex";
    label.style.alignItems = "center";
    
    const input = document.createElement('input');
    input.type = "range";
    input.min = 0;
    input.max = values.length - 1;
    input.value = initial;
    input.step = 1;
    input.style.width = "180px";
    
    const output = document.createElement('output');
    output.style.marginLeft = "0.4em";
    
    label.appendChild(input);
    label.appendChild(output);
    form.appendChild(label);
    
    let frame = null;
    let timer = null;
    let interval = null;
    
    function start() {
      button.textContent = "Pause";
      if (delay === null) frame = requestAnimationFrame(tick);
      else interval = setInterval(tick, delay);
    }
    
    function stop() {
      button.textContent = "Play";
      if (frame !== null) cancelAnimationFrame(frame), frame = null;
      if (timer !== null) clearTimeout(timer), timer = null;
      if (interval !== null) clearInterval(interval), interval = null;
    }
    
    function running() {
      return frame !== null || timer !== null || interval !== null;
    }
    
    function tick() {
      if (input.valueAsNumber === (direction > 0 ? values.length - 1 : 0)) {
        if (!loop) return stop();
        if (alternate) direction = -direction;
        if (loopDelay !== null) {
          stop();
          timer = setTimeout(() => { step(); start(); }, loopDelay);
          return;
        }
      }
      if (delay === null) frame = requestAnimationFrame(tick);
      step();
    }
    
    function step() {
      input.valueAsNumber = (input.valueAsNumber + direction + values.length) % values.length;
      input.dispatchEvent(new Event('input'));
    }
    
    input.oninput = () => {
      if (running()) stop();
      form.value = values[input.valueAsNumber];
      output.textContent = format(form.value, input.valueAsNumber, values);
    };
    
    button.onclick = () => {
      if (running()) return stop();
      direction = alternate && input.valueAsNumber === values.length - 1 ? -1 : 1;
      step();
      start();
    };
    
    input.oninput();
    if (autoplay) start();
    else stop();
    
    return form;
  }
  
function frame(Scrubber, d3, frameCount, delay) {
  return Scrubber(d3.range(1, frameCount, 1), {
    loop: false,
    autoplay: false,
    delay,
  });
}

function chart(d3, width, height, xAxis, x, yAxis, y, Tooltip, margin, getDataSlice, getPDataSlice, delay, defaultXDomain, genLine, bisect) {
  const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  let gx = svg.append('g').call(xAxis, x);
  let gy = svg.append('g').call(yAxis, y);

  let pathG = svg.append('g').attr('clip-path', 'url(#clip)');
  let transformG = pathG.append('g');

  const tooltip = new Tooltip(transformG);
  let p50G = transformG.append('g').attr('fill', '#0F3460');
  let p90G = transformG.append('g').attr('fill', '#E94560');
  let rawDataG = transformG.append('g').attr('fill', '#16213E');
  
  let clipping = svg.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('transform', `translate(${margin.left}, 0)`)
    .attr('width', width - margin.right - margin.left)
    .attr('height', height);

  let zoom = d3.zoom()
    .scaleExtent([1, 10])
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .translateExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  svg.call(zoom).transition().duration(750).call(zoom.scaleTo, 4, [0, 0]);
  let offsetX = 0;
  let zoomTransform = null;

  return Object.assign(svg.node(), {
    update(frame) {
      const newdata = getDataSlice(frame);
      const p50Data = getPDataSlice(frame, 'p50');
      const p90Data = getPDataSlice(frame, 'p90');
      const t = svg.transition().duration(delay).ease(d3.easeLinear);
      
      let xDomainShift = frame * delay;
      let newDomainX = defaultXDomain.map(a => a + xDomainShift);
      let horizScale = x.domain(newDomainX);

      if (zoomTransform) {
        horizScale = zoomTransform.rescaleX(horizScale);
        newDomainX = horizScale.domain();
      }
      let xRangeShift = horizScale(newDomainX[1]) - horizScale(newDomainX[1] - delay);
      let line = genLine(horizScale);

      gx.transition(t).call(xAxis, horizScale);
      gy.transition(t).call(yAxis, y.domain([0, d3.max(newdata, d => d.latency) + 100]).nice());
      transformG.interrupt().attr('transform', null).transition(t).attr('transform', `translate(-${xRangeShift}, 0)`);

      rawDataG.select('path').datum(newdata).attr('d', line);
      p50G.select('path').datum(p50Data).attr('d', line);
      p90G.select('path').datum(p90Data).attr('d', line);
    },
  });
}

function delay() {
  return 1000;
}

function frameCount() {
  return 10000;
}

function d3(require) {
  return require('d3@v6');
}
