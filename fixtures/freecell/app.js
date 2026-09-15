// 《空档接龙》浏览器层:渲染、点击/拖拽/键盘输入、撤销、进度与牌背存储。
// 规则全部来自 game-core.js;本文件不重复实现合法性判断。
import {
  CELL_COUNT,
  COLUMN_COUNT,
  LEVEL_COUNT,
  RANK_LABELS,
  SUITS,
  applyMove,
  autoPlayAll,
  cardLabel,
  cardName,
  createState,
  findBestDestination,
  isRed,
  isWon,
  legalMoves,
  nextAutoMove,
  maxMovableCount,
  orderedRunLength,
  rankOf,
  solve,
  suitOf,
  validateMove,
} from "./game-core.js";
import { heicTo } from "./vendor/heic-to-csp.js";
import {LESSONS,lessonState,lessonAccepts} from './lessons.js';

const PROGRESS_KEY = "freecell.progress.v1";
const SESSION_KEY = "freecell.session.v1";
const CARD_BACK_KEY = "freecell.cardBack.v1";
const SUPERMOVE_TIP_KEY = "freecell.tip.supermove.v1";
const DEFAULT_CARD_BACK = "assets/card-back.png";
const CARD_BACK_WIDTH = 500;
const CARD_BACK_HEIGHT = 700;

