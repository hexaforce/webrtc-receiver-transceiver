const n = 10
const duration = 750
const random = d3.random.normal(0, 0.2)

const margin = { top: 6, right: 6, bottom: 20, left: 25 }
const width = 720 - margin.right
const height = 120 - margin.top - margin.bottom

function createSvg(id) {
  var svg = d3
    .select(id)
    .append('p')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    /* .style('margin-left', -margin.left + 'px') */
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  svg.append('defs').append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height)
  return svg
}

function lineChart(id, xDomain, yDomain, interpolation, tick) {
  var data = d3.range(n).map(random)

  var x = d3.scale.linear().domain(xDomain).range([0, width])
  var y = d3.scale.linear().domain(yDomain).range([height, 0])

  var svg = createSvg(id)
  svg.append('g').attr('class', 'y axis').call(d3.svg.axis().scale(y).ticks(5).orient('left'))

  var line = d3.svg
    .line()
    .interpolate(interpolation)
    .x((d, i) => x(i))
    .y((d) => y(d))
  var path = svg.append('g').attr('clip-path', 'url(#clip)').append('path').datum(data).attr('class', 'line').attr('d', line)

  tick(path, line, data, x)
}

function barChart(id, xDomain, yDomain, tick) {
  var data = d3.range(n).map(random)

  var x = d3.scale.linear().domain(xDomain).range([0, width])
  var y = d3.scale.linear().domain(yDomain).range([height, 0])

  var svg = createSvg(id)
  svg.append('g').attr('class', 'y axis').call(d3.svg.axis().scale(y).ticks(5).orient('left'))

  var bars = svg
    .append('g')
    .attr('class', 'bars')
    .selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d, i) => x(i))
    .attr('y', (d) => y(d))
    .attr('width', width / n - 1)
    .attr('height', (d) => height - y(d))
    .attr('fill', 'steelblue')

  tick(bars, data, x, y)
}
