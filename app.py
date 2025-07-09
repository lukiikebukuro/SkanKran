from flask import Flask, render_template, send_from_directory, request, jsonify
import sqlite3
from datetime import datetime
from aquabotBackend import AquaBot
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Inicjalizacja bazy danych
def init_db():
    print("[DEBUG] Inicjalizuję bazę danych")
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        post_count INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_premium_only INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    conn.commit()
    conn.close()
    print("[DEBUG] Baza danych zainicjalizowana")

init_db()

# Endpointy główne
@app.route('/')
def home():
    print("[DEBUG] Wyświetlam stronę główną")
    return render_template('index.html')

@app.route('/manifest.json')
def manifest():
    print("[DEBUG] Serwuję manifest.json")
    return send_from_directory('.', 'manifest.json')

@app.route('/static/icon.png')
def serve_icon():
    print("[DEBUG] Serwuję ikonę")
    return send_from_directory('static', 'icon.png')

@app.route('/static/js/<path:path>')
def serve_js(path):
    print(f"[DEBUG] Serwuję plik JS: {path}")
    return send_from_directory('static/js', path)

# Endpointy społecznościowe
@app.route('/posts', methods=['GET'])
def get_posts():
    print("[DEBUG] Pobieram posty")
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('''SELECT p.id, p.content, p.timestamp, u.username, u.post_count, u.is_premium, p.is_premium_only
                 FROM posts p LEFT JOIN users u ON p.user_id = u.id
                 ORDER BY u.is_premium DESC, p.timestamp DESC''')
    posts = c.fetchall()
    posts_data = []
    for post in posts:
        post_id, content, timestamp, username, post_count, is_premium, is_premium_only = post
        print(f"[DEBUG] Przetwarzam post ID: {post_id}, użytkownik: {username}")
        if is_premium:
            if post_count >= 200:
                rank = "Król H2O"
            elif post_count >= 50:
                rank = "Wodny Ambasador"
            else:
                rank = "Wodny Nowicjusz"
        else:
            if post_count >= 100:
                rank = "Mistrz H2O"
            else:
                rank = "Wodny Nowicjusz"
        c.execute('''SELECT c.id, c.content, c.timestamp, u.username, u.is_premium
                     FROM comments c JOIN users u ON c.user_id = u.id
                     WHERE c.post_id = ?''', (post_id,))
        comments = c.fetchall()
        comments_data = []
        for comment in comments:
            comment_id, comment_content, comment_timestamp, comment_username, comment_is_premium = comment
            comments_data.append({
                'id': comment_id,
                'content': comment_content,
                'timestamp': comment_timestamp,
                'username': comment_username,
                'is_premium': bool(comment_is_premium)
            })
        posts_data.append({
            'id': post_id,
            'content': content,
            'timestamp': timestamp,
            'username': username,
            'rank': rank,
            'is_premium': bool(is_premium),
            'is_premium_only': bool(is_premium_only),
            'comments': comments_data
        })
    conn.close()
    print(f"[DEBUG] Zwrócono {len(posts_data)} postów")
    return jsonify(posts_data)

