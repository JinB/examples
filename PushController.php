<?php

namespace app\controllers;

use app\components\AccessRule;
use app\models\User;
use Yii;
use yii\filters\AccessControl;
use yii\web\Controller;
use app\models\PushForm;
use app\models\PushUrlForm;

class PushController extends Controller
{
    /**
     * Return full path to serialization file to keep last push info
     * @return string
     */
    private function getSerialFn(){
        return Yii::getAlias('@webroot').'/media/push.ser';
    }

    /**
     * Return full path to list of already pushed IDs
     * @return string
     */
    private function getPushListFn(){
        return Yii::getAlias('@webroot')."/media/push_list.txt";
    }
    
    /**
     * @inheritdoc
     */
    public function behaviors()
    {
        return [
            'access' => [
                'class' => AccessControl::className(),
                // We will override the default rule config with the new AccessRule class
                'ruleConfig' => [
                    'class' => AccessRule::className(),
                ],
                'only' => ['index'],
                'rules' => [
                    [
                        'allow' => true,
                        'actions' => ['index'],
                        'roles' => [
                            User::ROLE_ADMIN,
                            User::ROLE_MODERATOR,
                        ],],
                ],
            ],
        ];
    }

    /**
     * @inheritdoc
     */
    public function actions()
    {
        return [
            'error' => [
                'class' => 'yii\web\ErrorAction',
            ],
        ];
    }

    /**
     * @return \yii\web\Response
     */
    public function actionUpdate()
    {
        $this->callOneSignal(60);
        $msg = "Data successfully updated";
        Yii::$app->session->addFlash('success', $msg);
        Yii::info("PushController.actionUpdate(): flash msg: " . $msg);
        return $this->redirect("/push");
    }

    /**
     * @return string|\yii\web\Response
     */
    public function actionSend()
    {
        Yii::info("PushController.actionSend(): start, user: " . Yii::$app->user->id);
        $already_sent = "";
        $pushForm = new PushForm();
        if ($pushForm->load(Yii::$app->request->post())) {
            Yii::info("PushController.actionSend(): model was loaded");
            if ($pushForm->validate()) {
                Yii::info("PushController.actionSend(): model was validated: " . print_r($pushForm, true));
                // need to check list of already pushed articles
                $serialFile = $this->getPushListFn();
                if (file_exists($serialFile) && filesize($serialFile) >0) {
                    $already_sent = file_get_contents($serialFile);
                    if (strpos($already_sent, $pushForm->articleId) !== FALSE) {
                        Yii::info("PushController.actionSend(): --- the article was already sent: " . $pushForm->articleId);
                        Yii::info("PushController.actionSend(): already sent list: " . $already_sent);
                        $msg = "ERROR: The article was already sent";
                        Yii::$app->session->addFlash('error', $msg);
                        Yii::info("PushController.actionSend(): flash msg: " . $msg);
                        return $this->redirect("/push");
                    } else {
                        Yii::info("PushController.actionSend(): already sent check: PASSED");
                    }
                } else {
                    Yii::info("PushController.actionSend(): serialization path: ".$serialFile);
                    Yii::info("PushController.actionSend(): file exist: ".intval(file_exists($serialFile)));
                    if (file_exists($serialFile)) {
                        Yii::info("PushController.actionSend(): file size: ".filesize($serialFile));
                    }
                }
                $pushSuccess = true;
                $resSendArr = array();
                if ($pushForm->isSendWeb) {
                    $pushSuccess = $pushForm->pushWeb();
                    if ($pushSuccess) {
                        $resSendArr[] = 'web';
                    }
                }
                if ($pushForm->isSendMobile && !empty(Yii::$app->user->id)) { // Send to mobiles only on production environment
                    $pushSuccess = $pushForm->pushMobile();
                    if ($pushSuccess) {
                        $resSendArr[] = 'mobile';
                    }
                }
                if ($pushSuccess) { // Save Id of already sent article
                    $bytesSaved = file_put_contents($this->getPushListFn(), ' ' . $pushForm->articleId, FILE_APPEND);
                    Yii::info("PushController.actionSend(): articel Id saved, bytes: " . $bytesSaved);
                }
                $data = $this->callOneSignal(60);
                if (sizeof($resSendArr) > 0) {
                    $msg = "Push was success:" . implode(', ', $resSendArr);
                    Yii::$app->session->addFlash('success', $msg);
                } else {
                    $msg = "ERROR: Impossible to perform push request";
                    Yii::$app->session->addFlash('error', $msg);
                    Yii::info("PushController.actionSend(): push failed, so remove last saved article Id");
                    $bytesSaved = file_put_contents($this->getPushListFn(), $already_sent);
                    Yii::info("PushController.actionSend(): old id lits saved, bytes: " . $bytesSaved);
                }
                Yii::info("PushController.actionSend(): flash msg: " . $msg);
                return $this->redirect("/push");
            } else {
                Yii::info("PushController.actionSend(): wasn't validated");
                return $this->actionIndex();
            }
        } else {
            $msg = "ERROR: Impossible to load push details";
            Yii::$app->session->addFlash('error', $msg);
            Yii::info("PushController.actionSend(): flash msg: " . $msg);
            return $this->redirect("/push");
        }
    }

