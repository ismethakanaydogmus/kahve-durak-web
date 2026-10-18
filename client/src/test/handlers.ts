import { http, HttpResponse } from 'msw'
import { homeFixture, menuFixture } from './fixtures'

export const api = (path: string) => `http://localhost:5080${path}`

export const handlers = [
  http.get(api('/api/home'), () => HttpResponse.json(homeFixture)),
  http.get(api('/api/menu'), () => HttpResponse.json(menuFixture)),
]
