const API_KEY = "your_key_here";
const BASE_URL = "https://www.omdbapi.com";

export async function searchMovies(query) {
    const res = await fetch
    const data = await res.json();
    return data.Search || [];
}
