<?php

namespace app\models;

use app\commands\telegram\EntityDecoder1;
use app\components\Helper;
use app\components\HookAction;
use app\controllers\OkController;
use Longman\TelegramBot\Entities\Update;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;
use Yii;
use function app\commands\enc;

/**
 * This is the model for RFE addition to Telegram message
 *
 * @property string $status // ok, error
 * @property array $statusNote // Errror 400: File too big
 * @property string $bot_username
 * @property array $other
 * // fields for fast view presentation
 * @property string $f_updateId
 * @property string $f_date // post date
 * @property string $f_type // post type: text, audio, video, document, photo
 * @property string $f_channelId
 * @property string $f_channelTitle // Радио Свобода
 * @property string $f_channelUserName // radiosvoboda
 * @property string $f_forward // forward from channel
 * @property string $f_text
 * @property string $f_textRich
 * @property array $f_link // URL of the first 'text_link' filed
 * @property string $f_media // name of file saved in /assets/ dir: video-*.mp4, audio-*.mp3, photo-*.jpg, thumb-*.jpg
 * @property string $f_mediaUniqueId // file_unique_id Telegram value
 * @property string $f_mediaTitle // Media title parsed by Telegram from meta tags
 * @property string $f_mediaPerformer // Performer parsed by Telegram from meta tags
 * @property string $f_mediaSize // file_size Telegram value
 * @property string $f_mediaDesc // audio/mpeg, 14.4 MB
 * // RFE/Rl sites family specific properties
 * @property string $rfe_flag // yes, no
 * @property array $rfe_title // title of RFE article
 * @property array $rfe_photo // Link to RFE photo: https://gdb.rferl.org/*
 * // LiveJournal specific properties
 * @property string $lj_flag
 * @property string $lj_subj
 * @property string $lj_body
 * // OK social network specific properties
 * @property string $ok_flag
 * @property string $ok_media
 * // VK social network specific properties
 * @property string $vk_flag
 * @property string $vk_media
 * // Viber social network specific properties
 * @property string $viber_flag
 * @property string $viber_media
 *
 */
class RfeTg
{
    public static $TG_DIR_TXT = "/home/www/somesite.info/web/media/tg/";
    public static $TG_DIR_ASSET = "/home/www/somesite.info/web/media/tg/asset/";
    public static $RFE_TAG = "rfe";

    /**
     * @param array $data
     */
    public function __construct($data = null) {
//        Yii::info("RfeTg.__construct(): start", 'hook');
        $reflection = new \ReflectionClass($this);
        $doc_comment = $reflection->getDocComment();
//        Yii::info("RfeTg.__construct(): doc comment: " . print_r($doc_comment, true), 'hook');
        $pattern = "#(@property\s*[a-zA-Z0-9, ()_].*)#";
        preg_match_all($pattern, $doc_comment, $matches, PREG_PATTERN_ORDER);
        if (isset($matches[0]) && is_array($matches[0])) {
            foreach ($matches[0] as $cur_line) {
//                Yii::info("RfeTg.__construct(): cur line: " . $cur_line, 'hook');
                $cur_arr = explode(' ', $cur_line);
                foreach ($cur_arr as $cur_item) {
                    if (strpos($cur_item, '$') !== false) {
                        $property = trim(str_replace('$', '', $cur_item));
                        if (strpos($cur_line, "@property array") !== false) {
                            $this->$property = [];
                        } else {
                            $this->$property = '';
                        }
                        break;
                    }
                }
            }
        }
        if (isset($data)) {
            $this->assignMemberVariables($data);
        }
    }

    /**
     * Helper to set member variables
     *
     * @param array $data
     */
    protected function assignMemberVariables(array $data) {
        foreach ($data as $key => $value) {
            $this->$key = $value;
        }
    }

