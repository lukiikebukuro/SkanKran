import { setUsername, fetchUserStats, togglePremium, logout, suggestCities, suggestBottles, selectBottle } from '/static/js/utils.js';
import { fetchPosts, addPost, addComment, togglePostComments, markPostAsSolved } from '/static/js/community.js';
import { generateRanking, generateSUWRanking, generateDistrictRanking, generateBottleRanking } from '/static/js/ranking.js';
import { checkWater, findWaterStation, displayHistory, waterStations, showAllSUW, showAllMeasurementPoints, bottleData } from '/static/js/waterAnalysis.js';
import { toggleQuiz, checkQuizSkin, checkQuizWellbeing } from '/static/js/quiz.js';
import { startAquaBot } from '/static/js/aquaBot.js';

export let currentUser = localStorage.getItem('username') || null;

window.onload = function() {
    try {
        // Ustaw domyślną sekcję na "Sprawdź kranówkę"
        showSection('check-tapwater');

        // Inicjalizacja mapy Leaflet
        const mapElement = document.getElementById('map');
        if (mapElement && typeof L !== 'undefined') {
            window.map = L.map('map', { center: [52.2297, 21.0122], zoom: 12 });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(window.map);
            console.log('Mapa zainicjalizowana poprawnie');
        } else {
            console.warn('Mapa nie została zainicjalizowana: brak elementu #map lub biblioteki Leaflet');
        }

        // Event listenery dla rankingów
        const generateCityBtn = document.getElementById('generate-city-ranking');
        if (generateCityBtn) {
            generateCityBtn.addEventListener('click', () => {
                const parameter = document.getElementById('cityRankingParameter')?.value || 'twardosc';
                generateRanking(parameter);
            });
        }

        const generateSUWBtn = document.getElementById('generate-suw-ranking');
        if (generateSUWBtn) {
            generateSUWBtn.addEventListener('click', () => {
                const city = document.getElementById('city-for-suw')?.value || '';
                const parameter = document.getElementById('suwRankingParameter')?.value || 'twardosc';
                generateSUWRanking(city, parameter);
            });
        }

        const generateDistrictBtn = document.getElementById('generate-district-ranking');
        if (generateDistrictBtn) {
            generateDistrictBtn.addEventListener('click', () => {
                const city = document.getElementById('city-for-suw')?.value || '';
                const parameter = document.getElementById('suwRankingParameter')?.value || 'twardosc';
                generateDistrictRanking(city, parameter);
            });
        }

        const generateBottleBtn = document.getElementById('generate-bottle-ranking');
        if (generateBottleBtn) {
            generateBottleBtn.addEventListener('click', () => {
                const parameter = document.getElementById('bottleRankingParameter')?.value || 'wapn';
                generateBottleRanking(parameter);
            });
        }

        // Pozostałe event listenery
        const elements = {
            'city': document.getElementById('city'),
            'check-kranowka-btn': document.getElementById('check-kranowka-btn'),
            'city-premium': document.getElementById('city-premium'),
            'find-station-btn': document.getElementById('find-station-btn'),
            'show-suw-btn': document.getElementById('show-suw-btn'),
            'show-history-btn': document.getElementById('show-history-btn'),
            'city-for-suw': document.getElementById('city-for-suw'),
        };

        for (const [id, element] of Object.entries(elements)) {
            if (!element) console.warn(`Element o ID '${id}' nie został znaleziony`);
        }

        if (elements['city']) elements['city'].addEventListener('keyup', (e) => suggestCities(e.target.value));
        if (elements['check-kranowka-btn']) elements['check-kranowka-btn'].addEventListener('click', () => checkWater('city'));
        if (elements['city-premium']) elements['city-premium'].addEventListener('keyup', (e) => suggestCities(e.target.value, 'city-premium'));
        if (elements['find-station-btn']) elements['find-station-btn'].addEventListener('click', findWaterStation);
        if (elements['show-suw-btn']) elements['show-suw-btn'].addEventListener('click', showAllSUW);
        if (elements['show-history-btn']) elements['show-history-btn'].addEventListener('click', () => displayHistory(elements['city-premium']?.value));
        if (elements['city-for-suw']) elements['city-for-suw'].addEventListener('keyup', (e) => suggestCities(e.target.value, 'city-for-suw'));

        // Listenery dla przełączania rankingów wody kranowej i butelkowanej
        const tapWaterBtn = document.getElementById('tap-water-btn');
        const bottledWaterBtn = document.getElementById('bottled-water-btn');

        if (tapWaterBtn) {
            tapWaterBtn.addEventListener('click', () => {
                document.getElementById('tap-water-rankings').style.display = 'flex';
                document.getElementById('bottled-water-rankings').style.display = 'none';
                tapWaterBtn.classList.add('active');
                bottledWaterBtn.classList.remove('active');
            });
        }

        if (bottledWaterBtn) {
            bottledWaterBtn.addEventListener('click', () => {
                document.getElementById('tap-water-rankings').style.display = 'none';
                document.getElementById('bottled-water-rankings').style.display = 'block';
                bottledWaterBtn.classList.add('active');
                tapWaterBtn.classList.remove('active');
            });
        }

        // Ustaw domyślnie "Woda kranowa" jako aktywną
        if (tapWaterBtn) tapWaterBtn.classList.add('active');

        // Listener dla wyszukiwania wód butelkowanych
        const bottleInput = document.getElementById('bottleName');
        const searchBottleBtn = document.getElementById('search-bottle-water');

        if (bottleInput) {
            bottleInput.addEventListener('keyup', (e) => suggestBottles(e.target.value));
        }

        if (searchBottleBtn) {
    searchBottleBtn.addEventListener('click', () => {
        const bottle = bottleInput.value.trim();
        const resultDiv = document.getElementById('bottle-result');
        const bottleKey = Object.keys(bottleData).find(key => key.toLowerCase() === bottle.toLowerCase());
        if (bottleKey) {
            const data = bottleData[bottleKey];
            let result = `<h3>${bottleKey}</h3>`;
            for (let param in data) {
                if (param !== 'mikroplastik') {
                    const paramData = data[param];
                    const unit = param === 'pH' ? '' : 'mg/l';
                    result += `<p>${param}: ${paramData.value} ${unit} <span class="dot ${paramData.color}-dot"></span> - ${paramData.desc}</p>`;
                } else {
                    result += `<p>${data[param].desc}</p>`;
                }
            }
            resultDiv.innerHTML = result;
        } else {
            resultDiv.innerHTML = '<p>Nie znaleziono wody lub brak danych.</p>';
        }
    });
}

    } catch (error) {
        console.error('Błąd inicjalizacji:', error);
        alert('Wystąpił błąd podczas ładowania strony. Sprawdź konsolę (F12).');
    }
};

export function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        if (sectionId === 'find-stations' && window.map) {
            setTimeout(() => {
                window.map.invalidateSize();
            }, 0);
        }
    }
}

function toggleHamburgerMenu() {
    const menu = document.getElementById('hamburger-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    } else {
        console.error('Błąd: Element #hamburger-menu nie istnieje w HTML!');
    }
}

window.showSection = showSection;
window.toggleHamburgerMenu = toggleHamburgerMenu;