import { useMemo, useState } from 'react'
import './App.css'

type Event = {
  id: string
  title: string
  venue: string
  city: string
  date: string
  genre: string
  lowestPrice: number
  availableTickets: number
}

const events: Event[] = [
  {
    id: 'evt-1',
    title: 'Rock in Rio Warmup',
    venue: 'Arena Sul',
    city: 'Sao Paulo',
    date: '2026-05-12',
    genre: 'Rock',
    lowestPrice: 120,
    availableTickets: 58,
  },
  {
    id: 'evt-2',
    title: 'Samba de Rua',
    venue: 'Praca Central',
    city: 'Rio de Janeiro',
    date: '2026-05-22',
    genre: 'Samba',
    lowestPrice: 80,
    availableTickets: 92,
  },
  {
    id: 'evt-3',
    title: 'Jazz Nights',
    venue: 'Teatro Aurora',
    city: 'Belo Horizonte',
    date: '2026-06-02',
    genre: 'Jazz',
    lowestPrice: 95,
    availableTickets: 44,
  },
  {
    id: 'evt-4',
    title: 'Eletronica na Praia',
    venue: 'Beach Stage',
    city: 'Florianopolis',
    date: '2026-06-11',
    genre: 'Eletronica',
    lowestPrice: 140,
    availableTickets: 29,
  },
]

function App() {
  const [search, setSearch] = useState('')
  const [selectedEventId, setSelectedEventId] = useState(events[0].id)
  const [quantity, setQuantity] = useState(2)

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return events

    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.genre.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query),
    )
  }, [search])

  const selectedEvent = events.find((event) => event.id === selectedEventId)

  return (
    <main className="app">
      <header className="header">
        <p className="eyebrow">Ticketmaster - Frontend MVP</p>
        <h1>Encontre eventos e reserve ingressos</h1>
        <p className="subtitle">
          Primeira entrega do frontend separado do backend. Esta versao usa
          dados mockados para permitir evolucao rapida da interface.
        </p>
      </header>

      <section className="search-panel">
        <label htmlFor="search-input">Buscar por evento, cidade ou genero</label>
        <input
          id="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex.: rock, sao paulo, jazz..."
        />
      </section>

      <section className="grid">
        <article className="card">
          <h2>Eventos encontrados ({filteredEvents.length})</h2>
          <ul className="event-list">
            {filteredEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className={
                    event.id === selectedEventId
                      ? 'event-button selected'
                      : 'event-button'
                  }
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <strong>{event.title}</strong>
                  <span>
                    {event.city} - {event.venue}
                  </span>
                  <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Reserva rapida</h2>
          {selectedEvent ? (
            <div className="booking-panel">
              <p className="event-title">{selectedEvent.title}</p>
              <p>
                {selectedEvent.city} - {selectedEvent.venue}
              </p>
              <p>Genero: {selectedEvent.genre}</p>
              <p>
                Ingressos disponiveis: {selectedEvent.availableTickets} | A
                partir de R$ {selectedEvent.lowestPrice}
              </p>

              <label htmlFor="quantity">Quantidade</label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Number.parseInt(event.target.value || '1', 10))
                }
              />

              <button type="button" className="reserve">
                Reservar {quantity} ingresso(s)
              </button>
              <small>
                Acao demonstrativa. Integracao real com backend sera o proximo
                passo.
              </small>
            </div>
          ) : (
            <p>Nenhum evento selecionado.</p>
          )}
        </article>
      </section>
    </main>
  )
}

export default App
