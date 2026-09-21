export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) => {
      if (typeof currentValue === "bigint") {
        return currentValue.toString();
      }

      return currentValue;
    }),
  ) as T;
}