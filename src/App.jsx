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
  }
}

function App() {
  const [weather, setWeather] = useState(null)
  const [locationInput, setLocationInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const requestController = useRef(null)

  const loadLocation = useCallback(async (query) => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    setIsLoading(true)
    setError('')

    try {
      const result = await fetchWeatherForLocation(query, controller.signal)
      setWeather(result)
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.')
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    requestController.current = controller

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

  return (
    <main className="app-shell">
      <div className="weather-app">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Breezy home">
            <span className="brand-mark" aria-hidden="true">✳</span>
            <span>Richa<span className="brand-period">.</span></span>
          </a>
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

        <section className="current-weather" aria-label="Current weather">
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
                <span>Updated just now</span>
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

            <section className="forecast-section" aria-label="Five day forecast">
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
      </div>
    </main>
  )
}

export default App
