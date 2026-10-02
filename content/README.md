# 个人主页笔记库

用 Obsidian 的“打开文件夹作为仓库”选择这个 content 文件夹。六个频道各有一个文件夹：blog、thoughts、about、gallery、projects、thinking。

## 写一篇文章

在对应频道新建 .md 文件，复制 `_templates/文章模板.md` 的内容。若使用 Obsidian 核心“模板”插件，将模板文件夹设为 `_templates`，再插入模板。

顶部属性示例：

```yaml
---
title: 我的第一篇文章
date: 2026-10-02
summary: 这篇文章的简短介绍。
publish: false
tags:
  - 随笔
---
```

在第二个 `---` 后写 Markdown 正文。准备好时把 publish 改为 true。未设置 publish 或值为 false 的笔记不会生成网页。日期为 YYYY-MM-DD；通常按日期从新到旧排列，可用 order 数字指定优先顺序（数字越小越靠前）。

标题默认取文件名，summary 默认取第一段文字。tags 方便 Obsidian 分类，目前不显示在网站上。文章标题由网页自动显示，正文可从 `##` 小标题开始。

## 图片和链接

图片、PDF 等附件放在 assets 文件夹。文章内使用标准 Markdown 相对路径：

```md
![照片说明](../assets/photo.jpg)
[关于我](../about/关于我.md)
[另一篇文章的小标题](另一篇文章.md#小标题)
```

文件名含空格时使用 URL 编码（如 `%20`）或将目标路径放在尖括号中。网站自动把 .md 链接转换成网页链接，复制公开文章实际引用的附件。被引用的笔记也需要 publish: true，否则构建会提示文件位置。

Obsidian 已配置标准 Markdown 链接、相对路径和 assets 附件目录。支持普通 Markdown、代码块、表格和标题锚点；暂不转换 `[[双链]]`、`![[嵌入]]`、块引用、Dataview、Canvas 或 LaTeX 公式。原始 HTML 作为文本显示。尽量使用标准语法，方便迁移。

可选属性：image 为文章封面（相对路径），imageAlt 为图片说明，href 为相关链接，linkText 为链接按钮文字。

## 预览和发布

在 homepage 目录运行：

```sh
npm run dev
```

打开 http://localhost:8080。Obsidian 保存后刷新网页，Markdown 和附件变化会自动重新生成页面。

确认后执行：

```sh
npm run deploy
```

发布仍需这条命令，Obsidian 保存本身不会更新线上网站。README、模板、Obsidian 设置以及未发布的笔记不会出现在网站的 dist 发布目录中。

草稿仍是本地源码的一部分；git add content 并推送到公开仓库会把草稿源码公开。只想本地保存的私人笔记请放在另一个笔记库。

## 迁移

直接复制 content 文件夹即可保留正文、YAML 属性和附件，不需要导出专有格式。channels.json 只记录频道标题和介绍，正文已全部迁移到 .md 文件。移动或重命名文件可能改变文章网址。
