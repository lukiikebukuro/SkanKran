import { waterStations, bottleData } from './waterAnalysis.js';
import { getColor } from './utils.js';

export function generateRanking(parameter = "twardosc") {
    try {
        const rankingsDiv = document.getElementById('city-ranking');
        if (!rankingsDiv) {
            console.error('Brak elementu #city-ranking');
            return;
        }

        function parseValue(value) {
            if (typeof value === 'string') {
                if (value.startsWith('<')) {
                    return parseFloat(value.replace('<', '')) || 0;
                }
                return parseFloat(value) || 0;
            }
            return parseFloat(value) || 0;
        }

        const totalCities = 35; // Zakładamy 35 miast
        const ranking = Object.keys(waterStations)
            .map(city => ({
                city,
                value: parseValue(waterStations[city].average?.[parameter])
            }))
            .filter(item => !isNaN(item.value) && item.value !== 0);

        const citiesWithData = ranking.length;
        const citiesWithoutData = totalCities - citiesWithData;

        ranking.sort((a, b) => {
            if (parameter === "pH") {
                return Math.abs(a.value - 7) - Math.abs(b.value - 7);
            }
            return a.value - b.value;
        });

        let result = `<h3>Ranking miast (${parameter})</h3>`;
        result += `<p>Ranking dla ${citiesWithData}/${totalCities} miast – brak danych dla ${citiesWithoutData} miast.</p>`;
        result += `<h4>5 najlepszych (najniższe wartości):</h4><ol>`;
        ranking.slice(0, 5).forEach((item, index) => {
            const unit = parameter === 'twardosc' ? 'mg CaCO₃/L' : (parameter === 'mangan' ? 'µg/l' : (['azotany', 'zelazo', 'fluorki', 'chlor'].includes(parameter) ? 'mg/l' : ''));
            const color = getColor(parameter, item.value);
            let drop = '';
            if (index === 0) {
                drop = `<img src="/static/assets/icons/goldendrop.svg" class="ranking-drop">`;
            } else if (index === 1) {
                drop = `<img src="/static/assets/icons/silverdrop.svg" class="ranking-drop">`;
            } else if (index === 2) {
                drop = `<img src="/static/assets/icons/bronzedrop.svg" class="ranking-drop">`;
            }
            result += `<li>${item.city}: ${item.value.toFixed(2)} ${unit} <span class="dot ${color}"></span> ${drop}</li>`;
        });
        result += "</ol><h4>5 najgorszych (najwyższe wartości):</h4><ol>";
        ranking.slice(-5).reverse().forEach((item) => {
            const unit = parameter === 'twardosc' ? 'mg CaCO₃/L' : (parameter === 'mangan' ? 'µg/l' : (['azotany', 'zelazo', 'fluorki', 'chlor'].includes(parameter) ? 'mg/l' : ''));
            const color = getColor(parameter, item.value);
            result += `<li>${item.city}: ${item.value.toFixed(2)} ${unit} <span class="dot ${color}"></span></li>`;
        });
        result += "</ol>";

        rankingsDiv.innerHTML = result;
        console.log(`Ranking miast dla ${parameter}:`, ranking);
    } catch (error) {
        console.error('Błąd w generateRanking:', error);
        document.getElementById('city-ranking').innerHTML = "Wystąpił błąd – sprawdź konsolę (F12).";
    }
}

// Pozostałe funkcje (generateSUWRanking, generateDistrictRanking, generateBottleRanking) zostawiam bez zmian, bo ich nie edytujemy w tym momencie.

