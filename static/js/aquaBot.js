import { getColor } from './utils.js';

export function startAquaBot(type) {
    console.log('Inicjalizacja AquaBot dla typu:', type);
    const botSection = document.getElementById('aqua-bot');
    const messages = document.getElementById(`aqua-bot-${type}-messages`);
    const input = document.getElementById(`aqua-bot-${type}-input`);
    const sendButton = document.getElementById(`aqua-bot-${type}-send`);

    if (!botSection || !messages || !input || !sendButton) {
        console.error('Brak elementów czatu dla typu:', type);
        alert('Wystąpił błąd: Brak elementów czatu.');
        return;
    }


    const addressStyle = localStorage.getItem('aquaBotAddressStyle');
    let city = localStorage.getItem('aquaBotCity');

    if (!addressStyle) {
        messages.innerHTML = '<p class="bot-message">Cześć!Jestem AquaBot. Powiem Ci jak parametry z twojej stacji wpływają na włosy, choroby czy czajnik :)  Jak mam się do Ciebie zwracać? 😊</p>';
    } else if (!city) {
        messages.innerHTML = `<p class="bot-message">Super, ${addressStyle}! Skąd jesteś? 😊</p>`;
    } else {
        messages.innerHTML = `<p class="bot-message">Cześć, ${addressStyle} z ${city}! Jak mogę Ci pomóc? 😊</p>`;
    }
    input.value = '';

    sendButton.onclick = () => sendMessage(type, input, messages);
    input.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage(type, input, messages);
    };

    messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(type, input, messages) {
    const userMessage = input.value.trim();
    if (!userMessage) return;

    messages.innerHTML += `<p class="user-message">${userMessage}</p>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
        let addressStyle = localStorage.getItem('aquaBotAddressStyle');
        let userCity = localStorage.getItem('aquaBotCity');
        let selectedStation = localStorage.getItem('aquaBotSelectedStation');
        let waitingForCategory = localStorage.getItem('aquaBotWaitingForCategory') === 'true';
        let waitingForSubcategory = localStorage.getItem('aquaBotWaitingForSubcategory') === 'true';
        let selectedCategory = localStorage.getItem('aquaBotSelectedCategory');
        let lastParameters = JSON.parse(localStorage.getItem('aquaBotLastParameters') || '[]');

        // Krok 1: Jeśli nie ma addressStyle, ustaw go
        if (!addressStyle) {
            addressStyle = userMessage;
            localStorage.setItem('aquaBotAddressStyle', addressStyle);
            messages.innerHTML += `<p class="bot-message">Super, ${addressStyle}! Skąd jesteś? (Np. Warszawa, Kraków) 😊</p>`;
            messages.scrollTop = messages.scrollHeight;
            return;
        }

        // Krok 2: Jeśli nie ma userCity, zweryfikuj miasto
        if (!userCity) {
            const response = await fetch('http://127.0.0.1:3000/verify_city', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: userMessage })
            });
            const data = await response.json();
            console.log("[DEBUG] Verify city response:", data);

            if (data.valid) {
                userCity = data.city;
                localStorage.setItem('aquaBotCity', userCity);
                messages.innerHTML += `<p class="bot-message">Okej, ${addressStyle} z ${userCity.charAt(0).toUpperCase() + userCity.slice(1)}! Wybierz najbliższą geograficznie stacje, znajdziesz ją w zakładce "znajdź stacje" </p>`;
            } else {
                messages.innerHTML += `<p class="bot-message">Nie znam miasta '${userMessage}', ${addressStyle}! 😕 Wpisz np. 'Warszawa' lub 'Kraków'.</p>`;
            }
            messages.scrollTop = messages.scrollHeight;
            return;
        }

        // Krok 3: Wysyłanie żądania do /aquabot z pełnym stanem
        const response = await fetch('http://127.0.0.1:3000/aquabot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                addressStyle: addressStyle,
                city: userCity,
                selectedStation: selectedStation,
                waitingForCategory: waitingForCategory,
                waitingForSubcategory: waitingForSubcategory,
                selectedCategory: selectedCategory,
                lastParameters: lastParameters,
                in_conversation: waitingForCategory || waitingForSubcategory || selectedCategory
            })
        });

        if (!response.ok) {
            throw new Error(`Błąd HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("[DEBUG] AquaBot response:", data);

        const reply = data.reply;
        if (reply && reply.message) {
            let replyHtml = `<p>${reply.message}</p>`;
            if (reply.parameters && reply.parameters.length > 0) {
                console.log("[DEBUG] Rendering parameters:", reply.parameters);
                replyHtml += '<div>Parametry poza normą:<ul>';
                reply.parameters.forEach(param => {
                    const colorClass = getColor(param.name.toLowerCase(), param.value);
                    replyHtml += `<li>${param.name}: ${param.value} ${param.unit} <span class="dot ${colorClass}"></span></li>`;
                });
                replyHtml += '</ul></div>';
                replyHtml += '<p>Wpisz kategorię, np.<br>- zdrowie<br>- uroda<br>- codzienne użycie</p>';
            }
            messages.innerHTML += `<div class="bot-message">${replyHtml}</div>`;
        } else {
            console.log("[DEBUG] No valid reply message found in response");
            messages.innerHTML += `<p class="bot-message">Brak odpowiedzi, spróbuj ponownie! 😅</p>`;
        }
        messages.scrollTop = messages.scrollHeight;

        // Reset stanu po zmianie miasta
        if (data.message && data.message.includes('Zmieniłem na')) {
            localStorage.setItem('aquaBotSelectedStation', null);
            localStorage.setItem('aquaBotWaitingForCategory', false);
            localStorage.setItem('aquaBotWaitingForSubcategory', false);
            localStorage.setItem('aquaBotSelectedCategory', null);
            localStorage.setItem('aquaBotLastParameters', '[]');
        }

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
        console.error('Błąd w sendMessage:', error);
        messages.innerHTML += `<p class="bot-message">Ups, nie mogę połączyć się z serwerem! Sprawdź, czy serwer działa.</p>`;
        messages.scrollTop = messages.scrollHeight;
    }
}