const dom = {
  body: document.body,
  table: document.getElementById("table"),
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  moves: document.getElementById("moves"),
  timer: document.getElementById("timer"),
  level: document.getElementById("level-number"),
  unlocked: document.getElementById("unlocked-count"),
  undo: document.getElementById("undo"),
  hint: document.getElementById("hint"),
  restart: document.getElementById("restart"),
  openLevels: document.getElementById("open-levels"),
  openBack: document.getElementById("open-back"),
  openBackDialog: document.getElementById("open-back-dialog"),
  deckPreview: document.getElementById("deck-preview-image"),
  winDialog: document.getElementById("win-dialog"),
  winLevel: document.getElementById("win-level"),
  winMoves: document.getElementById("win-moves"),
  winTime: document.getElementById("win-time"),
  winBest: document.getElementById("win-best"),
  nextLevel: document.getElementById("next-level"),
  replayLevel: document.getElementById("replay-level"),
  levelDialog: document.getElementById("level-dialog"),
  levelGrid: document.getElementById("level-grid"),
  closeLevels: document.getElementById("close-levels"),
  backDialog: document.getElementById("back-dialog"),
  closeBack: document.getElementById("close-back"),
  backCanvas: document.getElementById("back-canvas"),
  backFile: document.getElementById("back-file"),
  backZoom: document.getElementById("back-zoom"),
  backOffsetX: document.getElementById("back-offset-x"),
  backOffsetY: document.getElementById("back-offset-y"),
  applyBack: document.getElementById("apply-back"),
  resetBack: document.getElementById("reset-back"),
  backStatus: document.getElementById("back-status"),
  stuckBanner: document.getElementById("stuck-banner"),
  stuckUndo: document.getElementById("stuck-undo"),
  stuckRestart: document.getElementById("stuck-restart"),
};
const LOCALES=new Set(['zh-CN','zh-TW','en','ja']);let locale=new URLSearchParams(location.search).get('lang');if(!LOCALES.has(locale))locale='zh-CN';
const I18N={
'zh-CN':{name:'空档接龙',title:l=>`空档接龙 · 第 ${l} 关`,brand:'FREECELL / 空档接龙',level:l=>`第 ${l} 关`,changeBack:'更换牌背',statsAria:'本局统计',moves:'步数',time:'用时',unlocked:'已解锁',table:'牌桌：方向键移动光标，空格选牌，回车放牌，U 撤销，H 提示',cell:'空档',ready:'选择一张牌，再点目标位置；再点一次自动放置。',stuck:'没有可以移动的牌了',stuckSub:'可以撤销几步换条路，或者重开本关。',undoOne:'撤销一步',restartLevel:'重开本关',actions:'操作',undo:'撤销',hint:'提示',restart:'重开',levels:'关卡',cardBack:'牌背',clear:'第 {level} 关完成',bestMoves:'最佳步数',next:'下一关',again:'再玩一次',chooseLevel:'选择关卡',close:'关闭',levelNote:'每一关对应同编号的经典 Microsoft FreeCell 牌局，均已知可解；完成当前关后解锁下一关。',changeBackTitle:'更换牌背',backNote:'支持常见图片以及浏览器可读取的 HEIC、HEIF、TIFF。原图会在本机裁切并压缩成 5:7 牌背，只保存在这台设备，不会上传。',preview:'牌背预览',chooseImage:'选择图片',zoom:'缩放',horizontal:'左右',vertical:'上下',useImage:'使用这张图片',resetBack:'恢复默认牌背',started:l=>`第 ${l} 关开始。`,noMoves:'没有可以移动的牌了。',practiceDone:'完成！你可以继续下一段练习。',practiceLegal:'这是合法移动。要完成本练习，请按上方说明操作；也可点“重练”。',superMove:(n,c)=>`超级移动 ×${n}：${c}。`,placedAuto:(c,n)=>`${c} 已放好，自动收牌 ${n} 张。`,placed:c=>`${c} 已放好。`,undone:'已撤销上一步。',noPlace:'这组牌现在没有可放的位置。',runOnly:'只能拿起底部连续交替颜色、点数递减的牌组。',capped:n=>`现在最多一次搬 ${n} 张，已拿起底部 ${n} 张；上面变灰的牌这次带不走。`,pickedMany:(n,c)=>`已拿起 ${n} 张牌（${c} 起），再点目标位置。`,picked:c=>`已拿起 ${c}，点目标位置或再点一次自动放置。`,empty:'空',emptyColumn:'空列',foundation:'收牌堆',column:n=>`第 ${n} 列`,cellN:n=>`空档 ${n}`,nextMove:(cards,target)=>`下一步：把 ${cards} 移到${target}。`,autoFinish:'剩下的牌会自动收完。',noRoute:'暂时算不出路线，试试撤销几步。',hintFoundation:'先找可按花色收入的下一张牌。再点提示查看下一步。',hintCell:'借用一个空档，释放被压住的牌。再点提示查看下一步。',hintColumn:'检查亮起的牌组：异色递减能否接到另一列？再点提示查看下一步。',doneBest:n=>`比自己的最佳纪录少 ${n} 步。`,donePlan:'完成整副牌的空间规划。',growth:(extra,h)=>`52 张归位 · 四门全收。${extra} 使用方向提示 ${h} 次。`,complete:(l,m,time)=>`第 ${l} 关完成！${m} 步，用时 ${time}。`,best:n=>`${n} 步`,locked:'未解锁',playable:'可玩',levelAria:(l,b,locked)=>`第 ${l} 关${b?`，最佳 ${b} 步`:locked?'，未解锁':''}`,currentCustom:'当前使用自定义牌背。',currentDefault:'当前使用默认牌背。',badType:'请选择 PNG、JPEG、WebP、GIF、BMP、AVIF、HEIC、HEIF 或 TIFF 图片。',converting:'正在本机转换 HEIC/HEIF，然后压缩牌背……',reading:'正在读取原图，完成取景后会自动压缩……',decodeError:'图片内容无法解码，请确认文件没有损坏。',readOk:(w,h)=>`${w}×${h} 原图已读取；拖动滑块调整取景，保存时会自动压缩。`,readFail:'图片无法读取。',storageFull:'浏览器存储空间不足，牌背只在本次会话生效。',backChanged:'已更换牌背，刷新后仍然有效。',backChangedStatus:'牌背已更换。',backReset:'已恢复默认牌背。',tipExtra:'空档和空列越多，一次能搬得越多：每个空档 +1，每个空列翻倍。',spaceLearning:'空间与学习',practice:n=>`练习 ${n} / 3`,retryPractice:'重练',practiceComplete:'练习完成',nextPractice:'下一练习',backGame:'回到牌局',collected:n=>`归位 ${n} / 52`,capacity:(c,n)=>`空档 ${c} / 4 · 现可搬 ${n} 张到非空列`,beginPractice:'新手练习',returned:'已回到原牌局，练习不会改变正式成绩。',restored:l=>`已恢复第 ${l} 关的进度。`,lessons:[['移动到空档','把顶牌移进空档，释放牌列。'],['交替颜色递减','把红黑交替且点数递减的牌接到另一列。'],['收入收牌堆','按同花色从 A 到 K 收牌。']],suits:['梅花','方块','红心','黑桃']},
'zh-TW':{name:'空檔接龍',title:l=>`空檔接龍 · 第 ${l} 關`,brand:'FREECELL / 空檔接龍',level:l=>`第 ${l} 關`,changeBack:'更換牌背',statsAria:'本局統計',moves:'步數',time:'用時',unlocked:'已解鎖',table:'牌桌：方向鍵移動游標，空白鍵選牌，Enter 放牌，U 復原，H 提示',cell:'空檔',ready:'選一張牌，再點目標位置；再點一次可自動放置。',stuck:'沒有可以移動的牌了',stuckSub:'可以復原幾步換條路，或重開本關。',undoOne:'復原一步',restartLevel:'重開本關',actions:'操作',undo:'復原',hint:'提示',restart:'重開',levels:'關卡',cardBack:'牌背',clear:'第 {level} 關完成',bestMoves:'最佳步數',next:'下一關',again:'再玩一次',chooseLevel:'選擇關卡',close:'關閉',levelNote:'每一關對應同編號的經典 Microsoft FreeCell 牌局，均已知可解；完成目前關卡後解鎖下一關。',changeBackTitle:'更換牌背',backNote:'支援常見圖片及瀏覽器可讀取的 HEIC、HEIF、TIFF。原圖會在本機裁切並壓縮成 5:7 牌背，只留在此裝置，不會上傳。',preview:'牌背預覽',chooseImage:'選擇圖片',zoom:'縮放',horizontal:'左右',vertical:'上下',useImage:'使用這張圖片',resetBack:'恢復預設牌背',started:l=>`第 ${l} 關開始。`,noMoves:'沒有可以移動的牌了。',practiceDone:'完成！你可以繼續下一段練習。',practiceLegal:'這是合法移動。要完成本練習，請依上方說明操作；也可點「重練」。',superMove:(n,c)=>`超級移動 ×${n}：${c}。`,placedAuto:(c,n)=>`${c} 已放好，自動收牌 ${n} 張。`,placed:c=>`${c} 已放好。`,undone:'已復原上一步。',noPlace:'這組牌目前沒有可放的位置。',runOnly:'只能拿起底部連續交替顏色、點數遞減的牌組。',capped:n=>`目前最多一次搬 ${n} 張，已拿起底部 ${n} 張；上面變灰的牌這次帶不走。`,pickedMany:(n,c)=>`已拿起 ${n} 張牌（從 ${c} 起），再點目標位置。`,picked:c=>`已拿起 ${c}，點目標位置或再點一次自動放置。`,empty:'空',emptyColumn:'空列',foundation:'收牌堆',column:n=>`第 ${n} 列`,cellN:n=>`空檔 ${n}`,nextMove:(cards,target)=>`下一步：把 ${cards} 移到${target}。`,autoFinish:'剩下的牌會自動收完。',noRoute:'暫時算不出路線，試著復原幾步。',hintFoundation:'先找可依花色收入的下一張牌。再點提示查看下一步。',hintCell:'借用一個空檔，釋放被壓住的牌。再點提示查看下一步。',hintColumn:'檢查亮起的牌組：異色遞減能否接到另一列？再點提示查看下一步。',doneBest:n=>`比自己的最佳紀錄少 ${n} 步。`,donePlan:'完成整副牌的空間規劃。',growth:(extra,h)=>`52 張歸位 · 四門全收。${extra} 使用方向提示 ${h} 次。`,complete:(l,m,time)=>`第 ${l} 關完成！${m} 步，用時 ${time}。`,best:n=>`${n} 步`,locked:'未解鎖',playable:'可玩',levelAria:(l,b,locked)=>`第 ${l} 關${b?`，最佳 ${b} 步`:locked?'，未解鎖':''}`,currentCustom:'目前使用自訂牌背。',currentDefault:'目前使用預設牌背。',badType:'請選擇 PNG、JPEG、WebP、GIF、BMP、AVIF、HEIC、HEIF 或 TIFF 圖片。',converting:'正在本機轉換 HEIC/HEIF，然後壓縮牌背……',reading:'正在讀取原圖，完成取景後會自動壓縮……',decodeError:'圖片內容無法解碼，請確認檔案沒有損壞。',readOk:(w,h)=>`${w}×${h} 原圖已讀取；拖曳滑桿調整取景，儲存時會自動壓縮。`,readFail:'圖片無法讀取。',storageFull:'瀏覽器儲存空間不足，牌背只在本次工作階段生效。',backChanged:'已更換牌背，重新整理後仍然有效。',backChangedStatus:'牌背已更換。',backReset:'已恢復預設牌背。',tipExtra:'空檔和空列越多，一次能搬得越多：每個空檔 +1，每個空列翻倍。',spaceLearning:'空間與學習',practice:n=>`練習 ${n} / 3`,retryPractice:'重練',practiceComplete:'練習完成',nextPractice:'下一練習',backGame:'回到牌局',collected:n=>`歸位 ${n} / 52`,capacity:(c,n)=>`空檔 ${c} / 4 · 現可搬 ${n} 張到非空列`,beginPractice:'新手練習',returned:'已回到原牌局，練習不會改變正式成績。',restored:l=>`已恢復第 ${l} 關的進度。`,lessons:[['移動到空檔','把頂牌移進空檔，釋放牌列。'],['交替顏色遞減','把紅黑交替且點數遞減的牌接到另一列。'],['收入收牌堆','按同花色從 A 到 K 收牌。']],suits:['梅花','方塊','紅心','黑桃']},
en:{name:'FreeCell',title:l=>`FreeCell · Level ${l}`,brand:'FREECELL',level:l=>`Level ${l}`,changeBack:'Change card back',statsAria:'Game statistics',moves:'Moves',time:'Time',unlocked:'Unlocked',table:'Card table: arrows move focus, Space selects, Enter places, U undoes, H gives a hint',cell:'Free cell',ready:'Select a card, then its destination. Select it again to auto-place.',stuck:'No cards can move',stuckSub:'Undo a few moves to try another route, or restart this level.',undoOne:'Undo one move',restartLevel:'Restart level',actions:'Actions',undo:'Undo',hint:'Hint',restart:'Restart',levels:'Levels',cardBack:'Card back',clear:'Level {level} complete',bestMoves:'Best moves',next:'Next level',again:'Play again',chooseLevel:'Choose a level',close:'Close',levelNote:'Each level is the matching classic Microsoft FreeCell deal and is known to be solvable. Complete the current level to unlock the next.',changeBackTitle:'Change card back',backNote:'Supports common images plus HEIC, HEIF, and TIFF when the browser can read them. Images are cropped and compressed locally to 5:7, stored only on this device, and never uploaded.',preview:'Card back preview',chooseImage:'Choose image',zoom:'Zoom',horizontal:'Horizontal',vertical:'Vertical',useImage:'Use this image',resetBack:'Restore default card back',started:l=>`Level ${l} started.`,noMoves:'No cards can move.',practiceDone:'Done! Continue to the next practice step.',practiceLegal:'That move is legal. Follow the instruction above to finish this exercise, or select Retry.',superMove:(n,c)=>`Supermove ×${n}: ${c}.`,placedAuto:(c,n)=>`${c} placed; ${n} cards moved home automatically.`,placed:c=>`${c} placed.`,undone:'Undid the last move.',noPlace:'That run has no legal destination.',runOnly:'Select a descending run of alternating colors from the bottom of a column.',capped:n=>`You can move at most ${n} cards now. The bottom ${n} are selected; dimmed cards cannot move with them.`,pickedMany:(n,c)=>`Selected ${n} cards starting with ${c}. Select a destination.`,picked:c=>`Selected ${c}. Select a destination or select it again to auto-place.`,empty:'empty',emptyColumn:'empty column',foundation:'foundation',column:n=>`column ${n}`,cellN:n=>`free cell ${n}`,nextMove:(cards,target)=>`Next: move ${cards} to ${target}.`,autoFinish:'The remaining cards will move home automatically.',noRoute:'No route found yet. Try undoing a few moves.',hintFoundation:'Find the next card that can move home by suit. Select Hint again for the move.',hintCell:'Use a free cell to release a covered card. Select Hint again for the move.',hintColumn:'Check the highlighted run: can alternating descending cards join another column? Select Hint again for the move.',doneBest:n=>`${n} fewer moves than your previous best.`,donePlan:'You planned space for the full deck.',growth:(extra,h)=>`All 52 cards home in four suits. ${extra} Direction hints used: ${h}.`,complete:(l,m,time)=>`Level ${l} complete! ${m} moves in ${time}.`,best:n=>`${n} moves`,locked:'Locked',playable:'Playable',levelAria:(l,b,locked)=>`Level ${l}${b?`, best ${b} moves`:locked?', locked':''}`,currentCustom:'Using a custom card back.',currentDefault:'Using the default card back.',badType:'Choose a PNG, JPEG, WebP, GIF, BMP, AVIF, HEIC, HEIF, or TIFF image.',converting:'Converting HEIC/HEIF locally, then compressing the card back…',reading:'Reading the image locally. It will be compressed after framing…',decodeError:'The image could not be decoded. Check that the file is not damaged.',readOk:(w,h)=>`${w}×${h} image loaded. Adjust the framing; it will be compressed when saved.`,readFail:'The image could not be read.',storageFull:'Browser storage is full. This card back will last for this session only.',backChanged:'Card back changed and saved for future visits.',backChangedStatus:'Card back changed.',backReset:'Default card back restored.',tipExtra:'More free cells and empty columns let you move more cards: each free cell adds one, and each empty column doubles the total.',spaceLearning:'Space and practice',practice:n=>`Practice ${n} / 3`,retryPractice:'Retry',practiceComplete:'Finish practice',nextPractice:'Next exercise',backGame:'Return to game',collected:n=>`Home ${n} / 52`,capacity:(c,n)=>`Free cells ${c} / 4 · Up to ${n} cards can move to a nonempty column`,beginPractice:'Beginner practice',returned:'Returned to your game. Practice does not change your score.',restored:l=>`Restored your progress in Level ${l}.`,lessons:[['Move to a free cell','Move the top card into a free cell to expose the column.'],['Alternate colors downward','Join descending cards of alternating colors to another column.'],['Build foundations','Move cards home by suit from A through K.']],suits:['clubs','diamonds','hearts','spades']},
ja:{name:'フリーセル',title:l=>`フリーセル · ステージ ${l}`,brand:'FREECELL / フリーセル',level:l=>`ステージ ${l}`,changeBack:'カード裏面を変更',statsAria:'ゲーム統計',moves:'手数',time:'時間',unlocked:'解放済み',table:'カード台：方向キーで移動、Spaceで選択、Enterで配置、Uで元に戻す、Hでヒント',cell:'フリーセル',ready:'カードを選び、移動先を選択します。もう一度選ぶと自動配置します。',stuck:'動かせるカードがありません',stuckSub:'何手か戻して別の手順を試すか、このステージをやり直せます。',undoOne:'1手戻す',restartLevel:'ステージをやり直す',actions:'操作',undo:'元に戻す',hint:'ヒント',restart:'やり直す',levels:'ステージ',cardBack:'カード裏面',clear:'ステージ {level} クリア',bestMoves:'最少手数',next:'次のステージ',again:'もう一度',chooseLevel:'ステージを選択',close:'閉じる',levelNote:'各ステージは同じ番号の古典的な Microsoft FreeCell 配置で、解けることが確認済みです。現在のステージをクリアすると次が開きます。',changeBackTitle:'カード裏面を変更',backNote:'一般的な画像と、ブラウザが読める HEIC・HEIF・TIFF に対応します。画像は端末内で5:7に切り抜き・圧縮し、この端末だけに保存してアップロードしません。',preview:'カード裏面プレビュー',chooseImage:'画像を選択',zoom:'拡大縮小',horizontal:'左右',vertical:'上下',useImage:'この画像を使う',resetBack:'既定の裏面に戻す',started:l=>`ステージ ${l} を開始しました。`,noMoves:'動かせるカードがありません。',practiceDone:'できました！次の練習へ進めます。',practiceLegal:'正しい移動です。この練習を終えるには上の説明どおりに操作するか、「もう一度」を選びます。',superMove:(n,c)=>`まとめて移動 ×${n}：${c}。`,placedAuto:(c,n)=>`${c}を配置し、${n}枚を自動で収めました。`,placed:c=>`${c}を配置しました。`,undone:'1手戻しました。',noPlace:'このカード列を置ける場所がありません。',runOnly:'列の下端から、色が交互で数字が小さくなる並びだけを選べます。',capped:n=>`現在は最大${n}枚です。下の${n}枚を選択しました。暗いカードは一緒に運べません。`,pickedMany:(n,c)=>`${c}から${n}枚を選択しました。移動先を選んでください。`,picked:c=>`${c}を選択しました。移動先を選ぶか、もう一度選んで自動配置します。`,empty:'空',emptyColumn:'空の列',foundation:'ホームセル',column:n=>`${n}列目`,cellN:n=>`フリーセル ${n}`,nextMove:(cards,target)=>`次の手：${cards}を${target}へ移動。`,autoFinish:'残りのカードは自動で収まります。',noRoute:'手順を見つけられません。何手か戻してみてください。',hintFoundation:'同じスートで次に収められるカードを探します。もう一度ヒントを選ぶと手順を表示します。',hintCell:'フリーセルを使って下のカードを出します。もう一度ヒントを選ぶと手順を表示します。',hintColumn:'光っている並びを確認：色違いの降順で別の列につなげます。もう一度ヒントを選ぶと手順を表示します。',doneBest:n=>`自己ベストより${n}手少なくできました。`,donePlan:'52枚すべての空間を計画できました。',growth:(extra,h)=>`52枚を4スートに収めました。${extra} 方向ヒント使用：${h}回。`,complete:(l,m,time)=>`ステージ ${l} クリア！${m}手、${time}。`,best:n=>`${n}手`,locked:'未解放',playable:'プレイ可能',levelAria:(l,b,locked)=>`ステージ ${l}${b?`、ベスト ${b}手`:locked?'、未解放':''}`,currentCustom:'カスタムのカード裏面を使用中です。',currentDefault:'既定のカード裏面を使用中です。',badType:'PNG、JPEG、WebP、GIF、BMP、AVIF、HEIC、HEIF、TIFF画像を選んでください。',converting:'端末内でHEIC/HEIFを変換し、カード裏面を圧縮しています…',reading:'元画像を読み込んでいます。位置調整後に自動圧縮します…',decodeError:'画像を読み込めません。ファイルが壊れていないか確認してください。',readOk:(w,h)=>`${w}×${h}の画像を読み込みました。位置を調整すると保存時に圧縮します。`,readFail:'画像を読み込めません。',storageFull:'ブラウザの保存容量が不足しています。このセッションだけ有効です。',backChanged:'カード裏面を変更し、次回用に保存しました。',backChangedStatus:'カード裏面を変更しました。',backReset:'既定のカード裏面に戻しました。',tipExtra:'フリーセルと空の列が多いほど、まとめて動かせます：フリーセル1つで+1枚、空の列ごとに倍になります。',spaceLearning:'空間と練習',practice:n=>`練習 ${n} / 3`,retryPractice:'もう一度',practiceComplete:'練習を完了',nextPractice:'次の練習',backGame:'ゲームへ戻る',collected:n=>`収容 ${n} / 52`,capacity:(c,n)=>`フリーセル ${c} / 4 · 空でない列へ最大${n}枚移動可能`,beginPractice:'初心者練習',returned:'元のゲームに戻りました。練習は正式記録に影響しません。',restored:l=>`ステージ ${l} の進行を復元しました。`,lessons:[['フリーセルへ移動','一番上のカードをフリーセルへ動かし、下の列を出します。'],['色を交互に降順','赤黒交互で数字が小さくなるカードを別の列につなげます。'],['ホームセルへ収容','同じスートごとにAからKまで収めます。']],suits:['クラブ','ダイヤ','ハート','スペード']}};
const text=key=>I18N[locale][key];
const localizedCardName=card=>`${I18N[locale].suits[suitOf(card)]}${RANK_LABELS[rankOf(card)]}`;

