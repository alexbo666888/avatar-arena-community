# 免费体验版验证记录

验证日期：2026-11-02。仅记录本次实际执行结果，不以完整版的旧测试替代免费版测试。

## 环境与安装

- Windows 本机，Python 3.12.14、Node.js 24.20.0、pywebview 6.2.1、现有 WebView2 Runtime。
- 从空的免费版 `.venv` 开始，通过 `setup.ps1 -PythonExe ...` 创建独立环境并安装 requirements-local.txt 全部依赖，退出码 0。
- `pip check`：No broken requirements found。
- 本机默认 `python` 为 3.14，`py` 没有注册 3.12，因此本次指定已安装的 Python 3.12 路径。安装脚本支持 `py`、PATH 中的 Python、已有 uv 和显式 `-PythonExe`；未在另一台全新 Windows 上验收。

## 已通过

| 验证 | 结果 |
| --- | --- |
| `node --test --test-reporter=spec *.test.mjs test-bridge-ports.mjs` | 44 通过，0 失败 |
| `python -X utf8 -m unittest -v test_scene_relay test_public_server` | 6 通过，0 失败 |
| `test_desktop.py` | 退出码 0；真实 WebView2 中完成头像渲染、徒手出兵、暂停、回合结算及横竖屏传输 |
| 横屏小窗 1280×720 | 3 秒采样新增 87 帧 |
| 竖屏小窗 1080×1920 | 3 秒采样新增 87 帧 |
| 桌面页面运行错误 | errors 数组为空 |
| `test_ui.py` | 退出码 0；控制台、教程、功能页、购买页共 4 页通过 |
| 联系入口 | 作者、微信、完整版页签、教程新窗口链接正确；复制成功/拒绝两种反馈均已模拟验证 |
| 页面截图 | 已检查主控制台和购买页实机截图，测试宽度下无横向溢出 |
| 本地数据访问 | profile、日志、缓存、Python 文件与目录列表不可通过静态服务读取 |
| 免费版范围 | 固定礼物全部徒手；不存在个人榜单方法和 Python 存储接口；传入额外武器或礼物配置不会启用完整版实现 |

复制测试用受控剪贴板接口验证按钮反馈，没有改写用户真实系统剪贴板。帧数仅代表短时本机样本，不能视为满场持续性能承诺。

## 发布边界

公开包使用 PUBLIC_FILES.txt 白名单打包，排除 `.venv`、`.git`、profile、日志、缓存、榜单、导出文件与原始测试报告。docs 中截图只来自虚构观众演示。保留 MIT、来源说明及 Three.js 许可。

## 尚未验证

- 真实抖音账号登录、评论和礼物的完整收取、连击数量及真实头像身份。
- OBS 实际采集、录制与直播推流。
- 长时间 120 人满场运行、所有显卡与 Windows 设备兼容性。
- GitHub 远程发布；本次仅准备源码和发布 ZIP，没有创建仓库或推送。
