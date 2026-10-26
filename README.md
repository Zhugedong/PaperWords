# PaperWords

面向英文论文阅读的 Windows 桌面应用。将 PDF 阅读、划选翻译、查词、笔记和词汇复习放在同一个工作台中。

## 功能

- PDF 导入、滚轮连续阅读、按需渲染、页码跳转、缩放和阅读页码记忆。
- 划选后自动分段翻译，支持翻译本页、翻译全文、进度和停止；支持 Windows 本机英语朗读、关联原文的笔记和生词收藏。
- 根据论文前两页关键词在本机推测领域，可在右侧手动修改并按文献保存。
- 配置兼容 Chat Completions 的模型后，结合领域、论文背景与附近原文进行学术翻译和精读。
- ECDICT 本地英汉词典，联网补充英文释义与例句。
- 9 本单词书：中考、高考、四六级、考研、雅思、托福、GRE、学术阅读基础；支持学习和到期复习。
- 本机英文 OCR、五种可切换主题、收藏 JSON 导出。

## 开发运行

需要 Node.js、npm，以及用于构建和运行的 Windows 环境。朗读依赖 Windows 英语语音。

```powershell
npm ci
npm start
```

首次安装依赖需要联网下载 Electron。随源码提供词典、词书和英文 OCR 模型资源。

## 构建

```powershell
npm run pack
```

构建入口为 `scripts/build.ps1`，生成 `release/PaperWords.exe` 及 `release/win-unpacked/`。启动器依赖旁边的 `win-unpacked` 目录，请一起保留。构建还需要 Windows .NET Framework C# 编译器，详见构建脚本。

克隆源码后可直接通过 `npm start` 使用；根目录的 `启动PaperWords.cmd` 用于启动已经构建的程序。

## 模型与数据

在应用「设置」中填写接口基础地址、模型名称和密钥。密钥仅保留在当前窗口，不写入项目配置。远程模型地址要求 HTTPS，本机服务允许 HTTP。

未配置模型时，划选翻译调用 MyMemory；单词可使用 Free Dictionary API 补充释义与例句。配置模型后，划选会向指定服务发送选文、所选领域以及部分论文背景和上下文。主动点击「翻译全文」会将整篇论文文字分段发送到对应服务；仅支持文字层，扫描页需先 OCR。可停止后续请求，失败或停止时保留已有译文。领域自动识别在本机完成，属于关键词推测，可以手动纠正。

开发运行的个人资料位于 `data/`；便携版本位于 `release/data/`。其中包含个人文献、笔记、收藏和复习进度，请自行备份。这些目录均排除在 Git 跟踪之外。

## 单词书与资源

考试词书按照 ECDICT 的原始标签整理，并非考试机构发布的官方完整词表。学术阅读基础词书由本项目整理，释义来自 ECDICT。

重新生成词书：

```powershell
node scripts/prepare-books.cjs
```

第三方资源来源及许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。更完整的使用方法见 [使用说明.md](使用说明.md)。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `main.js` / `preload.js` | Electron 主进程、本地数据与 IPC |
| `app.js` / `index.html` | 阅读工作台 |
| `continuous-reader.js` | PDF.js 连续阅读、页面懒加载和滚动定位 |
| `academic.cjs` / `academic-ui.js` | 论文领域识别和学术翻译 |
| `dictionary.js` / `books.js` | 查词学习与单词书 |
| `theme.js` / `themes/` | 主题切换和配色 |
| `assets/` | 本地词典、词书及 OCR 资源 |
| `scripts/` | 构建和资源处理脚本 |