    /**
     * Displays homepage.
     *
     * @param int $id
     * @return string
     */
    public function actionIndex($id = 0)
    {
        Yii::info("PushController.actionIndex(): start, user: " . Yii::$app->user->id . ", id: " . intval($id) . ", time: " . date("r"));
        Yii::info("PushController.actionIndex(): time: " . date("r") . ", timezone: " . date_default_timezone_get());

        $pushForm = new PushForm();
        $pushUrlForm = new PushUrlForm();
        $articleId = -1;
        if ($pushForm->loadFromSvoboda(Yii::$app->request->get())) {
            Yii::info("PushController.actionIndex(): pushModel loaded from GET request");
        } elseif ($pushUrlForm->loadFromSvoboda(Yii::$app->request->post())) {
            $articleId = $pushUrlForm->articleId;
            Yii::info("PushController.actionIndex(): articleId submitted: " . $articleId);
            $pushForm->loadFromSvoboda(['id' => $articleId, 'image' => $pushUrlForm->image]);
        } else {
            $pushForm = null;
            Yii::info("PushController.actionIndex(): impossible to load pushModel from request");
        }
        $data = [];
        if (file_exists($this->getSerialFn())) {
            $delta = time() - filemtime($this->getSerialFn());
            Yii::info("PushController.actionIndex(): last serialization: " . date("Y-m-d H:i", filemtime($this->getSerialFn())) . ", delta: " . $delta);
            if ($delta >= 3600) {
                Yii::info("PushController.actionIndex(): serialised file is too old, need to refresh");
                $data = $this->callOneSignal(60);
            }
            Yii::info("PushController.actionIndex(): deserialize saved data");
            $data = unserialize(file_get_contents($this->getSerialFn()));
        } else {
            Yii::info("PushController.actionIndex(): try to call OneSignal...");
            $data = $this->callOneSignal(60);
        }
        Yii::info("PushController.actionIndex(): data: " . print_r($data, true));

        $disablePush = false;
        if (array_key_exists($id, $data)) {
            $msg = "ERROR: This is last pushed article: " . $id . ". Please wait of oneSignal update";
            Yii::$app->session->addFlash('error', $msg);
            Yii::info("PushController.actionIndex(): flash msg: " . $msg);
            $disablePush = true;
            $pushForm->title = $data[$id]['head'];
            $pushForm->message = $data[$id]['content'];
        } else {
            Yii::info("PushController.actionIndex(): is isn't the last pushed article");
            Yii::info("PushController.actionIndex(): need to check in a list of all pushed articles...");
            $file_push_list = $this->getPushListFn();
            if (!file_exists($file_push_list)) {
                touch($file_push_list);
            }
            $already_sent = file_get_contents($file_push_list);
            Yii::info("PushController.actionIndex(): already sent: " . $already_sent);
            if (strpos($already_sent, $articleId) !== FALSE) {
                Yii::info("PushController.actionIndex(): --- the article was already sent: " . $articleId);
                $msg = "ERROR: The article was already sent";
                Yii::$app->session->addFlash('error', $msg);
                Yii::info("PushController.actionIndex(): flash msg: " . $msg);
                $disablePush = true;
                $pushForm->title = "";
                $pushForm->message = $msg;
            } else {
                Yii::info("PushController.actionIndex(): already sent check step 2: PASSED");
            }
        }
        if (file_exists($this->getSerialFn())) {
            $serialization_time = date("Y-m-d H:i", filemtime($this->getSerialFn()));
        } else {
            $serialization_time = '---';
        }


        return $this->render('index', [
            'data' => $data,
            'serialization_time' => $serialization_time,
            'pushModel' => $pushForm,
            'pushUrlModel' => $pushUrlForm,
            'disablePush' => $disablePush,
        ]);
    }

    /**
     *
     * @param int $limit
     * @return int
     */
    private function callOneSignal($limit = 60)
    {
        Yii::info("PushController.callOneSignal(): start. Limit: " . $limit);
        if (empty(Yii::$app->user->id)) { // Test app - RFE-NEWS
            $limit = 20;
        }
        $curl = curl_init();
        $appId = Yii::$app->params["oneSignal"]["appId"];
        $restApiKey = Yii::$app->params["oneSignal"]["restApiKey"];
        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://onesignal.com/api/v1/notifications?app_id=" . $appId . "&limit=" . $limit,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_HTTPHEADER => array(
                "Authorization: Basic " . $restApiKey,
            ),
        ));

        Yii::info("PushController.callOneSignal(): try to exec curl call...");
        $response = curl_exec($curl);
        Yii::info("PushController.callOneSignal(): curl exec: Done");
        $err = curl_error($curl);
        curl_close($curl);
//    Yii::info("PushController.callOneSignal(): curl err: " . print_r($err, true));

        $raw_data = json_decode($response, true);