    /**
     * Scan passed Telegram update JSON file and fill it with useful information
     * @param $file
     * @return RfeTg|false
     */
    public static function getInfo($file) {
        Yii::info("RfeTg.getInfo(): start. File: " . basename($file), 'hook');
        try {
            $rfeTg = new RfeTg();
            if (!file_exists($file)) {
                Yii::error("RfeTg.getInfo(): File doesn't exist: " . $file, 'hook');
                return false;
            }
            $input = file_get_contents($file);
            $input_array = json_decode($input, true);
//            Yii::info("RfeTg.getInfo(): got input array: " . print_r($input_array, true), 'hook');
//            $input_array = self::checkEntities($input_array);
            // Send monitoring info should be permanent
            $send_monitoring_arr = null;
            if (!isset($input_array[RfeSend::$RFE_SEND_TAG])) {
                $sendMonitoring = new RfeSend();
//                Yii::info("RfeTg.getInfo(): created new RfeSend object: " . print_r($sendMonitoring, true), 'hook');
                $send_monitoring_arr = json_decode(json_encode($sendMonitoring), true);
//                Yii::info("RfeTg.getInfo(): created new send monitoring array: " . print_r($send_monitoring_arr, true), 'hook');
            } else {
                $send_monitoring_arr = $input_array[RfeSend::$RFE_SEND_TAG];
            }

            if (!isset($input_array["bot_username"])) {
                Yii::error("RfeTg.getInfo(): input file contains no 'bot_username'", 'hook');
                $rfeTg->statusNote[] = "No 'bot_username'";
                $bot_username = "x1bot";
            } else {
                $bot_username = $input_array["bot_username"];
            }
            $update = new Update($input_array, $bot_username);
            $update_id = $update->getUpdateId();
            $post = $update->getChannelPost();
            $type = $post->getType();
            $chat = $post->getChat();
            $chatId = $chat->getId();

            $rfeTg->bot_username = $bot_username;
            $rfeTg->f_updateId = $update_id;
            $rfeTg->f_channelId = $chatId;
            $rfeTg->f_channelUserName = $chat->getUsername();
            $rfeTg->f_channelTitle = $chat->getTitle();
            $rfeTg->f_type = $type;
            $rfeTg->f_date = date("Y-m-d H:i:s", $post->getDate());
            if ($forwardChat = $post->getForwardFromChat()) {
                $rfeTg->f_forward = $forwardChat->getTitle();
            }


            // Format text
            try {
                $richTextDecoder = new EntityDecoder1();
                // Convert post into general object
                $post_obj = json_decode(json_encode($post));
//                Yii::info("RfeTg.getInfo(): try to call decoder. Message: ".print_r($post_obj, true), 'hook');
                $rfeTg->f_textRich = $richTextDecoder->decode($post_obj);
            } catch (\Exception $e) {
                Yii::error("RfeTg.getInfo(): rich formatter 1: caught exception: " . $e, 'hook');
                $rfeTg->f_textRich = $post->getText();
            }

            if ($type === "text") {
                $rfeTg->status = "ok";
                $rfeTg->f_text = $post->getText();

                $entities = $post->getEntities();
                if ($entities == null || empty($entities) || sizeof($entities) == 0) { // to prevent exception 'Invalid argument supplied for foreach()'
                    $entities = [];
                    Yii::info("RfeTg.getInfo(): got no entities", 'hook');
                }
                Yii::info("RfeTg.getInfo(): msg type: text, amount of entities: " . sizeof($entities), 'hook');
                $counter = 0;
                $imageReplacemetUrl = '';
                $already_added_link = [];
                foreach ($entities as $cur_ent) {
                    $ent_type = $cur_ent->getType();
                    Yii::info("RfeTg.getInfo(): entity: " . $counter . ", type: " . $ent_type, 'hook');
                    Yii::info("RfeTg.getInfo(): entity: " . $counter . ", content: " . print_r($cur_ent, true), 'hook');
                    if ($ent_type === "text_link") {
                        $url = $cur_ent->getUrl();
                        $offset = $cur_ent->getOffset();
                        $length = $cur_ent->getLength();
                        if ($offset == 0 && $length == 1) {
                            // it possible that the fist symbol of message is invisible link to an image
                            Yii::info("RfeTg.getInfo(): possible image replacement attempt", 'hook');
                            if (self::isFollowToImage($url)) {
                                Yii::info("RfeTg.getInfo(): image replacement attempt confirmed", 'hook');
                                $imageReplacemetUrl = $url;
                                continue;
                            }
                        }
                        if (in_array($url, $already_added_link)) {
                            Yii::info("RfeTg.getInfo(): this link was already processed", 'hook');
                            continue;
                        }
                        $rfeTg->f_link[] = $url;
                        $already_added_link[] = $url;
                        Yii::info("RfeTg.getInfo(): url: " . $url, 'hook');
                        if (preg_match("/(http.+\/a.*\/[0-9]{7,8}\.html)/", $url, $matches)) {
                            $url = $matches[1];
                            Yii::info("RfeTg.getInfo(): RFE/Rl site detected", 'hook');
                            list($title, $photo) = self::parseArticle($url);
                            Yii::info("RfeTg.getInfo(): title: " . $title, 'hook');
                            Yii::info("RfeTg.getInfo(): photo: " . $photo, 'hook');
                            $rfeTg->rfe_flag = "yes";
                            $rfeTg->rfe_title[] = $title;
                            $rfeTg->rfe_photo[] = $photo;
                        } else {
                            Yii::info("RfeTg.getInfo(): foreign site", 'hook');
                            if (strpos($url, "youtu")) {
                                list($youtubeId, $title, $photo) = self::parseYouTube($url);
                                Yii::info(sprintf("RfeTg.getInfo(): youtube id: %s, title: %s, photo: %s", $youtubeId, $title, $photo), 'hook');
                                $rfeTg->rfe_flag = "youtube";
                                $rfeTg->rfe_title[] = $title;
                                $rfeTg->rfe_photo[] = $photo;
                                if (!empty($youtubeId)) {
                                    $rfeTg->other["YoutubeId"] = $youtubeId;
                                }
                            }
                        }
                    } elseif ($ent_type === "url") {
                        $prefix = mb_substr($rfeTg->f_text, 0, $cur_ent->getOffset());
                        $new_url = mb_substr($rfeTg->f_text, $cur_ent->getOffset(), $cur_ent->getLength());
                        $suffix = mb_substr($rfeTg->f_text, $cur_ent->getOffset() + $cur_ent->getLength());
                        // cut link
                        $newText = trim($prefix . $suffix);
                        Yii::info("RfeTg.getInfo(): new URL: " . $new_url, 'hook');
                        Yii::info("RfeTg.getInfo(): new text: " . $newText, 'hook');
                        if (preg_match("/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/", $new_url)) {
                            $rfeTg->f_text = $rfeTg->f_textRich = $newText;
                            $rfeTg->f_link[] = $new_url;
                            if (preg_match("/(http.+\/a.*\/[0-9]{7,8}\.html)/", $new_url, $matches)) {
                                $new_url = $matches[1];
                                Yii::info("RfeTg.getInfo(): new link - RFE/Rl site detected", 'hook');
                                list($title, $photo) = self::parseArticle($new_url);
                                Yii::info("RfeTg.getInfo(): new link title: " . $title, 'hook');
                                Yii::info("RfeTg.getInfo(): new link photo: " . $photo, 'hook');
                                $rfeTg->rfe_flag = "yes";
                                $rfeTg->rfe_title[] = $title;
                                $rfeTg->rfe_photo[] = $photo;
                            } elseif (strpos($url, "youtu")) { // YouTube
                                list($youtubeId, $title, $photo) = self::parseYouTube($url);
                                if (!empty($youtubeId)) {
                                    $rfeTg->other["YoutubeId"] = $youtubeId;
                                }
                            }
                        } else {
                            Yii::info("RfeTg.getInfo(): new URL isn't valid link", 'hook');
                        }
                    } else {
                        $ignore_tag = ['bold', 'italic', 'underline', 'strikethrough', 'code', 'pre', 'text_mention'];
                        if (!in_array($ent_type, $ignore_tag)) {
                            Yii::info("RfeTg.getInfo(): --- WARNING: NEED TO IMPLEMENT PROCESSING OF TAG: " . $ent_type, 'hook');
                        }
                        continue;
                    }
                    $counter++;
                }
                if (!empty($imageReplacemetUrl) && sizeof($rfeTg->rfe_photo) > 0) {
                    Yii::info("RfeTg.getInfo(): replace image replacement. Old: " . $rfeTg->rfe_photo[0], 'hook');
                    $rfeTg->rfe_photo[0] = $imageReplacemetUrl;
                    Yii::info("RfeTg.getInfo(): replace image replacement. New: " . $rfeTg->rfe_photo[0], 'hook');
                }
                // Check duplication
                // Need to perform duplication check by post links
                $arr = ["f_link" => $rfeTg->f_link];
                $isDuplication = self::isDuplication($arr, $file);
                if ($isDuplication) {
                    $rfeTg->status = "error";
                    $rfeTg->statusNote[] = "Link duplication";
                    Yii::info("RfeTg.getInfo(): duplication by link detected", 'hook');
                }
            } elseif ($type === "audio" || $type === "video" || $type === "photo") {
                $rfeTg->f_text = $post->getCaption();
                $captionEntitles = $post->getCaptionEntities();
                if (is_array($captionEntitles)) {
                    foreach ($captionEntitles as $curCaptionEntitle) {
//                        Yii::info("RfeTg.getInfo(): cur caption entitle: ".print_r($curCaptionEntitle, true), 'hook');
                        $curCaptionType = $curCaptionEntitle->getType();
                        $curCaptionUrl = $curCaptionEntitle->getUrl();
                        Yii::info("RfeTg.getInfo(): cur caption entitle type: " . $curCaptionType . ", url: " . $curCaptionUrl, 'hook');
                        if (!empty($curCaptionUrl) && !in_array($curCaptionUrl, $rfeTg->f_link)) {
                            $rfeTg->f_link[] = $curCaptionUrl;
                        }
                    }
                }
                if ($type === "audio") {
                    $media = $post->getAudio();
                    $prefix = "audio";
                    $ext = "mp3";
                    $rfeTg->f_mediaDesc = sprintf("%s", Helper::format_file_size($media->getFileSize()));
                } elseif ($type === "video") {
                    $media = $post->getVideo();
                    $prefix = "video";
                    $ext = "mp4";
                    $rfeTg->f_mediaDesc = sprintf("%s", Helper::format_file_size($media->getFileSize()));
                } else { // photo
                    $photoSizeArr = $post->getPhoto();
                    $max_size = 0;
                    foreach ($photoSizeArr as $photoSize) {
                        if ($photoSize->getFileSize() > $max_size) {
                            $media = $photoSize;
                            $rfeTg->f_mediaDesc = sprintf("%sx%s", $photoSize->getWidth(), $photoSize->getHeight());
                        }
                    }
                    $prefix = "photo";
                    $ext = "jpg";
                }
                Yii::info("RfeTg.getInfo(): media: " . print_r($media, true), 'hook');
                $file_unique_id = $media->getProperty("file_unique_id");
                $rfeTg->f_mediaPerformer = $media->getProperty("performer");
                if (!empty($mediaTitle = $media->getProperty("title"))) {
                    $titleStopWords = [".mp3", ".mp4"];
                    $isStop = false;
                    foreach ($titleStopWords as $curWord) {
                        if (mb_strpos($mediaTitle, $curWord) !== false) {
                            $isStop = true;
                            break;
                        }
                    }
                    if (!$isStop) {
                        $rfeTg->f_mediaTitle = $mediaTitle;

                    }
                }
                $rfeTg->f_mediaUniqueId = $file_unique_id;
                $rfeTg->f_mediaSize = $media->getFileSize();
                // Need to perform duplication check by media size and unique Id
                $arr = ["f_mediaUniqueId" => $file_unique_id, "f_mediaSize" => $media->getFileSize()];
                $isDuplication = self::isDuplication($arr, $file);
                if ($isDuplication) {
                    $rfeTg->status = "error";
                    $rfeTg->statusNote[] = "File duplication";
                    Yii::info("RfeTg.getInfo(): duplication by media detected", 'hook');
                } else {
                    $mediaFileName = sprintf("%s%s_%s-%s.%s", $prefix, $chatId, $update_id, $file_unique_id, $ext);
                    $getRes = self::getFile($media->getFileId(), $mediaFileName, $rfeTg);
                    Yii::info("RfeTg.getInfo(): video get result: " . print_r($getRes, true), 'hook');
                    $rfeTg->status = $getRes["media_download"];
                    if ($rfeTg->status == "ok") {
                        $rfeTg->f_media = $getRes["download_description"];
                    } else {
                        $rfeTg->statusNote[] = $getRes["download_description"];
                    }
                }
            } elseif ($type == "message") {
                Yii::info("RfeTg.getInfo(): post type 'message'", 'hook');
                $rawData = $post->getRawData();
                Yii::info("RfeTg.getInfo(): raw data: " . print_r($rawData, true), 'hook');
                if (isset($rawData["poll"]["question"])) {
                    Yii::info("RfeTg.getInfo(): this is poll message", 'hook');
                    $rfeTg->f_text = $rfeTg->f_textRich = $rawData["poll"]["question"];
                }
                $rfeTg->status = "error";
                $rfeTg->statusNote[] = "Unsupported type";
            } else {
                Yii::info("RfeTg.getInfo(): --- WARNING: NEED TO IMPLEMENT PROCESSING OF MESSAGE TYPE: " . $type, 'hook');
            }

            // Add social network formatting
            if (isset($rfeTg->status) && ($rfeTg->status == "ok")) {
                Yii::info("RfeTg.getInfo(): try to add LiveJournal data...", 'hook');
                $rfeTg = self::addLj($rfeTg);
                Yii::info("RfeTg.getInfo(): try to add OK data...", 'hook');
                $rfeTg = self::addOk($rfeTg);
                Yii::info("RfeTg.getInfo(): try to add VK data...", 'hook');
                $rfeTg = self::addVk($rfeTg);
                Yii::info("RfeTg.getInfo(): try to add Viber data...", 'hook');
                $rfeTg = self::addViber($rfeTg);
            }

            $add_arr = json_decode(json_encode($rfeTg), true);
            // get sending statuses from monitoring block
            foreach ($send_monitoring_arr as $tag => $value) {
//                Yii::info("RfeTg.getInfo(): tag: ".$tag.", value: ".print_r($value, true), 'hook');
                if (is_string($tag) && preg_match("/^([a-z]+)_status$/", $tag, $matches)) {
                    $network_shortname = $matches[1];
//                    Yii::info("RfeTg.getInfo(): status tag match: " . $network_shortname . ", value: " . $value, 'hook');
                    $flag_tag = $network_shortname . "_flag";
//                    Yii::info("RfeTg.getInfo(): flag tag: " . $flag_tag . ", value: " . $add_arr[$flag_tag], 'hook');
                    if (!empty($value) && isset($add_arr[$flag_tag])) {
                        $add_arr[$flag_tag] = $value;
                    }
                }
            }
            Yii::info("RfeTg.getInfo(): add array: " . print_r($add_arr, true), 'hook');
            $update_arr = json_decode(json_encode($update), true);
            // force RFE_SEND_TAG tag to be placed as last one in array
            unset($update_arr[RfeSend::$RFE_SEND_TAG]);
            $update_arr[self::$RFE_TAG] = $add_arr;
            $update_arr[RfeSend::$RFE_SEND_TAG] = $send_monitoring_arr;
            $saveRes = file_put_contents($file, json_encode($update_arr));
            Yii::info("RfeTg.getInfo(): save result: " . $saveRes . ", file: " . basename($file), 'hook');
            return $rfeTg;
        } catch (\Exception $e) {
            Yii::error("RfeTg.getInfo(): caught exception: " . $e, 'hook');
            return false;
        }
    }

