export function renderMovies(movies) {
    const container = document.getElementById("movieContainer");
    container.innerHTML = "";

    movies.forEach(m => {
        container.innerHTML += `
            <div class="movie-card">
                <img src="${m.Poster}" />
                <h4>${m.Title}</h4>
                <p>${m.Year}</p>
                <button data-id="${m.imdbID}" class="addFav">Add to Favorites</button>
            </div>
        `;
    });
}
