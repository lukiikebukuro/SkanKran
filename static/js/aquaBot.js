import { waterStations } from './waterAnalysis.js';
import { userCity } from './quiz.js';
import { getColor } from './utils.js';

export function startAquaBot(type) {
    console.log('Inicjalizacja AquaBot dla typu:', type);
    const botSection = document.getElementById(`aqua-bot-${type}`);
    const messages = document.getElementById(`aqua-bot-${type}-messages`);
    const input = document.getElementById(`aqua-bot-${type}-input`);
    const sendButton = document.getElementById(`aqua-bot-${type}-send`);

    if (!botSection || !messages || !input || !sendButton) {
        console.error('Brak elementów czatu!');
        alert('Wystąpił błąd: Brak elementów czatu.');
        return;
    }

    botSection.style.display = 'block';
    const addressStyle = localStorage.getItem('aquaBotAddressStyle');
    let city = localStorage.getItem('aquaBotCity') || userCity || 'Grudziądz';

    if (!addressStyle) {
        messages.innerHTML = '<p class="bot-message">Cześć! Jestem AquaBot – Twój ekspert od wody. Jak mam się do Ciebie zwracać? (Np. przyjacielu, kochanie) 😊</p>';
    } else if (!city) {
        messages.innerHTML = `<p class="bot-message">Super, ${addressStyle}! Skąd jesteś? (Np. Warszawa, Kraków) 😊</p>`;
    } else {
        messages.innerHTML = `<p class="bot-message">Cześć, ${addressStyle} z ${city}! Jak mogę Ci pomóc? 😊</p>`;
    }
    input.value = '';

    sendButton.onclick = () => sendMessage(type, input, messages);
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(type, input, messages); };
}

async function sendMessage(type, input, messages) {
    const message = input.value.trim();
    if (!message) return;

    messages.innerHTML += `<p class="user-message">${message}</p>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
        let addressStyle = localStorage.getItem('aquaBotAddressStyle');
        let userCity = localStorage.getItem('aquaBotCity') || 'Grudziądz';
        let selectedStation = localStorage.getItem('aquaBotSelectedStation') || null;
        let waitingForCategory = localStorage.getItem('aquaBotWaitingForCategory') === 'true';
        let waitingForSubcategory = localStorage.getItem('aquaBotWaitingForSubcategory') === 'true';
        let selectedCategory = localStorage.getItem('aquaBotSelectedCategory') || null;
        let lastParameters = JSON.parse(localStorage.getItem('aquaBotLastParameters') || '[]');

        if (!addressStyle) {
            addressStyle = message;
            localStorage.setItem('aquaBotAddressStyle', addressStyle);
            messages.innerHTML += `<p class="bot-message">Super, ${addressStyle}! Skąd jesteś? (Np. Warszawa, Kraków) 😊</p>`;
            messages.scrollTop = messages.scrollHeight;
            return;
        }

        if (!userCity) {
            const response = await fetch('/verify_city', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: message })
            });
            const data = await response.json();
            if (data.valid) {
                userCity = data.city;
                localStorage.setItem('aquaBotCity', userCity);
                messages.innerHTML += `<p class="bot-message">Okej, ${addressStyle} z ${userCity.charAt(0).toUpperCase() + userCity.slice(1)}! Wybierz stację uzdatniania, np. 'SUW Praga'! 😊</p>`;
            } else {
                messages.innerHTML += `<p class="bot-message">Nie znam miasta '${message}', ${addressStyle}! 😕 Wpisz np. 'Warszawa' lub 'Kraków'.</p>`;
            }
            messages.scrollTop = messages.scrollHeight;
            return;
        }

        const response = await fetch('/aquabot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                addressStyle: addressStyle,
                city: userCity,
                selectedStation: selectedStation,
                waitingForCategory: waitingForCategory,
                waitingForSubcategory: waitingForSubcategory,
                selectedCategory: selectedCategory,
                lastParameters: lastParameters
            })
        });
        const data = await response.json();
        console.log("API Response:", data);

        const reply = data.reply;
        if (reply && reply.message) {
            let replyHtml = reply.message;
            if (reply.parameters && reply.parameters.length > 0) {
                replyHtml += '<br>';
                reply.parameters.forEach(param => {
                    const colorClass = getColor(param.name.toLowerCase(), param.value);
                    console.log(`Parametr: ${param.name}, Wartość: ${param.value}, Klasa: ${colorClass}`);
                    replyHtml += `<p>${param.name}: ${param.value} ${param.unit} <span class="dot ${colorClass}"></span></p>`;
                });
                replyHtml += "Wpisz kategorię, np.<br>- zdrowie<br>- uroda<br>- codzienne użycie";
            }
            messages.innerHTML += `<div class="bot-message">${replyHtml}</div>`;
        } else {
            messages.innerHTML += `<p class="bot-message">Brak odpowiedzi, spróbuj ponownie! 😅</p>`;
        }
        messages.scrollTop = messages.scrollHeight;

        // Zaktualizuj stan w localStorage
        if (data.waitingForCategory !== undefined) {
            localStorage.setItem('aquaBotWaitingForCategory', data.waitingForCategory);
        }
        if (data.waitingForSubcategory !== undefined) {
            localStorage.setItem('aquaBotWaitingForSubcategory', data.waitingForSubcategory);
        }
        if (data.selectedCategory) {
            localStorage.setItem('aquaBotSelectedCategory', data.selectedCategory);
        } else {
            localStorage.removeItem('aquaBotSelectedCategory');
        }
        if (data.city) {
            localStorage.setItem('aquaBotCity', data.city);
        }
        if (data.selectedStation) {
            localStorage.setItem('aquaBotSelectedStation', data.selectedStation);
        }
        if (data.lastParameters) {
            localStorage.setItem('aquaBotLastParameters', JSON.stringify(data.lastParameters));
        } else {
            localStorage.removeItem('aquaBotLastParameters');
        }
    } catch (error) {
        console.error('Błąd:', error);
        messages.innerHTML += `<p class="bot-message">Oj, coś poszło nie tak! Spróbuj jeszcze raz.</p>`;
        messages.scrollTop = messages.scrollHeight;
    }
}