    /**
     * Check if link to image submitted
     * @param $url
     * @return bool
     */
    public static function isFollowToImage($url) {
        Yii::info("RfeTg.isFollowToImage(): start. URL: " . $url, 'hook');
        try {
            $testData = self::getUrl($url);
            Yii::info("RfeTg.isFollowToImage(): got data: " . strlen($testData) . ", URL: " . $url, 'hook');
            if (is_array(getimagesizefromstring($testData))) {
                Yii::info("RfeTg.isFollowToImage(): --- image detected: " . $url, 'hook');
                return true;
            } else {
                Yii::info("RfeTg.isFollowToImage(): it isn't image", 'hook');
                return false;
            }
        } catch (\Exception $e) {
            Yii::error("RfeTg.isFollowToImage(): caught exception: " . $e, 'hook');
            return false;
        }

    }

    /**
     * @param RfeTg $rfeTg
     * @return RfeTg mixed
     */
    private static function addViber($rfeTg) {
        $type = (isset($rfeTg->f_type)) ? $rfeTg->f_type : '';
        Yii::info("RfeTg.addViber(): start. Type: " . $type, 'hook');
        $rfeTg->viber_flag = "ready";
        $rfeTg->viber_media = $rfeTg->ok_media;
        return $rfeTg;
    }

