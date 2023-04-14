<?php

/**
 * @link http://www.yiiframework.com/
 * @copyright Copyright (c) Yii Software LLC
 * @license http://www.yiiframework.com/license/
 */

namespace app\components;

use app\commands\SocialSendController;
use app\controllers\OkController;
use app\models\RfeTg;
use Yii;
use yii\base\Action;
use yii\base\InvalidConfigException;
use yii\helpers\Url;
use yii\web\Response;
use app\models\ImageForm;
use Longman\TelegramBot\Telegram;
use Longman\TelegramBot\TelegramLog;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Entities\Update;

/**
 * HookAction serves Telegram's requests
 * Test run: https://somesite/hook?bot=svobodabot&test
 */
class HookAction extends Action
{

    private $isTestRun = false;
    private $telegram = null;
    private $bot_name = '';

    /**
     * @param $action
     * @return bool
     */
    public function beforeAction($action)
    {
        Yii::info("HookAction.beforeAction(): action: " . $action->id, 'hook');
//        if ($action->id == 'my-action') {
//            $this->enableCsrfValidation = false;
//        }
        if (!parent::beforeAction($action)) {
            return false;
        }
        return true; // or false to not run the action
    }

    /**
     * Initializes the action.
     * @return false
     * @throws TelegramException
     * @throws \Longman\TelegramBot\Exception\TelegramLogException
     */
    public function init()
    {
        $os_root = Helper::getOSRoot();

        // Add you bot's API key and name
        $mysql_credentials = [
            'host' => '',
            'user' => '',
            'password' => '',
            'database' => '',
        ];
        //
        if (preg_match("/^\/hook\?bot=[a-z_]{5,40}&test$/", $_SERVER["REQUEST_URI"])) {
            $this->isTestRun = true;
            Yii::info("HookAction.init(): this is ***TEST*** run", 'hook');
        }
        if (preg_match("/^\/hook\?bot=([a-z_]{5,40})/", $_SERVER["REQUEST_URI"], $matches)) {
            $req_bot_name = $matches[1];
            Yii::info("HookAction.init(): bot name in request: " . $req_bot_name, 'hook');
        } else {
            Yii::error("HookAction.init(): --- ERROR: got no bot name", 'hook');
            return false;
        }
        if (!array_key_exists($req_bot_name, self::$bot_array)) {
            Yii::error("HookAction.init(): --- ERROR: incorrect bot name", 'hook');
            return false;
        } else {
            $this->bot_name = $req_bot_name;
        }
        try {
            // Create Telegram API object
            $this->telegram = new Telegram(self::$bot_array[$this->bot_name], $this->bot_name);

            // Error, Debug and Raw Update logging
//      TelegramLog::initialize($your_external_monolog_instance);
            TelegramLog::initErrorLog($os_root . '/../runtime/logs/bot_error.log');
            TelegramLog::initDebugLog($os_root . '/../runtime/logs/bot_debug.log');
            TelegramLog::initUpdateLog($os_root . '/../runtime/logs/bot_update.log');

            // Enable MySQL
            // **** DISABLED AT THE MOMENT BEGIN
            // $this->telegram->enableMySql($mysql_credentials);
            // **** DISABLED AT THE MOMENT END
            // Enable MySQL with table prefix
            //$telegram->enableMySql($mysql_credentials, $BOT_NAME . '_');
            // Add an additional commands path
            $this->telegram->addCommandsPath($os_root . '/../commands/telegram');

            // Enable admin user(s)
            //$this->telegram->enableAdmin(your_telegram_id);
            //$this->telegram->enableAdmins([your_telegram_id, other_telegram_id]);
            // // Add the channel you want to manage
            //$this->telegram->setCommandConfig('sendtochannel', ['your_channel' => '@type_here_your_channel']);
            // Here you can set some command specific parameters,
            // for example, google geocode/timezone api key for /date command:
            //$this->telegram->setCommandConfig('date', ['google_api_key' => 'your_google_api_key_here']);
            // Set custom Upload and Download path
            $this->telegram->setDownloadPath($os_root . '/../assets/download');
//      $this->telegram->setUploadPath($os_root . '/../assets/upload');
            $this->telegram->setUploadPath($os_root . '/media');

            // Botan.io integration
            //$telegram->enableBotan('your_token');
        } catch (Exception $e) {
            Yii::error("HookAction.init(): --- ERROR: caught exception: " . $e, 'hook');
        }
    }

