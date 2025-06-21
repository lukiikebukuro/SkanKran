import json
import random
import re
import unicodedata
import os
from dotenv import load_dotenv
from openai import OpenAI
from fuzzywuzzy import process, fuzz
import time

load_dotenv()
XAI_API_KEY = os.getenv('XAI_API_KEY')

def normalize_name(name):
    """Normalizuje nazwy, usuwając znaki diakrytyczne i zamieniając na małe litery."""
    return ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn').lower().strip()

def parseFloat(value):
    """Parsuje wartości, w tym '<0.1', na float."""
    if isinstance(value, str) and value.startswith('<'):
        return float(value.replace('<', ''))
    try:
        return float(value)
    except (ValueError, TypeError):
        print(f"[DEBUG] Błąd konwersji: {value} nie jest konwertowalne na float")
        return None

def normalize_keys(d):
    """Rekurencyjnie normalizuje klucze w słowniku lub liście."""
    if isinstance(d, dict):
        return {normalize_name(k): normalize_keys(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [normalize_keys(item) for item in d]
    return d

class AquaBot:
    CATEGORY_ALIASES = {
        "zdrowie": ["zdrowie", "zdrowie fizyczne", "fizyczne", "zdrowie fiz"],
        "uroda": ["uroda", "piękno", "wygląd"],
        "codzienne_uzycie": ["codzienne użycie", "użycie", "gotowanie", "picie"],
    }

    SUBCATEGORIES = {
        "zdrowie": ["Picie wody", "Alergie", "Dzieci", "Autoimmunologia/Choroby"],
        "uroda": ["Skóra", "Włosy", "Oczy"],
        "codzienne_uzycie": ["Prysznic i kąpiel", "Zmywanie naczyń", "Pranie", "Sprzątanie"]
    }

    CITY_ALIASES = {
        "wwa": "warszawa",
        "krk": "krakow",
        "wro": "wrocław",
        "pozn": "poznan",
        "gd": "gdansk",
        "szcz": "szczecin",
    }

    def __init__(self, userName, city, addressStyle, selectedStation=None, waitingForCategory=False, lastParameters=[], selectedCategory=None, waitingForSubcategory=False, expectingCity=False, in_conversation=False):
        self.userName = addressStyle
        self.city = city or None
        self.addressStyle = addressStyle or "przyjacielu"
        self.waiting_for_category = waitingForCategory
        self.selected_category = selectedCategory
        self.waiting_for_subcategory = waitingForSubcategory
        self.last_parameters = lastParameters
        self.chat_history = []
        self.expecting_city = expectingCity
        self.in_conversation = in_conversation

        self.client = OpenAI(api_key=XAI_API_KEY, base_url="https://api.x.ai/v1")

        try:
            with open('static/js/waterAnalysis.json', 'r', encoding='utf-8') as f:
                self.water_data = json.load(f)
            self.water_data = normalize_keys(self.water_data)
            print(f"[DEBUG] Loaded cities: {list(self.water_data.keys())}")
        except Exception as e:
            print(f"Błąd ładowania waterAnalysis.json: {e}")
            self.water_data = {}

        try:
            with open('advice_templates.json', 'r', encoding='utf-8') as f:
                self.advice_templates = json.load(f)
        except Exception as e:
            print(f"Błąd ładowania advice_templates.json: {e}")
            self.advice_templates = {}

        self.normy = {
            'ph': {'type': 'range', 'green_min': 7.0, 'green_max': 8.5, 'orange_min': 6.5, 'orange_max': 9.5},
            'twardosc': {'type': 'upper', 'thresholds': {'orange': 150, 'red': 220}},
            'azotany': {'type': 'upper', 'thresholds': {'orange': 10, 'red': 20}},
            'zelazo': {'type': 'upper', 'thresholds': {'orange': 0.1, 'red': 0.2}},
            'fluorki': {'type': 'upper', 'thresholds': {'orange': 1.2, 'red': 1.5}},
            'chlor': {'type': 'upper', 'thresholds': {'orange': 0.15, 'red': 0.27}},
            'mangan': {'type': 'upper', 'thresholds': {'orange': 20, 'red': 50}},
            'chlorki': {'type': 'upper', 'thresholds': {'orange': 125, 'red': 250}},
            'siarczany': {'type': 'upper', 'thresholds': {'orange': 125, 'red': 250}},
            'barwa': {'type': 'upper', 'thresholds': {'orange': 7.5, 'red': 15}},
            'magnez': {'type': 'upper', 'thresholds': {'orange': 25, 'red': 50}},
            'potas': {'type': 'upper', 'thresholds': {'orange': 6, 'red': 12}},
            'olow': {'type': 'upper', 'thresholds': {'orange': 5, 'red': 10}},
            'rtec': {'type': 'upper', 'thresholds': {'orange': 0.5, 'red': 1}},
        }

        self.all_parameters = list(self.normy.keys())
        self.param_aliases = {
            'ph': ['ph', 'pH', 'ph?', 'pH?'],
            'twardosc': ['twardosc', 'twardość', 'twardosci', 'twardoscia', 'twardosc?'],
            'azotany': ['azotany', 'azotanami', 'azotanow', 'azotany?'],
            'zelazo': ['zelazo', 'żelazo', 'zelaza', 'żelaza', 'zelazo?'],
            'fluorki': ['fluorki', 'fluorkami', 'fluorkow', 'fluorki?', 'fluor', 'fluorem', 'fluor?'],
            'chlor': ['chlor', 'chlorem', 'chlory', 'chlor?'],
            'mangan': ['mangan', 'manganem', 'mangany', 'mangan?'],
            'chlorki': ['chlorki', 'chlorkami', 'chlorkow', 'chlorki?'],
            'siarczany': ['siarczany', 'siarczanami', 'siarczanow', 'siarczany?'],
            'barwa': ['barwa', 'barwe', 'barwy', 'barwa?'],
            'magnez': ['magnez', 'magnezem', 'magnezu', 'magnez?'],
            'potas': ['potas', 'potasem', 'potasu', 'potas?'],
            'olow': ['olow', 'ołów', 'ołowiem', 'olow?'],
            'rtec': ['rtec', 'rtęć', 'rtecia', 'rtec?'],
        }
        self.status_descriptions = {
            'green': "OK",
            'orange': "podwyższone",
            'red': "za wysokie"
        }

        if selectedStation:
            if isinstance(selectedStation, str):
                self.selected_station = self.find_station_by_name(selectedStation)
            else:
                self.selected_station = selectedStation
        else:
            self.selected_station = None
        print(f"[DEBUG] Set selected_station: {self.selected_station}")

        if self.selected_station and not self.in_conversation and not waitingForCategory and not waitingForSubcategory:
            self.setStation(self.selected_station['name'])

    def find_station_by_name(self, station_name):
        """Znajduje stację na podstawie nazwy i miasta."""
        if not self.city:
            return None
        city_key = normalize_name(self.city)
        if city_key not in self.water_data:
            return None
        stations = self.water_data[city_key].get('stations', [])
        normalized_input = normalize_name(station_name)
        for station in stations:
            if normalized_input in normalize_name(station['name']):
                return station
        return None

    def call_xai_api(self, prompt, parameters_out_of_norm=[], subcategory=None, max_tokens=100):
        """Wywołuje API Grok 3 z historią rozmowy i danymi o parametrach wody."""
        cache_file = "cache.json"
        try:
            with open(cache_file, "r") as f:
                cache = json.load(f)
            if prompt in cache:
                return cache[prompt]
        except FileNotFoundError:
            cache = {}

        params_description = ""
        if parameters_out_of_norm:
            params_description = "Parametry wody poza normą: " + ", ".join([f"{p['name']}: {p['value']} {p['unit']}" for p in parameters_out_of_norm]) + "."

        system_prompt = (
            f"Jesteś AquaBot, ekspert od wody, troszczący się o użytkownika. "
            f"Odpowiadaj krótko (max 80 znaków), merytorycznie i wspierająco. "
            f"Używaj kontekstu ostatnich 5 wiadomości. "
            f"Parametry wody: {params_description} "
            f"Podkategoria: {subcategory}. "
            f"Skup się na wpływie parametrów na {subcategory} w {self.selected_category}. "
            f"Przykład: 'Wysoka twardość? Użyj filtra, {self.userName}!'"
        )

        messages = [{"role": "system", "content": system_prompt}]
        for hist in self.chat_history[-5:]:
            if hist.startswith("Użytkownik:"):
                messages.append({"role": "user", "content": hist.replace("Użytkownik: ", "")})
            else:
                messages.append({"role": "assistant", "content": hist.replace("AquaBot: ", "")})
        messages.append({"role": "user", "content": prompt})

        for attempt in range(3):
            try:
                completion = self.client.chat.completions.create(
                    model="grok-3",
                    messages=messages,
                    max_tokens=100,
                    temperature=0.9,
                    top_p=0.9
                )
                content = completion.choices[0].message.content.strip()
                if len(content) > 80:
                    last_space = content[:80].rfind(' ')
                    content = content[:last_space] if last_space != -1 else content[:80]
                reply = content if content and len(content) >= 20 else f"Ups, coś poszło nie tak, {self.userName}!"
                cache[prompt] = reply
                with open(cache_file, "w") as f:
                    json.dump(cache, f)
                return reply
            except Exception as e:
                print(f"Błąd API Grok 3: {e}")
                time.sleep(2 ** attempt)
        return f"Coś nie działa, {self.userName}! Spróbuj później."

    def match_city(self, user_input):
        """Dopasowuje miasto na podstawie aliasów lub fuzzy matching."""
        user_input = normalize_name(user_input)
        print(f"[DEBUG] Normalized input: {user_input}")
        if user_input in self.CITY_ALIASES:
            print(f"[DEBUG] Found in aliases: {self.CITY_ALIASES[user_input]}")
            return self.CITY_ALIASES[user_input]
        print(f"[DEBUG] Available normalized cities: {list(self.water_data.keys())}")
        best_match = process.extractOne(user_input, self.water_data.keys(), scorer=fuzz.ratio)
        if best_match and best_match[1] >= 80:
            print(f"[DEBUG] Best match: {best_match[0]} with score {best_match[1]}")
            return best_match[0]
        print("[DEBUG] No match found")
        return None

    def setStation(self, station_name):
        """Ustawia stację i zwraca parametry poza normą."""
        if not self.city:
            return {'message': f"Podaj miasto, {self.addressStyle}! Np. 'Warszawa'.", 'parameters': []}
        city_key = normalize_name(self.city)
        if city_key not in self.water_data:
            return {'message': f"Brak danych dla {self.city}, {self.addressStyle}!", 'parameters': []}
        stations = self.water_data[city_key].get('stations', [])
        if not stations:
            return {'message': f"Brak stacji w {self.city}, {self.addressStyle}!", 'parameters': []}
        normalized_input = normalize_name(station_name)
        for station in stations:
            if normalized_input in normalize_name(station['name']):
                self.selected_station = station
                out_of_norm = self.get_out_of_norm_parameters()
                if out_of_norm:
                    self.last_parameters = [param['name'].lower() for param in out_of_norm]
                    self.waiting_for_category = True
                    return {'message': f"Stacja: {station['name']}. Parametry poza normą:", 'parameters': out_of_norm}
                return {'message': f"Stacja: {station['name']}. Woda w normie!", 'parameters': []}
        return {'message': f"Nie znalazłem '{station_name}' w {self.city}.", 'parameters': []}

    def get_out_of_norm_parameters(self):
        """Zwraca parametry poza normą w formacie JSON."""
        if not self.selected_station or 'data' not in self.selected_station:
            return []
        data = self.selected_station['data']
        out_of_norm = []
        for param, norm in self.normy.items():
            if param in data and data[param] is not None:
                value = parseFloat(data[param])
                if value == 0:
                    continue
                status = self.get_parameter_status(param, value)
                if status in ['orange', 'red']:
                    unit = "μg/l" if param in ['olow', 'rtec', 'mangan'] else "mg/l"
                    out_of_norm.append({"name": param.capitalize(), "value": value, "unit": unit})
        return out_of_norm

    def get_parameter_status(self, param, value):
        """Określa status parametru względem normy. Wymusza konwersję na float."""
        norm = self.normy.get(param, {})
        if not norm or value is None:
            return 'green'
        try:
            value = float(value)  # Dodatkowa konwersja na float
        except (ValueError, TypeError):
            print(f"[DEBUG] Błąd konwersji w get_parameter_status dla {param}: {value}")
            return 'green'
        if norm['type'] == 'range':
            if norm['green_min'] <= value <= norm['green_max']:
                return 'green'
            elif norm['orange_min'] <= value <= norm['orange_max']:
                return 'orange'
            return 'red'
        elif norm['type'] == 'upper':
            if value <= norm['thresholds']['orange']:
                return 'green'
            elif value <= norm['thresholds']['red']:
                return 'orange'
            return 'red'
        return 'green'

    def match_category(self, message):
        """Dopasowuje kategorię."""
        message = normalize_name(message)
        for category, aliases in self.CATEGORY_ALIASES.items():
            if any(normalize_name(alias) in message for alias in aliases):
                return category
        return None

    def match_subcategory(self, category, user_input):
        """Dopasowuje podkategorię."""
        user_input = normalize_name(user_input)
        subcats = self.SUBCATEGORIES.get(category, [])
        best_score = 0
        best_subcat = None
        for subcat in subcats:
            norm_subcat = normalize_name(subcat)
            score = fuzz.token_sort_ratio(user_input, norm_subcat)
            if score > best_score:
                best_score = score
                best_subcat = subcat
        if best_score >= 80:
            return best_subcat
        return None

    def getHealthAdvice(self, message=""):
        """Obsługuje zapytania z podkategoriami i templatekami. Dodano debugowanie."""
        print(f"[DEBUG] getHealthAdvice: message={message}, waiting_for_category={self.waiting_for_category}, waiting_for_subcategory={self.waiting_for_subcategory}, in_conversation={self.in_conversation}")
        message_lower = message.lower().strip()
        normalized_message = normalize_name(message_lower)

        self.chat_history.append(f"Użytkownik: {message}")
        if len(self.chat_history) > 10:
            self.chat_history = self.chat_history[-10:]

        # Jeśli jesteśmy w trybie rozmowy, używamy Grok 3 API
        if self.in_conversation:
            reply = self.call_xai_api(message)
            self.chat_history.append(f"AquaBot: {reply}")
            return {
                'message': reply,
                'parameters': [],
                'waitingForCategory': False,
                'waitingForSubcategory': False,
                'in_conversation': True,
                'selectedCategory': self.selected_category,
                'city': self.city
            }

        # Sprawdzanie zmiany miasta
        matched_city = self.match_city(normalized_message)
        if matched_city:
            self.city = matched_city
            self.selected_station = None
            self.waiting_for_category = False
            self.waiting_for_subcategory = False
            self.selected_category = None
            self.last_parameters = []
            self.expecting_city = False
            self.in_conversation = False
            message = f"Zmieniłem na {matched_city.capitalize()}, {self.addressStyle}! 😊 Wybierz stację, np. 'SUW {matched_city.capitalize()}'."
            return {
                'message': message,
                'parameters': [],
                'waitingForCategory': False,
                'waitingForSubcategory': False,
                'in_conversation': False,
                'selectedCategory': None,
                'city': self.city
            }

        if not self.city:
            return {
                'message': f"Skąd jesteś, {self.addressStyle}? Np. 'Warszawa'.",
                'parameters': [],
                'waitingForCategory': False,
                'waitingForSubcategory': False,
                'in_conversation': False,
                'selectedCategory': None
            }

        if self.city and not self.selected_station:
            station_result = self.setStation(message)
            self.chat_history.append(f"AquaBot: {station_result['message']}")
            return {
                **station_result,
                'waitingForCategory': self.waiting_for_category,
                'waitingForSubcategory': self.waiting_for_subcategory,
                'in_conversation': False,
                'selectedCategory': self.selected_category,
                'city': self.city
            }

        if self.waiting_for_category:
            category = self.match_category(message_lower)
            print(f"[DEBUG] Dopasowana kategoria: {category}")
            if category:
                self.selected_category = category
                self.waiting_for_category = False
                self.waiting_for_subcategory = True
                subcats = self.SUBCATEGORIES.get(category, [])
                message = f"Wybrałeś {category}. Wybierz podkategorię:<br>" + "<br>".join([f"- {subcat}" for subcat in subcats])
                return {
                    'message': message,
                    'parameters': [],
                    'waitingForCategory': False,
                    'waitingForSubcategory': True,
                    'in_conversation': False,
                    'selectedCategory': category
                }
            message = f"Wpisz np. 'zdrowie', 'uroda', 'codzienne użycie'."
            return {
                'message': message,
                'parameters': [],
                'waitingForCategory': True,
                'waitingForSubcategory': False,
                'in_conversation': False,
                'selectedCategory': self.selected_category
            }

        elif self.waiting_for_subcategory:
            subcategory = self.match_subcategory(self.selected_category, message_lower)
            print(f"[DEBUG] Dopasowana podkategoria: {subcategory}")
            if subcategory:
                advice = []
                for param in self.last_parameters:
                    raw_value = self.selected_station['data'].get(param, None)
                    print(f"[DEBUG] Param: {param}, Raw value: {raw_value}, Type: {type(raw_value)}")
                    value = parseFloat(raw_value)
                    print(f"[DEBUG] Parsed value: {value}, Type: {type(value)}")
                    if value is not None:
                        status = self.get_parameter_status(param, value)
                        print(f"[DEBUG] Status: {status}")
                        # Pobierz dane z advice_templates: kategoria -> podkategoria -> parametr -> status
                        category_data = self.advice_templates.get(self.selected_category, {})
                        subcategory_data = category_data.get(subcategory, {})
                        param_data = subcategory_data.get(param, {})
                        advice_text = param_data.get(status)
                        if advice_text:
                            # Wstaw wartość parametru do tekstu porady
                            advice.append(advice_text.format(value=value))
                if advice:
                    reply = "<br>".join(advice) + "<br>Chcesz wiedzieć więcej? Dopytaj!"
                else:
                    reply = "Brak dostępnych porad dla wybranych parametrów."
                self.waiting_for_subcategory = False
                self.in_conversation = True
                return {
                    'message': reply,
                    'parameters': [],
                    'waitingForCategory': False,
                    'waitingForSubcategory': False,
                    'in_conversation': True,
                    'selectedCategory': self.selected_category
                }
            subcats = self.SUBCATEGORIES.get(self.selected_category, [])
            message = f"Wybierz podkategorię:<br>" + "<br>".join([f"- {subcat}" for subcat in subcats])
            return {
                'message': message,
                'parameters': [],
                'waitingForCategory': False,
                'waitingForSubcategory': True,
                'in_conversation': False,
                'selectedCategory': self.selected_category
            }

        reply = self.call_xai_api(message)
        self.chat_history.append(f"AquaBot: {reply}")
        return {
            'message': reply,
            'parameters': [],
            'waitingForCategory': False,
            'waitingForSubcategory': False,
            'in_conversation': True,
            'selectedCategory': self.selected_category,
            'city': self.city
        }