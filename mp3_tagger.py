# -*- coding: utf-8 -*-
from mutagen.id3 import ID3, Encoding, PictureType
from mutagen.mp3 import MP3
import xml.etree.ElementTree as ET
import platform
import mutagen
import time
import sys
import os
import re
import io


def log(msg, stdout=False):
    "logger function"
    date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    output_str = u"{}: {}".format(date, msg)
    if stdout:
        print(output_str)
    if re.match("Windows", platform.system()):
        log_file = "python.log"
    else:
        log_file = "/home/www/somepath/runtime/logs/python.log"
    with io.open(log_file, 'ab') as file:
        output_str += "\n"
        file.write(output_str.encode('utf8'))


log("--- start. Python ver {}, system: {}".format(platform.python_version(), platform.system()), True)
log('number of arguments: {}'.format(len(sys.argv)))
if len(sys.argv) > 1 and re.match(r".+\.xml$", sys.argv[1]):
    xml_conf = sys.argv[1]
else:
    log("ERROR: no XML configaration file passed")
    quit()
# load mp3 ID3 tags info from XML file
log("try to parse XML config: '{}'".format(xml_conf))
id3_dict = {}
mp3_path = logo_path = None
try:
    tree = ET.parse(xml_conf)
    for elt in tree.iter():
        # log("cur node: {}: {}".format(elt.tag, elt.text))
        if re.match(r"^tag\_", elt.tag):
            id3_dict[elt.tag.replace("tag_", '')] = elt.text.encode('utf8')
        id3_dict["APIC"] = None  # Add tag for media image
        if re.match("logo_path", elt.tag):
            logo_path = elt.text
        if re.match("mp3_path", elt.tag):
            mp3_path = elt.text
except BaseException as e:
    log("ERROR: caught exception during XML parsing: {}".format(sys.exc_info()), True)
    log("so do nothing", True)
    quit()

log("logo path: {}".format(logo_path))
log("mp3 path: {}".format(mp3_path))
counter = 0
for cur_tag in id3_dict:
    counter += 1
    value = id3_dict[cur_tag]
    log("type: {}".format(type(value)))
    if type(value) is bytes:
        out_str = str(value, "utf8")
    else:
        out_str = '---'
    log("tag {0:<2d}: {1}: {2}".format(
        counter, cur_tag, out_str))

try:
    id3 = ID3()
    logo_data = logo_desc = ""
    for cur_tag in id3_dict:
        if cur_tag not in ("APIC"):  # skip image tag
            # log("add tag: {}: {}".format(cur_tag, id3_dict[cur_tag]))
            text_value = str(id3_dict[cur_tag], 'utf8')
            id3.add(mutagen.id3.Frames[cur_tag](
                encoding=Encoding.UTF8, text=text_value))
        elif cur_tag == "APIC":  # process image
            log("cur tag: {}".format(cur_tag))
            # get data for 230x230 front cover
            with open(logo_path, "rb") as h:
                logo_data = h.read()
            log("logo bytes: {}, path: {}".format(len(logo_data), logo_path))
            logo_desc = "Cover: {} - {}".format(str(id3_dict["TPE1"], 'utf8'),
                                                str(id3_dict["TPE2"], 'utf8'))
            # log("logo desc: {}".format(logo_desc))
            frame0 = mutagen.id3.APIC(encoding=Encoding.UTF8, mime="image/jpeg",
                                      desc=logo_desc, type=PictureType.COVER_FRONT, data=logo_data)
            id3.add(frame0)
    id3.update_to_v24()
    id3.save(mp3_path)

    # audio = MP3(mp3_path)
    # loop_range = range(20)
    # for i in loop_range:
    #     audio.tags.add(mutagen.id3.APIC(encoding=Encoding.UTF8, mime="image/jpeg",
    #                                     desc="Desc " + str(i), type=i, data=logo_data))
    # audio.save()

    log("file saved: " + mp3_path)
    log("try to test just saved file...")
    mp3file = MP3(mp3_path)
    log("update test - file info: {}".format(mp3file.info.pprint()))
    log("update test - file size: {} MB".format(round(os.path.getsize(mp3_path) / 1024 / 1024, 2)))
    log("update test - tags: {}".format(mp3file.tags.pprint()))
except BaseException as e:
    log("ERROR: Caught exception: {}".format(sys.exc_info()), True)
finally:
    log("file procesed: " + mp3_path, True)
