import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const weatherDescriptions = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'],
  48: ['Depositing rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'],
  57: ['Heavy freezing drizzle', '🌧️'],
  61: ['Light rain', '🌦️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'],
  67: ['Heavy freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Heavy rain showers', '🌧️'],
  85: ['Snow showers', '🌨️'],
  86: ['Heavy snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm with hail', '⛈️'],
  99: ['Thunderstorm with hail', '⛈️'],
}

const refreshInterval = 15 * 60 * 1000

function getCondition(code) {
  return weatherDescriptions[code] ?? ['Mixed conditions', '🌤️']
}

async function fetchWeatherForLocation(query, signal) {
  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
  geocodingUrl.search = new URLSearchParams({
    name: query,
    count: '1',
    language: 'en',
    format: 'json',
  })

  const locationResponse = await fetch(geocodingUrl, { signal })
  if (!locationResponse.ok) {
    throw new Error('Could not search for that location. Please try again.')
  }
  const locationData = await locationResponse.json()
  const place = locationData.results?.[0]
  if (!place) {
    throw new Error('We couldn’t find that place. Check the spelling and try again.')
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
  forecastUrl.search = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '5',
    timezone: 'auto',
  })

  const forecastResponse = await fetch(forecastUrl, { signal })
  if (!forecastResponse.ok) {
    throw new Error('Could not load the forecast. Please try again.')
  }
  const forecast = await forecastResponse.json()

  return {
    place,
    current: forecast.current,
    daily: forecast.daily,
    timezoneAbbreviation: forecast.timezone_abbreviation,
  }
}