export function generateSUWRanking(city, parameter) {
    try {
        function parseValue(value) {
            if (typeof value === 'string') {
                if (value.startsWith('<')) {
                    return parseFloat(value.replace('<', '')) || 0;
                } else if (value.includes('–')) {
                    const range = value.split('–').map(parseFloat);
                    return (range[0] + range[1]) / 2;
                } else if (value === 'Brak danych') {
                    return 0;
                }
                return parseFloat(value) || 0;
            }
            return parseFloat(value) || 0;
        }

        const rankingsDiv = document.getElementById('suw-ranking');
        if (!rankingsDiv) {
            console.error('Brak elementu #suw-ranking');
            return;
        }

        const stations = waterStations[city]?.stations || [];
        if (stations.length === 0) {
            rankingsDiv.innerHTML = `<h3>Brak danych dla ${city}</h3>`;
            return;
        }

        let allZero = true;
        stations.forEach(station => {
            const value = parseValue(station.data[parameter]);
            if (value !== 0) allZero = false;
        });

        if (allZero) {
            let message = `Brak danych dla parametru ${parameter} w ${city}.`;
            if (parameter === 'chlor') {
                message += ` Prawdopodobnie woda nie jest chlorowana, ale możliwe, że dane nie zostały podane.`;
            }
            rankingsDiv.innerHTML = `<h3>Ranking SUW-ów w ${city} (${parameter})</h3><p>${message}</p>`;
            return;
        }

        let ranking = stations.map(station => {
            let value = station.data[parameter];
            let parsedValue = parseValue(value);
            let note = '';
            if (parsedValue === 0 || value === "Brak danych") {
                note = parameter === 'chlor' 
                    ? 'Brak danych (prawdopodobnie woda nie jest chlorowana, ale możliwe, że dane nie zostały podane)' 
                    : `Brak danych dla ${parameter}`;
            }
            return { name: station.name, address: station.address, value: parsedValue, note };
        });

        ranking.sort((a, b) => {
            if (parameter === 'pH') {
                return Math.abs(a.value - 7) - Math.abs(b.value - 7);
            }
            return a.value - b.value;
        });

        let result = `<h3>Ranking SUW-ów w ${city} (${parameter})</h3>`;
        result += `<p style="font-size: 0.9em; color: #666;">Uwaga: Ranking oparty na danych z SUW-ów. Skontaktuj się z wodociągami dla dokładniejszych informacji.</p>`;
        result += `<ol>`;
        ranking.forEach((item, index) => {
            const unit = parameter === 'twardosc' ? 'mg CaCO₃/L' : (parameter === 'mangan' ? 'µg/l' : (['azotany', 'zelazo', 'fluorki', 'chlor'].includes(parameter) ? 'mg/l' : ''));
            const color = getColor(parameter, item.value);
            let warning = '';
            if (index === ranking.length - 1 && color === 'red') {
                warning = '<span style="color: #f44336;"> – Za wysoka wartość!</span>';
            } else if (index === 1 && color === 'orange') {
                warning = '<span style="color: #ff9800;"> – Rozważ filtr!</span>';
            }
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const displayValue = (item.value === 0 || item.note) ? item.note : `${item.value.toFixed(2)} ${unit}`;
            result += `<li>${item.name} (${item.address}): ${displayValue} <span class="dot ${color}"></span> ${warning} ${medal}</li>`;
        });
        result += `</ol>`;
        result += `<p class="note">Dane zależą od wodociągów. Skontaktuj się z nimi dla dokładniejszych informacji.</p>`;

        rankingsDiv.innerHTML = result;
    } catch (error) {
        console.error('Błąd w generateSUWRanking:', error);
        document.getElementById('suw-ranking').innerHTML = 'Wystąpił błąd – sprawdź konsolę (F12).';
    }
}

