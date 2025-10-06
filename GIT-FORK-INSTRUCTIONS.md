# 🔀 Инструкция по Созданию Форка и Публикации Изменений

## ✅ Что Уже Сделано

1. ✅ Создана ветка `myqo-customizations`
2. ✅ Все изменения закоммичены:
   - Custom Dark (myQO) тема
   - 4 перевода (ru, uk, tr, crh)
   - Скрипт запуска start.sh
   - Конфигурационный файл

**Коммит:** `eb2e909f`
**Ветка:** `myqo-customizations`

---

## 📋 Что Нужно Сделать

### Вариант 1: Через GitHub CLI (Рекомендуется)

GitHub CLI уже установлен. Выполните следующие команды:

#### Шаг 1: Авторизуйтесь в GitHub

```bash
gh auth login
```

Выберите:
- **What account do you want to log into?** → GitHub.com
- **What is your preferred protocol for Git operations?** → HTTPS
- **Authenticate Git with your GitHub credentials?** → Yes
- **How would you like to authenticate?** → Login with a web browser

Скопируйте код и откройте браузер для авторизации.

#### Шаг 2: Создайте Форк

```bash
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome
gh repo fork navidrome/navidrome --remote-name myfork
```

Это создаст форк в вашем GitHub аккаунте и добавит remote с именем `myfork`.

#### Шаг 3: Запушьте Изменения

```bash
git push myfork myqo-customizations
```

#### Шаг 4: Создайте Pull Request (Опционально)

Если хотите предложить изменения в основной репозиторий:

```bash
gh pr create --repo navidrome/navidrome --base master --head ВАШЕ_ИМЯ:myqo-customizations --title "Add Custom Dark theme and Crimean Tatar translation" --body "This PR adds a custom dark theme and translations for Russian, Ukrainian, Turkish, and Crimean Tatar languages."
```

**Примечание:** Замените `ВАШЕ_ИМЯ` на ваш GitHub username.

---

### Вариант 2: Через Веб-Интерфейс GitHub

#### Шаг 1: Создайте Форк на GitHub

1. Откройте браузер и перейдите на https://github.com/navidrome/navidrome
2. Нажмите кнопку **"Fork"** в правом верхнем углу
3. Выберите ваш аккаунт для создания форка
4. Дождитесь создания форка

#### Шаг 2: Добавьте Remote для Вашего Форка

```bash
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome

# Замените YOUR_USERNAME на ваш GitHub username
git remote add myfork https://github.com/YOUR_USERNAME/navidrome.git
```

#### Шаг 3: Запушьте Изменения

```bash
git push myfork myqo-customizations
```

При первом пуше вас попросят ввести учетные данные GitHub:
- **Username:** ваш GitHub username
- **Password:** используйте **Personal Access Token** (не обычный пароль!)

**Как создать Personal Access Token:**
1. Откройте https://github.com/settings/tokens
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Выберите scopes: `repo` (full control of private repositories)
4. Скопируйте токен и используйте его как пароль

#### Шаг 4: Проверьте на GitHub

Откройте в браузере:
```
https://github.com/YOUR_USERNAME/navidrome/tree/myqo-customizations
```

Вы должны увидеть вашу ветку с изменениями!

---

### Вариант 3: Через SSH (Если у вас настроен SSH)

#### Шаг 1: Создайте Форк на GitHub

(См. Вариант 2, Шаг 1)

#### Шаг 2: Добавьте SSH Remote

```bash
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome

# Замените YOUR_USERNAME на ваш GitHub username
git remote add myfork git@github.com:YOUR_USERNAME/navidrome.git
```

#### Шаг 3: Запушьте Изменения

```bash
git push myfork myqo-customizations
```

---

## 🔍 Проверка Текущего Состояния

### Посмотреть Список Веток

```bash
git branch -a
```

Вы должны увидеть:
```
  master
* myqo-customizations
  remotes/origin/master
  remotes/myfork/myqo-customizations (после пуша)
```

### Посмотреть Remotes

```bash
git remote -v
```

Должно быть:
```
origin    https://github.com/navidrome/navidrome.git (fetch)
origin    https://github.com/navidrome/navidrome.git (push)
myfork    https://github.com/YOUR_USERNAME/navidrome.git (fetch)
myfork    https://github.com/YOUR_USERNAME/navidrome.git (push)
```

