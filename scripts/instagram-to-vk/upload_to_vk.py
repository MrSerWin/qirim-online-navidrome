#!/usr/bin/env python3
"""
Загрузка видео в ВКонтакте
"""

import sys
import os

# Добавляем текущую директорию в путь для импорта
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from video_uploader import VKUploader, VideoMetadata

def upload_ice_skating_video():
    """Загрузка видео с катка в ВК"""

    # Путь к видео
    video_path = "/Volumes/T9/1_dev/1_anayurt/1_Vlog/vlog/Trash Cat/3D-графика и приколы (Зимние праздники)/video.mp4"

    # Проверка существования файла
    if not os.path.exists(video_path):
        print(f"❌ Видео не найдено: {video_path}")
        return False

    print(f"✅ Видео найдено: {os.path.basename(video_path)}")
    print(f"📁 Размер: {os.path.getsize(video_path) / (1024*1024):.2f} MB")
    print()

    # Метаданные видео
    title = "Халил \"помог\" Асие научиться кататься на коньках... ⛸️ (3D-анимация)"

    description = """Khalil wanted to show his sister Asie how to ice skate like a pro. He's a great teacher, clearly. 😅
Халил хотел показать своей сестре Асие, как кататься на коньках, как профи. Он отличный учитель, это очевидно. 😅

A little winter animation I'm working on! / Маленькая зимняя анимация, над которой я работаю!

#3danimation #iceskating #winter #funnyanimation #characterdesign #blender #fail #3данимация #коньки #прикол"""

    tags = [
        "3danimation",
        "iceskating",
        "winter",
        "funnyanimation",
        "characterdesign",
        "blender",
        "fail",
        "3данимация",
        "коньки",
        "прикол",
        "shorts"
    ]

    metadata = VideoMetadata(
        title=title,
        description=description,
        tags=tags,
        privacy="public"
    )

    print("📝 Метаданные видео:")
    print(f"   Название: {metadata.title}")
    print(f"   Теги: {', '.join(metadata.tags[:5])}...")
    print()

    # Получение токена
    print("🔑 Введите ваш VK access token:")
    print("   (Получить можно на https://vkhost.github.io/ → VK Admin)")
    print()
    access_token = input("VK Token: ").strip()

    if not access_token:
        print("❌ Токен не введен!")
        return False

    print()
    print("🔄 Начинаю загрузку в ВКонтакте...")
    print("-" * 50)

    # Создание uploader
    uploader = VKUploader(access_token)

    # Загрузка видео
    video_id = uploader.upload(video_path, metadata)

    print("-" * 50)

    if video_id:
        print()
        print("🎉 УСПЕХ! Видео загружено в ВКонтакте!")
        print(f"📺 Video ID: {video_id}")
        print(f"🔗 Ссылка: https://vk.com/video{video_id}")
        print()
        return True
    else:
        print()
        print("❌ Не удалось загрузить видео")
        print("💡 Проверьте:")
        print("   - Токен правильный и не истек")
        print("   - У токена есть права на загрузку видео (scope: video)")
        print("   - Размер видео не превышает лимит ВК (5 GB)")
        print()
        print("📖 Подробности в upload_log.txt")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("🎬 Загрузка видео в ВКонтакте")
    print("=" * 50)
    print()

    try:
        success = upload_ice_skating_video()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Загрузка отменена пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Произошла ошибка: {e}")
        print("\n📖 Подробности в upload_log.txt")
        import traceback
        traceback.print_exc()
        sys.exit(1)
