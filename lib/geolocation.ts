type PositionGetter = Pick<Geolocation, 'getCurrentPosition'>;

/** Requests a quick, network-friendly fix and retries once after a timeout. */
export function getPositionWithTimeoutRetry(
  geolocation: PositionGetter,
  onRetry: () => void = () => {},
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, error => {
      if (error.code !== error.TIMEOUT) {
        reject(error);
        return;
      }

      onRetry();
      geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 15_000,
        maximumAge: 10 * 60 * 1000,
      });
    }, {
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}
