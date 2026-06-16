import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
print(f"Fetching from {url}...")
response = requests.get(url)
xml_content = response.content

# Standard Atom namespace
namespaces = {'atom': 'http://www.w3.org/2005/Atom'}

try:
    root = ET.fromstring(xml_content)
    print("XML parsed successfully with ElementTree!")
except Exception as e:
    print(f"Error parsing XML: {e}")
    exit(1)
    
entries = []
atom_entries = root.findall('atom:entry', namespaces)
print(f"Found {len(atom_entries)} entries in feed.")

for entry_elem in atom_entries[:3]: # Let's check the first 3
    title_elem = entry_elem.find('atom:title', namespaces)
    content_elem = entry_elem.find('atom:content', namespaces)
    date_str = title_elem.text if title_elem is not None else "Unknown Date"
    content_html = content_elem.text if content_elem is not None else ""
    
    print(f"\n--- Entry Date: {date_str} ---")
    
    soup = BeautifulSoup(content_html, 'html.parser')
    
    current_type = "Update"
    current_elements = []
    sub_entries = []
    
    for child in soup.contents:
        if child.name == 'h3':
            if current_elements:
                sub_entries.append({
                    'type': current_type,
                    'html': ''.join(str(el) for el in current_elements),
                    'text': BeautifulSoup(''.join(str(el) for el in current_elements), 'html.parser').get_text()
                })
                current_elements = []
            current_type = child.get_text(strip=True)
        else:
            current_elements.append(child)
            
    if current_elements:
        sub_entries.append({
            'type': current_type,
            'html': ''.join(str(el) for el in current_elements),
            'text': BeautifulSoup(''.join(str(el) for el in current_elements), 'html.parser').get_text()
        })
        
    print(f"Split into {len(sub_entries)} sub-updates:")
    for sub in sub_entries:
        print(f"  [{sub['type']}]: {sub['text'][:100]}...")
