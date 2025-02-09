const n = 60
const duration = 750
const random = d3.random.normal(0, 0.2)

const margin = { top: 6, right: 6, bottom: 20, left: 25 }
const width = 720 - margin.right
const height = 120 - margin.top - margin.bottom

function createSvg(data, id, xDomain) {
  var x = d3.scale.linear().domain(xDomain).range([0, width])
  var now = new Date(Date.now() - duration)
  var lastIndex = xDomain[1]

  var timeseries = d3.time
    .scale()
    .domain([now - lastIndex * duration, now - duration])
    .range([0, width])

  var y = d3.scale
    .linear()
    .domain([d3.min(data), d3.max(data)])
    .range([height, 0])

  var baseSvg = d3
    .select(id)
    .append('p')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  baseSvg.append('defs').append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height)

  var axisY = baseSvg
    .append('g')
    .attr('class', 'y axis')
    .call((y.axis = d3.svg.axis().scale(y).ticks(5).orient('left')))

  var axisX = baseSvg
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call((timeseries.axis = d3.svg.axis().scale(timeseries).orient('bottom')))

  return { lastIndex, x, timeseries, axisX, y, axisY, baseSvg }
}

function updateAxis(data, svg) {
  const { timeseries, lastIndex, axisX, y, axisY } = svg
  const now = new Date()
  timeseries.domain([now - lastIndex * duration, now - duration])
  axisX.call(timeseries.axis)
  y.domain([d3.min(data), d3.max(data)])
  axisY.call(y.axis)
}

function lineChart(id, xDomain, interpolation, tick) {
  var data = d3.range(n).map(() => 0)
  var svg = createSvg(data, id, xDomain)

  var line = d3.svg
    .line()
    .interpolate(interpolation)
    .x((d, i) => svg.x(i))
    .y((d) => svg.y(d))
  var path = svg.baseSvg.append('g').attr('clip-path', 'url(#clip)').append('path').datum(data).attr('class', 'line').attr('d', line)

  tick(path, line, data, svg)
}

function barChart(id, xDomain, tick) {
  var data = d3.range(n).map(() => 0)
  var svg = createSvg(data, id, xDomain)

  var bars = svg.baseSvg
    .append('g')
    .attr('class', 'bars')
    .attr('clip-path', 'url(#clip)')
    .selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d, i) => svg.x(i))
    .attr('y', (d) => svg.y(d))
    .attr('width', width / n - 1)
    .attr('height', (d) => height - svg.y(d))
    .attr('fill', 'steelblue')

  tick(bars, data, svg)
}
