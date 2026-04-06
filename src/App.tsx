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
}

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_STORAGE_KEY = 'ticketmaster_token'

function App() {
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [registerName, setRegisterName] = useState('')
  const [userDisplayName, setUserDisplayName] = useState('')
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

  async function loadBookings() {
    if (!token) return
    setLoadingBookings(true)
    try {
      const response = await fetch(`${apiBase}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const data = (await response.json()) as { items: Booking[] }
      setBookings(data.items)
    } finally {
      setLoadingBookings(false)
    }
  }

  const searchQueryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('term', search.trim())
    if (locationFilter.trim()) params.set('location', locationFilter.trim())
    if (typeFilter.trim()) params.set('type', typeFilter.trim())
    if (dateFilter.trim()) params.set('date', dateFilter.trim())
    return params.toString()
  }, [search, locationFilter, typeFilter, dateFilter])

  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(true)
      setBookingMessage('')
      try {
        const qs = searchQueryString
        const response = await fetch(
          `${apiBase}/search${qs ? `?${qs}` : ''}`,
        )
        const data = (await response.json()) as { items: Event[] }
        setEvents(data.items)
      } catch {
        setBookingMessage('Falha ao carregar eventos do backend.')
      } finally {
        setLoadingEvents(false)
      }
    }

    void loadEvents()
  }, [apiBase, searchQueryString])

  useEffect(() => {
    if (token) {
      void loadBookings()
    } else {
      setBookings([])
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const data = (await response.json()) as { user: { name: string } }
        setUserDisplayName(data.user.name)
      } catch {
        /* ignore */
      }
    })()
  }, [token, apiBase])

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
      const response = await fetch(`${apiBase}/auth/login`, {
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
      setUserDisplayName(data.user.name)
      setAuthMessage(`Logado como ${data.user.email}`)
    } catch {
      setAuthMessage('Erro de conexao com backend.')
    }
  }

  function handleLogout() {
    setToken(null)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUserDisplayName('')
    setAuthMessage('Sessao encerrada.')
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')

    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: registerName.trim(),
        }),
      })

      if (!response.ok) {
        const err = (await response.json()) as { message?: string }
        setAuthMessage(err.message ?? 'Nao foi possivel cadastrar.')
        return
      }

      const data = (await response.json()) as LoginResponse
      setToken(data.token)
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      setUserDisplayName(data.user.name)
      setAuthMessage(`Conta criada. Bem-vindo, ${data.user.name}.`)
      setShowRegister(false)
    } catch {
      setAuthMessage('Erro de conexao com backend.')
    }
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
      const response = await fetch(`${apiBase}/bookings/reserve`, {
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
      const qs = searchQueryString
      const refreshed = await fetch(`${apiBase}/search${qs ? `?${qs}` : ''}`)
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
    try {
      const response = await fetch(`${apiBase}/bookings/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
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
            <h1>{showRegister ? 'Criar conta' : 'Entrar no sistema'}</h1>
            <p className="subtitle">
              Autentique para acessar a tela de eventos e reservas.
            </p>
          </header>
          {showRegister ? (
            <form className="auth-form" onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Nome"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
              />
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
              <small className="muted">Minimo 6 caracteres</small>
              <button type="submit" className="reserve">
                Cadastrar
              </button>
            </form>
          ) : (
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
          )}
          <p className="auth-toggle">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setShowRegister(!showRegister)
                setAuthMessage('')
              }}
            >
              {showRegister ? 'Ja tenho conta' : 'Criar conta'}
            </button>
          </p>
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
            Filtros por termo, local, tipo e data. A URL da API vem da variavel de ambiente
            VITE_API_URL.
          </p>
        </div>
        <div className="header-actions">
          {userDisplayName ? (
            <span className="user-pill">{userDisplayName}</span>
          ) : null}
          <button type="button" className="reserve logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {authMessage ? <small>{authMessage}</small> : null}

      <section className="search-panel filters-grid">
        <div className="filter-field">
          <label htmlFor="search-input">Termo</label>
          <input
            id="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Titulo ou genero, ex.: rock, jazz"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="location-input">Local</label>
          <input
            id="location-input"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            placeholder="Cidade ou venue, ex.: Sao Paulo"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="type-input">Genero</label>
          <input
            id="type-input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            placeholder="Ex.: Samba, Rock..."
          />
        </div>
        <div className="filter-field">
          <label htmlFor="date-input">Data do evento</label>
          <input
            id="date-input"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2 className="card-title-row">
            Eventos encontrados
            <span className="count-badge">{events.length}</span>
          </h2>
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
                Ingressos disponiveis: {selectedEvent.availableTickets}. A partir de{' '}
                R$ {selectedEvent.lowestPrice}
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
        <p className="muted section-hint">
          Pagamento aqui e so demonstracao; em producao usaria Stripe no navegador.
        </p>
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
                </small>
              </div>
              {b.status === 'reserved' ? (
                <div className="booking-actions">
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
