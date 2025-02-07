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

export { onload, getPosition, keys }
