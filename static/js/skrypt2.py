import json

json_path = 'C:/Users/lpisk/Projects/aqua_test/static/js/waterAnalysis.json'

with open(json_path, 'r', encoding='utf-8') as file:
    data = json.load(file)

# Sprawdź, czy klucz istnieje
for city, info in data.items():
    if 'chlor' not in info['average']:
        print(f"Brak klucza 'chlor' dla {city}")
    else:
        chlorine_data = {city: info['average']['chlor'] for city, info in data.items()}
        for city, chlorine in chlorine_data.items():
            print(f"{city}: {chlorine} mg/l")