export function generateDistrictRanking(city, parameter) {
    try {
        function parseValue(value) {
            if (typeof value === 'string') {
                if (value.startsWith('<')) {
                    return parseFloat(value.replace('<', '')) || 0;
                } else if (value.includes('–')) {
                    const range = value.split('–').map(parseFloat);
                    return (range[0] + range[1]) / 2;
                } else if (value === 'Brak danych') {
                    return 0;
                }
                return parseFloat(value) || 0;
            }
            return parseFloat(value) || 0;
        }

        const rankingsDiv = document.getElementById('district-ranking');
        if (!rankingsDiv) {
            console.error('Brak elementu #district-ranking');
            return;
        }

        const zones = waterStations[city]?.zones || {};
        const stations = waterStations[city]?.stations || [];
        if (Object.keys(zones).length === 0 || stations.length === 0) {
            rankingsDiv.innerHTML = `<h3>Brak danych dla ${city}</h3>`;
            return;
        }

        if (stations.length === 1) {
            rankingsDiv.innerHTML = `<h3>Ranking dzielnic w ${city}</h3><p>To miasto ma tylko jeden SUW (${stations[0].name}), więc ranking dzielnic nie jest dostępny.</p>`;
            return;
        }

        const stationData = {};
        let allZero = true;
        stations.forEach(station => {
            const value = parseValue(station.data[parameter]);
            stationData[station.name] = value;
            if (value !== 0) allZero = false;
        });

        if (allZero) {
            let message = `Brak danych dla parametru ${parameter} w ${city}.`;
            if (parameter === 'chlor') {
                message += ` Prawdopodobnie woda nie jest chlorowana, ale możliwe, że dane nie zostały podane.`;
            }
            rankingsDiv.innerHTML = `<h3>Ranking dzielnic w ${city} (${parameter})</h3><p>${message}</p>`;
            return;
        }

        let ranking = Object.keys(zones).map(district => {
            const suw = zones[district];
            let value;
            let note = '';
            if (typeof suw === 'string') {
                value = stationData[suw] || 0;
                if (value === 0 || suw === "Brak danych") {
                    note = parameter === 'chlor' 
                        ? 'Brak danych (prawdopodobnie woda nie jest chlorowana, ale możliwe, że dane nie zostały podane)' 
                        : `Brak danych dla ${parameter}`;
                }
            } else if (Array.isArray(suw)) {
                const values = suw.map(s => stationData[s] || 0);
                value = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
                if (value === 0) {
                    note = parameter === 'chlor' 
                        ? 'Brak danych (prawdopodobnie woda nie jest chlorowana, ale możliwe, że dane nie zostały podane)' 
                        : `Brak danych dla ${parameter}`;
                }
            } else {
                value = 0;
                note = `Brak danych dla ${parameter}`;
            }
            return { district, value, note };
        });

        ranking.sort((a, b) => {
            if (parameter === 'pH') {
                return Math.abs(a.value - 7) - Math.abs(b.value - 7);
            }
            return a.value - b.value;
        });

        let result = `<h3>Ranking dzielnic w ${city} (${parameter})</h3>`;
        result += `<p style="font-size: 0.9em; color: #666;">Uwaga: Ranking oparty na danych z głównych SUW-ów przypisanych do dzielnic. Woda może pochodzić z kilku SUW-ów – wartości są przybliżone.</p>`;
        result += `<ol>`;
        ranking.forEach((item, index) => {
            const unit = parameter === 'twardosc' ? 'mg CaCO₃/L' : (parameter === 'mangan' ? 'µg/l' : (['azotany', 'zelazo', 'fluorki', 'chlor'].includes(parameter) ? 'mg/l' : ''));
            const color = getColor(parameter, item.value);
            let warning = '';
            if (index === ranking.length - 1 && color === 'red') {
                warning = '<span style="color: #f44336;"> – Za wysoka wartość!</span>';
            } else if (index === 1 && color === 'orange') {
                warning = '<span style="color: #ff9800;"> – Rozważ filtr!</span>';
            }
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const displayValue = (item.value === 0 || item.note) ? item.note : `${item.value.toFixed(2)} ${unit}`;
            result += `<li>${item.district}: ${displayValue} <span class="dot ${color}"></span> ${warning} ${medal}</li>`;
        });
        result += `</ol>`;
        result += `<p class="note">Dane zależą od wodociągów. Skontaktuj się z nimi dla dokładniejszych informacji.</p>`;

        rankingsDiv.innerHTML = result;
    } catch (error) {
        console.error('Błąd w generateDistrictRanking:', error);
        document.getElementById('district-ranking').innerHTML = 'Wystąpił błąd – sprawdź konsolę (F12).';
    }
}

export function generateBottleRanking(parameter = "wapn") {
    try {
        const rankingsDiv = document.getElementById('bottle-rankings');
        if (!rankingsDiv) {
            console.error('Brak elementu #bottle-rankings');
            return;
        }

        let ranking = Object.keys(bottleData).map(bottle => ({
            bottle,
            value: parseFloat(bottleData[bottle][parameter].value)
        }));

        ranking.sort((a, b) => {
            if (parameter === "pH") {
                return Math.abs(a.value - 7) - Math.abs(b.value - 7);
            } else if (parameter === "sod" || parameter === "fluorki") {
                return a.value - b.value;
            }
            return b.value - a.value;
        });

        let result = `<h3>Ranking wód butelkowanych (${parameter})</h3>`;
        result += `<h4>Top wód:</h4><ol>`;
        ranking.forEach((item, index) => {
            let medal = '';
            if (index === 0) {
                medal = '🥇';
            } else if (index === 1) {
                medal = '🥈';
            } else if (index === 2) {
                medal = '🥉';
            }
            result += `<li>${item.bottle}: ${item.value} ${parameter === "wapn" || parameter === "magnez" || parameter === "sod" || parameter === "potas" || parameter === "fluorki" ? "mg/l" : ""} <span class="dot ${bottleData[item.bottle][parameter].color}"></span> ${medal}</li>`;
        });
        result += `</ol>`;

        rankingsDiv.innerHTML = result;
    } catch (error) {
        console.error('Błąd w generateBottleRanking:', error);
        document.getElementById('bottle-rankings').innerHTML = "Wystąpił błąd – sprawdź konsolę (F12).";
    }
}