// ---------- 本地存储 ----------

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式或容量不足时进度只保留在内存 */
  }
}

function loadProgress() {
  const stored = readJson(PROGRESS_KEY, null);
  const progress = { unlocked: 1, results: {} };
  if (stored && typeof stored === "object") {
    progress.unlocked = Math.min(LEVEL_COUNT, Math.max(1, Number(stored.unlocked) || 1));
    if (stored.results && typeof stored.results === "object") progress.results = stored.results;
  }
  return progress;
}

const progress = loadProgress();

// ---------- 游戏会话 ----------

const game = {
  level: 1,
  state: null,
  history: [],
  moves: 0,
  startedAt: null,
  elapsedBefore: 0,
  won: false,
  cascading: false,
  selection: null,
  cursor: { row: 1, index: 0 },
  keyboardMode: false,
  hint: null,
  sessionId:0,
  practice:null,
  hintCount:0,
};

function elapsedMs() {
  return game.elapsedBefore + (game.startedAt ? Date.now() - game.startedAt : 0);
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function saveSession() {
  if(game.practice)return;
  writeJson(SESSION_KEY, {
    level: game.level,
    state: game.state,
    history: game.history,
    moves: game.moves,
    elapsed: elapsedMs(),
    won: game.won,
    hints:game.hintCount,
  });
}

function restoreSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session || !session.state || !Array.isArray(session.state.columns) || session.won) return false;
  if (!Number.isInteger(session.level) || session.level < 1 || session.level > progress.unlocked) return false;
  game.level = session.level;
  game.state = session.state;
  game.history = Array.isArray(session.history) ? session.history : [];
  game.moves = Number(session.moves) || 0;
  game.elapsedBefore = Number(session.elapsed) || 0;
  game.startedAt = game.moves > 0 ? Date.now() : null;
  game.won = false;
  game.hintCount=Number(session.hints)||0;
  return true;
}

function startLevel(level, { deal = true } = {}) {
  if(game.practice)endPractice();
  game.sessionId++;game.cascading=false;dom.body.dataset.cascading='false';dom.body.classList.remove('is-celebrating');
  game.hintCount=0;
  game.level = level;
  game.state = createState(level);
  game.history = [];
  game.moves = 0;
  game.startedAt = null;
  game.elapsedBefore = 0;
  game.won = false;
  game.selection = null;
  game.hint = null;
  dom.body.dataset.gameState = "playing";
  saveSession();
  renderMeta();
  setStatus(text('started')(level));
  if (deal) dealAnimation();
  else render();
}

// ---------- 卡牌元素 ----------

const cardElements = new Map();

function suitAsset(card) {
  return `assets/suits/${SUITS[suitOf(card)]}.png`;
}

function courtAsset(card) {
  const rank = rankOf(card);
  const name = rank === 10 ? "jack" : rank === 11 ? "queen" : "king";
  return `assets/courts/${name}-${SUITS[suitOf(card)]}.png`;
}

