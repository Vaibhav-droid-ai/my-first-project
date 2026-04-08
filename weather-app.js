(function () {
    var STORAGE_KEY = "weather-app-recent-searches";
    var searchForm = document.getElementById("search-form");
    var cityInput = document.getElementById("city-input");
    var statusEl = document.getElementById("status");
    var updatedAtEl = document.getElementById("updated-at");
    var locationNameEl = document.getElementById("location-name");
    var temperatureEl = document.getElementById("temperature");
    var conditionEl = document.getElementById("condition");
    var localTimeEl = document.getElementById("local-time");
    var feelsLikeEl = document.getElementById("feels-like");
    var windEl = document.getElementById("wind");
    var humidityEl = document.getElementById("humidity");
    var dayNightEl = document.getElementById("day-night");
    var coordinatesEl = document.getElementById("coordinates");
    var weatherIconEl = document.getElementById("weather-icon");
    var currentTempDetailEl = document.getElementById("current-temp-detail");
    var feelsLikeDetailEl = document.getElementById("feels-like-detail");
    var conditionDetailEl = document.getElementById("condition-detail");
    var recentSearchesEl = document.getElementById("recent-searches");
    var useLocationButton = document.getElementById("use-location");
    var recentSearches = loadRecentSearches();

    renderRecentSearches();

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
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, "Your Location");
        }, function () {
            setStatus("Location access denied. Search by city instead.");
        });
    });

    function fetchWeatherByCity(city) {
        setStatus("Searching weather for " + city + "...");
        fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json")
            .then(handleJson)
            .then(function (data) {
                if (!data || !data.results || !data.results.length) {
                    throw new Error("City not found");
                }

                var result = data.results[0];
                var label = result.name;
                if (result.country) {
                    label += ", " + result.country;
                }

                saveRecentSearch(label);
                cityInput.value = result.name;
                fetchWeatherByCoords(result.latitude, result.longitude, label);
            })
            .catch(function () {
                setStatus("Could not find that city. Try a different name.");
            });
    }

    function fetchWeatherByCoords(latitude, longitude, label) {
        setStatus("Loading weather...");
        var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(latitude) +
            "&longitude=" + encodeURIComponent(longitude) +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m" +
            "&timezone=auto";

        fetch(url)
            .then(handleJson)
            .then(function (data) {
                renderWeather(label, latitude, longitude, data);
                setStatus("Weather loaded.");
            })
            .catch(function () {
                setStatus("Could not load weather data right now.");
            });
    }

    function renderWeather(label, latitude, longitude, data) {
        var current = data.current || {};
        var conditionText = weatherCodeToText(current.weather_code);
        var iconText = weatherCodeToIcon(current.weather_code, current.is_day);

        locationNameEl.textContent = label;
        temperatureEl.textContent = formatNumber(current.temperature_2m) + " C";
        conditionEl.textContent = conditionText;
        localTimeEl.textContent = "Local time: " + formatLocalTime(current.time);
        feelsLikeEl.textContent = "Feels like: " + formatNumber(current.apparent_temperature) + " C";
        windEl.textContent = formatNumber(current.wind_speed_10m) + " km/h";
        humidityEl.textContent = formatNumber(current.relative_humidity_2m) + "%";
        dayNightEl.textContent = current.is_day === 1 ? "Day" : "Night";
        coordinatesEl.textContent = Number(latitude).toFixed(2) + ", " + Number(longitude).toFixed(2);
        currentTempDetailEl.textContent = formatNumber(current.temperature_2m) + " C";
        feelsLikeDetailEl.textContent = formatNumber(current.apparent_temperature) + " C";
        conditionDetailEl.textContent = conditionText;
        weatherIconEl.textContent = iconText;
        updatedAtEl.textContent = formatLocalTime(current.time);
    }

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function formatNumber(value) {
        if (value === undefined || value === null || value === "") {
            return "--";
        }
        return Math.round(Number(value));
    }

    function formatLocalTime(timeValue) {
        if (!timeValue) {
            return "--";
        }

        var date = new Date(timeValue);
        if (isNaN(date.getTime())) {
            return timeValue;
        }

        return date.toLocaleString();
    }

    function handleJson(response) {
        if (!response.ok) {
            throw new Error("Request failed");
        }
        return response.json();
    }

    function weatherCodeToText(code) {
        var map = {
            0: "Clear sky",
            1: "Mostly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
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

    function weatherCodeToIcon(code, isDay) {
        if (code === 0) {
            return isDay === 1 ? "S" : "M";
        }

        if (code === 1 || code === 2 || code === 3) {
            return "CL";
        }

        if (code === 45 || code === 48) {
            return "FG";
        }

        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            return "RN";
        }

        if (code >= 71 && code <= 77) {
            return "SN";
        }

        if (code >= 95) {
            return "TS";
        }

        return "WX";
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

    function saveRecentSearch(city) {
        var next = [city];
        var index;

        for (index = 0; index < recentSearches.length; index += 1) {
            if (recentSearches[index].toLowerCase() !== city.toLowerCase()) {
                next.push(recentSearches[index]);
            }
        }

        recentSearches = next.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
        renderRecentSearches();
    }

    function renderRecentSearches() {
        var index;
        recentSearchesEl.innerHTML = "";

        if (!recentSearches.length) {
            recentSearchesEl.innerHTML = '<span class="empty-state">No recent searches yet.</span>';
            return;
        }

        for (index = 0; index < recentSearches.length; index += 1) {
            appendRecentSearchButton(recentSearches[index]);
        }
    }

    function appendRecentSearchButton(city) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "chip";
        button.textContent = city;
        button.addEventListener("click", function () {
            cityInput.value = city;
            fetchWeatherByCity(city);
        });
        recentSearchesEl.appendChild(button);
    }
}());
