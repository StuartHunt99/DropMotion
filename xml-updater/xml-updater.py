import json
import xml.etree.ElementTree as ET
from PIL import Image
import os

class VideoEditor:
    def __init__(self, xml_file, json_file, output_file, scale_increment=150, default_duration=10):
        self.xml_file = xml_file
        self.json_file = json_file
        self.output_file = output_file
        self.scale_increment = scale_increment
        self.default_duration = default_duration
        self.timebase = 24  # Assuming the sequence timebase is 24 fps

    def _timecode_to_seconds(self, timecode):
        hours, minutes, seconds, frames = map(int, timecode.split(':'))
        total_seconds = hours * 3600 + minutes * 60 + seconds + frames / 24
        return total_seconds

    def _get_image_dimensions(self, image_path):
        with Image.open(image_path) as img:
            return img.width, img.height

    def _calculate_initial_scale(self, img_width, img_height, video_width=1920, video_height=1080):
        scale_x = video_width / img_width
        scale_y = video_height / img_height
        return max(scale_x, scale_y) * 100  # Return the scale as a percentage

    def _load_json_data(self):
        with open(self.json_file, 'r') as f:
            return json.load(f)

    def _parse_xml(self):
        tree = ET.parse(self.xml_file)
        root = tree.getroot()
        return tree, root

    def _create_new_track(self, root):
        sequence = root.find('.//sequence[@id="sequence-3"]')
        media = sequence.find('.//media')
        video = media.find('video')
        new_track = ET.Element('track', id="track-1")
        video.append(new_track)
        return new_track

    def _create_clipitem(self, clip, start_frame, end_frame, idx, img_path):
        new_clipitem = ET.Element('clipitem', id=f"clipitem-{idx + 1}")
        ET.SubElement(new_clipitem, 'masterclipid').text = "masterclip-7"
        ET.SubElement(new_clipitem, 'name').text = img_path.split('/')[-1]
        ET.SubElement(new_clipitem, 'enabled').text = "TRUE"
        ET.SubElement(new_clipitem, 'duration').text = str(end_frame - start_frame)
        rate = ET.SubElement(new_clipitem, 'rate')
        ET.SubElement(rate, 'timebase').text = str(self.timebase)
        ET.SubElement(rate, 'ntsc').text = "TRUE"
        ET.SubElement(new_clipitem, 'start').text = str(start_frame)
        ET.SubElement(new_clipitem, 'end').text = str(end_frame)
        ET.SubElement(new_clipitem, 'in').text = "0"
        ET.SubElement(new_clipitem, 'out').text = str(end_frame - start_frame)
        ET.SubElement(new_clipitem, 'pproTicksIn').text = str(int(start_frame * (25401600000000 / self.timebase)))
        ET.SubElement(new_clipitem, 'pproTicksOut').text = str(int(end_frame * (25401600000000 / self.timebase)))
        ET.SubElement(new_clipitem, 'alphatype').text = "none"
        
        file_element = ET.SubElement(new_clipitem, 'file', id=f"file-{idx + 1}")
        ET.SubElement(file_element, 'name').text = img_path.split('/')[-1]
        ET.SubElement(file_element, 'pathurl').text = img_path
        file_rate = ET.SubElement(file_element, 'rate')
        ET.SubElement(file_rate, 'timebase').text = str(self.timebase)
        ET.SubElement(file_rate, 'ntsc').text = "TRUE"
        
        timecode = ET.SubElement(file_element, 'timecode')
        timecode_rate = ET.SubElement(timecode, 'rate')
        ET.SubElement(timecode_rate, 'timebase').text = str(self.timebase)
        ET.SubElement(timecode_rate, 'ntsc').text = "TRUE"
        ET.SubElement(timecode, 'string').text = "00:00:00:00"
        ET.SubElement(timecode, 'frame').text = "0"
        ET.SubElement(timecode, 'displayformat').text = "NDF"
        
        media_elem = ET.SubElement(file_element, 'media')
        video_elem = ET.SubElement(media_elem, 'video')
        samplecharacteristics = ET.SubElement(video_elem, 'samplecharacteristics')
        sample_rate = ET.SubElement(samplecharacteristics, 'rate')
        ET.SubElement(sample_rate, 'timebase').text = str(self.timebase)
        ET.SubElement(sample_rate, 'ntsc').text = "TRUE"
        ET.SubElement(samplecharacteristics, 'width').text = "1920"
        ET.SubElement(samplecharacteristics, 'height').text = "1080"
        ET.SubElement(samplecharacteristics, 'anamorphic').text = "FALSE"
        ET.SubElement(samplecharacteristics, 'pixelaspectratio').text = "square"
        ET.SubElement(samplecharacteristics, 'fielddominance').text = "none"
        
        return new_clipitem

    def _apply_scale_and_center_effects(self, clipitem, img_width, img_height, clip):
        initial_scale = self._calculate_initial_scale(img_width, img_height)
        final_scale = initial_scale * 1.5  # 150% of the initial scale

        filter_element = ET.SubElement(clipitem, 'filter')
        effect = ET.SubElement(filter_element, 'effect')
        ET.SubElement(effect, 'name').text = "Basic Motion"
        ET.SubElement(effect, 'effectid').text = "basic"
        ET.SubElement(effect, 'effectcategory').text = "motion"
        ET.SubElement(effect, 'effecttype').text = "motion"
        ET.SubElement(effect, 'mediatype').text = "video"
        ET.SubElement(effect, 'pproBypass').text = "false"

        # Initialize Scale Parameter
        scale_param = ET.SubElement(effect, 'parameter', authoringApp="PremierePro")
        ET.SubElement(scale_param, 'parameterid').text = "scale"
        ET.SubElement(scale_param, 'name').text = "Scale"
        ET.SubElement(scale_param, 'valuemin').text = "0"
        ET.SubElement(scale_param, 'valuemax').text = "1000"
        ET.SubElement(scale_param, 'value').text = str(initial_scale)
        keyframe1 = ET.SubElement(scale_param, 'keyframe')
        keyframe2 = ET.SubElement(scale_param, 'keyframe')
        duration = int(clipitem.find('out').text) - int(clipitem.find('in').text)
        
        # Determine Zoom Keyframes
        if clip.get('zoom').lower() == "zoom_out":
            ET.SubElement(keyframe1, 'when').text = "0"
            ET.SubElement(keyframe1, 'value').text = str(final_scale)
            ET.SubElement(keyframe2, 'when').text = str(duration)
            ET.SubElement(keyframe2, 'value').text = str(initial_scale)
        else:  
            ET.SubElement(keyframe1, 'when').text = "0"
            ET.SubElement(keyframe1, 'value').text = str(initial_scale)
            ET.SubElement(keyframe2, 'when').text = str(duration)
            ET.SubElement(keyframe2, 'value').text = str(final_scale)

        # Initialize Center Parameter
        center_param = ET.SubElement(effect, 'parameter', authoringApp="PremierePro")
        ET.SubElement(center_param, 'parameterid').text = "center"
        ET.SubElement(center_param, 'name').text = "Center"

        # Determine Center keyframe times and relevant values
        click_coords = clip['clickCoordinates']
        horizontal_margin_pixels = ((img_width * (final_scale / 100)) - 1920) / 2
        vertical_margin_pixels = ((img_height * (final_scale / 100)) - 1080) / 2

        # Convert limits to normalized coordinates
        horizontal_margin_normalized = horizontal_margin_pixels / (1920)
        vertical_margin_normalized = vertical_margin_pixels / (1080)

        center_keyframe1_time = "0"
        center_keyframe2_time = str(duration)
        
        if clip.get('zoom').lower() == "zoom_out":
            center_keyframe1_value = (
                min(max(float(click_coords['x']), -horizontal_margin_normalized), horizontal_margin_normalized),
                min(max(float(click_coords['y']), -vertical_margin_normalized), vertical_margin_normalized)
            )
            print(f"CenterFinal: {center_keyframe1_value[0]}, {center_keyframe1_value[1]}")

            center_keyframe2_value = ("0", "0")
        else:
            center_keyframe1_value = ("0", "0")
            center_keyframe2_value = (
                min(max(float(click_coords['x']), -horizontal_margin_normalized), horizontal_margin_normalized),
                min(max(float(click_coords['y']), -vertical_margin_normalized), vertical_margin_normalized)
            )
            print(f"CenterFinal: {center_keyframe2_value[0]}, {center_keyframe2_value[1]}")


        # Apply center keyframes
        center_keyframe1 = ET.SubElement(center_param, 'keyframe')
        ET.SubElement(center_keyframe1, 'when').text = center_keyframe1_time
        center_value1 = ET.SubElement(center_keyframe1, 'value')
        ET.SubElement(center_value1, 'horiz').text = str(center_keyframe1_value[0])
        ET.SubElement(center_value1, 'vert').text = str(center_keyframe1_value[1])

        center_keyframe2 = ET.SubElement(center_param, 'keyframe')
        ET.SubElement(center_keyframe2, 'when').text = center_keyframe2_time
        center_value2 = ET.SubElement(center_keyframe2, 'value')
        ET.SubElement(center_value2, 'horiz').text = str(center_keyframe2_value[0])
        ET.SubElement(center_value2, 'vert').text = str(center_keyframe2_value[1])

        print(f"Scale: {final_scale}, Margin: {horizontal_margin_normalized}, {vertical_margin_normalized }")



    def add_clips_to_sequence(self):
        tree, root = self._parse_xml()
        clips_data = self._load_json_data()
        new_track = self._create_new_track(root)

        for idx, clip in enumerate(clips_data):
            start_time_seconds = self._timecode_to_seconds(clip['markerTimecode'])
            start_frame = int(start_time_seconds * self.timebase)
            duration_frames = int(self.default_duration * self.timebase)

            if idx < len(clips_data) - 1:
                next_start_time_seconds = self._timecode_to_seconds(clips_data[idx + 1]['markerTimecode'])
                next_start_frame = int(next_start_time_seconds * self.timebase)
                end_frame = min(start_frame + duration_frames, next_start_frame)
            else:
                end_frame = start_frame + duration_frames

            new_clip_path = clip['filePath']
            img_path = new_clip_path.replace('file://', '')  # Remove 'file://' prefix
            if not os.path.isabs(img_path):
                img_path = os.path.join(script_dir, img_path.lstrip('/'))  # Correctly form the absolute path

            new_clipitem = self._create_clipitem(clip, start_frame, end_frame, idx, img_path)
            new_track.append(new_clipitem)

        for clip in clips_data:
            new_clip_path = clip['filePath'].split('/')[-1]
            clipitem = root.find(f".//clipitem[name='{new_clip_path}']")
            if clipitem is not None:
                img_width, img_height = self._get_image_dimensions(clip['filePath'])
                self._apply_scale_and_center_effects(clipitem, img_width, img_height, clip)
                print(f"Clip: {clip['filePath']}, Center X: {clip['clickCoordinates']['x']}, Center Y: {clip['clickCoordinates']['y']}")

        tree.write(self.output_file, encoding='UTF-8', xml_declaration=True)


# Get the directory of the script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Parameters for the new clips
json_file = os.path.join(script_dir, "updated_spreadsheet.json")
xml_file = os.path.join(script_dir, "TEST_ZOOM_PAN.xml")
output_file = os.path.join(script_dir, "UPDATED_TEST_ZOOM_PAN.xml")

# Update the XML file with clips from JSON
editor = VideoEditor(xml_file, json_file, output_file)
editor.add_clips_to_sequence()