//    Yii::info("PushController.callOneSignal(): data: " . print_r($raw_data, true));
        $data = array();
        if (isset($raw_data['errors'])) {
            Yii::error("PushController.callOneSignal(): OneSignal API call error: " . implode($raw_data['errors']));
            $msg = "ERROR: Impossible to contact OneSignal";
            Yii::$app->session->addFlash('error', $msg);
            Yii::info("PushController.callOneSignal(): flash msg: " . $msg);
        } else {
            Yii::info("PushController.callOneSignal(): OneSignal API call OK");
            Yii::info("PushController.callOneSignal(): data 0: " . print_r($raw_data['notifications'][0], true));
            Yii::info("PushController.callOneSignal(): data 1: " . print_r($raw_data['notifications'][1], true));
            $id_str = '';
            if (!isset($raw_data['notifications']) || !is_array($raw_data['notifications'])) {
                $msg = "ERROR: OneSignal incorrect response";
                Yii::$app->session->addFlash('error', $msg);
                Yii::info("PushController.callOneSignal(): response flash msg: " . $msg);
                return $data;
            }
            foreach ($raw_data['notifications'] as $cur) {
                if (preg_match("/([0-9]{7,8})/", $cur['url'], $matches)) {
                    $articleId = $matches[1];
                } elseif (isset($cur['data']['articleId'])) {
                    $articleId = $cur['data']['articleId'];
                } else {
                    continue;
                }
                $id_str .= ($articleId . ' ');
                $data[$articleId]['head'] = $cur['headings']['en'];
                $data[$articleId]['content'] = $cur['contents']['en'];

                $data[$articleId]['completed_at'] = !empty($cur['completed_at']) ? date("d.m.Y H:i", $cur['completed_at']) : '---';
                $data[$articleId]['url'] = $cur['url'];
                if (empty($data[$articleId]['url'])) {
                    $data[$articleId]['url'] = $cur['web_url'];
                }
                $data[$articleId]['ios'] = $data[$articleId]['android'] = $data[$articleId]['chrome'] = $data[$articleId]['safari'] = $data[$articleId]['firefox'] = $data[$articleId]['edge'] = $data[$articleId]['total_mobile'] = $data[$articleId]['total_web'] = $data[$articleId]['total'] = 0;
                $stats = $cur['platform_delivery_stats'];
                if (isset($stats['ios'])) {
                    $data[$articleId]['ios'] = $stats['ios']['successful'];
                }
                if (isset($stats['android'])) {
                    $data[$articleId]['android'] = $stats['android']['successful'];
                }
                if (isset($stats['chrome_web_push'])) {
                    $data[$articleId]['chrome'] = $stats['chrome_web_push']['successful'];
                }
                if (isset($stats['safari_web_push'])) {
                    $data[$articleId]['safari'] = $stats['safari_web_push']['successful'];
                }
                if (isset($stats['firefox_web_push'])) {
                    $data[$articleId]['firefox'] = $stats['firefox_web_push']['successful'];
                }
                if (isset($stats['edge_web_push'])) {
                    $data[$articleId]['edge'] = $stats['edge_web_push']['successful'];
                }
                $data[$articleId]['total_mobile'] = $data[$articleId]['ios'] + $data[$articleId]['android'];
                $data[$articleId]['total_web'] = $data[$articleId]['chrome'] + $data[$articleId]['safari'] + $data[$articleId]['firefox'] + $data[$articleId]['edge'];
                $data[$articleId]['total'] = $data[$articleId]['total_mobile'] + $data[$articleId]['total_web'];
                if ($cur['successful'] != 0) {
                    $data[$articleId]['converted'][] = round($cur['converted'] / $cur['successful'] * 100, 2);
                } else {
                    $data[$articleId]['converted'][] = 0;
                }
                $data[$articleId]['highlight'] = 0;
            }
            $data_cut = array();
            foreach ($data as $articleId => $row) {
                $sum = 0;
                foreach ($data[$articleId]['converted'] as $key => $val) {
                    $sum += $val;
                }
                $avg = $sum / sizeof($data[$articleId]['converted']);
                $data[$articleId]['converted_avg'] = $avg;
                $data_cut[$articleId] = $avg;
//      Yii::info("PushController.actionIndex(): articleId: " . $articleId . ", sum: " . $sum . ", avg: " . $avg);
            }
            arsort($data_cut);
//    Yii::info("PushController.actionIndex(): data_cut sorted: " . print_r($data_cut, true));
            $counter = 0;
            foreach ($data_cut as $articleId => $value) {
                $data[$articleId]['highlight'] = 1;
                $counter++;
                if ($counter >= 5) {
                    break;
                }
            }
//    Yii::info("PushController.callOneSignal(): data: " . print_r($data, true));
            // save data into file
            $handle = fopen($this->getSerialFn(), 'w');
            $serialized = serialize($data);
            fputs($handle, $serialized, strlen($serialized));
            fclose($handle);
        }
        Yii::info("PushController.callOneSignal(): start. End");
        return $data;
    }

}
