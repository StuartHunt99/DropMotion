import os
import csv
import pandas as pd
import chardet
from datetime import datetime, timedelta

# Helper function to convert timecode to seconds
def timecode_to_seconds(timecode):
    parts = timecode.split(':')
    if len(parts) == 3:
        h, m, s = parts
        ms = 0
    elif len(parts) == 4:
        h, m, s, ms = parts
    else:
        raise ValueError(f"Invalid timecode format: {timecode}")
    
    s_parts = s.split('.')
    if len(s_parts) == 2:
        s, ms = s_parts
    else:
        s = s_parts[0]
        ms = 0
    
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

# Function to detect encoding of a file
def detect_encoding(file_path):
    with open(file_path, 'rb') as f:
        result = chardet.detect(f.read())
    return result['encoding']

# Function to read CSV with automatic encoding detection
def read_csv_with_auto_encoding(file_path, delimiter=','):
    try:
        # Try reading with utf-8 encoding
        with open(file_path, mode='r', newline='', encoding='utf-8') as file:
            return list(csv.DictReader(file, delimiter=delimiter))
    except UnicodeDecodeError:
        # If utf-8 fails, detect and use the detected encoding
        encoding = detect_encoding(file_path)
        with open(file_path, mode='r', newline='', encoding=encoding) as file:
            return list(csv.DictReader(file, delimiter=delimiter))

# Get the directory of the script
script_dir = os.path.dirname(__file__)

# Define the file paths
transcript_file = os.path.join(script_dir, 'transcript.csv')
markers_file = os.path.join(script_dir, 'markers.csv')
output_file = os.path.join(script_dir, 'base_table.csv')
fps = 30  # Default frame rate

# Load transcript into a list of dictionaries
transcript = read_csv_with_auto_encoding(transcript_file)
for row in transcript:
    row['Start Time Seconds'] = timecode_to_seconds(row['Start Time'])
    row['End Time Seconds'] = timecode_to_seconds(row['End Time'])

# Load markers into a list and print headers to check column names
markers = read_csv_with_auto_encoding(markers_file, delimiter='\t')
if markers:
    print("Markers file headers:", markers[0].keys())
else:
    print("Markers file is empty")

# Function to find the closest transcript segments to a marker time
def find_closest_transcript_segments(marker_time, transcript, fps=30):
    marker_time_seconds = timecode_to_seconds(marker_time)

    for segment in transcript:
        segment_start_time = segment['Start Time Seconds']
        segment_end_time = segment['End Time Seconds']
        
        # Check if marker time falls within the segment
        if segment_start_time <= marker_time_seconds <= segment_end_time:
            return segment['Text']
    
    # If no matching segment is found, return a message
    return 'No matching transcript segment found'

# Create output data
output_data = []
for i, marker in enumerate(markers):
    marker_time = marker['In']
    closest_segments = find_closest_transcript_segments(marker_time, transcript)
    print(f'Marker {i + 1} at {marker_time} -> Closest Segment: {closest_segments}')
    output_data.append({
        'Marker Number': i + 1,
        'Marker Timecode': marker_time,
        'Closest Transcript Segment': closest_segments,
        'Image File Reference': ''
    })

# Write output data to a new CSV file
with open(output_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=['Marker Number', 'Marker Timecode', 'Closest Transcript Segment', 'Image File Reference'])
    writer.writeheader()
    for row in output_data:
        writer.writerow(row)

print(f'Spreadsheet created successfully: {output_file}')
