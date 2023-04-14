from __future__ import print_function

import datetime
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from apiclient import errors
from apiclient import http
from pathlib import Path
import platform
import time
import os
import re
import io
import random

from dmt_stuct import *


class DriveProcessor:
    """This is a DriveProcessor class
    """
    # If modifying these scope list, delete the file token.json.
    SCOPES_LIST = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/gmail.readonly']
    user_id: str
    cur_time: datetime
    timestamp: str
    storage_root = 'storage'
    cred: Credentials
    mapping_drive_dict = {}

    driveMap: DriveMap

    def __init__(self, user_id):
        # current date and time
        self.cur_time = datetime.datetime.now()
        self.timestamp = self.cur_time.strftime("%Y%m%d_%H%M%S")
        self.user_id = user_id
        self.driveMap = DriveMap(user_id)
        self.driveMap.timestamp = self.timestamp
        self.driveMap.files = {}  # dictionary
        Path(self.storage_root).mkdir(parents=True, exist_ok=True)
        log("dp.__init__(): user id: {}, timestamp: {}".format(self.user_id, self.timestamp), True)
        # load mapping file
        _save_path = self.storage_root + '/map-' + self.driveMap.userId + '.json'
        try:
            if os.path.exists(_save_path):
                # check file size
                if os.path.getsize(_save_path) == 0:
                    raise Exception("Init ERROR: empty mapping file detected!")
                log("dp.__init__(): try to open json file: {}".format(_save_path), True)
                with open(_save_path) as json_file:
                    _json = json.load(json_file)
                    for file_id in _json['files'].keys():
                        log("dp.__init__(): cur file id: {}, ".format(file_id), False)
                        _fileHolder = _json['files'][file_id]
                        version_list = []
                        for _ver in _fileHolder:
                            # log("dp.__init__(): var type: {}, ver: {}, ".format(type(_ver), _ver), True)
                            _ver_str = str(_ver)
                            _ver_str = _ver_str.replace("\'", "\"")
                            file_json = json.loads(_ver_str)
                            drive_file = DriveFile(**file_json)
                            # log("dp.__init__(): drive file: {}".format(vars(drive_file)), True)
                            version_list.append(drive_file)
                        self.driveMap.files[file_id] = version_list
        except Exception as error:
            log('dp.__init__(): --- ERROR: JSON error: {}'.format(error), True)
            quit()
        log("dp.__init__(): got saved mapping: {}".format(vars(self.driveMap)), False)
        log("dp.__init__(): saved keys: {}".format(self.driveMap.files.keys()), True)

        _cred = None
        # The file token.json stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        token_path = self.storage_root + '/token-' + self.user_id + '.json'
        if os.path.exists(token_path):
            log("dp.__init__(): load credentials from already saved token: {}".format(token_path), True)
            _cred = Credentials.from_authorized_user_file(token_path, self.SCOPES_LIST)
        # If there are no (valid) credentials available, let the user log in.
        if not _cred or not _cred.valid:
            if _cred and _cred.expired and _cred.refresh_token:
                log("dp.__init__(): try to refresh credits...", True)
                _cred.refresh(Request())
            else:
                log("dp.__init__(): try to get flow...")
                flow = InstalledAppFlow.from_client_secrets_file(self.storage_root + '/' + 'credentials.json',
                                                                 self.SCOPES_LIST)
                log("dp.__init__(): try to run local server...")
                _cred = flow.run_local_server(port=0)
            # Save the credentials for the next run
            log("dp.__init__(): save the credentials for the next run: {}".format(token_path))
            with open(token_path, 'w') as token:
                token.write(_cred.to_json())
        self.cred = _cred

    def run(self):
        """Shows basic usage of the Drive v3 API.
        Prints the names and ids of the first 10 files the user has access to.
        revi
        """
        log("dp.run(): start", True)
        drive_map_updated = False
        try:
            log("run(): try to build service...")
            service = build('drive', 'v3', credentials=self.cred)

            root = service.files().get(fileId='root').execute()
            root_id = root['id']
            log("dp.run(): root Id: {}".format(root_id))

            # Call the Drive v3 API
            log("dp.run(): try to call Drive v3 API...")
            results = service.files().list(
                pageSize=999, fields="nextPageToken, files(id, name, parents, mimeType)").execute()
            items = results.get('files', [])
            log('dp.run(): items amount including folders: {}'.format(len(items)))
            folder_dict = self.create_folders_tree(items, root_id)
            files_list = []
            for item in items:
                if item['mimeType'] != 'application/vnd.google-apps.folder':
                    files_list.append(item)
            self.driveMap.file_amount = len(files_list)
            log('dp.run(): files amount: {}'.format(self.driveMap.file_amount))

            # log('dp.run(): keys of already tracked files: {}'.format(self.driveMap.files.keys()), True)
            for i, item in enumerate(files_list):
                log("dp.run(): item {0}: {1}".format(i, item))
                file_id = item['id']
                new_file_name = item['name']
                parent_id = item['parents'][0]
                tmp_path = self.storage_root + '/tmp_' + str(random.randrange(1000, 9999)) + '_' + new_file_name
                save_path = self.storage_root + '/' + folder_dict[parent_id] + '/' + new_file_name
                f = open(tmp_path, 'wb')
                download_result = self.download_file(service, file_id, item['mimeType'], f)
                f.close()
                if not download_result:
                    log("dp.run(): item {}: {}: --- ERROR: impossible to download: {}".format(i, item, save_path))
                    continue
                new_file_size = os.path.getsize(tmp_path)
                new_file_path = self.storage_root + '/' + folder_dict[parent_id]
                new_file_time = self.cur_time.strftime("%Y-%d-%m %H:%M:%S")
                new_file = DriveFile(new_file_name, new_file_path, new_file_size, new_file_time, item['mimeType'])
                # log(u"run(): file {} of {}: {}, size bytes: {}".format(i, len(files_list), tmp_path, file_size), True)

                # check if this file was already downloaded
                need_to_save = True
                last_saved_path = None
                last_saved_size = None
                last_saved_name = None

                if file_id in self.driveMap.files.keys():
                    file_versions_amount = len(self.driveMap.files[file_id])
                    msg = 'dp.run(): {} of {}: check received file id: {}, amount of versions: {}'
                    log(msg.format(i + 1, len(files_list), file_id, file_versions_amount), False)

                    if file_versions_amount > 0:
                        last_saved_size = self.driveMap.files[file_id][file_versions_amount - 1].size
                        last_saved_path = self.driveMap.files[file_id][file_versions_amount - 1].path
                        last_saved_name = self.driveMap.files[file_id][file_versions_amount - 1].name
                        if new_file_size in range(last_saved_size - 5, last_saved_size + 5):
                            need_to_save = False
                else:
                    msg = 'dp.run(): {} of {}: --- new file_id detected: {}: {}'
                    log(msg.format(i + 1, len(files_list), file_id, save_path), True)

                if need_to_save:
                    drive_map_updated = True
                    msg = 'dp.run(): {} of {}: need to store updated file: {}, last saved/received: {}/{}'
                    log(msg.format(i + 1, len(files_list), save_path, last_saved_size, new_file_size), True)
                    # self.driveMap.files = {file_id: [new_file]}
                    if file_id in self.driveMap.files.keys():
                        log('dp.run(): append new file version to file_id: {}'.format(file_id))
                        self.driveMap.files[file_id].append(new_file)
                    else:
                        log('dp.run(): need to create new record for file_id: {}'.format(file_id))
                        self.driveMap.files[file_id] = []
                        self.driveMap.files[file_id].append(new_file)
                        pass
                    # create folder for the new file
                    Path(self.storage_root + '/' + folder_dict[parent_id]).mkdir(parents=True, exist_ok=True)
                    # msg = 'run(): {} of {}: this version should be stored in the folder: {}'
                    # log(msg.format(i+1, len(files_list), self.storage_root + '/' + folder_dict[parent_id]), True)
                    os.rename(tmp_path, save_path)
                else:
                    msg = 'dp.run(): {} of {}: already saved: {}/{}, last saved/received: {}/{}'
                    log(msg.format(i + 1, len(files_list), last_saved_path, last_saved_name, last_saved_size,
                                   new_file_size), True)
                    os.remove(tmp_path)
                # if (i + 1) >= 2:
                #     break
            _save_path = self.storage_root + '/map-' + self.driveMap.userId + '.json'
            if drive_map_updated:
                # save original version of mapping file
                if os.path.exists(_save_path):
                    with open(_save_path) as f:
                        _old_mapping_path = self.storage_root + '/map-' + self.driveMap.userId + '_' + self.driveMap.timestamp + '.json'
                        with open(_old_mapping_path, 'w') as file:
                            file.write(f.read())
                            log("dp.run(): old mapping was saved ro: {}".format(_old_mapping_path), True)
                # save new version of mapping file
                with open(_save_path, 'w') as cur_map:
                    cur_map.write(self.driveMap.to_json())
                    log("dp.run(): new mapping file saved: {}".format(_save_path), True)
            else:
                log("dp.run(): no changes in mapping file: {}".format(_save_path), True)

        except HttpError as error:
            log('dp.run(): --- ERROR: An error occurred: {}'.format(error), True)

    def create_folders_tree(self, items, root_id):
        #  get amount of folder tree nodes
        parent_dict = {}
        for item in items:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                parent_dict[item['parents'][0]] = ''
        tree_levels = len(parent_dict)
        log('dp.create_folders_tree(): folder tree levels: {}'.format(tree_levels))

        folder_dict = {root_id: self.user_id + '-' + self.timestamp}
        for i in range(0, tree_levels):
            # log('dp.create_folders_tree(): iteration: {}'.format(i))
            for item in items:
                if item['mimeType'] == 'application/vnd.google-apps.folder':
                    folder_id = item['id']
                    parent_id = item['parents'][0]
                    # msg = 'dp.create_folders_tree(): iteration {}: folder id: {}, name: {}, parent: {}'
                    # log(msg.format(i, item['id'], item['name'], parent_id))
                    if folder_id not in folder_dict:
                        if parent_id == root_id:
                            folder_dict[folder_id] = self.user_id + '-' + self.timestamp + '/' + item['name']
                        else:
                            if parent_id in folder_dict:
                                path = folder_dict[parent_id] + '/' + item['name']
                                folder_dict[folder_id] = path
                                # msg = 'dp.create_folders_tree(): iteration {}: folder id: {}, path: {}'
                                # log(msg.format(i, item['id'], path))
                                break
            # log('dp.create_folders_tree(): iteration {}: cur mapping: {}'.format(i, folder_mapper))
            # log('dp.create_folders_tree(): iteration {}: path created: {}'.format(i, path_created))
        log('dp.create_folders_tree(): folder mapping: {}'.format(folder_dict), False)
        return folder_dict

    @staticmethod
    def download_file(service, file_id, mime_type, local_fd):
        """Download a Drive file's content to the local filesystem.
        https://developers.google.com/drive/api/guides/ref-export-formats

        Args:
          service: Drive API Service instance.
          file_id: ID of the Drive file that will downloaded.
          mime_type: mime type of file
          local_fd: io.Base or file object, the stream that the Drive file's
              contents will be written to.
        """
        if mime_type == "application/vnd.google-apps.spreadsheet":
            export_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            request = service.files().export_media(fileId=file_id, mimeType=export_type)
        elif mime_type == "application/vnd.google-apps.document":
            export_type = 'application/vnd.oasis.opendocument.text'
            request = service.files().export_media(fileId=file_id, mimeType=export_type)
        else:
            request = service.files().get_media(fileId=file_id)

        media_request = http.MediaIoBaseDownload(local_fd, request)

        while True:
            try:
                download_progress, done = media_request.next_chunk()
            except errors.HttpError as error:
                log('dp.download_file(): --- ERROR: An error occurred: {}'.format(error), True)
                log('dp.download_file(): --- ERROR: error mime type: {}'.format(mime_type), True)
                return False
            if download_progress:
                log('dp.download_file(): download Progress: {}%'.format(int(download_progress.progress() * 100)))
            if done:
                log("dp.download_file(): download complete: {0}".format(file_id))
                return True


def log(msg, stdout=False):
    """logger function"""
    date = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    output_str = u"{}: {}".format(date, msg)
    if stdout:
        print(output_str)
    if re.match("Windows", platform.system()):
        log_file = "python.log"
    else:
        log_file = "./python.log"
    with io.open(log_file, 'ab') as file:
        output_str += "\n"
        file.write(output_str.encode('utf8'))


if __name__ == '__main__':
    driveProcessor = DriveProcessor('st')
    driveProcessor.run()
