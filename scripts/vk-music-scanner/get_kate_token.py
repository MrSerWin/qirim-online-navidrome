#!/usr/bin/env python3
"""
Get Kate Mobile token manually via OAuth

Kate Mobile app_id = 2685278
This app has audio API access
"""

import urllib.parse
import webbrowser

# Kate Mobile app credentials (this specific app has audio API access)
KATE_APP_ID = "2685278"
KATE_SCOPE = "audio,offline"
VK_API_VERSION = "5.131"

def get_auth_url():
    params = {
        'client_id': KATE_APP_ID,
        'display': 'page',
        'redirect_uri': 'https://oauth.vk.com/blank.html',
        'scope': KATE_SCOPE,
        'response_type': 'token',
        'v': VK_API_VERSION
    }
    return f"https://oauth.vk.com/authorize?{urllib.parse.urlencode(params)}"


def parse_token_url(url: str) -> dict:
    """Parse token from redirect URL"""
    if '#' not in url:
        return {}

    fragment = url.split('#')[1]
    return dict(urllib.parse.parse_qsl(fragment))


if __name__ == '__main__':
    auth_url = get_auth_url()

    print("=" * 60)
    print("GET KATE MOBILE TOKEN")
    print("=" * 60)
    print()
    print("1. Opening browser...")
    print(f"\n   URL: {auth_url}\n")

    try:
        webbrowser.open(auth_url)
    except:
        pass

    print("2. Log in to VK and authorize Kate Mobile")
    print("3. You'll be redirected to a blank page")
    print("4. Copy the FULL URL from the address bar")
    print()

    redirect_url = input("Paste the URL here: ").strip()

    params = parse_token_url(redirect_url)

    if params.get('access_token'):
        print()
        print("=" * 60)
        print("SUCCESS! Your Kate Mobile token:")
        print("=" * 60)
        print()
        print(f"Token: {params['access_token']}")
        print(f"User ID: {params.get('user_id', 'N/A')}")
        print(f"Expires in: {params.get('expires_in', 'never')} seconds")
        print()
        print("Add this to your config.json:")
        print()
        print(f'"token": "{params["access_token"]}"')
    else:
        print()
        print("Failed to extract token from URL")
        print(f"Parsed params: {params}")
