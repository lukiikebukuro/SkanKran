import { setUsername, fetchUserStats, togglePremium, logout, suggestCities, suggestBottles, selectBottle } from '/static/js/utils.js';
import { fetchPosts, addPost, addComment, togglePostComments, markPostAsSolved } from '/static/js/community.js';
import { generateRanking, generateSUWRanking, generateDistrictRanking, generateBottleRanking } from '/static/js/ranking.js';
import { checkWater, findWaterStation, displayHistory, waterStations, showAllSUW, showAllMeasurementPoints } from '/static/js/waterAnalysis.js';
import { toggleQuiz, checkQuizSkin, checkQuizWellbeing } from '/static/js/quiz.js';
import { startAquaBot } from '/static/js/aquaBot.js';

export let currentUser = localStorage.getItem('username') || null;
let isAquaBotInitialized = false;

export function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        if (sectionId === 'find-stations' && window.map && typeof window.map.invalidateSize === 'function') {
            setTimeout(() => {
                window.map.invalidateSize();
            }, 0);
        }
        if (sectionId === 'aqua-bot' && !isAquaBotInitialized) {
            startAquaBot('skin');
            isAquaBotInitialized = true;
        }
    }
}
document.getElementById('send-feedback-btn').addEventListener('click', () => {
    const text = document.getElementById('feedback-text').value;
    if (text.trim()) {
        document.getElementById('feedback-status').textContent = 'Dziękujemy za feedback!'; // Symulacja
        document.getElementById('feedback-text').value = '';
    } else {
        document.getElementById('feedback-status').textContent = 'Wpisz wiadomość!';
        document.getElementById('feedback-status').style.color = '#f44336';
    }
});

window.onload = function() {
    // Inicjalizacja mapy Leaflet
    if (document.getElementById('map')) {
        window.map = L.map('map').setView([52.2297, 21.0122], 13); // Warszawa jako domyślne centrum
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(window.map);
    }

    const checkKranowkaBtn = document.getElementById('check-kranowka-btn');
    const findStationBtn = document.getElementById('find-station-btn');
    const showSUWBtn = document.getElementById('show-suw-btn');
    const showHistoryBtn = document.getElementById('show-history-btn');
    const generateCityRankingBtn = document.getElementById('generate-city-ranking');
    const generateSUWRankingBtn = document.getElementById('generate-suw-ranking');
    const generateDistrictRankingBtn = document.getElementById('generate-district-ranking');
    const generateBottleRankingBtn = document.getElementById('generate-bottle-ranking');
    const searchBottleWaterBtn = document.getElementById('search-bottle-water');
    const cityInput = document.getElementById('city');
    const cityPremiumInput = document.getElementById('city-premium');
    const cityForSuwInput = document.getElementById('city-for-suw');
    const bottleInput = document.getElementById('bottleName');
    const tapWaterBtn = document.getElementById('tap-water-btn');
    const bottledWaterBtn = document.getElementById('bottled-water-btn');

    if (cityInput) {
        cityInput.addEventListener('input', () => suggestCities(cityInput.value));
    }
    if (cityPremiumInput) {
        cityPremiumInput.addEventListener('input', () => suggestCities(cityPremiumInput.value, 'city-premium'));
    }
    if (cityForSuwInput) {
        cityForSuwInput.addEventListener('input', () => suggestCities(cityForSuwInput.value, 'city-for-suw'));
    }
    if (bottleInput) {
        bottleInput.addEventListener('input', () => suggestBottles(bottleInput.value));
    }
    if (checkKranowkaBtn) {
        checkKranowkaBtn.addEventListener('click', () => checkWater('city'));
    }
    if (findStationBtn) {
        findStationBtn.addEventListener('click', findWaterStation);
    }
    if (showSUWBtn) {
        showSUWBtn.addEventListener('click', showAllSUW);
    }
    if (showHistoryBtn) {
        showHistoryBtn.addEventListener('click', displayHistory);
    }
    if (generateCityRankingBtn) {
        generateCityRankingBtn.addEventListener('click', () => {
            const param = document.getElementById('cityRankingParameter').value;
            generateRanking(param);
        });
    }
    if (generateSUWRankingBtn) {
        generateSUWRankingBtn.addEventListener('click', () => {
            const city = document.getElementById('city-for-suw').value;
            const param = document.getElementById('suwRankingParameter').value;
            generateSUWRanking(city, param);
        });
    }
    if (generateDistrictRankingBtn) {
        generateDistrictRankingBtn.addEventListener('click', () => {
            const city = document.getElementById('city-for-suw').value;
            const param = document.getElementById('suwRankingParameter').value;
            generateDistrictRanking(city, param);
        });
    }
    if (generateBottleRankingBtn) {
        generateBottleRankingBtn.addEventListener('click', () => {
            const param = document.getElementById('bottleRankingParameter').value;
            generateBottleRanking(param);
        });
    }
    if (searchBottleWaterBtn) {
        searchBottleWaterBtn.addEventListener('click', () => checkWater('bottle'));
    }
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

    if (currentUser) {
        fetchUserStats();
        fetchPosts();
    }
};

window.showSection = showSection;

window.toggleHamburgerMenu = function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    hamburgerMenu.style.display = hamburgerMenu.style.display === 'none' ? 'block' : 'none';
};