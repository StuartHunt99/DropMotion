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
        self.timebase = 24 

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

    def _generate_clipitem_xml(self, idx, clip, start_frame, end_frame, initial_scale, final_scale, duration, timebase, img_width, img_height):
        return f"""
        <clipitem id="clipitem-{idx + 1}">
            <masterclipid>masterclip-{idx + 1}</masterclipid>
            <name>{os.path.basename(clip['filePath'])}</name>
            <enabled>TRUE</enabled>
            <duration>{end_frame - start_frame}</duration>
            <rate>
                <timebase>{timebase}</timebase>
                <ntsc>TRUE</ntsc>
            </rate>
            <start>{start_frame}</start>
            <end>{end_frame}</end>
            <in>0</in>
            <out>{end_frame - start_frame}</out>
            <pproTicksIn>{int(start_frame * (25401600000000 / timebase))}</pproTicksIn>
            <pproTicksOut>{int(end_frame * (25401600000000 / timebase))}</pproTicksOut>
            <alphatype>straight</alphatype>        
            <pixelaspectratio>square</pixelaspectratio>
            <anamorphic>FALSE</anamorphic>
            <file id="file-{idx + 1}">  
                <name>{os.path.basename(clip['filePath'])}</name>
                <pathurl>{clip['filePath']}</pathurl>
                <rate>
                    <timebase>{timebase}</timebase>
                    <ntsc>TRUE</ntsc>
                </rate>
                <timecode>
                    <rate>
                        <timebase>{timebase}</timebase>
                        <ntsc>TRUE</ntsc>
                    </rate>
                    <string>00:00:00:00</string>
                    <frame>0</frame>
                    <displayformat>NDF</displayformat>
                </timecode>
                <media>
                    <video>
                        <samplecharacteristics>
                            <rate>
                                <timebase>{timebase}</timebase>
                                <ntsc>TRUE</ntsc>
                            </rate>
                            <width>1920</width>
                            <height>1080</height>
                            <anamorphic>FALSE</anamorphic>
                            <pixelaspectratio>square</pixelaspectratio>
                            <fielddominance>none</fielddominance>
                        </samplecharacteristics>
                    </video>
                </media>
            </file>
            <filter>
                <effect>
                    <name>Basic Motion</name>
                    <effectid>basic</effectid>
                    <effectcategory>motion</effectcategory>
                    <effecttype>motion</effecttype>
                    <mediatype>video</mediatype>
                    <pproBypass>false</pproBypass>
                    <parameter authoringApp="PremierePro">
                        <parameterid>scale</parameterid>
                        <name>Scale</name>
                        <valuemin>0</valuemin>
                        <valuemax>1000</valuemax>
                        <value>{initial_scale}</value>
                        <keyframe>
                            <when>0</when>
                            <value>{initial_scale if clip.get('zoom') == 'zoom_in' else final_scale}</value>
                        </keyframe>
                        <keyframe>
                            <when>{duration}</when>
                            <value>{final_scale if clip.get('zoom') == 'zoom_in' else initial_scale}</value>
                        </keyframe>
                    </parameter>
                    <parameter authoringApp="PremierePro">
                        <parameterid>rotation</parameterid>
                        <name>Rotation</name>
                        <valuemin>-8640</valuemin>
                        <valuemax>8640</valuemax>
                        <value>0</value>
                    </parameter>
                    <parameter authoringApp="PremierePro">
                        <parameterid>center</parameterid>
                        <name>Center</name>
                        <value>
                            <horiz>0</horiz>
                            <vert>0</vert>
                        </value>
                        <keyframe>
                            <when>0</when>
                            <value>
                                <horiz>0</horiz>
                                <vert>0</vert>
                            </value>
                        </keyframe>
                        <keyframe>
                            <when>{duration}</when>
                            <value>
                                <horiz>1.44</horiz>
                                <vert>0</vert>
                            </value>
                        </keyframe>
                    </parameter>
                    <parameter authoringApp="PremierePro">
                        <parameterid>centerOffset</parameterid>
                        <name>Anchor Point</name>
                        <value>
                            <horiz>0</horiz>
                            <vert>0</vert>
                        </value>
                    </parameter>
                    <parameter authoringApp="PremierePro">
                        <parameterid>antiflicker</parameterid>
                        <name>Anti-flicker Filter</name>
                        <valuemin>0.0</valuemin>
                        <valuemax>1.0</valuemax>
                        <value>0</value>
                    </parameter>
                </effect>
            </filter>
            <logginginfo>
                <description></description>
                <scene></scene>
                <shottake></shottake>
                <lognote></lognote>
                <good></good>
                <originalvideofilename></originalvideofilename>
                <originalaudiofilename></originalaudiofilename>
            </logginginfo>
            <colorinfo>
                <lut></lut>
                <lut1></lut1>
                <asc_sop></asc_sop>
                <asc_sat></asc_sat>
                <lut2></lut2>
            </colorinfo>
            <labels>
                <label2>Lavender</label2>
            </labels>
        </clipitem>
        """

    def _add_clips_to_sequence(self, xml_file, json_file, output_file, scale_increment=150, default_duration=10):
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
        new_track = ET.Element('track', {
            'TL.SQTrackShy': "0",
            'TL.SQTrackExpandedHeight': "41",
            'TL.SQTrackExpanded': "0",
            'MZ.TrackTargeted': "1"
        })
        video.append(new_track)

        for idx, clip in enumerate(clips_data):
            start_time_seconds = self._timecode_to_seconds(clip['markerTimecode'])
            start_frame = int(start_time_seconds * self.timebase)
            duration_frames = int(default_duration * self.timebase)

            # Calculate end frame based on next clip's start time or default duration
            if idx < len(clips_data) - 1:
                next_start_time_seconds = self.timecode_to_seconds(clips_data[idx + 1]['markerTimecode'])
                next_start_frame = int(next_start_time_seconds * timebase)
                end_frame = min(start_frame + duration_frames, next_start_frame)
            else:
                end_frame = start_frame + duration_frames

            img_path = clip['filePath'].replace('file://', '')  # Remove 'file://' prefix
            if not os.path.isabs(img_path):
                img_path = os.path.join(script_dir, img_path.lstrip('/'))  # Correctly form the absolute path

            img_width, img_height = self.get_image_dimensions(img_path)
            initial_scale = self.calculate_initial_scale(img_width, img_height)
            final_scale = initial_scale + scale_increment
            duration = end_frame - start_frame

            clipitem_xml = self.generate_clipitem_xml(idx, clip, start_frame, end_frame, initial_scale, final_scale, duration, timebase, img_width, img_height)
            new_clipitem = ET.fromstring(clipitem_xml)

            # Append the new clipitem to the new video track
            new_track.append(new_clipitem)

        # Write the updated XML to a new file with scale effects
        tree.write(output_file, encoding='UTF-8', xml_declaration=True)

# Get the directory of the script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Parameters for the new clips
json_file = os.path.join(script_dir, "updated_spreadsheet.json")
xml_file = os.path.join(script_dir, "TEST_ZOOM_PAN.xml")
output_file = os.path.join(script_dir, "UPDATED_TEST_ZOOM_PAN.xml")

# Update the XML file with clips from JSON
editor = VideoEditor(xml_file, json_file, output_file)
editor.add_clips_to_sequence()
