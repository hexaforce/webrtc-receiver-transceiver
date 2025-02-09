import 'https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js'
import 'https://cdn.jsdelivr.net/npm/threebox-plugin@2.2.7/dist/threebox.min.js'
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js'
import { GUI } from 'https://threejs.org/examples/jsm/libs/lil-gui.module.min.js'
import { onload, getPosition, keys, glb, layerId, createBuildingLayer } from './20-game2.js'

onload()

const position = await getPosition()

mapboxgl.accessToken = 'pk.eyJ1IjoicmVsaWNzOSIsImEiOiJjbHMzNHlwbDIwNDczMmtvM2xhNWR0ZzVtIn0.whCzeh6XW7ju4Ja6DR0imw'

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/relics9/cm6ppb5z7000501ra6nwl5wl2',
  zoom: 18,
  center: position,
  pitch: 60,
  bearing: 38,
  antialias: true, // create the gl context with MSAA antialiasing, so custom layers are antialiased
})

window.tb = new Threebox(map, map.getCanvas().getContext('webgl'), {
  // realSunlight: true,
  // enableSelectingObjects: true,
  // enableDraggingObjects: true,
  enableRotatingObjects: true,
  // enableTooltips: true,
})

// tb.setSunlight(new Date(2020, 6, 19, 23), map.getCenter())

let api = {
  buildings: true,
  acceleration: 2,
  inertia: 3,
}

// parameters to ensure the model is georeferenced correctly on the map
let drone
const onChanged = (e) => {
  if (api.buildings) {
    let point = map.project(e.detail.object.coordinates) //here's the object already modified
    let features = map.queryRenderedFeatures(point, { layers: [layerId] })
    if (features.length > 0) {
      const { source, sourceLayer, id } = features[0]
      map.setFeatureState({ source, sourceLayer, id }, { select: true })
    }
  }
}

let stats

const cb = (model) => {
  drone = model.setCoords([position[0], position[1], 10])
  drone.setRotation({ x: 0, y: 0, z: -38 }) //turn it to the initial street way
  // drone.addTooltip('Drive with WASD keys', true, drone.anchor, true, 2)
  drone.castShadow = true
  drone.selected = true
  drone.addEventListener('ObjectChanged', onChanged, false)
  tb.add(drone)
  // stats
  stats = new Stats()
  map.getContainer().appendChild(stats.dom)
  stats.dom.style.left = 'auto'
  stats.dom.style.right = '400px'

  animate()

  const gui = new GUI({ container: document.getElementById('gui'), width: '100%' })
  const onChangedGUI = () => {
    if (api.buildings) {
      if (!map.getLayer(layerId)) {
        map.addLayer(createBuildingLayer())
      }
    } else {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
    }
    tb.map.repaint = true
  }
  // this will define if there's a fixed zoom level for the model
  gui.add(api, 'buildings').name('buildings').onChange(onChangedGUI)
  gui.add(api, 'acceleration', 1, 10).step(0.5)
  gui.add(api, 'inertia', 1, 5).step(0.5)
  gui.close()
}

map.on('style.load', () => {
  //create the layer
  map.addLayer({
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: (map, gl) => tb.loadObj(glb, cb),
    render: (gl, matrix) => tb.update(),
  })

  if (api.buildings) {
    if (!map.getLayer(layerId)) {
      map.addLayer(createBuildingLayer())
    }
  }

  map.getCanvas().focus()
})

map.once('load', () => {
  map.setPadding({ top: 100 })
})

let velocity = 0.0
let speed = 0.0
let ds = 0.01
function toDeg(rad) {
  return (rad / Math.PI) * 180
}
function toRad(deg) {
  return (deg * Math.PI) / 180
}
function animate() {
  requestAnimationFrame(animate)
  stats.update()
  speed = 0.0
  if (!(keys.w || keys.s)) {
    if (velocity > 0) {
      speed = -api.inertia * ds
    } else if (velocity < 0) {
      speed = api.inertia * ds
    }
    if (velocity > -0.0008 && velocity < 0.0008) {
      speed = velocity = 0.0
      return
    }
  }
  if (keys.w) {
    speed = api.acceleration * ds
  } else if (keys.s) {
    speed = -api.acceleration * ds
  }
  velocity += (speed - velocity) * api.acceleration * ds
  if (speed == 0.0) {
    velocity = 0
    return
  }
  drone.set({ worldTranslate: new THREE.Vector3(0, -velocity, 0) })
  let options = {
    center: drone.coordinates,
    bearing: map.getBearing(),
    easing: (t) => {
      return t * (2 - t)
    },
  }
  let deg = 1
  let rad = toRad(deg)
  let zAxis = new THREE.Vector3(0, 0, 1)
  if (keys.a || keys.d) {
    rad *= keys.d ? -1 : 1
    drone.set({ quaternion: [zAxis, drone.rotation.z + rad] })
    options.bearing = -toDeg(drone.rotation.z)
  }
  map.jumpTo(options)
  tb.map.update = true
}