@app.route('/add_post', methods=['POST'])
def add_post():
    data = request.get_json()
    print(f"[DEBUG] Dodaję post, dane: {data}")
    username = data.get('username')
    content = data.get('content')
    is_premium_only = data.get('is_premium_only', 0)
    if not username or not content:
        print("[DEBUG] Brak username lub content")
        return jsonify({'error': 'Brak nazwy użytkownika lub treści'}), 400
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('SELECT id, post_count, is_premium FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    if not user:
        print(f"[DEBUG] Nowy użytkownik: {username}")
        c.execute('INSERT INTO users (username, post_count) VALUES (?, 0)', (username,))
        c.execute('SELECT id FROM users WHERE username = ?', (username,))
        user_id = c.fetchone()[0]
    else:
        user_id, post_count, is_premium = user
        print(f"[DEBUG] Istniejący użytkownik: {username}, premium: {is_premium}")
        c.execute('UPDATE users SET post_count = post_count + 1 WHERE id = ?', (user_id,))
        if is_premium_only and not is_premium:
            conn.close()
            print("[DEBUG] Próba premium-only bez premium")
            return jsonify({'error': 'Tylko użytkownicy premium mogą tworzyć tematy premium-only'}), 403
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    c.execute('INSERT INTO posts (user_id, content, timestamp, is_premium_only) VALUES (?, ?, ?, ?)', 
              (user_id, content, timestamp, is_premium_only))
    conn.commit()
    conn.close()
    print("[DEBUG] Post dodany pomyślnie")
    return jsonify({'message': 'Post dodany'}), 200

@app.route('/add_comment', methods=['POST'])
def add_comment():
    data = request.get_json()
    print(f"[DEBUG] Dodaję komentarz, dane: {data}")
    username = data.get('username')
    post_id = data.get('post_id')
    content = data.get('content')
    if not username or not post_id or not content:
        print("[DEBUG] Brak wymaganych danych komentarza")
        return jsonify({'error': 'Brak wymaganych danych'}), 400
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('SELECT id, is_premium FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    if not user:
        print(f"[DEBUG] Nowy użytkownik dla komentarza: {username}")
        c.execute('INSERT INTO users (username, post_count) VALUES (?, 0)', (username,))
        c.execute('SELECT id FROM users WHERE username = ?', (username,))
        user_id = c.fetchone()[0]
    else:
        user_id, is_premium = user
        print(f"[DEBUG] Użytkownik komentarza: {username}, premium: {is_premium}")
        c.execute('SELECT is_premium_only FROM posts WHERE id = ?', (post_id,))
        post = c.fetchone()
        if post and post[0] and not is_premium:
            conn.close()
            print("[DEBUG] Próba komentarza premium-only bez premium")
            return jsonify({'error': 'Tylko użytkownicy premium mogą komentować w tematach premium-only'}), 403
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    c.execute('INSERT INTO comments (post_id, user_id, content, timestamp) VALUES (?, ?, ?, ?)',
              (post_id, user_id, content, timestamp))
    conn.commit()
    conn.close()
    print("[DEBUG] Komentarz dodany pomyślnie")
    return jsonify({'message': 'Komentarz dodany'}), 200

@app.route('/user_stats/<username>', methods=['GET'])
def user_stats(username):
    print(f"[DEBUG] Pobieram statystyki użytkownika: {username}")
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('SELECT post_count, is_premium FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    if not user:
        conn.close()
        print("[DEBUG] Użytkownik nie istnieje")
        return jsonify({'error': 'Użytkownik nie istnieje'}), 404
    post_count, is_premium = user
    if is_premium:
        if post_count >= 200:
            rank = "Król H2O"
        elif post_count >= 50:
            rank = "Wodny Ambasador"
        else:
            rank = "Wodny Nowicjusz"
    else:
        if post_count >= 100:
            rank = "Mistrz H2O"
        else:
            rank = "Wodny Nowicjusz"
    conn.close()
    print(f"[DEBUG] Statystyki: post_count={post_count}, rank={rank}")
    return jsonify({
        'username': username,
        'post_count': post_count,
        'rank': rank,
        'is_premium': bool(is_premium)
    })

@app.route('/toggle_premium', methods=['POST'])
def toggle_premium():
    data = request.get_json()
    print(f"[DEBUG] Przełączam premium, dane: {data}")
    username = data.get('username')
    if not username:
        print("[DEBUG] Brak username")
        return jsonify({'error': 'Brak nazwy użytkownika'}), 400
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('SELECT id, is_premium FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    if not user:
        conn.close()
        print("[DEBUG] Użytkownik nie istnieje")
        return jsonify({'error': 'Użytkownik nie istnieje'}), 404
    user_id, is_premium = user
    new_status = 0 if is_premium else 1
    c.execute('UPDATE users SET is_premium = ? WHERE id = ?', (new_status, user_id))
    conn.commit()
    conn.close()
    print(f"[DEBUG] Premium zmienione na: {new_status}")
    return jsonify({'message': f'Status premium {"włączony" if new_status else "wyłączony"}'}), 200

@app.route('/edit_post', methods=['POST'])
def edit_post():
    data = request.get_json()
    print(f"[DEBUG] Edytuję post, dane: {data}")
    post_id = data.get('post_id')
    content = data.get('content')
    username = data.get('username')
    if not post_id or not content or not username:
        print("[DEBUG] Brak wymaganych danych")
        return jsonify({'error': 'Brak wymaganych danych'}), 400
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('''SELECT p.user_id, p.timestamp, u.is_premium
                 FROM posts p JOIN users u ON p.user_id = u.id
                 WHERE p.id = ? AND u.username = ?''', (post_id, username))
    post = c.fetchone()
    if not post:
        conn.close()
        print("[DEBUG] Post nie istnieje lub nie należy do użytkownika")
        return jsonify({'error': 'Post nie istnieje lub nie należy do Ciebie'}), 404
    user_id, timestamp, is_premium = post
    if not is_premium:
        conn.close()
        print("[DEBUG] Brak premium do edycji")
        return jsonify({'error': 'Tylko użytkownicy premium mogą edytować posty'}), 403
    try:
        post_date = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        diff_hours = (now - post_date).total_seconds() / 3600
        if diff_hours < 0 or diff_hours >= 24:
            conn.close()
            print("[DEBUG] Minął czas na edycję")
            return jsonify({'error': 'Minął czas na edycję (24h)'}), 403
    except ValueError as e:
        conn.close()
        print(f"[DEBUG] Błąd daty: {e}")
        return jsonify({'error': 'Błąd formatu daty'}), 400
    c.execute('UPDATE posts SET content = ? WHERE id = ?', (content, post_id))
    conn.commit()
    conn.close()
    print("[DEBUG] Post zaktualizowany")
    return jsonify({'message': 'Post zaktualizowany'}), 200

@app.route('/edit_comment', methods=['POST'])
def edit_comment():
    data = request.get_json()
    print(f"[DEBUG] Edytuję komentarz, dane: {data}")
    comment_id = data.get('comment_id')
    content = data.get('content')
    username = data.get('username')
    if not comment_id or not content or not username:
        print("[DEBUG] Brak wymaganych danych")
        return jsonify({'error': 'Brak wymaganych danych'}), 400
    conn = sqlite3.connect('community.db')
    c = conn.cursor()
    c.execute('''SELECT c.user_id, c.timestamp, u.is_premium
                 FROM comments c JOIN users u ON c.user_id = u.id
                 WHERE c.id = ? AND u.username = ?''', (comment_id, username))
    comment = c.fetchone()
    if not comment:
        conn.close()
        print("[DEBUG] Komentarz nie istnieje lub nie należy do użytkownika")
        return jsonify({'error': 'Komentarz nie istnieje lub nie należy do Ciebie'}), 404
    user_id, timestamp, is_premium = comment
    if not is_premium:
        conn.close()
        print("[DEBUG] Brak premium do edycji")
        return jsonify({'error': 'Tylko użytkownicy premium mogą edytować komentarze'}), 403
    try:
        comment_date = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        diff_hours = (now - comment_date).total_seconds() / 3600
        if diff_hours < 0 or diff_hours >= 24:
            conn.close()
            print("[DEBUG] Minął czas na edycję")
            return jsonify({'error': 'Minął czas na edycję (24h)'}), 403
    except ValueError as e:
        conn.close()
        print(f"[DEBUG] Błąd daty: {e}")
        return jsonify({'error': 'Błąd formatu daty'}), 400
    c.execute('UPDATE comments SET content = ? WHERE id = ?', (content, comment_id))
    conn.commit()
    conn.close()
    print("[DEBUG] Komentarz zaktualizowany")
    return jsonify({'message': 'Komentarz zaktualizowany'}), 200

# Endpointy AquaBota
@app.route('/verify_city', methods=['POST'])
def verify_city():
    print("[DEBUG] Rozpoczynam weryfikację miasta w /verify_city")
    data = request.get_json()
    print(f"[DEBUG] Otrzymane dane: {data}")
    city = data.get('city')
    print(f"[DEBUG] Weryfikuję miasto: {city}")
    if not city:
        print("[DEBUG] Brak miasta w danych, zwracam błąd")
        return jsonify({'valid': False})
    bot = AquaBot("Temp", "temp", "przyjacielu")
    print("[DEBUG] Utworzono instancję AquaBot dla weryfikacji")
    matched_city = bot.match_city(city)
    print(f"[DEBUG] Dopasowane miasto: {matched_city}")
    if matched_city:
        print(f"[DEBUG] Miasto poprawne, zwracam: {matched_city}")
        return jsonify({'valid': True, 'city': matched_city})
    print(f"[DEBUG] Miasto niepoprawne: {city}")
    return jsonify({'valid': False})

@app.route('/aquabot', methods=['POST'])
def aquabot():
    print("[DEBUG] Wywołuję endpoint /aquabot")
    data = request.get_json()
    print(f"[DEBUG] Aquabot - Odebrane dane z frontendu: {data}")
    
    # Pobierz dane z żądania
    message = data.get('message', '')
    address_style = data.get('addressStyle', 'przyjacielu')
    city = data.get('city', None)
    selected_station = data.get('selectedStation', None)
    waiting_for_category = data.get('waitingForCategory', False)
    waiting_for_subcategory = data.get('waitingForSubcategory', False)
    selected_category = data.get('selectedCategory', None)
    last_parameters = data.get('lastParameters', [])
    in_conversation = data.get('in_conversation', False)

    try:
        print("[DEBUG] Tworzę instancję AquaBot")
        bot = AquaBot(
            userName=address_style,
            city=city,
            addressStyle=address_style,
            selectedStation=selected_station,
            waitingForCategory=waiting_for_category,
            lastParameters=last_parameters,
            selectedCategory=selected_category,
            waitingForSubcategory=waiting_for_subcategory,
            in_conversation=in_conversation
        )
        print("[DEBUG] Wywołuję getHealthAdvice")
        reply = bot.getHealthAdvice(message)
        
        response = {
            'reply': reply,
            'waitingForCategory': bot.waiting_for_category,
            'waitingForSubcategory': bot.waiting_for_subcategory,
            'in_conversation': bot.in_conversation,
            'selectedCategory': bot.selected_category,
            'lastParameters': bot.last_parameters,
            'city': bot.city
        }
        if bot.selected_station:
            response['selectedStation'] = bot.selected_station['name']
            print(f"[DEBUG] Wybrana stacja w odpowiedzi: {bot.selected_station['name']}")
        
        print(f"[DEBUG] Zwracam odpowiedź: {response}")
        return jsonify(response)
    except Exception as e:
        print(f"[DEBUG] Błąd w aquabot: {str(e)}")
        return jsonify({'reply': 'Oj, coś poszło nie tak! Spróbuj jeszcze raz. 😅'}), 500

@app.route('/remindWater', methods=['GET'])
def remind_water():
    print("[DEBUG] Wywołuję endpoint /remindWater")
    try:
        print("[DEBUG] Tworzę instancję AquaBot dla remindWater")
        bot = AquaBot('Użytkownik', 'Grudziądz', 'przyjacielu')
        print("[DEBUG] Wywołuję remindWater")
        message = bot.remindWater()
        print(f"[DEBUG] Zwracam przypomnienie: {message}")
        return jsonify({'message': message})
    except Exception as e:
        print(f"[DEBUG] Błąd w remindWater: {str(e)}")
        return jsonify({'message': 'Oj, coś poszło nie tak z przypomnieniem!'}), 500

if __name__ == '__main__':
    print("[DEBUG] Uruchamiam aplikację Flask")
    app.run(debug=True, host='0.0.0.0', port=3000)