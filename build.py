"""把 src/ 的程式和 data/countries.json 組合成單一檔案 index.html。
用法：python3 build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
DROP = ['jp_id', 'primary_language', 'frontier', 'merged_unreached_count',
        'merged_bible_none_count', 'merged_count', 'name_en', 'language_en']

HEAD = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="如果重新出生一次，你會在幾歲聽見耶穌的名字？隨機出生在 53 國其中一個家庭，走完一段完全不同的人生。《教會小本本》Podcast 特別企劃。">
<meta property="og:type" content="website">
<meta property="og:site_name" content="《教會小本本》福音距離">
<meta property="og:locale" content="zh_TW">
<meta property="og:title" content="福音距離｜如果重新出生一次，你會在幾歲聽見耶穌的名字？">
<meta property="og:description" content="你可能出生在台灣，也可能出生在一個從來沒有人向你提過耶穌的地方。依 53 國公開資料建立的人生模擬，《教會小本本》Podcast 特別企劃。">
<meta property="og:url" content="https://gbookchurch.github.io/gospel-distance/">
<meta property="og:image" content="https://gbookchurch.github.io/gospel-distance/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="福音距離：如果重新出生一次，你會在幾歲聽見耶穌的名字？">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="福音距離｜如果重新出生一次，你會在幾歲聽見耶穌的名字？">
<meta name="twitter:description" content="依 53 國公開資料建立的人生模擬，《教會小本本》Podcast 特別企劃。">
<meta name="twitter:image" content="https://gbookchurch.github.io/gospel-distance/og.png">
<meta name="theme-color" content="#b8570b">
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font-size: 14px; font-family: system-ui, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
"""

def main():
    data = json.loads((ROOT / 'data/countries.json').read_text(encoding='utf-8'))
    for c in data['countries']:
        for g in c['people_groups']:
            for k in DROP:
                g.pop(k, None)
    page = (ROOT / 'src/template.html').read_text(encoding='utf-8')
    page = page.replace('/*DATA*/', json.dumps({'countries': data['countries']}, ensure_ascii=False, separators=(',', ':')))
    page = page.replace('/*MAP*/', (ROOT / 'data/worldmap.json').read_text(encoding='utf-8'))
    page = page.replace('/*GOSPEL*/', (ROOT / 'src/gospel.js').read_text(encoding='utf-8'))
    page = page.replace('/*EVENTS*/', (ROOT / 'src/events.js').read_text(encoding='utf-8'))
    # template 開頭的 <title>、字型連結和 <style> 屬於 <head>，<main> 之後屬於 <body>
    head_part, body_part = page.split('<main>', 1)
    html = HEAD + head_part + '</head>\n<body>\n<main>' + body_part + '\n</body>\n</html>\n'
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    print(f'index.html 已產生（{len(html.encode()) // 1024} KB）')

if __name__ == '__main__':
    main()
