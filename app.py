import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache structure
FEED_CACHE = {
    "data": None,
    "last_fetched": 0
}
# 5 minutes TTL
CACHE_TTL = 300
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_text(html_content):
    """Clean HTML to plain text and normalize spaces for tweeting."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    text = soup.get_text()
    # Replace multiple spaces/newlines with a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_xml_feed(xml_content):
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"XML Parsing error: {e}")
        return []

    parsed_entries = []
    
    for entry_elem in root.findall('atom:entry', namespaces):
        title_elem = entry_elem.find('atom:title', namespaces)
        updated_elem = entry_elem.find('atom:updated', namespaces)
        link_elem = entry_elem.find('atom:link[@rel="alternate"]', namespaces)
        if link_elem is None:
            link_elem = entry_elem.find('atom:link', namespaces)
        id_elem = entry_elem.find('atom:id', namespaces)
        content_elem = entry_elem.find('atom:content', namespaces)
        
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        link_url = link_elem.attrib.get('href', '') if link_elem is not None else ""
        updated_str = updated_elem.text if updated_elem is not None else ""
        id_str = id_elem.text if id_elem is not None else ""
        content_html = content_elem.text if content_elem is not None else ""
        
        if not content_html:
            continue
            
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Split by <h3> tags
        current_type = "Update"
        current_elements = []
        sub_entries = []
        
        for child in soup.contents:
            if child.name == 'h3':
                if current_elements:
                    html_snippet = ''.join(str(el) for el in current_elements)
                    sub_entries.append({
                        'type': current_type,
                        'html': html_snippet,
                        'text': clean_text(html_snippet)
                    })
                    current_elements = []
                current_type = child.get_text(strip=True)
            else:
                current_elements.append(child)
                
        if current_elements:
            html_snippet = ''.join(str(el) for el in current_elements)
            sub_entries.append({
                'type': current_type,
                'html': html_snippet,
                'text': clean_text(html_snippet)
            })
            
        for i, sub in enumerate(sub_entries):
            sub_id = f"{id_str}#{i}" if id_str else f"{date_str}-{i}"
            parsed_entries.append({
                'id': sub_id,
                'date': date_str,
                'updated': updated_str,
                'link': link_url,
                'type': sub['type'],
                'html': sub['html'],
                'text': sub['text']
            })
            
    return parsed_entries

def get_release_notes(force_refresh=False):
    global FEED_CACHE
    now = time.time()
    
    if force_refresh or not FEED_CACHE["data"] or (now - FEED_CACHE["last_fetched"] > CACHE_TTL):
        try:
            print("Fetching live release notes feed...")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
            response = requests.get(FEED_URL, headers=headers, timeout=10)
            if response.status_code == 200:
                data = parse_xml_feed(response.content)
                if data:
                    FEED_CACHE["data"] = data
                    FEED_CACHE["last_fetched"] = now
                else:
                    print("Parsed data is empty, using cache if available")
            else:
                print(f"Failed to fetch feed, status code: {response.status_code}")
        except Exception as e:
            print(f"Error fetching feed: {e}")
            
    return FEED_CACHE["data"] or []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data = get_release_notes(force_refresh=force_refresh)
    return jsonify({
        "success": True,
        "count": len(data),
        "data": data,
        "last_fetched": FEED_CACHE["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
