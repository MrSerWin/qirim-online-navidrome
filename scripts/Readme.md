Создай конфиг:

cd /Volumes/T9/1_dev/1_QO/myQO/navidrome/scripts/vk-music-scanner
cp config.example.json config.json
Заполни config.json:
vk.login / vk.password - логин/пароль ВК
telegram.bot_token - токен бота (создай через @BotFather)
telegram.chat_id - твой chat ID (узнай через @userinfobot)
navidrome.db_path - путь к БД на сервере
navidrome.music_dir - папка с музыкой
artist_mappings - маппинг имён (кириллица ↔ латиница)
Установи зависимости:

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
Запусти:

python3 scan_vk_music.py
Для ежедневного запуска добавь в crontab:

0 3 * * * cd /opt/navidrome/scripts/vk-music-scanner && ./venv/bin/python scan_vk_music.py >> /var/log/vk-scanner.log 2>&1