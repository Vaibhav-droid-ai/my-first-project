(function () {
    var config = window.WEATHER_APP_CONFIG || {};
    var API_KEY = config.weatherApiKey || "";
    var STORAGE_KEY = "weather-app-recent-searches";
    var DEFAULT_CITY = "Delhi";

    var searchForm = document.getElementById("search-form");
    var cityInput = document.getElementById("city-input");
    var statusEl = document.getElementById("status");
    var updatedAtEl = document.getElementById("updated-at");
    var locationNameEl = document.getElementById("location-name");
    var temperatureEl = document.getElementById("temperature");
    var conditionEl = document.getElementById("condition");
    var localTimeEl = document.getElementById("local-time");
    var feelsLikeEl = document.getElementById("feels-like");
    var rainChanceEl = document.getElementById("rain-chance");
    var windEl = document.getElementById("wind");
    var humidityEl = document.getElementById("humidity");
    var uvIndexEl = document.getElementById("uv-index");
    var visibilityEl = document.getElementById("visibility");
    var coordinatesEl = document.getElementById("coordinates");
    var weatherIconEl = document.getElementById("weather-icon");
    var visualCaptionEl = document.getElementById("visual-caption");
    var currentTempDetailEl = document.getElementById("current-temp-detail");
    var feelsLikeDetailEl = document.getElementById("feels-like-detail");
    var conditionDetailEl = document.getElementById("condition-detail");
    var pressureEl = document.getElementById("pressure");
    var sunriseEl = document.getElementById("sunrise");
    var sunsetEl = document.getElementById("sunset");
    var moonPhaseEl = document.getElementById("moon-phase");
    var forecastGridEl = document.getElementById("forecast-grid");
    var hourlyStripEl = document.getElementById("hourly-strip");
    var recentSearchesEl = document.getElementById("recent-searches");
    var useLocationButton = document.getElementById("use-location");
    var recentSearches = loadRecentSearches();

    renderRecentSearches();
    fetchWeatherByCity(DEFAULT_CITY);

    searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var city = cityInput.value.replace(/^\s+|\s+$/g, "");
        if (!city) {
            setStatus("Please enter a city name.");
            return;
        }
        fetchWeatherByCity(city);
    });

    useLocationButton.addEventListener("click", function () {
        if (!navigator.geolocation) {
            setStatus("Geolocation is not supported in this browser.");
            return;
        }

        setStatus("Getting your location...");
        navigator.geolocation.getCurrentPosition(function (position) {
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        }, function () {
            setStatus("Location access denied. Search by city instead.");
        });
    });

    function fetchWeatherByCity(city) {
        setStatus("Searching weather for " + city + "...");
        setLoadingState();

        fetchWeatherApiByQuery(city)
            .catch(function () {
                return fetchOpenMeteoByCity(city);
            })
            .then(function (result) {
                cityInput.value = result.cityName;
                saveRecentSearch(result.cityName);
                renderWeather(result.data);
                setStatus(result.providerMessage);
            })
            .catch(function () {
                setStatus("Could not load weather right now. Check internet or city name.");
            });
    }

    function fetchWeatherByCoords(latitude, longitude) {
        setStatus("Loading weather for your location...");
        setLoadingState();

        fetchWeatherApiByQuery(latitude + "," + longitude)
            .catch(function () {
                return fetchOpenMeteoByCoords(latitude, longitude, "Your Location");
            })
            .then(function (result) {
                cityInput.value = extractBaseCity(result.cityName);
                saveRecentSearch(result.cityName);
                renderWeather(result.data);
                setStatus(result.providerMessage);
            })
            .catch(function () {
                setStatus("Could not load weather for your location.");
            });
    }

    function fetchWeatherApiByQuery(query) {
        if (!API_KEY) {
            return Promise.reject(new Error("Missing API key"));
        }

        return fetch(buildWeatherApiUrl(query))
            .then(handleJson)
            .then(function (data) {
                return {
                    cityName: data.location.name + ", " + data.location.country,
                    data: normalizeWeatherApi(data),
                    providerMessage: "Weather loaded successfully."
                };
            });
    }

    function fetchOpenMeteoByCity(city) {
        return fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json")
            .then(handleJson)
            .then(function (data) {
                if (!data || !data.results || !data.results.length) {
                    throw new Error("City not found");
                }

                var result = data.results[0];
                var label = result.name + ", " + result.country;
                return fetchOpenMeteoByCoords(result.latitude, result.longitude, label);
            });
    }

    function fetchOpenMeteoByCoords(latitude, longitude, label) {
        var geocodePromise;

        if (label) {
            geocodePromise = Promise.resolve(label);
        } else {
            geocodePromise = Promise.resolve("Selected Location");
        }

        return geocodePromise.then(function (resolvedLabel) {
            var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(latitude) +
                "&longitude=" + encodeURIComponent(longitude) +
                "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure,visibility" +
                "&hourly=temperature_2m,precipitation_probability,weather_code,is_day" +
                "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
                "&timezone=auto&forecast_days=3";

            return fetch(url)
                .then(handleJson)
                .then(function (data) {
                    return {
                        cityName: resolvedLabel,
                        data: normalizeOpenMeteo(data, resolvedLabel, latitude, longitude),
                        providerMessage: "Weather loaded via backup provider."
                    };
                });
        });
    }

    function renderWeather(data) {
        var weatherIcon = getWeatherIcon(data.conditionText, data.isDay);

        locationNameEl.textContent = data.cityName;
        temperatureEl.textContent = formatTemp(data.tempC);
        conditionEl.textContent = data.conditionText;
        localTimeEl.textContent = "Local time: " + safeText(data.localTime, "--");
        feelsLikeEl.textContent = "Feels like: " + formatTemp(data.feelsLikeC);
        rainChanceEl.textContent = "Rain chance: " + formatNumber(data.rainChance) + "%";
        windEl.textContent = formatNumber(data.windKph) + " km/h";
        humidityEl.textContent = formatNumber(data.humidity) + "%";
        uvIndexEl.textContent = safeMetric(data.uvIndex);
        visibilityEl.textContent = formatNumber(data.visibilityKm) + " km";
        coordinatesEl.textContent = formatCoordinate(data.latitude, data.longitude);
        weatherIconEl.textContent = weatherIcon;
        visualCaptionEl.textContent = getVisualCaption(data.conditionText);
        currentTempDetailEl.textContent = formatTemp(data.tempC);
        feelsLikeDetailEl.textContent = formatTemp(data.feelsLikeC);
        conditionDetailEl.textContent = data.conditionText;
        pressureEl.textContent = safeMetric(data.pressureMb, " mb");
        sunriseEl.textContent = safeText(data.sunrise, "--");
        sunsetEl.textContent = safeText(data.sunset, "--");
        moonPhaseEl.textContent = safeText(data.moonPhase, "Unavailable");
        updatedAtEl.textContent = safeText(data.lastUpdated, "--");

        renderForecast(data.forecastDays);
        renderHourly(data.hourlyItems);
    }

    function renderForecast(forecastDays) {
        var html = "";
        var index;

        for (index = 0; index < forecastDays.length; index += 1) {
            html += '' +
                '<div class="forecast-card">' +
                    '<div class="forecast-day">' + formatDay(forecastDays[index].date) + '</div>' +
                    '<div class="forecast-icon">' + getWeatherIcon(forecastDays[index].conditionText, 1) + '</div>' +
                    '<div class="forecast-temp">' + formatTemp(forecastDays[index].maxTempC) + ' / ' + formatTemp(forecastDays[index].minTempC) + '</div>' +
                    '<div class="forecast-text">' + escapeHtml(forecastDays[index].conditionText) + '</div>' +
                '</div>';
        }

        forecastGridEl.innerHTML = html || '<div class="empty-state">Forecast unavailable.</div>';
    }

    function renderHourly(hourlyItems) {
        var html = "";
        var index;

        for (index = 0; index < hourlyItems.length; index += 1) {
            html += '' +
                '<div class="hour-card">' +
                    '<div class="hour-time">' + escapeHtml(formatHour(hourlyItems[index].time)) + '</div>' +
                    '<div class="hour-icon">' + getWeatherIcon(hourlyItems[index].conditionText, hourlyItems[index].isDay) + '</div>' +
                    '<div class="hour-temp">' + formatTemp(hourlyItems[index].tempC) + '</div>' +
                '</div>';
        }

        hourlyStripEl.innerHTML = html || '<div class="empty-state">Hourly forecast unavailable.</div>';
    }

    function normalizeWeatherApi(data) {
        var location = data.location || {};
        var current = data.current || {};
        var forecastDays = data.forecast && data.forecast.forecastday ? data.forecast.forecastday : [];
        var today = forecastDays.length ? forecastDays[0] : null;
        var hourlyItems = today && today.hour ? pickUpcomingWeatherApiHours(today.hour) : [];

        return {
            cityName: location.name + ", " + location.country,
            latitude: location.lat,
            longitude: location.lon,
            localTime: location.localtime,
            lastUpdated: current.last_updated,
            tempC: current.temp_c,
            feelsLikeC: current.feelslike_c,
            conditionText: safeText(current.condition && current.condition.text, "Weather unavailable"),
            isDay: current.is_day,
            rainChance: getWeatherApiRainChance(today),
            windKph: current.wind_kph,
            humidity: current.humidity,
            uvIndex: current.uv,
            visibilityKm: current.vis_km,
            pressureMb: current.pressure_mb,
            sunrise: today ? today.astro.sunrise : null,
            sunset: today ? today.astro.sunset : null,
            moonPhase: today ? today.astro.moon_phase : null,
            forecastDays: mapWeatherApiForecastDays(forecastDays),
            hourlyItems: mapWeatherApiHourlyItems(hourlyItems)
        };
    }

    function normalizeOpenMeteo(data, label, latitude, longitude) {
        var current = data.current || {};
        var daily = data.daily || {};
        var hourly = data.hourly || {};
        var hourlyItems = pickUpcomingOpenMeteoHours(hourly);

        return {
            cityName: label,
            latitude: latitude,
            longitude: longitude,
            localTime: current.time,
            lastUpdated: current.time,
            tempC: current.temperature_2m,
            feelsLikeC: current.apparent_temperature,
            conditionText: openMeteoCodeToText(current.weather_code),
            isDay: current.is_day,
            rainChance: getOpenMeteoRainChance(hourly.precipitation_probability),
            windKph: current.wind_speed_10m,
            humidity: current.relative_humidity_2m,
            uvIndex: null,
            visibilityKm: current.visibility ? Number(current.visibility) / 1000 : null,
            pressureMb: current.surface_pressure,
            sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : null,
            sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0] : null,
            moonPhase: null,
            forecastDays: mapOpenMeteoForecastDays(daily),
            hourlyItems: hourlyItems
        };
    }

    function mapWeatherApiForecastDays(forecastDays) {
        var items = [];
        var index;

        for (index = 0; index < forecastDays.length; index += 1) {
            items.push({
                date: forecastDays[index].date,
                maxTempC: forecastDays[index].day.maxtemp_c,
                minTempC: forecastDays[index].day.mintemp_c,
                conditionText: forecastDays[index].day.condition.text
            });
        }

        return items;
    }

    function mapWeatherApiHourlyItems(hours) {
        var items = [];
        var index;

        for (index = 0; index < hours.length; index += 1) {
            items.push({
                time: hours[index].time,
                tempC: hours[index].temp_c,
                conditionText: hours[index].condition.text,
                isDay: hours[index].is_day
            });
        }

        return items;
    }

    function mapOpenMeteoForecastDays(daily) {
        var items = [];
        var index;
        var dates = daily.time || [];

        for (index = 0; index < dates.length; index += 1) {
            items.push({
                date: dates[index],
                maxTempC: daily.temperature_2m_max[index],
                minTempC: daily.temperature_2m_min[index],
                conditionText: openMeteoCodeToText(daily.weather_code[index])
            });
        }

        return items;
    }

    function pickUpcomingWeatherApiHours(hours) {
        var nowHour = new Date().getHours();
        var items = [];
        var index;

        for (index = 0; index < hours.length; index += 1) {
            if (index >= nowHour && items.length < 6) {
                items.push(hours[index]);
            }
        }

        return items.length ? items : hours.slice(0, 6);
    }

    function pickUpcomingOpenMeteoHours(hourly) {
        var items = [];
        var times = hourly.time || [];
        var temps = hourly.temperature_2m || [];
        var codes = hourly.weather_code || [];
        var isDayList = hourly.is_day || [];
        var now = new Date().getTime();
        var index;

        for (index = 0; index < times.length; index += 1) {
            if (new Date(times[index]).getTime() >= now && items.length < 6) {
                items.push({
                    time: times[index],
                    tempC: temps[index],
                    conditionText: openMeteoCodeToText(codes[index]),
                    isDay: isDayList[index]
                });
            }
        }

        return items;
    }

    function getWeatherApiRainChance(today) {
        var maxChance = 0;
        var hours = today && today.hour ? today.hour : [];
        var index;

        for (index = 0; index < hours.length; index += 1) {
            if (Number(hours[index].chance_of_rain) > maxChance) {
                maxChance = Number(hours[index].chance_of_rain);
            }
        }

        return maxChance;
    }

    function getOpenMeteoRainChance(values) {
        var maxChance = 0;
        var index;
        var list = values || [];

        for (index = 0; index < list.length; index += 1) {
            if (Number(list[index]) > maxChance) {
                maxChance = Number(list[index]);
            }
        }

        return maxChance;
    }

    function getWeatherIcon(text, isDay) {
        var value = (text || "").toLowerCase();

        if (value.indexOf("sun") !== -1 || value.indexOf("clear") !== -1) {
            return isDay === 1 ? "SUN" : "MOON";
        }
        if (value.indexOf("cloud") !== -1 || value.indexOf("overcast") !== -1) {
            return "CLOUD";
        }
        if (value.indexOf("rain") !== -1 || value.indexOf("drizzle") !== -1) {
            return "RAIN";
        }
        if (value.indexOf("thunder") !== -1) {
            return "STORM";
        }
        if (value.indexOf("snow") !== -1 || value.indexOf("ice") !== -1) {
            return "SNOW";
        }
        if (value.indexOf("mist") !== -1 || value.indexOf("fog") !== -1) {
            return "FOG";
        }

        return "SKY";
    }

    function getVisualCaption(text) {
        var value = (text || "").toLowerCase();

        if (value.indexOf("rain") !== -1) {
            return "Rain clouds nearby";
        }
        if (value.indexOf("cloud") !== -1) {
            return "Cloud cover active";
        }
        if (value.indexOf("clear") !== -1 || value.indexOf("sun") !== -1) {
            return "Bright sky conditions";
        }
        if (value.indexOf("thunder") !== -1) {
            return "Storm energy building";
        }

        return "Live sky snapshot";
    }

    function openMeteoCodeToText(code) {
        var map = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Fog",
            51: "Light drizzle",
            53: "Drizzle",
            55: "Heavy drizzle",
            61: "Light rain",
            63: "Rain",
            65: "Heavy rain",
            71: "Light snow",
            73: "Snow",
            75: "Heavy snow",
            80: "Rain showers",
            81: "Heavy rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm"
        };

        return map.hasOwnProperty(code) ? map[code] : "Weather unavailable";
    }

    function setLoadingState() {
        forecastGridEl.innerHTML = '<div class="forecast-card skeleton" style="height: 150px;"></div><div class="forecast-card skeleton" style="height: 150px;"></div><div class="forecast-card skeleton" style="height: 150px;"></div>';
        hourlyStripEl.innerHTML = '<div class="hour-card skeleton" style="height: 118px;"></div><div class="hour-card skeleton" style="height: 118px;"></div><div class="hour-card skeleton" style="height: 118px;"></div><div class="hour-card skeleton" style="height: 118px;"></div>';
    }

    function renderRecentSearches() {
        var html = "";
        var index;

        for (index = 0; index < recentSearches.length; index += 1) {
            html += '<button type="button" class="chip" data-city="' + escapeAttribute(recentSearches[index]) + '">' + escapeHtml(recentSearches[index]) + '</button>';
        }

        recentSearchesEl.innerHTML = html || '<span class="empty-state">No recent searches yet.</span>';
        bindRecentSearchButtons();
    }

    function bindRecentSearchButtons() {
        var buttons = recentSearchesEl.querySelectorAll("[data-city]");
        var index;

        for (index = 0; index < buttons.length; index += 1) {
            buttons[index].addEventListener("click", function () {
                var city = this.getAttribute("data-city");
                cityInput.value = extractBaseCity(city);
                fetchWeatherByCity(city);
            });
        }
    }

    function saveRecentSearch(city) {
        var next = [city];
        var index;

        for (index = 0; index < recentSearches.length; index += 1) {
            if (recentSearches[index].toLowerCase() !== city.toLowerCase()) {
                next.push(recentSearches[index]);
            }
        }

        recentSearches = next.slice(0, 6);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
        renderRecentSearches();
    }

    function loadRecentSearches() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function buildWeatherApiUrl(query) {
        return "https://api.weatherapi.com/v1/forecast.json?key=" + API_KEY + "&q=" + encodeURIComponent(query) + "&days=3&aqi=no&alerts=no";
    }

    function handleJson(response) {
        if (!response.ok) {
            throw new Error("Request failed");
        }
        return response.json();
    }

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function formatTemp(value) {
        return formatNumber(value) + " C";
    }

    function formatNumber(value) {
        if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
            return "--";
        }
        return Math.round(Number(value));
    }

    function safeMetric(value, suffix) {
        if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
            return "Unavailable";
        }
        return Math.round(Number(value)) + (suffix || "");
    }

    function formatCoordinate(lat, lon) {
        if (lat === undefined || lon === undefined) {
            return "--";
        }
        return Number(lat).toFixed(2) + ", " + Number(lon).toFixed(2);
    }

    function formatDay(dateValue) {
        var date = new Date(dateValue);
        return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    }

    function formatHour(timeValue) {
        var date = new Date(timeValue);
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    function safeText(value, fallback) {
        return value || fallback;
    }

    function extractBaseCity(city) {
        return String(city).split(",")[0];
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
}());