function App() {
  const [weather, setWeather] = useState(null)
  const [locationInput, setLocationInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState(() => (
    window.location.hash === '#help' ? 'help' : 'overview'
  ))
  const requestController = useRef(null)
  const selectedLocation = useRef('London')

  const loadLocation = useCallback(async (query, { showLoading = true } = {}) => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    selectedLocation.current = query
    if (showLoading) setIsLoading(true)
    setError('')

    try {
      const result = await fetchWeatherForLocation(query, controller.signal)
      setWeather(result)
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.')
      }
    } finally {
      if (!controller.signal.aborted && showLoading) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    requestController.current = controller
    selectedLocation.current = 'London'

    fetchWeatherForLocation('London', controller.signal)
      .then(setWeather)
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadLocation(selectedLocation.current, { showLoading: false })
    }, refreshInterval)

    return () => window.clearInterval(intervalId)
  }, [loadLocation])

  useEffect(() => {
    function updateActivePage() {
      setActivePage(window.location.hash === '#help' ? 'help' : 'overview')
    }

    window.addEventListener('hashchange', updateActivePage)
    return () => window.removeEventListener('hashchange', updateActivePage)
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const query = locationInput.trim()
    if (query) loadLocation(query)
  }

  const currentCondition = weather ? getCondition(weather.current.weather_code) : null
  const currentDate = weather?.daily.time[0]
    ? new Date(`${weather.daily.time[0]}T12:00:00`).toLocaleDateString('en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    : ''
  const currentDataTime = weather?.current.time
    ? `${weather.current.time.slice(11, 16)}${weather.timezoneAbbreviation ? ` ${weather.timezoneAbbreviation}` : ''}`
    : ''

  return (
    <main className="app-shell">
      <div className="weather-app">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Breezy home">
            <span className="brand-mark" aria-hidden="true">✳</span>
            <span>Richa<span className="brand-period">.</span></span>
          </a>
          <nav className="top-nav" aria-label="Weather sections">
            <a
              className={`nav-link${activePage === 'overview' ? ' active' : ''}`}
              href="#today"
              aria-current={activePage === 'overview' ? 'page' : undefined}
            >
              Overview
            </a>
            <a className="nav-link" href="#forecast">Forecast</a>
            <a
              className={`nav-link${activePage === 'help' ? ' active' : ''}`}
              href="#help"
              aria-current={activePage === 'help' ? 'page' : undefined}
            >
              Help
            </a>
          </nav>
          <form className="search-form" onSubmit={handleSearch} role="search">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              aria-label="Search for a city"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="Search a city..."
            />
            <button type="submit" disabled={!locationInput.trim() || isLoading}>
              Search
            </button>
          </form>
        </header>

        {activePage === 'help' ? (
          <section className="help-page" aria-labelledby="help-title">
            <div className="help-intro">
              <p className="eyebrow">A QUICK GUIDE</p>
              <h1 id="help-title">Weather, without the guesswork.</h1>
              <p>
                Richa makes it easy to check what the weather is doing now
                and what to expect over the next few days.
              </p>
            </div>

            <div className="help-card-grid">
              <article className="help-card">
                <span className="help-card-number">01</span>
                <h2>Find a place</h2>
                <p>Use the search box in the top bar to look up a city. The dashboard updates with local conditions and the forecast for your selected location.</p>
              </article>
              <article className="help-card">
                <span className="help-card-number">02</span>
                <h2>Read today&apos;s weather</h2>
                <p>The overview shows the current temperature and what it feels like, along with humidity, wind speed, and current precipitation.</p>
              </article>
              <article className="help-card">
                <span className="help-card-number">03</span>
                <h2>Plan ahead</h2>
                <p>The five-day forecast includes each day&apos;s conditions, chance of precipitation, and expected high and low temperatures.</p>
              </article>
            </div>

            <aside className="help-data-card">
              <div className="help-data-icon" aria-hidden="true">✳</div>
              <div>
                <p className="eyebrow">ABOUT THE WEATHER DATA</p>
                <h2>Powered by Open-Meteo</h2>
                <p>
                  Weather and location information is provided by Open-Meteo.
                  The dashboard refreshes automatically every 15 minutes while
                  it is open. An internet connection is required, and no API
                  key or extra setup is needed. Current conditions are
                  model-based data and may not be a live weather-station reading.
                </p>
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Visit Open-Meteo <span aria-hidden="true">↗</span>
                </a>
              </div>
            </aside>
          </section>
        ) : (
          <>
        <section className="intro">
          <p className="eyebrow">YOUR PERSONAL WEATHER, AT A GLANCE</p>
          <h1>A little sunshine in your day.</h1>
          <p className="intro-copy">The forecast, made simple.</p>
        </section>

        {error && (
          <div className="error-message" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </div>
        )}

        <section className="current-weather" id="today" aria-label="Current weather">
          {isLoading && !weather ? (
            <div className="loading-state" role="status">Finding your forecast<span>...</span></div>
          ) : weather ? (
            <>
              <div className="current-main">
                <div className="location-details">
                  <p className="current-date">{currentDate}</p>
                  <h2>
                    {weather.place.name}
                    <span className="location-country">
                      {weather.place.admin1 ? `${weather.place.admin1}, ` : ''}{weather.place.country}
                    </span>
                  </h2>
                  <p className="condition-label">{currentCondition[0]}</p>
                </div>
                <div className="temperature-block">
                  <span className="current-icon" aria-hidden="true">{currentCondition[1]}</span>
                  <p className="temperature">
                    {Math.round(weather.current.temperature_2m)}
                    <span>°</span>
                  </p>
                </div>
              </div>
              <div className="current-footer">
                <span>Feels like <strong>{Math.round(weather.current.apparent_temperature)}°</strong></span>
                <span className="footer-divider" aria-hidden="true" />
                <span>Weather data time: <strong>{currentDataTime}</strong></span>
              </div>
            </>
          ) : (
            <div className="loading-state">Search for a city to see its weather.</div>
          )}
          <div className="sun-decoration" aria-hidden="true" />
        </section>

        {weather && (
          <>
            <section className="details-section" aria-label="Weather details">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THE DETAILS</p>
                  <h2>Today&apos;s highlights</h2>
                </div>
                <span className="local-time-label">LOCAL CONDITIONS</span>
              </div>
              <div className="highlights-grid">
                <article className="highlight-card">
                  <div className="highlight-top">
                    <span className="highlight-icon humidity-icon" aria-hidden="true">◉</span>
                    <span className="highlight-label">Humidity</span>
                  </div>
                  <p className="highlight-value">{weather.current.relative_humidity_2m}<span>%</span></p>
                  <p className="highlight-note">
                    {weather.current.relative_humidity_2m > 65 ? 'A little muggy' : 'Comfortable air'}
                  </p>
                  <div className="meter"><span style={{ width: `${weather.current.relative_humidity_2m}%` }} /></div>
                </article>
                <article className="highlight-card">
                  <div className="highlight-top">
                    <span className="highlight-icon wind-icon" aria-hidden="true">↗</span>
                    <span className="highlight-label">Wind</span>
                  </div>
                  <p className="highlight-value">{Math.round(weather.current.wind_speed_10m)}<span className="unit"> km/h</span></p>
                  <p className="highlight-note">A gentle breeze</p>
                  <div className="wind-indicator" aria-hidden="true"><span>→</span></div>
                </article>
                <article className="highlight-card">
                  <div className="highlight-top">
                    <span className="highlight-icon rain-icon" aria-hidden="true">⌁</span>
                    <span className="highlight-label">Precipitation</span>
                  </div>
                  <p className="highlight-value">{weather.current.precipitation}<span className="unit"> mm</span></p>
                  <p className="highlight-note">Currently falling</p>
                  <div className="precip-dots" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
                </article>
              </div>
            </section>

            <section className="forecast-section" id="forecast" aria-label="Five day forecast">
              <div className="section-heading forecast-heading">
                <div>
                  <p className="eyebrow">COMING UP</p>
                  <h2>5-day forecast</h2>
                </div>
                <span className="temperature-key"><i /> High <i /> Low</span>
              </div>
              <div className="forecast-list">
                {weather.daily.time.map((day, index) => {
                  const [description, icon] = getCondition(weather.daily.weather_code[index])
                  const label = index === 0
                    ? 'Today'
                    : new Date(`${day}T12:00:00`).toLocaleDateString('en', { weekday: 'short' })
                  return (
                    <article className={`forecast-day${index === 0 ? ' forecast-today' : ''}`} key={day}>
                      <p className="forecast-date">{label}</p>
                      <span className="forecast-icon" aria-label={description}>{icon}</span>
                      <div className="forecast-condition">{description}</div>
                      <div className="forecast-precip" title="Chance of precipitation">
                        <span aria-hidden="true">⌁</span> {weather.daily.precipitation_probability_max[index] ?? 0}%
                      </div>
                      <p className="forecast-temperatures">
                        <strong>{Math.round(weather.daily.temperature_2m_max[index])}°</strong>
                        <span>{Math.round(weather.daily.temperature_2m_min[index])}°</span>
                      </p>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <footer className="page-footer">
          <span>Made for wherever the day takes you.</span>
          <span>Weather data by Open-Meteo</span>
        </footer>
          </>
        )}
      </div>
    </main>
  )
}

export default App