    /**
     * @param RfeTg $rfeTg
     * @return RfeTg mixed
     */
    private static function addVk($rfeTg) {
        $type = (isset($rfeTg->f_type)) ? $rfeTg->f_type : '';
        Yii::info("RfeTg.addVk(): start. Type: " . $type, 'hook');
        $rfeTg->vk_flag = "ready";
        $rfeTg->vk_media = $rfeTg->ok_media;
        return $rfeTg;
    }


    /**
     * @param $youtubeId
     * @return string
     */
    private static function embedYouTubePlayer($youtubeId) {
        return sprintf('<br/><iframe width="560" height="315" src="https://www.youtube.com/embed/%s" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', $youtubeId);
    }

    /**
     * @param array $keys_arr
     * @param string $file
     */
    private
    static function isDuplication($keys_arr, $file) {
        Yii::info("RfeTg.isDuplication(): keys: " . implode(', ', array_keys($keys_arr)), 'hook');
        Yii::info("RfeTg.isDuplication(): file: " . basename($file), 'hook');
        $files = glob(RfeTg::$TG_DIR_TXT . "*_*-*.txt");
        arsort($files); // Newest first
        $files = array_slice($files, 0, OkController::$MSG_LIMIT * 2); // Only X newest
        $checkStarted = false;
        foreach ($files as $cur_file) {
//            Yii::info("RfeTg.isDuplication(): cur file: " . $cur_file, 'hook');
            if ($checkStarted) {
                $arr = json_decode(file_get_contents($cur_file), true);
                if (isset($arr[self::$RFE_TAG])) {
                    $rfe_arr = $arr[self::$RFE_TAG];
//                    Yii::info("RfeTg.checkDuplication(): rfe block: " . print_r($rfe_arr, true), 'hook');
                    $flag = 1;
                    $counter = 1;
                    foreach ($keys_arr as $cur_key => $cur_value) {
                        if (isset($rfe_arr[$cur_key]) && !empty($rfe_arr[$cur_key]) && $rfe_arr[$cur_key] == $cur_value) {
                            Yii::info("RfeTg.isDuplication(): --- duplication " . $counter++ . " of " . sizeof($keys_arr) . ", field: " . $cur_key . ", file: " . basename($cur_file), 'hook');
                            $flag = $flag & 1;
                        } else {
                            $flag = $flag & 0;
                        }
                    }
                    if ($flag == 1) {
                        Yii::info("RfeTg.isDuplication(): got final duplication ", 'hook');
                        return true;
                    }
                }
            }
            if ($cur_file == $file) {
                Yii::info("RfeTg.isDuplication(): check started after file: " . $cur_file, 'hook');
                $checkStarted = true;
            }
        }
        Yii::info("RfeTg.isDuplication(): no duplication detected", 'hook');
        return false;
    }