function buildCardElement(card) {
  const element = document.createElement("div");
  const label = cardLabel(card);
  const isCourt = rankOf(card) >= 10;
  element.className = `card ${isRed(card) ? "is-red" : "is-black"}${isCourt ? " card--court" : ""}`;
  element.dataset.card = label;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", localizedCardName(card));
  element.tabIndex = -1;
  const face = document.createElement("div");
  face.className = "card__face";
  const rankText = RANK_LABELS[rankOf(card)];
  const corner = document.createElement("span");
  corner.className = "card__corner";
  corner.innerHTML = `<span>${rankText}</span><img src="${suitAsset(card)}" alt="" draggable="false">`;
  const cornerBottom = corner.cloneNode(true);
  cornerBottom.classList.add("card__corner--bottom");
  const center = document.createElement("img");
  center.className = "card__center";
  center.alt = "";
  center.draggable = false;
  center.src = isCourt ? courtAsset(card) : suitAsset(card);
  face.append(corner, center, cornerBottom);
  const back = document.createElement("div");
  back.className = "card__back";
  element.append(face, back);
  return element;
}

for (let card = 0; card < 52; card += 1) {
  const element = buildCardElement(card);
  cardElements.set(card, element);
  dom.cards.append(element);
}

// ---------- 布局与渲染 ----------

const metrics = { cardW: 44, cardH: 62, gap: 6, left: 0, topRowY: 0, columnsY: 0, stackOffset: 18, tableHeight: 0 };

function computeMetrics() {
  const rect = dom.table.getBoundingClientRect();
  const inner = rect.width - 8;
  const gap = Math.max(4, Math.min(12, rect.width * 0.012));
  const cardW = Math.floor((inner - gap * (COLUMN_COUNT - 1)) / COLUMN_COUNT);
  const cardH = Math.round(cardW * 1.4);
  metrics.gap = gap;
  metrics.cardW = Math.max(30, Math.min(cardW, 96));
  metrics.cardH = Math.round(metrics.cardW * 1.4);
  const totalWidth = metrics.cardW * COLUMN_COUNT + gap * (COLUMN_COUNT - 1);
  metrics.left = Math.round((inner - totalWidth) / 2);
  metrics.topRowY = 0;
  metrics.columnsY = metrics.cardH + gap * 1.6;
  metrics.tableHeight = rect.height - 8;
  // Use the available vertical table space so mobile ranks are not packed into tiny strips.
  metrics.stackOffset = Math.max(20, Math.min(Math.round(metrics.cardH * 0.65), 56));
  dom.table.style.setProperty("--card-w", `${metrics.cardW}px`);
  dom.table.style.setProperty("--card-h", `${metrics.cardH}px`);
  dom.table.style.setProperty("--gap", `${gap}px`);
  void cardH;
}

function slotPosition(slot) {
  const x = metrics.left + slot.index * (metrics.cardW + metrics.gap);
  if (slot.type === "cell") return { x, y: metrics.topRowY };
  if (slot.type === "foundation") return { x: metrics.left + (CELL_COUNT + slot.index) * (metrics.cardW + metrics.gap), y: metrics.topRowY };
  return { x, y: metrics.columnsY };
}

function columnOffset(length) {
  if (length <= 1) return metrics.stackOffset;
  const available = Math.max(0, metrics.tableHeight - metrics.columnsY - metrics.cardH);
  return Math.max(9, Math.min(metrics.stackOffset, Math.floor(available / (length - 1))));
}

function placeCard(element, x, y, z) {
  element.style.setProperty("--x", `${Math.round(x)}px`);
  element.style.setProperty("--y", `${Math.round(y)}px`);
  element.style.zIndex = String(z);
}

const cardFlights = new Map();
let cardFlightOrder = 0;
const CARD_FLIGHT_MS = 640;
function flyCard(element, x, y, z, fromTransform = getComputedStyle(element).transform) {
  const from = new DOMMatrixReadOnly(fromTransform);
  cardFlights.get(element)?.cancel();
  element.style.setProperty('--flight-z', String(1000 + ++cardFlightOrder));
  placeCard(element, x, y, z);
  const animation = element.animate([
    { transform: `translate3d(${from.m41}px,${from.m42}px,0) scale(1)` },
    { transform: `translate3d(${(from.m41+x)/2}px,${(from.m42+y)/2-24}px,0) scale(1.06)`, offset: .5 },
    { transform: `translate3d(${x}px,${y}px,0) scale(1)` },
  ], { duration: CARD_FLIGHT_MS, easing: 'cubic-bezier(.3,.05,.65,.95)' });
  cardFlights.set(element, animation);
  animation.onfinish = () => { if(cardFlights.get(element)===animation)cardFlights.delete(element); };
}

function cardPosition(state, card) {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] === card) return { ...slotPosition({ type: "cell", index }), z: 5 };
  }
  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const row = state.columns[column].indexOf(card);
    if (row >= 0) {
      const base = slotPosition({ type: "column", index: column });
      return { x: base.x, y: base.y + row * columnOffset(state.columns[column].length), z: 10 + row };
    }
  }
  const suit = suitOf(card);
  if (state.foundations[suit] > rankOf(card)) {
    return { ...slotPosition({ type: "foundation", index: suit }), z: 2 + rankOf(card) };
  }
  return null;
}

function render() {
  computeMetrics();
  const state = game.state;
  const selected = new Set(selectedCards());
  const capped = cappedCards();
  for (let card = 0; card < 52; card += 1) {
    const element = cardElements.get(card);
    const position = cardPosition(state, card);
    if (!position) continue;
    element.classList.remove("is-facedown");
    element.classList.toggle("is-on-foundation", state.foundations[suitOf(card)] > rankOf(card));
    element.classList.toggle("is-selected", selected.has(card));
    element.classList.toggle("is-capped", capped.has(card));
    element.classList.toggle("is-hint", Boolean(game.hint && game.hint.cards.includes(card)));
    const covered = state.foundations[suitOf(card)] > rankOf(card) + 1;
    const flying = element.classList.contains("is-flying");
    element.hidden = covered && !flying;
    if (!covered || flying) placeCard(element, position.x, position.y, position.z + (selected.has(card) ? 40 : 0));
  }
  renderSlots();
  renderMeta();
  renderStuck();
}

/** 没有任何合法移动（含放入空档与收牌）且未通关时，提醒玩家撤销或重开。 */
function renderStuck() {
  const stuck = Boolean(game.state) && !game.won && !game.cascading && !isWon(game.state) && legalMoves(game.state).length === 0;
  dom.stuckBanner.hidden = !stuck;
  if (stuck) {
    dom.stuckUndo.hidden = game.history.length === 0;
    setStatus(text('noMoves'));
  }
}

function renderSlots() {
  const targets = new Set(game.selection ? validTargets(game.selection).map(slotKey) : []);
  const cursorKey = slotKey(cursorSlot());
  const hintKey = game.hint?.revealed ? slotKey(game.hint.move.to) : null;
  for (const slot of dom.table.querySelectorAll(".slot")) {
    const key = slot.dataset.slot;
    slot.classList.toggle("is-target", targets.has(key));
    slot.classList.toggle("is-cursor", game.keyboardMode && document.activeElement === dom.table && key === cursorKey);
    slot.classList.toggle("is-hint", key === hintKey);
  }
}

function applyLocale({ announce = true } = {}) {
  document.documentElement.lang=locale;
  dom.openBackDialog.setAttribute('aria-label',text('changeBack'));document.querySelector('.brand .eyebrow').textContent=text('brand');
  document.querySelector('.stats').setAttribute('aria-label',text('statsAria'));document.querySelectorAll('.stats dt').forEach((node,index)=>node.textContent=[text('moves'),text('time'),text('unlocked')][index]);
  dom.table.setAttribute('aria-label',text('table'));document.querySelectorAll('.slot__hint').forEach(node=>node.textContent=text('cell'));
  const stuck=dom.stuckBanner.querySelector('.stuck-banner__copy');stuck.querySelector('strong').textContent=text('stuck');stuck.querySelector('span').textContent=text('stuckSub');dom.stuckUndo.textContent=text('undoOne');dom.stuckRestart.textContent=text('restartLevel');
  document.querySelector('.toolbar').setAttribute('aria-label',text('actions'));dom.undo.textContent=text('undo');dom.hint.textContent=text('hint');dom.restart.textContent=text('restart');dom.openLevels.textContent=text('levels');dom.openBack.textContent=text('cardBack');
  const win=dom.winDialog,[winBefore,winAfter]=text('clear').split('{level}');win.querySelector('#win-title').childNodes[0].nodeValue=winBefore;win.querySelector('#win-title').childNodes[2].nodeValue=winAfter;win.querySelectorAll('.win-stats dt').forEach((node,index)=>node.textContent=[text('moves'),text('time'),text('bestMoves')][index]);dom.nextLevel.textContent=text('next');dom.replayLevel.textContent=text('again');
  document.querySelector('#level-title').textContent=text('chooseLevel');dom.closeLevels.textContent=text('close');dom.levelDialog.querySelector('.sheet__note').textContent=text('levelNote');
  document.querySelector('#back-title').textContent=text('changeBackTitle');dom.closeBack.textContent=text('close');dom.backDialog.querySelector('.sheet__note').textContent=text('backNote');dom.backCanvas.setAttribute('aria-label',text('preview'));
  const labels=dom.backDialog.querySelectorAll('.back-editor__controls > label');labels[0].childNodes[0].nodeValue=text('chooseImage');labels[1].childNodes[0].nodeValue=text('zoom');labels[2].childNodes[0].nodeValue=text('horizontal');labels[3].childNodes[0].nodeValue=text('vertical');dom.applyBack.textContent=text('useImage');dom.resetBack.textContent=text('resetBack');
  learningBar?.setAttribute('aria-label',text('spaceLearning'));renderMeta();renderLearningBar();if(dom.levelDialog.open)renderLevelGrid();if(announce)setStatus(text('ready'));
}