    /**
     * This method receives calls from Telegram and saves messages and media files submitted
     */
    public function run()
    {
        Yii::info("HookAction.run(): bot name: " . $this->bot_name, 'hook');
        try {
            if ($this->telegram == null) {
                Yii::error("HookAction.run(): --- ERROR: telegram object wasn't created", 'hook');
                return 'hError: ' . date("d.m.Y H:i:s");
            }
            if ($this->isTestRun) { // --- Test run
                Yii::info("HookAction.run(): this is test run, exit here", 'hook');
                return 'Test: ' . date("d.m.Y H:i:s");
            }
//      $this->telegram->handle();
            $input = Request::getInput();
            if (empty($input)) {
                Yii::error("HookAction.run(): --- ERROR: input is empty", 'hook');
                throw new TelegramException('Input is empty!');
            }
            $input_array = json_decode($input, true);
            Yii::info("HookAction.run(): input array: " . print_r($input_array, true), 'hook');
            if (empty($input_array)) {
                Yii::error("HookAction.run(): --- ERROR: invalid JSON", 'hook');
                throw new TelegramException('Invalid JSON!');
            }

            $update = new Update($input_array, $this->bot_name);
            $update_id = $update->getUpdateId();
            $update_type = $update->getUpdateType();
            Yii::info("HookAction.run(): update Id: " . $update_id . ", type: " . $update_type, 'hook');
//            Yii::info("HookAction.run(): update content: " . print_r($update, true), 'hook');
            $chatId = -1;
            $type = 'null';
            if ($update_type == 'message') {
                $message = $update->getMessage();
                $type = $message->getType();
                Yii::info("HookAction.run(): got message. Message Id: " . $message->getMessageId() . ", type: " . $type, 'hook');
                $chat = $message->getChat();
//                Yii::info("HookAction.run(): got chat: " . print_r($chat, true), 'hook');
                $chatId = $chat->getId();
                Yii::info("HookAction.run(): chat Id: " . $chatId, 'hook');
                $data = [
                    'chat_id' => $chatId,
                    'text' => 'welcome text',
                ];
                $result = Request::sendMessage($data);
                Yii::info("HookAction.run(): send redirection to official liberty bot", 'hook');
                return $result;
            } elseif ($update_type == 'channel_post') {
                Yii::info("HookAction.run(): try to save channel_post...", 'hook');
                $this->saveChannelPost($update);
            } else {
                Yii::info("HookAction.run(): --- NEED TO IMPLEMENT PROCESSING OF UPDATES OF TYPE: " . $update_type, 'hook');
            }
            Yii::info("HookAction.run(): --- WARNING: skip Telegram bot functionality in this version", 'hook');
            // $response = $this->telegram->processUpdate($update);
            Yii::info("HookAction.run(): end", 'hook');
        } catch (\Exception $e) {
            Yii::error("HookAction.run(): --- ERROR: caught exception: " . $e, 'hook');
            return 'Bot ex: ' . date("d.m.Y H:i:s");
        }
    }

