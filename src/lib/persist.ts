export function requestPersistentStorage(): void {
  if (navigator.storage?.persist) {
    void navigator.storage.persist()
  }
}