### Посмотреть Последний Коммит

```bash
git log -1 --oneline
```

Должно показать:
```
eb2e909f Add myQO customizations: Custom Dark theme and 4 language translations
```

### Посмотреть Измененные Файлы в Коммите

```bash
git show --stat
```

---

## 📝 Что Включено в Коммит

### Кастомная Тема
- ✅ `ui/src/themes/customDark.js` - основная тема
- ✅ `ui/src/themes/customDark.css.js` - стили плеера
- ✅ `ui/src/themes/index.js` - регистрация темы

### Переводы (Backend)
- ✅ `resources/i18n/crh.json` - Крымскотатарский (НОВЫЙ!)
- ✅ `resources/i18n/ru.json` - Русский (обновлен)
- ✅ `resources/i18n/uk.json` - Украинский (обновлен)
- ✅ `resources/i18n/tr.json` - Турецкий (обновлен)

### Переводы (Frontend)
- ✅ `ui/src/i18n/crh.json` - Крымскотатарский
- ✅ `ui/src/i18n/ru.json` - Русский
- ✅ `ui/src/i18n/uk.json` - Украинский
- ✅ `ui/src/i18n/tr.json` - Турецкий

### Дополнительно
- ✅ `start.sh` - скрипт запуска сервера

**Всего:** 12 файлов изменено, +4146 строк добавлено, -850 строк удалено

---

## 🚀 Быстрая Команда (После Настройки Remote)

```bash
# После того как вы добавили remote 'myfork':
cd /Volumes/T9/1_dev/1_QO/myQO/navidrome
git push myfork myqo-customizations
```

---

## 🔄 Синхронизация с Upstream

Если основной репозиторий navidrome/navidrome обновится, вы можете синхронизироваться:

```bash
# Убедитесь что вы на master ветке
git checkout master

# Получите последние изменения из upstream
git pull origin master

# Вернитесь на вашу ветку
git checkout myqo-customizations

# Перебазируйте ваши изменения поверх последнего master
git rebase master

# Если возникнут конфликты, разрешите их и продолжите:
# git add <файлы>
# git rebase --continue

# Запушьте обновленную ветку (нужен force push после rebase)
git push myfork myqo-customizations --force
```

---

## 🎯 URL Вашего Форка

После создания форка, ваш репозиторий будет доступен по адресу:

```
https://github.com/YOUR_USERNAME/navidrome
```

Ваша ветка с изменениями:

```
https://github.com/YOUR_USERNAME/navidrome/tree/myqo-customizations
```

---

## ❓ Часто Задаваемые Вопросы

### Как узнать мой GitHub username?

```bash
# Если вы авторизованы через gh:
gh api user --jq .login

# Или посмотрите в браузере:
# https://github.com/settings/profile
```

### Как создать Personal Access Token?

1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Выберите scopes: `repo`
4. Скопируйте токен (он больше не будет показан!)

### Как изменить remote URL?

```bash
# Посмотреть текущие remotes
git remote -v

# Изменить URL для myfork
git remote set-url myfork https://github.com/YOUR_USERNAME/navidrome.git
```

### Как удалить remote?

```bash
git remote remove myfork
```

### Как переключиться обратно на master?

```bash
git checkout master
```

---

## 📊 Статистика Коммита

| Параметр | Значение |
|----------|----------|
| **Коммит Hash** | eb2e909f |
| **Ветка** | myqo-customizations |
| **Файлов изменено** | 12 |
| **Строк добавлено** | +4146 |
| **Строк удалено** | -850 |
| **Новых файлов** | 9 |

---

## ✅ Чеклист

Перед тем как пушить, убедитесь:

- [ ] У вас есть GitHub аккаунт
- [ ] Вы создали форк репозитория navidrome/navidrome
- [ ] Вы добавили remote `myfork` с URL вашего форка
- [ ] Вы на ветке `myqo-customizations` (проверьте: `git branch`)
- [ ] Все изменения закоммичены (проверьте: `git status`)
- [ ] Вы готовы запушить: `git push myfork myqo-customizations`

---

## 🎉 Готово!

После успешного пуша ваши изменения будут доступны на GitHub в вашем форке!

Вы можете:
- Поделиться ссылкой на вашу ветку
- Создать Pull Request в основной репозиторий
- Клонировать форк на других машинах
- Продолжать разработку и пушить новые изменения
