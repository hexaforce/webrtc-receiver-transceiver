var config = {
  accessToken:
    "pk.eyJ1IjoicmVsaWNzOSIsImEiOiJjbHMzNHlwbDIwNDczMmtvM2xhNWR0ZzVtIn0.whCzeh6XW7ju4Ja6DR0imw",
  subscriptionKey: "azure maps subscription key goes here",
  getPosition: async (timeout) => {
    if (!window.navigator || !window.navigator.geolocation)
      throw new Error("Geolocation is not supported by this browser.");
    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(
        ({ coords, timestamp }) => {
          const {
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            latitude,
            longitude,
            speed,
          } = coords;
          resolve({
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            latitude,
            longitude,
            speed,
            timestamp,
          });
        },
        (err) => reject(err),
        // { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 }
      );
    });
  },
};
