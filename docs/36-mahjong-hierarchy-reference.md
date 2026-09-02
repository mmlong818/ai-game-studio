# 月港雀旅：麻将接龙层级与选择反馈基线

核对日期：2026-08-29

## 研究依据

- MobilityWare 官方规则：牌阵由多层正面牌组成；自由牌必须能向左或向右移出，上方有牌时不可选。其产品页明确采用两次触摸完成配对。
  - https://mobilityware.helpshift.com/hc/en/37-mahjong/faq/2371-what-are-the-rules-of-mahjong/
  - https://www.mobilityware.com/mahjong/
- Microsoft Mahjong 官方页面：成熟产品把提示、洗牌、撤销、缩放、难度和多牌阵作为辅助系统，不改变基础层级判读规则。
  - https://www.xbox.com/en-US/games/store/microsoft-mahjong/9WZDNCRFHWCP
  - https://play.google.com/store/apps/details?id=com.microsoft.mahjong
- Mahjong Titan 商店页面：以大牌面、竖屏优化、高清图形和多牌阵为产品重点。
  - https://play.google.com/store/apps/details?id=com.kristanix.android.mahjongsolitairetitan
- Whatajong 开源仓库：只参考麻将接龙与肉鸽结合的工程组织；许可证为 MIT，没有复制其视听资产。
  - https://github.com/masylum/whatajong
- Refero 交互样本：研究了 70 张移动端拼图、网格选择与卡片状态页面，并深读 6 张。Apple News Crossword 的选中格保持网格几何不变，以底色表达选择；Quartiles 和 Grid Master 也保持单元尺寸稳定，以内框、颜色或局部标记表达当前状态。
  - Apple News Crossword：`43c5b37e-bce5-42ad-8c96-f97c3fc45058`、`b9388288-ab15-4550-ae21-cd4dc94d0cdc`、`cd3a6279-cdc9-4cbb-b0d4-88f27085d83b`
  - Apple News Quartiles：`752ee02b-514e-439c-a55d-3f40316ab224`
  - Abode Grid Master：`855caa3f-cd9b-45e1-bb08-f3cbe5bbbb03`、`de698215-48be-4839-9231-bb8a52e2b2c8`

## 固定设计规则

1. **层级先于状态。** 同层牌保持接近实体牌的稳定间距；只有更高的 `z` 层使用位置偏移。牌体厚度、侧边明暗、接触阴影和遮挡共同表达真实堆叠。
2. **点击不改变几何。** 选中前后 `x`、`y`、`width`、`height` 和命中区域必须完全相同；禁止抬升、缩放和重新排版。
3. **状态各用一种信号。** 自由牌保持完整亮度；被覆盖牌降低饱和度和亮度；提示或可配对目标使用金色角标；已选中牌使用青绿内框和确认点。
4. **不要给所有可操作牌粗描边。** 这会把“可操作”误读为“已选中”，也会淹没牌体层级。自由牌以正常亮面为主，只保留克制的实体边线。
5. **键盘焦点按输入方式出现。** 开局自动聚焦画布时不显示虚线选中框；用户实际按方向键导航后才显示键盘焦点，触摸或鼠标输入会立即清除该焦点样式。
6. **被覆盖原因保留在交互反馈。** 不在每张牌上覆盖大号“被压”标签；点击不可用牌时通过状态文字说明“上方覆盖、两侧封闭或规则封锁”。

## v29 验证结果

- 390×844 与 1280×720 两档真实浏览器检查均通过。
- 点击同一张自由牌前后矩形完全一致；`selectionChangesGeometry=false`。
- 开局同时存在自由牌、被覆盖牌和两个 `z` 层；页面无横向或纵向溢出，控制台及资源请求无错误。
- 阶段 E 自动检查真实完成 3 局、触发 2 次失败并验证刷新恢复。

