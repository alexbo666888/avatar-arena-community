# 上传 GitHub

本目录是可公开的免费版。完整版位于另一个私有目录，**不要上传父目录、完整版目录或它的 Git 历史**。

## 最简单：上传整理好的文件

1. 打开 GitHub，用你的账号创建空仓库，建议名称 `avatar-arena-community`，选择 Public。
2. 解压交付的 `avatar-arena-community-v0.1.0.zip`。
3. 点击 uploading an existing file 或 Add file → Upload files，将解压后内层目录的文件和子目录拖入，包括 README、LICENSE、assets、docs。README 应在仓库根目录。
4. 检查页面上没有 `.venv`、profile、日志、真实观众数据和完整版文件后提交。
5. 仓库简介可填：「观众头像红蓝角斗场：抖音直播互动、3D 徒手战斗，Windows 本地运行。作者大雨。」

GitHub 网页上传有数量和单文件大小限制；若浏览器拒绝文件夹或漏传隐藏文件，使用下面的 Git 方式。不要只上传 ZIP 到源码根目录，否则用户无法直接浏览源码与教程。ZIP 可作为 Release 附件。

## 使用 Git

仅在本免费版目录执行。把占位内容替换成你的实际 GitHub 信息，不要原样执行：

```powershell
git init
git config user.name "你的 GitHub 名称"
git config user.email "你的 GitHub 已验证邮箱或 noreply 邮箱"
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "Release community edition v0.1.0"
git branch -M main
git remote add origin https://github.com/你的用户名/avatar-arena-community.git
git push -u origin main
```

未自动替你设置 Git 身份、创建仓库、提交或推送。

## 以后重新打包

运行 `python release.py`。只打包 PUBLIC_FILES.txt 中列出的公开文件，输出到 dist，含 SHA256 校验值；不会复制本机环境、登录资料、运行日志和用户数据。新增可公开文件后应人工审核并更新白名单。

## 许可证边界

本公开版 MIT 许可允许使用、修改与再分发，因此不能承诺别人无法移除广告或自行扩展功能。收费完整版的保护来自不发布独有实现，而不是免费版源码里的“隐藏开关”。保留上游版权、LICENSE、NOTICE 及第三方许可。