    /**
     *
     * @param Update $update
     */
    public function saveChannelPost($update)
    {
        $isMediaDownloaded = false;
        Yii::info("HookAction.saveChannelPost(): start", 'hook');
//        Yii::info("HookAction.saveChannelPost(): update: " . print_r($update, true), 'hook');
        $update_id = $update->getUpdateId();
        Yii::info("HookAction.saveChannelPost(): Update id: " . $update_id, 'hook');
        $post = $update->getChannelPost();
        $chatId = $post->getChat()->getId();
        $type = $post->getType();
        Yii::info("HookAction.saveChannelPost(): msg content: " . print_r($post, true), 'hook');

        // save channel post
        $file_name = date("Ymd-His") . '' . $chatId . '_' . $update_id . '-' . $type . '.txt';
        $save_path = RfeTg::$TG_DIR_TXT . $file_name;
        $saveRes = file_put_contents($save_path, json_encode($update));
        Yii::info("HookAction.saveChannelPost(): save to file: " . $save_path . ", result: " . $saveRes, 'hook');
        if ($saveRes) { // try to download media content
            Yii::info("HookAction.saveChannelPost(): try to parse file...", 'hook');
            $rfeTg = RfeTg::getInfo($save_path);
//            Yii::info("HookAction.saveChannelPost(): file parsed. Result: " . print_r($rfeTg, true), 'hook');
            Yii::info("HookAction.saveChannelPost(): file parsed", 'hook');
            if ($rfeTg->status == "ok") {
                $internalChannels = OkController::getInternalTgChannels();
                if (array_key_exists($rfeTg->f_channelId, $internalChannels)) {
                    Yii::info("HookAction.saveChannelPost(): this is RFE's Telegram channel: " . print_r($internalChannels[$rfeTg->f_channelId], true), 'hook');
                    // send automatically only text messages for now
                    if ($rfeTg->f_type == "text" || $rfeTg->f_type == "audio") {
                        if ($rfeTg->lj_flag == "ready") {
                            Yii::info("HookAction.saveChannelPost(): try to send to LiveJournal...", 'hook');
                            $command = sprintf(" /usr/bin/php /home/www/tools.rfe-news.info/yii social-send/lj %s", $update_id);
                            $out = null;
                            $returnValue = null;
                            exec($command, $out, $returnValue);
                            Yii::info("HookAction.saveChannelPost(): LJ send result: " . intval($returnValue) . ", out: " . print_r($out, true), 'hook');
                        }
                        if ($rfeTg->ok_flag == "ready") {
                            Yii::info("HookAction.saveChannelPost(): try to send to Odnoklassniki...", 'hook');
                            $command = sprintf(" /usr/bin/php /home/www/somesite.info/yii social-send/ok %s", $update_id);
                            $out = null;
                            $returnValue = null;
                            exec($command, $out, $returnValue);
                            Yii::info("HookAction.saveChannelPost(): LJ send result: " . intval($returnValue) . ", out: " . print_r($out, true), 'hook');
                        }
                        if ($rfeTg->vk_flag == "ready" && $rfeTg->f_type == "text") { // Send only text messages to VK
                            Yii::info("HookAction.saveChannelPost(): try to send to VK...", 'hook');
                            $command = sprintf(" /usr/bin/php /home/www/somesite.info/yii social-send/vk %s", $update_id);
                            $out = null;
                            $returnValue = null;
                            exec($command, $out, $returnValue);
                            Yii::info("HookAction.saveChannelPost(): VK send result: " . intval($returnValue) . ", out: " . print_r($out, true), 'hook');
                        }
                        if ($rfeTg->viber_flag == "ready" && $rfeTg->f_type == "text") { // Send only text messages to Viber
                            Yii::info("HookAction.saveChannelPost(): try to send to Viber...", 'hook');
                            $command = sprintf(" /usr/bin/php /home/www/somesite.info/yii social-send/viber %s", $update_id);
                            $out = null;
                            $returnValue = null;
                            exec($command, $out, $returnValue);
                            Yii::info("HookAction.saveChannelPost(): Viber send result: " . intval($returnValue) . ", out: " . print_r($out, true), 'hook');
                        }
                    }
                } else {
                    Yii::info("HookAction.saveChannelPost(): it isn't our Telegram channel", 'hook');
                }
            } else {
                Yii::info("HookAction.saveChannelPost(): update processing wasn't OK. Do nothing here", 'hook');
            }
        }
    }

}