    /**
     * Get file from Telegram
     * @param type $id
     */
    private
    static
    function getFile($file_id, $filename, $rfeTg) {
        Yii::info("RfeTg.getFile(): file id: " . $file_id, 'hook');
        try {
            $api_key = HookAction::$bot_array[$rfeTg->bot_username];
            Yii::info("RfeTg.getFile(): bot name: " . $rfeTg->bot_username . ", API key: " . $api_key, 'hook');
            Yii::info("RfeTg.getFile(): file to download: " . $file_id, 'hook');

            $url_one = sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", $api_key, $file_id);
            Yii::info("RfeTg.getFile(): url one: " . $url_one, 'hook');
            $data_one = self::getUrl($url_one);
            Yii::info("RfeTg.getFile(): data_one: " . print_r($data_one, true), 'hook');
            $data_one = json_decode($data_one, true); // convert JSON into array
            Yii::info("RfeTg.getFile(): data_one: " . print_r($data_one, true), 'hook');
            if (isset($data_one["ok"]) && $data_one["ok"] != 1) {
                Yii::info("RfeTg.getFile(): error code: " . $data_one['error_code'] . ": " . $data_one['description'], 'hook');
                return ["media_download" => "error", "download_description" => $data_one['description']];
            } else {
                Yii::info("RfeTg.getFile(): call one: OK", 'hook');
            }
            $descriptor = $data_one["result"];
            Yii::info("RfeTg.getFile(): got descriptor: " . print_r($descriptor, true), 'hook');
            $real_path = $descriptor["file_path"];
            Yii::info("RfeTg.getFile(): real path: " . $real_path, 'hook');
            $url_real = sprintf("https://api.telegram.org/file/bot%s/%s", $api_key, $real_path);
            Yii::info("RfeTg.getFile(): real file to download: " . $url_real, 'hook');
            $content = file_get_contents($url_real);
            $our_ext = $server_ext = '';
            if (preg_match("/\.([a-zA-z]{3,5}$)/", $filename, $matches)) {
                $our_ext = $matches[1];
                Yii::info("RfeTg.getFile(): our extension: " . $our_ext, 'hook');
            }
            if (preg_match("/\.([a-zA-z]{3,5}$)/", $real_path, $matches)) {
                $server_ext = $matches[1];
                Yii::info("RfeTg.getFile(): server extension: " . $server_ext, 'hook');
            }
            if ($our_ext !== $server_ext) {
                $filename = str_replace('.' . $our_ext, '.' . $server_ext, $filename);
                Yii::info("RfeTg.getFile(): corrected filename: " . $filename, 'hook');
            } else {
                Yii::info("RfeTg.getFile(): extension check: OK", 'hook');
            }
            // save file
            $local_path = self::$TG_DIR_ASSET . $filename;
            Yii::info("RfeTg.getFile(): local file: " . $local_path, 'hook');
            $fp = fopen($local_path, 'c');
            $saveRes = fwrite($fp, $content);
            fclose($fp);
            Yii::info("RfeTg.getFile(): save result " . intval($saveRes) . ", file: " . $local_path, 'hook');
            return ["media_download" => "ok", "download_description" => $filename];
        } catch (\Exception $e) {
            Yii::error("RfeTg.getFile(): caught exception: " . $e, 'hook');
            return ["media_download" => "error", "download_description" => strval($e)];
        }
    }


