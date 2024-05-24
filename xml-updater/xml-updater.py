import json
import xml.etree.ElementTree as ET
from PIL import Image
import os

def timecode_to_seconds(timecode):
    hours, minutes, seconds, frames = map(int, timecode.split(':'))
    total_seconds = hours * 3600 + minutes * 60 + seconds + frames / 24
    return total_seconds

def get_image_dimensions(image_path):
    with Image.open(image_path) as img:
        return img.width, img.height

def calculate_initial_scale(img_width, img_height, video_width=1920, video_height=1080):
    scale_x = video_width / img_width
    scale_y = video_height / img_height
    return max(scale_x, scale_y) * 100  # Return the scale as a percentage

def add_clips_to_sequence(xml_file, json_file, output_file, scale_increment=150, default_duration=10):
    # Parse the original XML file
    tree = ET.parse(xml_file)
    root = tree.getroot()

    # Load the JSON file
    with open(json_file, 'r') as f:
        clips_data = json.load(f)

    timebase = 24  # Assuming the sequence timebase is 24 fps
    sequence = root.find('.//sequence[@id="sequence-3"]')
    media = sequence.find('.//media')
    video = media.find('video')

    # Create a new video track
    new_track = ET.Element('track', id="track-1")
    video.append(new_track)

    for idx, clip in enumerate(clips_data):
        start_time_seconds = timecode_to_seconds(clip['markerTimecode'])
        start_frame = int(start_time_seconds * timebase)
        duration_frames = int(default_duration * timebase)

        # Calculate end frame based on next clip's start time or default duration
        if idx < len(clips_data) - 1:
            next_start_time_seconds = timecode_to_seconds(clips_data[idx + 1]['markerTimecode'])
            next_start_frame = int(next_start_time_seconds * timebase)
            end_frame = min(start_frame + duration_frames, next_start_frame)
        else:
            end_frame = start_frame + duration_frames

        new_clip_path = clip['filePath']
        img_path = new_clip_path.replace('file://', '')  # Remove 'file://' prefix
        if not os.path.isabs(img_path):
            img_path = os.path.join(script_dir, img_path.lstrip('/'))  # Correctly form the absolute path

        # Create the new clipitem element
        new_clipitem = ET.Element('clipitem', id=f"clipitem-{idx + 1}")
        ET.SubElement(new_clipitem, 'masterclipid').text = "masterclip-7"
        ET.SubElement(new_clipitem, 'name').text = new_clip_path.split('/')[-1]
        ET.SubElement(new_clipitem, 'enabled').text = "TRUE"
        ET.SubElement(new_clipitem, 'duration').text = str(end_frame - start_frame)
        rate = ET.SubElement(new_clipitem, 'rate')
        ET.SubElement(rate, 'timebase').text = str(timebase)
        ET.SubElement(rate, 'ntsc').text = "TRUE"
        ET.SubElement(new_clipitem, 'start').text = str(start_frame)
        ET.SubElement(new_clipitem, 'end').text = str(end_frame)
        ET.SubElement(new_clipitem, 'in').text = "0"
        ET.SubElement(new_clipitem, 'out').text = str(end_frame - start_frame)
        ET.SubElement(new_clipitem, 'pproTicksIn').text = str(int(start_frame * (25401600000000 / timebase)))
        ET.SubElement(new_clipitem, 'pproTicksOut').text = str(int(end_frame * (25401600000000 / timebase)))
        ET.SubElement(new_clipitem, 'alphatype').text = "none"
        
        file_element = ET.SubElement(new_clipitem, 'file', id=f"file-{idx + 1}")
        ET.SubElement(file_element, 'name').text = new_clip_path.split('/')[-1]
        ET.SubElement(file_element, 'pathurl').text = new_clip_path
        file_rate = ET.SubElement(file_element, 'rate')
        ET.SubElement(file_rate, 'timebase').text = str(timebase)
        ET.SubElement(file_rate, 'ntsc').text = "TRUE"
        
        timecode = ET.SubElement(file_element, 'timecode')
        timecode_rate = ET.SubElement(timecode, 'rate')
        ET.SubElement(timecode_rate, 'timebase').text = str(timebase)
        ET.SubElement(timecode_rate, 'ntsc').text = "TRUE"
        ET.SubElement(timecode, 'string').text = "00:00:00:00"
        ET.SubElement(timecode, 'frame').text = "0"
        ET.SubElement(timecode, 'displayformat').text = "NDF"
        
        media_elem = ET.SubElement(file_element, 'media')
        video_elem = ET.SubElement(media_elem, 'video')
        samplecharacteristics = ET.SubElement(video_elem, 'samplecharacteristics')
        sample_rate = ET.SubElement(samplecharacteristics, 'rate')
        ET.SubElement(sample_rate, 'timebase').text = str(timebase)
        ET.SubElement(sample_rate, 'ntsc').text = "TRUE"
        ET.SubElement(samplecharacteristics, 'width').text = "1920"
        ET.SubElement(samplecharacteristics, 'height').text = "1080"
        ET.SubElement(samplecharacteristics, 'anamorphic').text = "FALSE"
        ET.SubElement(samplecharacteristics, 'pixelaspectratio').text = "square"
        ET.SubElement(samplecharacteristics, 'fielddominance').text = "none"

        # Append the new clipitem to the new video track
        new_track.append(new_clipitem)

    # Write the updated XML to a new file
    tree.write(output_file, encoding='UTF-8', xml_declaration=True)

    # Apply scale effects after adding all clips
    tree = ET.parse(output_file)
    root = tree.getroot()

    for clip in clips_data:
        new_clip_path = clip['filePath'].split('/')[-1]
        clipitem = root.find(f".//clipitem[name='{new_clip_path}']")
        if clipitem is not None:
            img_width, img_height = get_image_dimensions(img_path)
            initial_scale = calculate_initial_scale(img_width, img_height)
            final_scale = initial_scale + scale_increment

            filter_element = ET.SubElement(clipitem, 'filter')
            effect = ET.SubElement(filter_element, 'effect')
            ET.SubElement(effect, 'name').text = "Basic Motion"
            ET.SubElement(effect, 'effectid').text = "basic"
            ET.SubElement(effect, 'effectcategory').text = "motion"
            ET.SubElement(effect, 'effecttype').text = "motion"
            ET.SubElement(effect, 'mediatype').text = "video"
            ET.SubElement(effect, 'pproBypass').text = "false"

            scale_param = ET.SubElement(effect, 'parameter', authoringApp="PremierePro")
            ET.SubElement(scale_param, 'parameterid').text = "scale"
            ET.SubElement(scale_param, 'name').text = "Scale"
            ET.SubElement(scale_param, 'valuemin').text = "0"
            ET.SubElement(scale_param, 'valuemax').text = "1000"
            ET.SubElement(scale_param, 'value').text = str(initial_scale)
            
            keyframe1 = ET.SubElement(scale_param, 'keyframe')
            ET.SubElement(keyframe1, 'when').text = "0"
            ET.SubElement(keyframe1, 'value').text = str(initial_scale)
            
            keyframe2 = ET.SubElement(scale_param, 'keyframe')
            duration = int(clipitem.find('out').text) - int(clipitem.find('in').text)
            ET.SubElement(keyframe2, 'when').text = str(duration)
            ET.SubElement(keyframe2, 'value').text = str(final_scale)

    # Write the updated XML to a new file with scale effects
    tree.write(output_file, encoding='UTF-8', xml_declaration=True)

# Get the directory of the script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Parameters for the new clips
json_file = os.path.join(script_dir, "updated_spreadsheet.json")
xml_file = os.path.join(script_dir, "TEST_ZOOM_PAN.xml")
output_file = os.path.join(script_dir, "UPDATED_TEST_ZOOM_PAN.xml")

# Update the XML file with clips from JSON
add_clips_to_sequence(xml_file, json_file, output_file)
