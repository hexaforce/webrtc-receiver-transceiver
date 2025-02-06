const getPosition = async (timeout) => {
  return new Promise((resolve, reject) => {
    window.navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve([coords.longitude, coords.latitude]),
      (err) => reject(err),
      timeout
        ? { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 }
        : null
    );
  });
};

export { getPosition }