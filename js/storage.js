export function saveFavorite(movie) {
    const request = indexedDB.open("MovieDB", 1);

    request.onupgradeneeded = () => {
        request.result.createObjectStore("favorites", { keyPath: "imdbID" });
    };

    request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("favorites", "readwrite");
        tx.objectStore("favorites").put(movie);
    };
}