function renderMeta() {
  renderLearningBar();
  dom.level.textContent = String(game.level);
  dom.moves.textContent = String(game.moves);
  dom.moves.dataset.prefix = text('moves');
  dom.timer.dataset.prefix = text('time');
  dom.unlocked.dataset.prefix = text('unlocked');
  dom.unlocked.textContent = String(progress.unlocked);
  dom.timer.textContent = formatTime(elapsedMs());
  dom.undo.disabled = game.history.length === 0 || game.won;
  dom.hint.disabled = game.won;
  const [levelBefore,levelAfter]=text('level')(game.level).split(String(game.level));document.querySelector('#game-title').childNodes[0].nodeValue=levelBefore;document.querySelector('#game-title').childNodes[2].nodeValue=levelAfter;
  document.title = text('title')(game.level);
}

function slotKey(slot) {
  return `${slot.type}-${slot.index}`;
}

function setStatus(message) {
  dom.status.textContent = message;
}

// ---------- 选择与移动 ----------

function selectedCards() {
  if (!game.selection || !game.state) return [];
  const { from, count } = game.selection;
  if (from.type === "cell") return game.state.cells[from.index] === null ? [] : [game.state.cells[from.index]];
  const column = game.state.columns[from.index];
  return column.slice(column.length - count);
}

/** 选中一列牌组时,有序牌组里超出本次搬动上限、这次带不走的牌。 */
function cappedCards() {
  const capped = new Set();
  if (!game.selection || !game.state || game.selection.from.type !== "column") return capped;
  const column = game.state.columns[game.selection.from.index];
  const run = orderedRunLength(column);
  const limit = maxMovableCount(game.state, false);
  if (run <= limit) return capped;
  for (let index = column.length - run; index < column.length - limit; index += 1) capped.add(column[index]);
  return capped;
}

let ruleToastTimer = null;
/** 在目标位置旁边短暂弹出规则说明;第一次触发时多解释一句。 */
function showRuleToast(message, slot) {
  let toast = dom.table.querySelector(".rule-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "rule-toast";
    toast.setAttribute("role", "status");
    dom.table.appendChild(toast);
  }
  let displayText = message;
  try {
    if (!localStorage.getItem(SUPERMOVE_TIP_KEY)) {
      displayText = `${message} ${text('tipExtra')}`;
      localStorage.setItem(SUPERMOVE_TIP_KEY, "1");
    }
  } catch { /* 存储不可用时只显示短提示 */ }
  toast.textContent = displayText;
  const position = slot ? slotPosition(slot) : { x: metrics.left, y: metrics.columnsY };
  const width = Math.min(dom.table.clientWidth - 16, 300);
  const left = Math.max(4, Math.min(position.x + metrics.cardW / 2 - width / 2, dom.table.clientWidth - width - 4));
  toast.style.setProperty("--x", `${Math.round(left)}px`);
  toast.style.setProperty("--y", `${Math.round(position.y + metrics.cardH + 8)}px`);
  toast.style.width = `${width}px`;
  toast.hidden = false;
  toast.classList.add("is-visible");
  if (ruleToastTimer) clearTimeout(ruleToastTimer);
  ruleToastTimer = setTimeout(() => { toast.classList.remove("is-visible"); toast.hidden = true; }, 3200);
}

/** 统一处理被拒绝的移动:上限类拒绝在目标旁弹出说明,其余只更新状态栏。 */
function rejectMove(move, verdict) {
  const reason=verdict.code==='supermove-limit'?text('capped')(verdict.limit):text('noPlace');
  setStatus(reason);
  if (verdict.code === "supermove-limit") showRuleToast(reason, move.to);
}

function validTargets(selection) {
  const targets = [];
  for (let index = 0; index < CELL_COUNT; index += 1) targets.push({ type: "cell", index });
  for (let index = 0; index < 4; index += 1) targets.push({ type: "foundation", index });
  for (let index = 0; index < COLUMN_COUNT; index += 1) targets.push({ type: "column", index });
  return targets.filter((to) => validateMove(game.state, { from: selection.from, to, count: selection.count }).ok);
}

function startTimerIfNeeded() {
  if (!game.startedAt && !game.won) game.startedAt = Date.now();
}

/** 执行玩家移动:记录历史、自动收牌、检测胜利。返回是否成功。 */
function performMove(move, { announce = true } = {}) {
  if (game.won || dom.body.dataset.dealing === "true") return false;
  const verdict = validateMove(game.state, move);
  if (!verdict.ok) {
    rejectMove(move, verdict);
    return false;
  }
  if (game.cascading) return false;
  if(game.practice){
    game.state=applyMove(game.state,move);game.selection=null;game.hint=null;
    if(lessonAccepts(game.practice.index,{...move,count:move.count??1})){game.practice.passed=true;setStatus(text('practiceDone'));}
    else setStatus(text('practiceLegal'));
    render();return true;
  }
  startTimerIfNeeded();
  game.history.push({ state: game.state, moves: game.moves });
  if (game.history.length > 500) game.history.shift();
  const moved = applyMove(game.state, move);
  const auto = autoPlayAll(moved);
  game.state = moved;
  game.moves += 1;
  game.selection = null;
  game.hint = null;
  const label = verdict.cards.map(localizedCardName).join(locale==='en'?', ':'、');
  if (announce) {
    if (verdict.cards.length > 1) setStatus(text('superMove')(verdict.cards.length,label));
    else if (auto.moves.length > 0) setStatus(text('placedAuto')(label,auto.moves.length));
    else setStatus(text('placed')(label));
  }
  render();
  // 会话直接保存收牌完成后的局面:刷新后不会卡在收牌中途。
  writeJson(SESSION_KEY, { level: game.level, state: auto.state, history: game.history, moves: game.moves, elapsed: elapsedMs(), won: false,hints:game.hintCount });
  if (auto.moves.length > 0) runCascade(auto.state);
  else if (isWon(game.state)) celebrateThenFinish();
  return true;
}

/** 自动收牌:一张一张飞向收牌堆;全部到位后再结算。牌越多间隔越短,整段不超过约 4 秒。 */
function runCascade(finalState) {
  const sessionId=game.sessionId;
  const total = autoPlayAll(game.state).moves.length;
  const interval = Math.max(70, Math.min(160, Math.floor(3600 / Math.max(1, total))));
  game.cascading = true;
  dom.body.dataset.cascading = "true";
  const step = () => {
    if(sessionId!==game.sessionId)return;
    const move = nextAutoMove(game.state);
    if (!move) {
      // Let the final card land before exposing the result or accepting another move.
      setTimeout(() => {
        if(sessionId!==game.sessionId)return;
        game.cascading = false;
        dom.body.dataset.cascading = "false";
        game.state = finalState;
        render();
        if (isWon(game.state)) celebrateThenFinish();
      }, CARD_FLIGHT_MS + 30);
      return;
    }
    const card = move.from.type === "cell" ? game.state.cells[move.from.index] : game.state.columns[move.from.index].at(-1);
    const element = cardElements.get(card);
    const from = getComputedStyle(element).transform;
    element.classList.add("is-flying");
    setTimeout(() => {
      if(sessionId!==game.sessionId)return;
      element.classList.remove("is-flying");
      element.hidden = game.state.foundations[suitOf(card)] > rankOf(card) + 1;
    }, CARD_FLIGHT_MS + 30);
    game.state = applyMove(game.state, move);
    render();
    // render() updates the destination; start the visible flight from the pre-move position.
    const destination = cardPosition(game.state, card);
    if(destination)flyCard(element,destination.x,destination.y,300,from);
    setTimeout(step, interval);
  };
  step();
}

/** 通关时先让四个收牌堆依次弹一下,再弹出结算面板。 */
function celebrateThenFinish() {
  const sessionId=game.sessionId;
  game.cascading = true;
  dom.body.dataset.cascading = "true";
  dom.body.classList.add("is-celebrating");
  setTimeout(() => {
    if(sessionId!==game.sessionId)return;
    dom.body.classList.remove("is-celebrating");
    game.cascading = false;
    dom.body.dataset.cascading = "false";
    finishLevel();
  }, 1100);
}

function undo() {
  if (dom.body.dataset.dealing === "true") return;
  if(game.practice){loadPracticeStep(game.practice.index);return;}
  if (game.cascading) return;
  const previous = game.history.pop();
  if (!previous || game.won) return;
  game.state = previous.state;
  game.moves = previous.moves;
  game.selection = null;
  game.hint = null;
  setStatus(text('undone'));
  render();
  saveSession();
}

function autoMoveFrom(from, count) {
  const move = findBestDestination(game.state, from, count);
  if (!move) {
    setStatus(text('noPlace'));
    return false;
  }
  return performMove(move);
}

function isMovableRun(from, count) {
  if (from.type === "cell") return count === 1 && game.state.cells[from.index] !== null;
  const column = game.state.columns[from.index];
  return count >= 1 && count <= orderedRunLength(column);
}