    /**
     * Parse RFE/RL's article to get title and photo
     * @param type $url
     */
    private
    static
    function parseYouTube($url) {
        $youTubeId = '';
        $title = " "; // Alt 255
        $photo = '';
        try {
            $content = file_get_contents($url);
            Yii::info("RfeTg.parseYouTube(): got bytes from YouTube: " . strlen($content) . ", url: " . $url, 'hook');
            // <title></title>
            if (preg_match("/\<title\>(.+)\<\/title\>/", $content, $matches)) {
                $title = $matches[1];
                $title = str_replace("- YouTube", "", $title);
                Yii::info("RfeTg.parseYouTube(): title: " . $title, 'hook');
            }
            // https://i.ytimg.com/vi/BYB1Vw0u0zQ/maxresdefault.jpg
            // get YouTube Id
            if (preg_match("#(?<=v=)[a-zA-Z0-9-]+(?=&)|(?<=v\/)[^&\n]+(?=\?)|(?<=v=)[^&\n]+|(?<=youtu.be/)[^&\n]+#", $url, $matches)) {
                $youTubeId = isset($matches[0]) ? $matches[0] : 'xxx';
                Yii::info("RfeTg.parseYouTube(): YouTube ID: " . $youTubeId, 'hook');
                $imgUrl = sprintf("https://i.ytimg.com/vi/%s/maxresdefault.jpg", $youTubeId);
                Yii::info("RfeTg.parseYouTube(): img URL: " . $imgUrl, 'hook');
                try {
                    if ($image_info = getimagesize($imgUrl)) {
                        Yii::info("RfeTg.parseYouTube(): img get result: " . print_r($image_info, true), 'hook');
                        $photo = $imgUrl;
                        Yii::info("RfeTg.parseYouTube(): photo: " . $imgUrl, 'hook');
                    } else {
                        Yii::info("RfeTg.parseYouTube(): img does not exist: " . $url, 'hook');
                    }
                } catch (\Exception $e) {
                    Yii::error("RfeTg.parseYouTube(): exception during image check: " . $e->getMessage(), 'hook');
                }
            } else {
                Yii::info("RfeTg.parseYouTube(): no YouTube ID in URL: " . $url, 'hook');
            }
            return [$youTubeId, $title, $photo];
        } catch (\Exception $e) {
            Yii::error("RfeTg.parseYouTube(): caught exception: " . $e, 'hook');
            return [$youTubeId, $title, $photo];
        }
    }

