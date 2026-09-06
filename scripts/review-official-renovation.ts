/** Inventory only: library matches and file presence are not quality scores. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { OFFICIAL_GAMES } from '../src/shared/official-games/index.js';
import { integrateGameDesign } from '../src/shared/game-design-knowledge/integrator.js';
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from '../src/shared/game-design-knowledge/catalog.js';
import { searchMechanicAtlas } from '../src/shared/game-design-knowledge/mechanic-atlas.js';
import { generateGameSpec } from '../src/shared/contracts.js';
import { createGameDesignContractForLegacyProject } from '../src/shared/game-design-contract/from-legacy.js';
import { auditGameDesignContract } from '../src/shared/game-design-contract/index.js';
import { migrateLegacyProjectToV11 } from '../src/shared/project-schema/migrate-v1.js';
import { PUZZLE_DESIGN_GUIDELINES } from '../src/shared/game-design-knowledge/puzzle-guidelines.js';

const proposals:Record<string,{change:string;verify:string;queries:string[]}>={
  'star-dream-duel':{change:'保留已确认三模式；复核 AI 恢复价值、意图可读性和单人后段目标组合。',verify:'双方同条件收益对照；正常交换完成不同目标组合；不串模式存档。',queries:['连锁','恢复']},
  snake:{change:'保留已确认顶视资源、食物密度和自由控制；复核路线宽度与长身体后期公平性。',verify:'各章路线空间、实际有效时长和出生安全；不再额外叠加龙头进食变形。',queries:['路径','采集']},
  'polyomino-fit':{change:'保留用户接受的本轮修复；后续审查轮廓课程与后段解法多样性。',verify:'非预设合法解、提示与当前局面一致；正常触屏完成代表关。',queries:['拼块','旋转']},
  'space-shooter':{change:'连续三阶段作战，首关至少120秒、后续180至300秒；只在整关结算后选择下一关强化；Boss 蓄力锁向预告。',verify:'局中无升级选择等待；教学暂停不计时；关后强化生效且重试刷新保留、不重复叠加；锁向后不追踪。',queries:['升级','预警']},
  breakout:{change:'可读回球控角预告；能力砖形成可规划入口；少量剩砖的收尾辅助。',verify:'预测与真实回球同源；能力效果改变清砖策略；教学不消耗能力时长，计时与物理同步。',queries:['弹射','连锁']},
  tetris:{change:'从摆放到双线、井位与暂存的课程；展示可读落点和连消收益，避免只加速。',verify:'不同章节迫使不同摆放策略；无须增加按键；手机暂存不误触硬降。',queries:['消行','暂存']},
  puzzle:{change:'边框—色区—纹理图册课程；成组拼合与贴合反馈，帮助不直接代做。',verify:'图片辨识度和块数分别递进；小屏可识别；恢复后组合关系一致。',queries:['拼图','分组']},
  klotski:{change:'按用户五项门槛重制：20主题题组、3张新入门题、双级帮助、跨庭进度和整关成果；保留旧版对照。',verify:'23基础题及镜像精确可解；整组结算与跨庭恢复；真人首关约2分钟、后续3–5分钟及教学效果尚待验证，未放行。',queries:['滑块','瓶颈']},
  'merge-2048':{change:'闯关与无尽双入口、连续里程碑、可选技巧、方向收益预览、教学返回原局、独立存档和成果结算。',verify:'双端输入、教学返回、刷新撤销、模式隔离与首关128正常通关有专项证据；真人时长及多种子后期胜率待验，未整体放行。',queries:['合并','空间']},
  'block-place':{change:'强化双线规划和候选空间选择；清除预览和无法放置原因即时可见。',verify:'候选公平；预览等于结算；无尽与关卡目标、存档隔离。',queries:['拼块','消除']},
  'region-logic':{change:'按推理技巧组织题册；提示逐层给出排除依据，不用答案高亮替代解释。',verify:'每条提示的行列区域依据真实；唯一解、无需猜测与手机可读性。',queries:['排除','约束']},
  'mahjong-roguelite':{change:'三种牌阵、自由牌开路预览、收益提示、航线成果及独立模式存档；局内选择不误报整关完成。',verify:'312组可解牌阵；双端真实点击航线、遗物并配对完成三段；每日不解锁闯关；全旅程时长待验。',queries:['配对','遗物']},
  freecell:{change:'三个完整合法局面的真实练习、两级线索、可搬运容量与个人成果；练习后返回正式局。',verify:'100副牌可解；双端练习、整局操作、超级移动、撤销、键盘、牌背恢复；短屏不挡工具栏。',queries:['空档','纸牌']},
};
const active=new Set(['mahjong-roguelite','freecell']);
const implemented=new Set(['space-shooter','breakout','tetris','puzzle','region-logic','block-place','klotski','merge-2048','mahjong-roguelite','freecell']);
const retained=new Set(['star-dream-duel','snake','polyomino-fit']);
const root=resolve('dogfood-output/official-renovation-review');
mkdirSync(root,{recursive:true});
const games=OFFICIAL_GAMES.map(game=>{
  const plan=integrateGameDesign({idea:game.domainTemplate.pitch,templateId:game.id,dimensions:game.kind==='three'?'limited-3d':'2d',input:'touch'});
  const proposal=proposals[game.id];
  if(!proposal)throw new Error('Missing renovation proposal: '+game.id);
  const runtime=game.kind==='template'?`src/server/game-runtimes/${game.serverTemplate==='puzzle'?'puzzle-commercial':game.serverTemplate}.ts`:game.kind==='fixture'?`fixtures/${game.id}/app.js`:'src/server/game-artifact.ts';
  const inputs=[runtime,game.referenceDoc,game.cover].filter((path):path is string=>Boolean(path)).map(path=>({path,exists:existsSync(path),sha256:existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null}));
  const candidates=[...new Map(proposal.queries.flatMap(query=>searchMechanicAtlas({query,limit:6}).entries).map(entry=>[entry.id,entry])).values()];
  let contractAudit:unknown={status:'not-run',reason:'固定游戏和3D消费者需走各自合同链路，本脚本不使用2D合同冒充'};
  if(game.kind==='template'){
    try{
      const source={id:'renovation-'+game.id,title:game.title,createdAt:new Date().toISOString(),spec:generateGameSpec({idea:game.seed!.idea,template:game.serverTemplate,dimensions:'2d'})};
      const contract=createGameDesignContractForLegacyProject({projectId:source.id,title:source.title,idea:game.seed!.idea,createdAt:source.createdAt,spec:source.spec});
      const audit=auditGameDesignContract(migrateLegacyProjectToV11(source),contract);
      contractAudit={status:audit.complete?'structurally-complete':'gaps',audit,contract,boundary:'仅证明设计合同结构完整，不证明已实现、更好玩或运行通过'};
    }catch(error){contractAudit={status:'failed',error:error instanceof Error?error.message:String(error)};}
  }
  return {id:game.id,title:game.title,stage:game.stage??'live',workStatus:implemented.has(game.id)?'implemented-awaiting-playtest':active.has(game.id)?'implementation-in-progress':retained.has(game.id)?'preserve-accepted-version':'design-queued',
    proposal,inputs,contractAudit,knowledge:{plan,mechanicCandidates:candidates},
    puzzleChecklist:active.has(game.id)?PUZZLE_DESIGN_GUIDELINES.filter(item=>item.disposition==='required').map(item=>({...item,status:'requires-evidence'})):[],
    baseline:existsSync(resolve('dogfood-output/renovation-baseline',game.id,'app.js'))?{path:`dogfood-output/renovation-baseline/${game.id}`,boundary:'改造前截图和平台产物；不是已通过质量审核'}:null,
    evaluation:GAME_DESIGN_KNOWLEDGE_LIBRARY.evaluation.dimensions.map(dimension=>({...dimension,status:'unreviewed',score:null,evidence:[]})),
    limitations:['登记精确匹配不是质量得分','候选机制不是已落地功能','文件存在与哈希不是美术质量证明','没有导入旧探针结果充当新版试玩证据'],
  };
});
const report={schemaVersion:'official-renovation-inventory-v1',generatedAt:new Date().toISOString(),evaluationModel:GAME_DESIGN_KNOWLEDGE_LIBRARY.evaluation,games};
writeFileSync(join(root,'review.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# 官方游戏改造审查入口','',`生成时间：${report.generatedAt}`,'','本表使用现有策划整合器、玩法库、独立机制检索和八维评估模型。不是自动打分器；全部体验维度保持未评审，直到有具体的新版证据。','',
  '| 游戏 | 工作状态 | 主动改造方向 | 必须证明 |','| --- | --- | --- | --- |',
  ...games.map(game=>`| ${game.title} | ${game.workStatus} | ${game.proposal.change} | ${game.proposal.verify} |`),
  '','## 交付约束','','- 每次交付同时给出基线问题、玩家可见变化、引用机制、实际验证、未完成项。',
  '- 修 bug、增加文本、测试通过不能单独作为显著质量提升。',
  '- 新版本必须比较至少一种真实决策变化和对应反馈；正常输入检查教学、代表关、结算和恢复。',
  '- 美术按实际用途检查：角色、可交互物、危险、收益。没有生成/更换图片就明确标注沿用。',
  '- 体验评审与技术回归分开；真人样本不足不写留存、好玩率或虚构满意度。',
  '- 不把已有独立机制进行组合后重复计数，也不为单款游戏改动其他游戏的默认规则。','',
  ...games.flatMap(game=>[`## ${game.title}`,'',`玩法库：${game.knowledge.plan.selectedPatternId??'待研究'}；整合状态：${game.knowledge.plan.status}。`,
    `组合约束：${game.knowledge.plan.compositionRules.join('；')||'待明确'}。`,
    `候选机制：${game.knowledge.mechanicCandidates.map(entry=>`${entry.label} (${entry.id})`).join('、')||'无检索命中，需要明确检索或研究'}。`,
    `已知风险：${game.knowledge.plan.knownRisks.join('；')||'待专项审核'}。`,'']),
];
writeFileSync(join(root,'review.md'),lines.join('\n'));
console.log(`Reviewed inventory: ${games.length} games; active implementation: ${games.filter(game=>game.workStatus==='implementation-in-progress').length}; quality scores: unreviewed.\n${root}`);