function select(from, count) {
  if (game.cascading || dom.body.dataset.dealing === "true") return false;
  if (!isMovableRun(from, count)) {
    setStatus(text('runOnly'));
    return false;
  }
  let capped = false;
  if (from.type === "column") {
    const limit = maxMovableCount(game.state, false);
    if (count > limit) { count = limit; capped = true; }
  }
  game.selection = { from, count };
  game.hint = null;
  const cards = selectedCards();
  if (capped) setStatus(text('capped')(count));
  else setStatus(cards.length > 1 ? text('pickedMany')(cards.length,localizedCardName(cards[0])) : text('picked')(localizedCardName(cards[0])));
  render();
  return true;
}

function clearSelection() {
  game.selection = null;
  render();
}

function locateCard(card) {
  const cellIndex = game.state.cells.indexOf(card);
  if (cellIndex >= 0) return { from: { type: "cell", index: cellIndex }, count: 1 };
  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const row = game.state.columns[column].indexOf(card);
    if (row >= 0) return { from: { type: "column", index: column }, count: game.state.columns[column].length - row };
  }
  return null;
}

function handleCardTap(card) {
  if (game.won) return;
  const location = locateCard(card);
  if (!location) return;
  if (!game.selection) {
    select(location.from, location.count);
    return;
  }
  const sameSource = game.selection.from.type === location.from.type && game.selection.from.index === location.from.index;
  if (sameSource) {
    if (game.selection.count === location.count) {
      autoMoveFrom(game.selection.from, game.selection.count);
    } else {
      select(location.from, location.count);
    }
    return;
  }
  const target = location.from.type === "cell" ? { type: "cell", index: location.from.index } : { type: "column", index: location.from.index };
  const move = { from: game.selection.from, to: target, count: game.selection.count };
  if (validateMove(game.state, move).ok) performMove(move);
  else select(location.from, location.count);
}

function handleSlotTap(slot) {
  if (game.won) return;
  if (!game.selection) {
    if (slot.type === "column" && game.state.columns[slot.index].length > 0) {
      select(slot, 1);
    } else if (slot.type === "cell" && game.state.cells[slot.index] !== null) {
      select(slot, 1);
    }
    return;
  }
  const move = { from: game.selection.from, to: slot, count: game.selection.count };
  performMove(move);
}

// ---------- 指针:点击与拖拽 ----------

const drag = { pointerId: null, card: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, cards: [], moving: false, origin: null, suppressClick: false };

function parseSlot(element) {
  const key = element?.dataset?.slot;
  if (!key) return null;
  const [type, index] = key.split("-");
  return { type, index: Number(index) };
}

function cardFromElement(element) {
  const label = element?.closest?.(".card")?.dataset.card;
  if (!label) return null;
  for (const [card, node] of cardElements) if (node.dataset.card === label) return card;
  return null;
}

dom.table.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  game.keyboardMode = false;
  const card = cardFromElement(event.target);
  if (card === null || game.won) return;
  const location = locateCard(card);
  if (!location) return;
  const movable = location.from.type === "cell" || location.count <= orderedRunLength(game.state.columns[location.from.index]);
  drag.pointerId = event.pointerId;
  drag.card = card;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.moving = false;
  drag.origin = movable ? location : null;
  drag.cards = movable ? (location.from.type === "cell" ? [card] : game.state.columns[location.from.index].slice(-location.count)) : [];
  const rect = cardElements.get(card).getBoundingClientRect();
  drag.offsetX = event.clientX - rect.left;
  drag.offsetY = event.clientY - rect.top;
  dom.table.setPointerCapture?.(event.pointerId);
});

dom.table.addEventListener("pointermove", (event) => {
  if (drag.pointerId !== event.pointerId || drag.card === null) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moving) {
    if (Math.hypot(dx, dy) < 6 || !drag.origin) return;
    drag.moving = true;
    dom.table.dataset.dragging = "true";
    game.selection = { from: drag.origin.from, count: drag.origin.count };
    game.hint = null;
    renderSlots();
    drag.cards.forEach((card) => cardElements.get(card).classList.add("is-dragging"));
  }
  const tableRect = dom.table.getBoundingClientRect();
  const offset = columnOffset(drag.cards.length + 1);
  drag.cards.forEach((card, index) => {
    const x = event.clientX - tableRect.left - 4 - drag.offsetX;
    const y = event.clientY - tableRect.top - 4 - drag.offsetY + index * offset;
    placeCard(cardElements.get(card), x, y, 200 + index);
  });
});

function dropTargetAt(clientX, clientY) {
  const dragged = drag.cards.map((card) => cardElements.get(card));
  dragged.forEach((element) => { element.style.visibility = "hidden"; });
  let element = document.elementFromPoint(clientX, clientY);
  dragged.forEach((node) => { node.style.visibility = ""; });
  const card = cardFromElement(element);
  if (card !== null) {
    const location = locateCard(card);
    if (location) return location.from.type === "cell" ? { type: "cell", index: location.from.index } : { type: "column", index: location.from.index };
  }
  const slot = parseSlot(element?.closest?.(".slot"));
  if (slot) return slot;
  // 落在列下方的空白处也算该列。
  const tableRect = dom.table.getBoundingClientRect();
  const x = clientX - tableRect.left - 4 - metrics.left;
  const column = Math.floor(x / (metrics.cardW + metrics.gap));
  if (column >= 0 && column < COLUMN_COUNT && clientY - tableRect.top - 4 >= metrics.columnsY) return { type: "column", index: column };
  return null;
}

function endDrag(event) {
  if (drag.pointerId !== event.pointerId || drag.card === null) return;
  const card = drag.card;
  const wasMoving = drag.moving;
  const origin = drag.origin;
  const draggedCards = drag.cards;
  drag.pointerId = null;
  drag.card = null;
  drag.moving = false;
  // 指针捕获会让随后的 click 落在牌桌上,这里吞掉它,避免刚选中的牌被当成“点空白取消”。
  drag.suppressClick = true;
  dom.table.dataset.dragging = "false";
  draggedCards.forEach((item) => cardElements.get(item).classList.remove("is-dragging"));
  if (event.type === "pointercancel") {
    game.selection = null;
    render();
    return;
  }
  if (!wasMoving) {
    handleCardTap(card);
    return;
  }
  const target = dropTargetAt(event.clientX, event.clientY);
  const move = target ? { from: origin.from, to: target, count: origin.count } : null;
  if (move && validateMove(game.state, move).ok) {
    performMove(move);
  } else {
    if (move && !(target.type === origin.from.type && target.index === origin.from.index)) rejectMove(move, validateMove(game.state, move));
    game.selection = null;
    render();
  }
}

dom.table.addEventListener("pointerup", endDrag);
dom.table.addEventListener("pointercancel", endDrag);

dom.table.addEventListener("click", (event) => {
  if (drag.suppressClick) {
    drag.suppressClick = false;
    return;
  }
  if (cardFromElement(event.target) !== null) return;
  const slot = parseSlot(event.target.closest?.(".slot"));
  if (slot) handleSlotTap(slot);
  else if (game.selection) clearSelection();
});

// ---------- 键盘 ----------

function cursorSlot() {
  const { row, index } = game.cursor;
  if (row === 0) return index < CELL_COUNT ? { type: "cell", index } : { type: "foundation", index: index - CELL_COUNT };
  return { type: "column", index };
}

function moveCursor(dx, dy) {
  game.cursor.row = Math.max(0, Math.min(1, game.cursor.row + dy));
  game.cursor.index = (game.cursor.index + dx + 8) % 8;
  renderSlots();
  const slot = cursorSlot();
  const description = slot.type === "cell"
    ? `${text('cellN')(slot.index + 1)}: ${game.state.cells[slot.index] === null ? text('empty') : localizedCardName(game.state.cells[slot.index])}`
    : slot.type === "foundation"
      ? `${text('foundation')} ${slot.index + 1}: ${game.state.foundations[slot.index]}`
      : `${text('column')(slot.index + 1)}: ${game.state.columns[slot.index].length ? localizedCardName(game.state.columns[slot.index].at(-1)) : text('emptyColumn')}`;
  setStatus(description);
}

function keyboardSelect() {
  const slot = cursorSlot();
  if (slot.type === "foundation") return;
  const sameSource = game.selection && game.selection.from.type === slot.type && game.selection.from.index === slot.index;
  if (sameSource && slot.type === "column") {
    const run = orderedRunLength(game.state.columns[slot.index]);
    const next = game.selection.count >= run ? 1 : game.selection.count + 1;
    select(slot, next);
    return;
  }
  if (sameSource) {
    clearSelection();
    return;
  }
  handleSlotTap(slot);
}

