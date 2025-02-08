function createSvg(id, margin, width, height) {
  return (
    d3
      .select(id)
      .append('p')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      /* .style('margin-left', -margin.left + 'px') */
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  )
}

function chart(id, domain, interpolation, tick) {
  var data = d3.range(n).map(random)

  var margin = { top: 6, right: 10, bottom: 6, left: 25 }
  var width = 720 - margin.right
  var height = 120 - margin.top - margin.bottom

  var x = d3.scale.linear().domain(domain).range([0, width])
  var y = d3.scale.linear().domain([-1, 1]).range([height, 0])
  var line = d3.svg
    .line()
    .interpolate(interpolation)
    .x((d, i) => x(i))
    .y((d) => y(d))

  var svg = createSvg(id, margin, width, height)

  svg.append('defs').append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height)

  svg.append('g').attr('class', 'y axis').call(d3.svg.axis().scale(y).ticks(5).orient('left'))

  var path = svg.append('g').attr('clip-path', 'url(#clip)').append('path').datum(data).attr('class', 'line').attr('d', line)

  tick(path, line, data, x)
}
