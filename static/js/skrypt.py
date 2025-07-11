import json

# Zmień ścieżkę, jeśli JSON jest gdzie indziej
json_path = 'C:/Users/lpisk/Projects/aqua_testbackup/static/js/waterAnalysis.json'

with open(json_path, 'r', encoding='utf-8') as file:
    data = json.load(file)

hardness_data = {city: info['average']['twardosc'] for city, info in data.items()}
for city, hardness in hardness_data.items():
    print(f"{city}: {hardness} mg/l")