function keyboardConfirm() {
  const slot = cursorSlot();
  if (!game.selection) {
    if (slot.type !== "foundation" && (slot.type === "cell" ? game.state.cells[slot.index] !== null : game.state.columns[slot.index].length > 0)) {
      autoMoveFrom(slot, 1);
    }
    return;
  }
  const sameSource = game.selection.from.type === slot.type && game.selection.from.index === slot.index;
  if (sameSource) autoMoveFrom(game.selection.from, game.selection.count);
  else handleSlotTap(slot);
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const inDialog = document.querySelector("dialog[open]");
  if (inDialog || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  const key = event.key;
  if (/^(Arrow(Left|Right|Up|Down)| |Enter|[1-8])$/.test(key)) game.keyboardMode = true;
  if (key === "ArrowLeft") { moveCursor(-1, 0); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowRight") { moveCursor(1, 0); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowUp") { moveCursor(0, -1); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowDown") { moveCursor(0, 1); dom.table.focus(); event.preventDefault(); return; }
  if (key === " " ) { dom.table.focus(); keyboardSelect(); event.preventDefault(); return; }
  if (key === "Enter") { dom.table.focus(); keyboardConfirm(); event.preventDefault(); return; }
  if (key === "Escape") { clearSelection(); return; }
  if (/^[1-8]$/.test(key)) { game.cursor = { row: 1, index: Number(key) - 1 }; dom.table.focus(); renderSlots(); keyboardSelect(); return; }
  if (key === "u" || key === "U") { undo(); return; }
  if (key === "h" || key === "H") { showHint(); return; }
  if (key === "r" || key === "R") { restartLevel(); return; }
  if ((key === "n" || key === "N") && game.won) { goNextLevel(); }
});

dom.table.addEventListener("focus", renderSlots);
dom.table.addEventListener("blur", renderSlots);

// ---------- 提示 ----------

function showHint() {
  if (game.won||game.cascading||game.practice) return;
  const signature=JSON.stringify(game.state);
  if(game.hint?.signature===signature){
    const move=game.hint.move,target=move.to.type==='foundation'?text('foundation'):move.to.type==='cell'?text('cellN')(move.to.index+1):text('column')(move.to.index+1);
    game.hint.revealed=true;setStatus(text('nextMove')(game.hint.cards.map(localizedCardName).join(locale==='en'?', ':'、'),target));render();return;
  }
  const result = solve(game.state, { maxNodes: 40_000 });
  const move = result.moves[0]?.move;
  if (!move) {
    setStatus(result.solved ? text('autoFinish') : text('noRoute'));
    return;
  }
  const verdict = validateMove(game.state, move);
  game.hintCount++;saveSession();
  game.hint = { move, cards: verdict.cards ?? [],signature,revealed:false };
  setStatus(move.to.type==='foundation'?text('hintFoundation'):move.to.type==='cell'?text('hintCell'):text('hintColumn'));
  render();
}

// ---------- 关卡与结算 ----------

function finishLevel() {
  if(game.practice||game.won)return;
  game.won = true;
  game.elapsedBefore = elapsedMs();
  game.startedAt = null;
  const seconds = Math.round(game.elapsedBefore / 1000);
  const key = String(game.level);
  const previous = progress.results[key];
  const best = previous ? Math.min(previous.bestMoves, game.moves) : game.moves;
  progress.results[key] = {
    moves: game.moves,
    seconds,
    bestMoves: best,
    bestSeconds: previous ? Math.min(previous.bestSeconds, seconds) : seconds,
    completedAt: new Date().toISOString(),
  };
  if (game.level >= progress.unlocked && game.level < LEVEL_COUNT) progress.unlocked = game.level + 1;
  writeJson(PROGRESS_KEY, progress);
  writeJson(SESSION_KEY, { level: game.level, won: true });
  dom.body.dataset.gameState = "won";
  dom.winLevel.textContent = String(game.level);
  dom.winMoves.textContent = String(game.moves);
  dom.winTime.textContent = formatTime(game.elapsedBefore);
  dom.winBest.textContent = String(best);
  let growth=dom.winDialog.querySelector('.growth-summary');
  if(!growth){growth=document.createElement('p');growth.className='growth-summary';dom.winDialog.querySelector('.win-stats').after(growth);}
  growth.textContent=text('growth')(previous&&game.moves<previous.bestMoves?text('doneBest')(previous.bestMoves-game.moves):text('donePlan'),game.hintCount);
  dom.nextLevel.hidden = game.level >= LEVEL_COUNT;
  renderMeta();
  setStatus(text('complete')(game.level,game.moves,formatTime(game.elapsedBefore)));
  for (const [, element] of cardElements) element.classList.remove("is-selected", "is-hint");
  if (!dom.winDialog.open) dom.winDialog.showModal();
}

function goNextLevel() {
  dom.winDialog.close();
  startLevel(Math.min(LEVEL_COUNT, game.level + 1));
}

function restartLevel() {
  if (dom.winDialog.open) dom.winDialog.close();
  startLevel(game.level);
}

function renderLevelGrid() {
  dom.levelGrid.textContent = "";
  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    const button = document.createElement("button");
    const result = progress.results[String(level)];
    button.type = "button";
    button.className = `level${result ? " is-done" : ""}${level === game.level ? " is-current" : ""}`;
    button.dataset.level = String(level);
    button.setAttribute("role", "listitem");
    button.disabled = level > progress.unlocked;
    button.innerHTML = `<span>${level}</span><small>${result ? text('best')(result.bestMoves) : level > progress.unlocked ? text('locked') : text('playable')}</small>`;
    button.setAttribute("aria-label", text('levelAria')(level,result?.bestMoves,level > progress.unlocked));
    button.addEventListener("click", () => {
      dom.levelDialog.close();
      startLevel(level);
    });
    dom.levelGrid.append(button);
  }
}

// ---------- 牌背 ----------

function applyCardBack(dataUrl) {
  const url = dataUrl || DEFAULT_CARD_BACK;
  document.documentElement.style.setProperty("--card-back", `url("${url}")`);
  dom.deckPreview.src = url;
  for (const image of document.querySelectorAll(".win-card")) image.src = url;
  dom.body.dataset.cardBack = dataUrl ? "custom" : "default";
}

function loadCardBack() {
  try {
    const stored = localStorage.getItem(CARD_BACK_KEY);
    applyCardBack(stored && stored.startsWith("data:image/") ? stored : null);
  } catch {
    applyCardBack(null);
  }
}

const backEditor = { image: null, zoom: 1, offsetX: 0, offsetY: 0 };
const CARD_BACK_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "jfif", "webp", "gif", "bmp", "avif", "heic", "heif", "tif", "tiff"]);

function drawBackPreview(context, width, height) {
  context.clearRect(0, 0, width, height);
  const image = backEditor.image;
  if (!image) {
    const fallback = new Image();
    fallback.src = dom.deckPreview.src;
    if (fallback.complete) context.drawImage(fallback, 0, 0, width, height);
    return;
  }
  // 先按“覆盖”比例填满 5:7 画布,再叠加缩放与平移。
  const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight) * backEditor.zoom;
  const drawWidth = image.naturalWidth * cover;
  const drawHeight = image.naturalHeight * cover;
  const maxShiftX = Math.max(0, (drawWidth - width) / 2);
  const maxShiftY = Math.max(0, (drawHeight - height) / 2);
  const x = (width - drawWidth) / 2 - backEditor.offsetX * maxShiftX;
  const y = (height - drawHeight) / 2 - backEditor.offsetY * maxShiftY;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function refreshBackPreview() {
  const context = dom.backCanvas.getContext("2d");
  drawBackPreview(context, dom.backCanvas.width, dom.backCanvas.height);
}

function openBackDialog() {
  backEditor.image = null;
  backEditor.zoom = 1;
  backEditor.offsetX = 0;
  backEditor.offsetY = 0;
  dom.backZoom.value = "1";
  dom.backOffsetX.value = "0";
  dom.backOffsetY.value = "0";
  for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = true;
  dom.applyBack.disabled = true;
  dom.backStatus.textContent = dom.body.dataset.cardBack === "custom" ? text('currentCustom') : text('currentDefault');
  dom.backFile.value = "";
  const preview = new Image();
  preview.onload = () => {
    const context = dom.backCanvas.getContext("2d");
    context.clearRect(0, 0, dom.backCanvas.width, dom.backCanvas.height);
    context.drawImage(preview, 0, 0, dom.backCanvas.width, dom.backCanvas.height);
  };
  preview.src = dom.deckPreview.src;
  dom.backDialog.showModal();
}

/** 把选中的本机图片解码到内存;不上传、不写入网络。 */
async function loadBackFile(file) {
  if (!file) return;
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const isRasterImage = file.type.startsWith("image/") || CARD_BACK_IMAGE_EXTENSIONS.has(extension);
  const unsupportedExtension = String.fromCharCode(115, 118, 103);
  if (!isRasterImage || extension === unsupportedExtension || file.type === `image/${unsupportedExtension}+xml`) {
    dom.backStatus.textContent = text('badType');
    return;
  }
  const needsConversion = extension === "heic" || extension === "heif" || file.type === "image/heic" || file.type === "image/heif";
  dom.backStatus.textContent = needsConversion ? text('converting') : text('reading');
  let readableFile = file;
  try {
    if (needsConversion) {
      readableFile = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
    }
    const url = URL.createObjectURL(readableFile);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(text('decodeError')));
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
    backEditor.image = image;
    backEditor.zoom = 1;
    backEditor.offsetX = 0;
    backEditor.offsetY = 0;
    dom.backZoom.value = "1";
    dom.backOffsetX.value = "0";
    dom.backOffsetY.value = "0";
    for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = false;
    dom.applyBack.disabled = false;
    dom.backStatus.textContent = text('readOk')(image.naturalWidth,image.naturalHeight);
    refreshBackPreview();
  } catch (error) {
    dom.backStatus.textContent = error instanceof Error ? error.message : text('readFail');
  }
}

function exportCardBack() {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_BACK_WIDTH;
  canvas.height = CARD_BACK_HEIGHT;
  const context = canvas.getContext("2d");
  context.fillStyle = "#2b3a67";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawBackPreview(context, canvas.width, canvas.height);
  // JPEG 体积可控(约 60–150KB),避免撑爆 localStorage;牌背不需要透明通道。
  return canvas.toDataURL("image/jpeg", 0.86);
}

