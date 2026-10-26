# 第三方资源说明

本项目的原创代码与第三方依赖、词典、模型资源分别适用各自的许可证。项目许可证不替代第三方资源的原始许可证。

## ECDICT

- 上游项目：https://github.com/skywind3000/ECDICT
- 用途：本地英汉词典，以及按原始考试标签生成的词书。
- 资源：`assets/dictionary/*.json`、`assets/books/*.json`。
- 已保留原始 MIT 许可和版权声明：`assets/dictionary/ECDICT-LICENSE.txt`。
- 本项目对词库进行分片、筛选和排序；学术阅读基础词表由本项目整理，释义取自词库。

## Tesseract 与英文 OCR

- Tesseract.js：https://github.com/naptha/tesseract.js
- Tesseract 语言模型项目：https://github.com/tesseract-ocr/tessdata
- 用途：本机英文 OCR；随附资源为 `assets/ocr/eng.traineddata.gz`。
- Apache License 2.0 文本见 `assets/ocr/APACHE-2.0.txt`。英文模型文件为既有项目资源，当前工程未记录其精确下载版本和来源分支。

## npm 依赖

Electron、PDF.js、Tesseract.js 等依赖的版本和来源记录在 `package-lock.json`。安装依赖后，其许可证位于各自的 `node_modules` 包中；分发构建产物时，应保留相应的许可证及声明。

## 在线服务

MyMemory 和 Free Dictionary API 是运行时调用的第三方在线服务，本项目未将它们的全部词库作为资源打包。用户自行配置的模型服务由相应服务方提供。
