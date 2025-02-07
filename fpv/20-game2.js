const $ = (id) => document.getElementById(id)

const getPosition = async (timeout) => {
  return new Promise((resolve, reject) => {
    window.navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve([coords.longitude, coords.latitude]),
      (err) => reject(err),
      timeout ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 } : null,
    )
  })
}

let keys = {
  a: false,
  s: false,
  d: false,
  w: false,
}

const onload = () => {
  document.body.addEventListener('keydown', (e) => {
    const key = e.code.replace('Key', '').toLowerCase()
    if (keys[key] !== undefined) keys[key] = true
  })

  document.body.addEventListener('keyup', (e) => {
    const key = e.code.replace('Key', '').toLowerCase()
    if (keys[key] !== undefined) keys[key] = false
  })
}

const layerId = '3d-buildings'
const minZoom = 12

function createBuildingLayer() {
  return {
    id: layerId,
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: minZoom,
    paint: {
      'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'select'], false], 'red', ['boolean', ['feature-state', 'hover'], false], 'lightblue', '#aaa'],
      // use an 'interpolate' expression to add a smooth transition effect to the buildings as the user zooms in
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], minZoom, 0, minZoom + 0.05, ['get', 'height']],
      'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], minZoom, 0, minZoom + 0.05, ['get', 'min_height']],
      'fill-extrusion-opacity': 0.8,
    },
  }
}

const glb = {
  type: 'glb', //model type
  obj: './vehicles/car.glb',
  units: 'meters', // in meters
  scale: 5, //x3 times is real size for this model
  rotation: { x: 90, y: -90, z: 0 }, //default rotation
  anchor: 'top',
}

export { onload, getPosition, keys, glb, layerId, createBuildingLayer }
