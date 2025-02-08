const n = 60
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

function chart(id, domain, interpolation, tick) {
  var data = d3.range(n).map(random)

  var x = d3.scale.linear().domain(domain).range([0, width])
  var y = d3.scale.linear().domain([-1, 1]).range([height, 0])

  var line = d3.svg.line().interpolate(interpolation).x((d, i) => x(i)).y((d) => y(d))

  var svg = createSvg(id)

  svg.append('g').attr('class', 'y axis').call(d3.svg.axis().scale(y).ticks(5).orient('left'))

  var path = svg.append('g').attr('clip-path', 'url(#clip)').append('path').datum(data).attr('class', 'line').attr('d', line)

  tick(path, line, data, x)
}