    /**
     * Parse RFE/RL's article to get title and photo
     * @param type $url
     */
    private
    static
    function parseArticle($url) {
        $title = " "; // Alt 255
        $photo = '';
        try {
            $content = file_get_contents($url);
            Yii::info("RfeTg.parseArticle(): got bytes of article: " . strlen($content) . ", url: " . $url, 'hook');
            // <title></title>
            if (preg_match("/\<title\>(.+)\<\/title\>/", $content, $matches)) {
                $title = $matches[1];
                Yii::info("RfeTg.parseArticle(): title: " . $title, 'hook');
            }
            // <meta content="https://somesite/B26D2759-051C-4257-ABEE-154C67582860_w1200_r1_s.jpg" property="og:image" />
            if (preg_match("/\<meta content\=\"(.+)\" property\=\"og\:image\" \/\>/", $content, $matches)) {
                $photo = $matches[1];
                Yii::info("RfeTg.parseArticle(): photo: " . $photo, 'hook');
            }
            return [$title, $photo];
        } catch (\Exception $e) {
            Yii::error("RfeTg.parseArticle(): caught exception: " . $e, 'hook');
            return [$title, $photo];
        }
    }

    /**
     * @param $url
     * @return bool|string
     */
    private
    static
    function getUrl($url) {
        Yii::info("RfeTg.getUrl(): start. Url: " . $url, 'hook');
        try {
            if ($ch = curl_init()) {
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
                curl_setopt($ch, CURLOPT_USERAGENT, 'PHP Bot');
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                $data = curl_exec($ch);
                curl_close($ch);
                // One more time in case of frozen API
                if (isset($data['error_code']) && $data['error_code'] == 5000) {
                    $data = self::getUrl($url);
                }
                return $data;
            } else {
                return "{}";
            }
        } catch (\Exception $e) {
            Yii::error("RfeTg.getUrl(): caught exception: " . $e, 'hook');
            return "{}";
        }
    }

}