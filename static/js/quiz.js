import { waterStations } from './waterAnalysis.js';
import { getParameterDescription } from './utils.js';
import { startAquaBot } from './aquaBot.js';

export let skinQuizAnswers = {};
export let wellbeingQuizAnswers = {};
export let userCity = "";

export function toggleQuiz(type) {
    try {
        const skinQuiz = document.getElementById('quiz-skin');
        const wellbeingQuiz = document.getElementById('quiz-wellbeing');
        if (skinQuiz && wellbeingQuiz) {
            if (type === 'skin') {
                skinQuiz.style.display = skinQuiz.style.display === 'none' ? 'block' : 'none';
                wellbeingQuiz.style.display = 'none';
            } else if (type === 'wellbeing') {
                wellbeingQuiz.style.display = wellbeingQuiz.style.display === 'none' ? 'block' : 'none';
                skinQuiz.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Błąd w toggleQuiz:', error);
    }
}

export function checkQuizSkin() {
    try {
        skinQuizAnswers.q1 = document.querySelector('input[name="q1"]:checked')?.value;
        skinQuizAnswers.q2 = document.querySelector('input[name="q2"]:checked')?.value;
        skinQuizAnswers.q3 = document.querySelector('input[name="q3"]:checked')?.value;
        skinQuizAnswers.q4 = document.querySelector('input[name="q4"]:checked')?.value;
        skinQuizAnswers.q5 = document.querySelector('input[name="q5"]:checked')?.value;
        skinQuizAnswers.q6 = document.querySelector('input[name="q6"]:checked')?.value;
        skinQuizAnswers.q7 = document.querySelector('input[name="q7"]:checked')?.value;
        skinQuizAnswers.q8 = document.querySelector('input[name="q8"]:checked')?.value;
        skinQuizAnswers.q9 = document.querySelector('input[name="q9"]:checked')?.value;
        userCity = document.getElementById('city')?.value || "";

        if (!skinQuizAnswers.q1 || !skinQuizAnswers.q2 || !skinQuizAnswers.q3 || 
            !skinQuizAnswers.q4 || !skinQuizAnswers.q5 || !skinQuizAnswers.q6 || 
            !skinQuizAnswers.q7 || !skinQuizAnswers.q8 || !skinQuizAnswers.q9) {
            alert('Proszę odpowiedzieć na wszystkie pytania!');
            return;
        }

        let result = "";
        let filter = "<ul>";
        let recommendation = "";
        let miniTip = "";
        let premiumContent = "";
        let isPremium = localStorage.getItem('isPremium') === 'true';

        if (skinQuizAnswers.q1 === "sucha" && skinQuizAnswers.q2 === "tak" && skinQuizAnswers.q3 === "tak" && skinQuizAnswers.q4 === "kranówka" && skinQuizAnswers.q7 === "tak" && skinQuizAnswers.q8 === "codziennie") {
            result = "Twoja skóra cierpi! Sucha cera i AZS w połączeniu z twardą wodą oraz żelazem to przepis na podrażnienia.";
            recommendation = "Zwiększ nawodnienie do 2 litrów dziennie. Polecamy Nałęczowiankę (wapń 130 mg/l wspiera regenerację skóry).";
            miniTip = "Codzienne mycie twarzy kranówką może wysuszać cerę – ogranicz kontakt z wodą!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Rano: Wypij 0,5 l Nałęczowianki. Unikaj mycia twarzy kranówką – użyj przefiltrowanej wody.<br>
                - W ciągu dnia: Pij 1 l przefiltrowanej kranówki – filtr zmiękczający to must-have.<br>
                - Wieczorem: Wypij 0,5 l Żywiec Zdrój. Umyj twarz przefiltrowaną wodą.<br>
                <b>Porada eksperta:</b> Dr Anna Woda: Twarda woda wysusza cerę. Filtr zmiękczający to klucz!<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('skin')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Zmiękczający (99 zł) – na twardość</li><li>Eko-filtr (109 zł) – na metale</li><li>Premium (129 zł) – pełna ochrona</li></ul>";
        } else if (skinQuizAnswers.q1 === "normalna" && skinQuizAnswers.q2 === "nie" && skinQuizAnswers.q3 === "nie" && skinQuizAnswers.q7 === "nie" && skinQuizAnswers.q8 === "rzadko") {
            result = "Twoja skóra w dobrej formie! Brak osadu sugeruje, że woda jest OK.";
            recommendation = "Pij 1,5-2 litry dziennie. Spróbuj Żywiec Zdrój (magnez 20 mg/l).";
            miniTip = "Rzadkie mycie kranówką to dobry wybór!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Rano: Wypij 0,5 l Żywiec Zdrój. Możesz myć twarz kranówką.<br>
                - W ciągu dnia: Pij 1 l kranówki – filtr smakowy poprawi smak.<br>
                - Wieczorem: Wypij 0,5 l Nałęczowianki.<br>
                <b>Porada eksperta:</b> Dr Anna Woda: Regularne nawodnienie utrzyma cerę w formie.<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('skin')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Smakowy (99 zł) – dla smaku</li><li>Premium (129 zł) – pełna ochrona</li></ul>";
        } else {
            result = "Twoja skóra potrzebuje uwagi – woda może wpływać na jej stan.";
            recommendation = "Pij 2 litry dziennie – polecamy Nałęczowiankę.";
            miniTip = "Osad na kranie? To twarda woda – rozważ filtr!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Pij 2 litry dziennie, mieszaj kranówkę z butelkowaną.<br>
                - Rozważ filtr zmiękczający przy osadzie.<br>
                <b>Porada eksperta:</b> Dr Anna Woda: Twarda woda może szkodzić cerze.<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('skin')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Premium (129 zł) – pełna ochrona</li></ul>";
        }

        document.getElementById('quiz-skin-result').innerHTML = `<p>${result}</p><p>${recommendation}</p>${isPremium ? premiumContent : `<p><b>Mini-porada:</b> ${miniTip}</p><p>Chcesz szczegółowy plan? Premium (9,99 zł/mc) da wskazówki!</p>`}<p><b>Polecane filtry:</b> ${filter}</p>`;
    } catch (error) {
        console.error('Błąd w checkQuizSkin:', error);
        alert('Wystąpił błąd w quizie o cerze. Sprawdź konsolę (F12).');
    }
}

export function checkQuizWellbeing() {
    try {
        wellbeingQuizAnswers.q1 = document.querySelector('input[name="q1"]:checked')?.value;
        wellbeingQuizAnswers.q2 = document.querySelector('input[name="q2"]:checked')?.value;
        wellbeingQuizAnswers.q3 = document.querySelector('input[name="q3"]:checked')?.value;
        wellbeingQuizAnswers.q4 = document.querySelector('input[name="q4"]:checked')?.value;
        wellbeingQuizAnswers.q5 = document.querySelector('input[name="q5"]:checked')?.value;
        wellbeingQuizAnswers.q6 = document.querySelector('input[name="q6"]:checked')?.value;
        userCity = document.getElementById('city')?.value || "";

        if (!wellbeingQuizAnswers.q1 || !wellbeingQuizAnswers.q2 || !wellbeingQuizAnswers.q3 || 
            !wellbeingQuizAnswers.q4 || !wellbeingQuizAnswers.q5 || !wellbeingQuizAnswers.q6) {
            alert('Proszę odpowiedzieć na wszystkie pytania!');
            return;
        }

        let result = "";
        let filter = "<ul>";
        let recommendation = "";
        let miniTip = "";
        let premiumContent = "";
        let isPremium = localStorage.getItem('isPremium') === 'true';

        if (wellbeingQuizAnswers.q1 === "tak" && wellbeingQuizAnswers.q2 === "tak" && wellbeingQuizAnswers.q3 === "tak" && wellbeingQuizAnswers.q4 === "tak" && wellbeingQuizAnswers.q5 === "rzadko" && wellbeingQuizAnswers.q6 === "kranówka") {
            result = "Twoje samopoczucie potrzebuje wsparcia! Zmęczenie i stres mogą wynikać z niedoborów.";
            recommendation = "Pij 2 litry dziennie – Nałęczowianka (magnez 24 mg/l).";
            miniTip = "Mało pijesz – to nasila zmęczenie. Pij więcej w małych porcjach!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Pij 2 litry dziennie, ustaw przypomnienia co 2h (200 ml).<br>
                - Rano: 0,5 l Nałęczowianki – magnez doda energii.<br>
                - Dzień: 1 l przefiltrowanej kranówki – ${userCity && waterStations[userCity] ? `w ${userCity} woda jest twarda (${waterStations[userCity].average.twardosc} mg/l)` : "rozważ filtr zmiękczający"}.<br>
                - Wieczór: 0,5 l Nałęczowianki – wspiera sen.<br>
                <b>Porada eksperta:</b> Dr Jan: Regularne nawodnienie i filtr zmiękczający pomogą!<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('wellbeing')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Zmiękczający (99 zł) – na twardość</li><li>Premium (129 zł) – pełna ochrona</li></ul>";
        } else if (wellbeingQuizAnswers.q1 === "nie" && wellbeingQuizAnswers.q2 === "nie" && wellbeingQuizAnswers.q3 === "nie" && wellbeingQuizAnswers.q5 === "regularnie" && wellbeingQuizAnswers.q6 === "butelkowana") {
            result = "Twoje samopoczucie jest OK! Regularne nawodnienie to klucz.";
            recommendation = "Pij 2 litry – Żywiec Zdrój (magnez 20 mg/l).";
            miniTip = "Butelkowana woda ma mikroplastik – filtr eko pomoże!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Pij 2 litry dziennie – Żywiec Zdrój.<br>
                - Rozważ filtr eko na mikroplastik.<br>
                <b>Porada eksperta:</b> Dr Jan: Utrzymaj nawodnienie i unikaj mikroplastiku!<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('wellbeing')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Eko-filtr (109 zł) – na mikroplastik</li><li>Premium (129 zł) – pełna ochrona</li></ul>";
        } else {
            result = "Twoje samopoczucie może być lepsze – woda pomoże!";
            recommendation = "Pij 2 litry – Nałęczowianka.";
            miniTip = "Zestresowany? Regularne picie wody łagodzi napięcie!";
            premiumContent = `
                <b>Szczegółowy plan:</b><br>
                - Pij 2 litry dziennie – Nałęczowianka.<br>
                - ${wellbeingQuizAnswers.q2 === "tak" ? "Problemy ze snem? Unikaj ekranów przed snem." : ""}<br>
                <b>Porada eksperta:</b> Dr Jan: Nawodnienie i relaks to klucz.<br>
                <button onclick="showSection('aqua-bot'); startAquaBot('wellbeing')">Porozmawiaj z AquaBotem!</button>
            `;
            filter += "<li>Premium (129 zł) – pełna ochrona</li></ul>";
        }

        document.getElementById('quiz-wellbeing-result').innerHTML = `<p>${result}</p><p>${recommendation}</p>${isPremium ? premiumContent : `<p><b>Mini-porada:</b> ${miniTip}</p><p>Chcesz szczegółowy plan? Premium (9,99 zł/mc) da wskazówki!</p>`}<p><b>Polecane filtry:</b> ${filter}</p>`;
    } catch (error) {
        console.error('Błąd w checkQuizWellbeing:', error);
        alert('Wystąpił błąd w quizie o samopoczuciu. Sprawdź konsolę (F12).');
    }
}