import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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

type LoginResponse = {
  token: string
  user: {
    email: string
    name: string
  }
}

type Booking = {
  id: string
  eventId: string
  quantity: number
  userEmail: string
  totalPrice: number
  status: 'reserved' | 'confirmed'
  createdAt: string
  confirmedAt?: string
  paymentLast4?: string
}

const API_BASE_URL = 'http://localhost:3000'
const TOKEN_STORAGE_KEY = 'ticketmaster_token'

function App() {
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(2)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [email, setEmail] = useState('admin@ticketmaster.dev')
  const [password, setPassword] = useState('123456')
  const [authMessage, setAuthMessage] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [cardLast4ByBooking, setCardLast4ByBooking] = useState<
    Record<string, string>
  >({})

  async function loadBookings() {
    if (!token) return
    setLoadingBookings(true)
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const data = (await response.json()) as { items: Booking[] }
      setBookings(data.items)
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true)
      setBookingMessage('')
      try {
        const query = search.trim()
        const params = query ? `?q=${encodeURIComponent(query)}` : ''
        const response = await fetch(`${API_BASE_URL}/events${params}`)
        const data = (await response.json()) as { items: Event[] }
        setEvents(data.items)
      } catch {
        setBookingMessage('Falha ao carregar eventos do backend.')
      } finally {
        setLoadingEvents(false)
      }
    }

    void loadEvents()
  }, [search])

  useEffect(() => {
    if (token) {
      void loadBookings()
    } else {
      setBookings([])
    }
  }, [token])

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId(null)
      return
    }

    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId],
  )

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        setAuthMessage('Credenciais invalidas.')
        return
      }

      const data = (await response.json()) as LoginResponse
      setToken(data.token)
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      setAuthMessage(`Logado como ${data.user.email}`)
    } catch {
      setAuthMessage('Erro de conexao com backend.')
    }
  }

  function handleLogout() {
    setToken(null)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setAuthMessage('Sessao encerrada.')
  }

  async function handleReserve() {
    if (!selectedEvent) {
      return
    }

    setBookingMessage('')
    if (!token) {
      setBookingMessage('Faca login para reservar ingressos.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          quantity,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string }
        setBookingMessage(errorData.message ?? 'Falha ao reservar.')
        return
      }

      setBookingMessage('Reserva criada com sucesso. Confirme o pagamento abaixo.')
      const refreshed = await fetch(`${API_BASE_URL}/events`)
      const refreshedData = (await refreshed.json()) as { items: Event[] }
      setEvents(refreshedData.items)
      await loadBookings()
    } catch {
      setBookingMessage('Erro de conexao ao reservar.')
    }
  }

  async function handleConfirmPayment(bookingId: string) {
    if (!token) return
    setBookingMessage('')
    const cardLast4 = cardLast4ByBooking[bookingId]?.replace(/\D/g, '').slice(-4)
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          paymentDetails: cardLast4 ? { cardLast4 } : undefined,
        }),
      })
      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string }
        setBookingMessage(errorData.message ?? 'Falha ao confirmar pagamento.')
        return
      }
      setBookingMessage('Pagamento confirmado.')
      await loadBookings()
    } catch {
      setBookingMessage('Erro de conexao ao confirmar.')
    }
  }

  function eventTitleFor(eventId: string) {
    return events.find((e) => e.id === eventId)?.title ?? eventId
  }

  if (!token) {
    return (
      <main className="app auth-screen">
        <section className="card auth-card">
          <header className="header">
            <p className="eyebrow">Ticketmaster</p>
            <h1>Entrar no sistema</h1>
            <p className="subtitle">
              Autentique para acessar a tela de eventos e reservas.
            </p>
          </header>
          <form className="auth-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="submit" className="reserve">
              Entrar
            </button>
          </form>
          {authMessage ? <small>{authMessage}</small> : null}
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="header system-header">
        <div>
          <p className="eyebrow">Ticketmaster - Sistema</p>
          <h1>Eventos e reservas</h1>
          <p className="subtitle">
            Frontend integrado ao backend real com autenticacao via token.
          </p>
        </div>
        <button type="button" className="reserve logout-button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      {authMessage ? <small>{authMessage}</small> : null}

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
          <h2>Eventos encontrados ({events.length})</h2>
          {loadingEvents ? <p>Carregando eventos...</p> : null}
          <ul className="event-list">
            {events.map((event) => (
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

              <button type="button" className="reserve" onClick={handleReserve}>
                Reservar {quantity} ingresso(s)
              </button>
              {bookingMessage ? <small>{bookingMessage}</small> : null}
            </div>
          ) : (
            <p>Nenhum evento selecionado.</p>
          )}
        </article>
      </section>

      <section className="card bookings-section">
        <h2>Minhas reservas</h2>
        {loadingBookings ? <p>Carregando...</p> : null}
        {!loadingBookings && bookings.length === 0 ? (
          <p className="muted">Nenhuma reserva ainda. Reserve ingressos acima.</p>
        ) : null}
        <ul className="bookings-list">
          {bookings.map((b) => (
            <li key={b.id} className="booking-row">
              <div className="booking-info">
                <strong>{eventTitleFor(b.eventId)}</strong>
                <span>
                  {b.quantity} ingresso(s) — R$ {b.totalPrice} —{' '}
                  <span
                    className={
                      b.status === 'confirmed' ? 'status-confirmed' : 'status-pending'
                    }
                  >
                    {b.status === 'confirmed' ? 'Pago' : 'Aguardando pagamento'}
                  </span>
                </span>
                <small>
                  {new Date(b.createdAt).toLocaleString('pt-BR')}
                  {b.confirmedAt
                    ? ` · Confirmado ${new Date(b.confirmedAt).toLocaleString('pt-BR')}`
                    : null}
                  {b.paymentLast4 ? ` · Cartao ****${b.paymentLast4}` : null}
                </small>
              </div>
              {b.status === 'reserved' ? (
                <div className="booking-actions">
                  <input
                    className="card-last4"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Ultimos 4 digitos"
                    value={cardLast4ByBooking[b.id] ?? ''}
                    onChange={(e) =>
                      setCardLast4ByBooking((prev) => ({
                        ...prev,
                        [b.id]: e.target.value.replace(/\D/g, '').slice(0, 4),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleConfirmPayment(b.id)}
                  >
                    Confirmar pagamento
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
