# 海岛赛车：授权模型源包

2026-09-06 从作者官网下载，用于本项目开发及后续筛选。不是游戏运行目录，不应整包复制到交付产物。

- Car Kit 3.1：https://kenney.nl/assets/car-kit
  - 下载：https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip
- Nature Kit（包内 License 标注 2.1）：https://kenney.nl/assets/nature-kit
  - 下载：https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip

两套包内 License.txt 均标注 CC0，并明确允许个人、教育和商业用途。作者为 Kenney。无需付费；没有下载付费套装或执行包内程序/链接。

使用 `node scripts/prepare-island-models.mjs` 从 OBJ/MTL 和原始调色板生成游戏选用数据。当前选择三辆完整卡丁车、两棵棕榈树、灌木、大小礁石及花，共 9 个模型。转换会将材质/调色板烘焙为顶点色、统一海岛配色、保留车轮命名；生成的 manifest 记录来源 OBJ SHA-256、面数及许可证，许可证副本随游戏分发。

新增资源先核对许可证、来源、轮廓与实际面数，再做输入/动画/性能复核；Three.js 示例授权不能代替示例内第三方模型自身的授权。
