
const frameCount = 10000

const delay = 1000

const height = 300

const width = 1000

const margin = { top: 20, bottom: 20, left: 40, right: 20 }

const pDataSamplingRate = 4

const chartFrameLimit = 200

const now = Date.now()

const renderForwardBy = 4

const defaultYDomain = [0, 100]

const defaultXDomain = [now - delay * chartFrameLimit, now]

const x = d3
  .scaleTime()
  .domain(defaultXDomain)
  .range([margin.left, width - margin.right])

const y = d3
  .scaleLinear()
  .domain(defaultYDomain)
  .nice()
  .range([height - margin.bottom, margin.top])


  const keyframes = []
  for (let index = 0; index < frameCount; ++index) {
    keyframes.push({
      ts: now + index * delay,
      latency: Math.max(25, Math.min(d3.randomNormal(0.45, 0.13)() * 500, 500)),
    })
  }

  function xAxis(g, x) {
    g.attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        d3
          .axisTop(x)
          .tickSize(height - margin.top - margin.bottom)
          .ticks(width / 80),
      )
      .call((g) => g.selectAll('.tick line').attr('stroke-opacity', 0.3).attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain').attr('opacity', 1))
      .call((g) => g.selectAll('.tick text').attr('y', 12))
  }

  function yAxis(g, y) {
    g.attr('text-anchor', 'end')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisRight(y).tickSize(width - margin.left - margin.right))
      .call((g) => g.selectAll('.tick line').attr('stroke-opacity', 0.3).attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain').attr('opacity', 0))
      .call((g) => g.selectAll('.tick text').attr('x', -4))
  }

  function getPData(rawData, p, samplingRate) {
    return tailessChunk(rawData, samplingRate).map((d) => ({
      ts: d[Math.floor(d.length / 2)].ts,
      latency: d3.quantile(d, p, (d) => d.latency),
    }))
  }

  const p90keyframes = getPData(keyframes, 0.9, pDataSamplingRate)
  const p50keyframes = getPData(keyframes, 0.5, pDataSamplingRate)

  function getDataSlice(frame) {
    let forwardBy = frame > frameCount ? 0 : renderForwardBy
    if (frame < chartFrameLimit) {
      return keyframes.slice(0, frame + forwardBy)
    }
    return keyframes.slice(frame - chartFrameLimit, frame + forwardBy)
  }

  function getPDataSlice(frame, pType) {
    let syncedFrame = frame / pDataSamplingRate
    let source = pType === 'p50' ? p50keyframes : p90keyframes
    if (syncedFrame < chartFrameLimit) {
      return source.slice(0, syncedFrame + renderForwardBy)
    }
    return source.slice(syncedFrame - chartFrameLimit, syncedFrame + renderForwardBy)
  }

  function tailessChunk(array, chunkSize) {
    // chunks an array into equally chunkSized subarrays
    // but discard the tail that doesn't have enough items left to make chunkSized subarray.
    let arr = []
    let temp = []
    let chunkcount = 0

    for (let i = 0; i < array.length; i++) {
      temp.push(array[i])
      if (chunkcount < chunkSize - 1) {
        chunkcount++
      } else {
        chunkcount = 0
        arr.push(temp)
        temp = []
      }
    }
    return arr
  }

  const bisectTs = d3.bisector((d) => d.ts).left

  function bisect(data, ts) {
    const i = bisectTs(data, ts, 1)
    const a = data[i - 1],
      b = data[i]
    return ts - a.ts > b.ts - ts ? b : a
  }

  function genLine(xScale) {
    return d3
      .line()
      .curve(d3.curveCardinal.tension(0.85))
      .x((d) => xScale(d.ts))
      .y((d) => y(d.latency))
  }

  class Tooltip {
    constructor(parent) {
      this.g = parent.append('g').attr('pointer-events', 'none').attr('display', 'none').attr('font-size', '10').attr('font-family', 'sans-serif').attr('text-anchor', 'middle')

      this.g
        .append('rect')
        .attr('width', 1)
        .attr('height', height - margin.top)
        .attr('fill', '#12355B')

      let textBox = this.g.append('g').attr('transform', `translate(0, ${margin.top})`)
      textBox.append('rect').attr('x', -29).attr('width', 58).attr('height', 15).attr('rx', 3).attr('ry', 3).attr('fill', '#16213E')
      textBox.append('text').attr('id', 'latency').attr('fill', 'white').attr('y', 12)
      this.g.append('circle').attr('id', 'tooltip-cir').attr('r', 6).attr('fill', '#16213E')
    }

    show(d, scaleX) {
      this.g.node().removeAttribute('display')
      this.g.attr('transform', `translate(${scaleX(d.ts)}, 0)`)
      this.g.select('circle').attr('transform', `translate(0, ${y(d.latency)})`)
      this.g.select('#latency').text(`${d.latency.toFixed(2)} ms`)
    }

    hide() {
      this.g.attr('display', 'none')
    }
  }

  function chart() {
    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height])

    let gx = svg.append('g').call(xAxis, x)
    let gy = svg.append('g').call(yAxis, y)

    let pathG = svg.append('g').attr('clip-path', 'url(#clip)')
    let transformG = pathG.append('g')

    const tooltip = new Tooltip(transformG)

    let p50G = transformG.append('g').attr('fill', '#0F3460')
    let p90G = transformG.append('g').attr('fill', '#E94560')
    let rawDataG = transformG.append('g').attr('fill', '#16213E')
    let tooltipG = transformG
      .append('g')
      .attr('pointer-events', 'all')
      .attr('fill', 'none')
      .on('mouseleave', () => tooltip.hide())

    let clipping = svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('transform', `translate(${margin.left}, 0)`)
      .attr('width', width - margin.right - margin.left)
      .attr('height', height)

    let path = rawDataG.append('g').append('path').attr('opacity', 0.5).attr('fill', 'none').attr('stroke', '#16213E').attr('class', 'line').attr('stroke-width', '1')
    let path50 = p50G.append('path').attr('fill', 'none').attr('stroke', '#0F3460').attr('class', 'line').attr('stroke-width', 1.5)
    let path90 = p90G.append('path').attr('fill', 'none').attr('stroke', '#E94560').attr('class', 'line').attr('stroke-width', 2)

    const zoom = d3
      .zoom()
      .scaleExtent([1, 10])
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      .translateExtent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])

    svg.call(zoom).transition().duration(750).call(zoom.scaleTo, 4, [0, 0])

    let offsetX = 0
    let zoomTransform = null

    return Object.assign(svg.node(), {
      update(frame) {
        const newdata = getDataSlice(frame)
        const p50Data = getPDataSlice(frame, 'p50')
        const p90Data = getPDataSlice(frame, 'p90')
        const t = svg.transition().duration(delay).ease(d3.easeLinear)

        let xDomainShift = frame * delay // calculate how many pixels the distance of frame-dragging every update.
        let newDomainX = defaultXDomain.map((a) => a + xDomainShift)
        let horizScale = x.domain(newDomainX)

        if (zoomTransform) {
          horizScale = zoomTransform.rescaleX(horizScale)
          newDomainX = horizScale.domain()
        }
        let xRangeShift = horizScale(newDomainX[1]) - horizScale(newDomainX[1] - delay)
        let line = genLine(horizScale)

        // redraw domain
        gx.transition(t).call(xAxis, horizScale)
        gy.transition(t).call(yAxis, y.domain([0, d3.max(newdata, (d) => d.latency) + 100]).nice())

        // drag the frame to the left continuously to emulate continous line
        transformG.interrupt().attr('transform', null).transition(t).attr('transform', `translate(-${xRangeShift}, 0)`)

        // update path
        rawDataG.select('path').datum(newdata).attr('d', line)
        p50G.select('path').datum(p50Data).attr('d', line)
        p90G.select('path').datum(p90Data).attr('d', line)

        // update circles
        rawDataG
          .selectAll('circle')
          .data(newdata)
          .join(
            (enter) => enter.append('circle'),
            (update) => update,
            (exit) => exit.remove(),
          )
          .attr('r', 1.5)
          .attr('cx', (d) => horizScale(d.ts))
          .attr('cy', (d) => y(d.latency))

        p50G
          .selectAll('circle')
          .data(p50Data)
          .join(
            (enter) => enter.append('circle'),
            (update) => update,
            (exit) => exit.remove(),
          )
          .attr('r', 3)
          .attr('cx', (d) => horizScale(d.ts))
          .attr('cy', (d) => y(d.latency))

        p90G
          .selectAll('circle')
          .data(p90Data)
          .join(
            (enter) => enter.append('circle'),
            (update) => update,
            (exit) => exit.remove(),
          )
          .attr('r', 3)
          .attr('cx', (d) => horizScale(d.ts))
          .attr('cy', (d) => y(d.latency))

        // update tooltip with latest data point
        let tooltipCb = (mouseAt) => tooltip.show(bisect(newdata, horizScale.invert(mouseAt)), horizScale, t)

        svg.on('mousemove', (event) => {
          tooltipCb(event.offsetX)
          offsetX = event.offsetX
        })
        tooltipCb(offsetX)

        // update zoom
        function zoomed(event) {
          const xz = event.transform.rescaleX(x)
          zoomTransform = event.transform

          line = genLine(xz)
          transformG.selectAll('circle:not(#tooltip-cir)').attr('cx', (d) => xz(d.ts))
          transformG.selectAll('path').attr('d', line)
          gx.call(xAxis, xz)
        }

        zoom.on('zoom', zoomed)
      },
    })
  }