function saveCardBack() {
  if (!backEditor.image) return;
  const dataUrl = exportCardBack();
  try {
    localStorage.setItem(CARD_BACK_KEY, dataUrl);
  } catch {
    dom.backStatus.textContent = text('storageFull');
  }
  applyCardBack(dataUrl);
  dom.backStatus.textContent = text('backChanged');
  setStatus(text('backChangedStatus'));
  dom.backDialog.close();
}

function resetCardBack() {
  try {
    localStorage.removeItem(CARD_BACK_KEY);
  } catch {
    /* ignore */
  }
  applyCardBack(null);
  backEditor.image = null;
  dom.applyBack.disabled = true;
  for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = true;
  dom.backStatus.textContent = text('backReset');
  setStatus(text('backReset'));
  const preview = new Image();
  preview.onload = () => {
    const context = dom.backCanvas.getContext("2d");
    context.clearRect(0, 0, dom.backCanvas.width, dom.backCanvas.height);
    context.drawImage(preview, 0, 0, dom.backCanvas.width, dom.backCanvas.height);
  };
  preview.src = DEFAULT_CARD_BACK;
}

// ---------- 发牌动画 ----------

function dealAnimation() {
  const sessionId = ++game.sessionId;
  for(const animation of cardFlights.values())animation.cancel();
  cardFlights.clear();
  computeMetrics();
  const deckX = metrics.left + (metrics.cardW + metrics.gap) * 3.5;
  const deckY = metrics.topRowY;
  const order = [];
  for (let row = 0; row < Math.max(...game.state.columns.map(column => column.length)); row++) {
    for (const column of game.state.columns) if (column[row] !== undefined) order.push(column[row]);
  }
  for (const card of game.state.cells) if (card !== null) order.push(card);
  for (let suit = 0; suit < 4; suit++) if (game.state.foundations[suit]) order.push((game.state.foundations[suit] - 1) * 4 + suit);
  for (let card = 0; card < 52; card += 1) {
    const element = cardElements.get(card);
    element.hidden = !order.includes(card);
    element.classList.remove("is-dealing", "is-flying", "is-on-foundation", "is-selected", "is-hint");
    element.classList.add("is-facedown");
    element.style.transition = "none";
    placeCard(element, deckX, deckY, 100 + card);
  }
  // 强制回流,让起始位置生效后再开启过渡。
  void dom.cards.offsetWidth;
  order.forEach((card, index) => {
    const element = cardElements.get(card);
    element.style.transition = "";
    element.classList.add("is-dealing");
    setTimeout(() => {
      if(sessionId!==game.sessionId)return;
      element.classList.remove("is-facedown");
      const position = cardPosition(game.state, card);
      if (position) flyCard(element, position.x, position.y, position.z);
    }, 32 + index * 24);
    setTimeout(() => { if(sessionId===game.sessionId)element.classList.remove("is-dealing"); }, 720 + index * 24);
  });
  dom.body.dataset.dealing = "true";
  setTimeout(() => {
    if(sessionId!==game.sessionId)return;
    dom.body.dataset.dealing = "false";
    render();
    window.dispatchEvent(new Event('freecell:deal-complete'));
  }, 760 + order.length * 24);
  renderSlots();
  renderMeta();
}

// ---------- 事件绑定 ----------

dom.undo.addEventListener("click", undo);
dom.hint.addEventListener("click", showHint);
dom.restart.addEventListener("click", restartLevel);
dom.openLevels.addEventListener("click", () => {
  renderLevelGrid();
  dom.levelDialog.showModal();
});
dom.closeLevels.addEventListener("click", () => dom.levelDialog.close());
dom.openBack.addEventListener("click", openBackDialog);
dom.openBackDialog.addEventListener("click", openBackDialog);
dom.closeBack.addEventListener("click", () => dom.backDialog.close());
dom.backFile.addEventListener("change", () => loadBackFile(dom.backFile.files?.[0]));
dom.backZoom.addEventListener("input", () => { backEditor.zoom = Number(dom.backZoom.value); refreshBackPreview(); });
dom.backOffsetX.addEventListener("input", () => { backEditor.offsetX = Number(dom.backOffsetX.value); refreshBackPreview(); });
dom.backOffsetY.addEventListener("input", () => { backEditor.offsetY = Number(dom.backOffsetY.value); refreshBackPreview(); });
dom.applyBack.addEventListener("click", saveCardBack);
dom.resetBack.addEventListener("click", resetCardBack);
dom.nextLevel.addEventListener("click", goNextLevel);
dom.replayLevel.addEventListener("click", restartLevel);
for (const dialog of [dom.winDialog, dom.levelDialog, dom.backDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

window.addEventListener("resize", () => render());
setInterval(() => {
  if (game.startedAt && !game.won) dom.timer.textContent = formatTime(elapsedMs());
}, 500);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveSession();
});

dom.stuckUndo.addEventListener("click", () => undo());
dom.stuckRestart.addEventListener("click", () => restartLevel());

// ---------- 启动 ----------

const learningBar=document.createElement('section');learningBar.className='learning-bar';learningBar.setAttribute('aria-label',text('spaceLearning'));
document.querySelector('.topbar').after(learningBar);
function renderLearningBar(){
  if(!game.state)return;
  if(game.practice){const lesson=I18N[locale].lessons[game.practice.index];
    learningBar.innerHTML=`<div><strong>${text('practice')(game.practice.index+1)} · ${lesson[0]}</strong><p>${lesson[1]}</p></div><div class="learning-actions"><button type="button" data-learn="retry">${text('retryPractice')}</button><button type="button" data-learn="next" ${game.practice.passed?'':'disabled'}>${game.practice.index===2?text('practiceComplete'):text('nextPractice')}</button><button type="button" data-learn="close">${text('backGame')}</button></div>`;
  }else{
    const collected=game.state.foundations.reduce((sum,count)=>sum+count,0),cells=game.state.cells.filter(card=>card===null).length;
    learningBar.innerHTML=`<div><strong>${text('collected')(collected)}</strong><p>${text('capacity')(cells,maxMovableCount(game.state,false))}</p></div><button type="button" data-learn="start">${text('beginPractice')}</button>`;
  }
}
function loadPracticeStep(index){
  game.practice.index=index;game.practice.passed=false;game.state=lessonState(index);game.selection=null;game.hint=null;
  render();select({type:'column',index:0},LESSONS[index].cards.length);
}
function beginPractice(){
  if(game.practice||game.cascading||game.won||dom.body.dataset.dealing==='true')return;
  saveSession();const elapsed=elapsedMs();
  game.practice={index:0,passed:false,bookmark:{state:game.state,history:game.history,moves:game.moves,elapsed,started:Boolean(game.startedAt)}};
  game.startedAt=null;game.history=[];loadPracticeStep(0);
}
function endPractice(){
  if(!game.practice)return;
  const bookmark=game.practice.bookmark;game.state=bookmark.state;game.history=bookmark.history;game.moves=bookmark.moves;game.elapsedBefore=bookmark.elapsed;
  game.startedAt=bookmark.started?Date.now():null;game.practice=null;game.selection=null;game.hint=null;
  writeJson('freecell.learning.v1',{seen:true});render();saveSession();setStatus(text('returned'));
}
learningBar.addEventListener('click',event=>{
  const action=event.target.closest('[data-learn]')?.dataset.learn;
  if(action==='start')beginPractice();if(action==='close')endPractice();
  if(action==='retry'&&game.practice)loadPracticeStep(game.practice.index);
  if(action==='next'&&game.practice?.passed){if(game.practice.index===2)endPractice();else loadPracticeStep(game.practice.index+1);}
});

dom.body.dataset.cascading = "false";
loadCardBack();
if (restoreSession()) {
  dom.body.dataset.gameState = "playing";
  setStatus(text('restored')(game.level));
  renderMeta();
  dealAnimation();
} else {
  const session = readJson(SESSION_KEY, null);
  const resumeLevel = session?.won && Number.isInteger(session.level) ? Math.min(progress.unlocked, session.level + 1) : progress.unlocked;
  startLevel(Math.max(1, Math.min(LEVEL_COUNT, resumeLevel)), { deal: true });
}
applyLocale({announce:false});
addEventListener('message',event=>{let parentOrigin='';try{parentOrigin=new URL(document.referrer).origin;}catch{}if(event.source!==window.parent||!parentOrigin||event.origin!==parentOrigin||event.data?.type!=='forge:locale'||!LOCALES.has(event.data.locale)||event.data.locale===locale)return;locale=event.data.locale;for(const [card,element]of cardElements)element.setAttribute('aria-label',localizedCardName(card));applyLocale();});

// 测试与调试钩子:只读状态、按规则执行移动、求解当前局面。不暴露任何跳过规则的捷径。
window.__freecell = {
  getState: () => JSON.parse(JSON.stringify(game.state)),
  getMeta: () => ({ level: game.level, moves: game.moves, won: game.won, unlocked: progress.unlocked, historyLength: game.history.length,practice:game.practice?{index:game.practice.index,passed:game.practice.passed}:null }),
  validateMove: (move) => validateMove(game.state, move),
  solve: (options) => solve(game.state, options),
  cardLabel,
};
if(!readJson('freecell.learning.v1',null))window.addEventListener('freecell:deal-complete',()=>setTimeout(()=>{if(!game.moves&&!game.won)beginPractice();},200),{once:true});
