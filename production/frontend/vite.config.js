import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The React app runs on http://localhost:5173 and talks to the Flask backend on port 5001
export default defineConfig({
  plugins: [react(), youtubeSearch()],
  server: { port: 5173 },
})

// A small helper in this dev server: /youtube-search?q=... searches YouTube and answers with the ids of the
// first videos. (A page in the browser may not read YouTube's pages itself, but the dev server can.)
// The app uses it to find a music video when Apple and Wikidata have none (see api.js).
function youtubeSearch() {
  return {
    name: 'youtube-search',
    configureServer(server) {
      server.middlewares.use('/youtube-search', async (request, response) => {
        const words = new URL(request.url, 'http://localhost').searchParams.get('q') || ''
        response.setHeader('Content-Type', 'application/json')
        try {
          const page = await (await fetch('https://www.youtube.com/results?' + new URLSearchParams({ search_query: words }), {
            headers: { cookie: 'SOCS=CAI', 'accept-language': 'en' },   // SOCS skips YouTube's cookie consent page
          })).text()
          // The results are data in the page: each video starts with "videoRenderer" and its id
          const ids = [...page.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})"/g)].map((found) => found[1])
          response.end(JSON.stringify({ ids: ids.slice(0, 5) }))
        } catch {
          response.statusCode = 502   // no internet, or YouTube didn't answer
          response.end(JSON.stringify({ ids: [] }))
        }
      })
    },
  }
}
