const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')
const MarkdownIt = require('markdown-it')

const attachmentTypes = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.pdf', '.mp3', '.wav', '.ogg', '.mp4', '.webm', '.txt', '.csv'])
const urlPath = file => file.split('/').map(encodeURIComponent).join('/')
const headingId = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section'

function parseNote(source, file) {
    source = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
    if (!source.startsWith('---\n')) return { metadata: {}, body: source }
    const end = source.indexOf('\n---', 4)
    if (end < 0 || !/^\n---(?:\n|$)/.test(source.slice(end))) throw new Error(`${file}: YAML 属性没有以 --- 结束`)
    const metadata = yaml.load(source.slice(4, end), { schema: yaml.CORE_SCHEMA, filename: file }) || {}
    if (typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${file}: 属性必须是 YAML 对象`)
    if (metadata.publish !== undefined && typeof metadata.publish !== 'boolean') throw new Error(`${file}: publish 必须是 true 或 false`)
    return { metadata, body: source.slice(end + 4).replace(/^\n/, '') }
}

function loadContent(contentRoot) {
    const root = fs.realpathSync(path.resolve(contentRoot))
    const definitions = JSON.parse(fs.readFileSync(path.join(root, 'channels.json'), 'utf8'))
    const channels = {}
    const notes = new Map()
    for (const [slug, definition] of Object.entries(definitions)) {
        if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`频道名不合法：${slug}`)
        if (definition.items) throw new Error(`请将 ${slug} 的 JSON 正文迁移为 Markdown 文件`)
        channels[slug] = { ...definition, items: [] }
        const walk = folder => {
            if (!fs.existsSync(folder)) return
            if (fs.lstatSync(folder).isSymbolicLink()) throw new Error(`笔记库不支持符号链接：${folder}`)
            for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
                if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue
                const absolute = path.join(folder, entry.name)
                if (entry.isSymbolicLink()) throw new Error(`笔记库不支持符号链接：${absolute}`)
                if (entry.isDirectory()) { walk(absolute); continue }
                if (!entry.isFile() || !entry.name.endsWith('.md')) continue
                const file = path.relative(root, absolute).split(path.sep).join('/')
                const { metadata, body } = parseNote(fs.readFileSync(absolute, 'utf8'), file)
                if (metadata.publish !== true) continue
                const title = metadata.title || path.basename(file, '.md')
                if (typeof title !== 'string') throw new Error(`${file}: title 必须是文字`)
                const date = metadata.date || ''
                if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)) throw new Error(`${file}: date 请使用 YYYY-MM-DD`)
                if (metadata.order !== undefined && (typeof metadata.order !== 'number' || !Number.isFinite(metadata.order))) throw new Error(`${file}: order 必须是数字`)
                for (const key of ['summary', 'image', 'imageAlt', 'href', 'linkText']) {
                    if (metadata[key] !== undefined && typeof metadata[key] !== 'string') throw new Error(`${file}: ${key} 必须是文字`)
                }
                const output = slug + '/posts/' + file.slice(slug.length + 1).replace(/\.md$/, '.html')
                const note = { file, absolute, output, title, date, body, metadata, channel: slug }
                notes.set(file, note)
                channels[slug].items.push(note)
            }
        }
        walk(path.join(root, slug))
    }
    const attachments = new Map()
    function resolveLink(raw, note, image = false) {
        if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) return raw
        if (raw.startsWith('#')) return '#' + encodeURIComponent(headingId(decodeURIComponent(raw.slice(1))))
        const match = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(raw)
        const targetPath = decodeURIComponent(match[1])
        const absolute = path.resolve(root, targetPath.startsWith('/') ? '.' + targetPath : path.join(path.dirname(note.file), targetPath))
        const file = path.relative(root, absolute).split(path.sep).join('/')
        if (file.startsWith('../') || path.isAbsolute(file) || file.split('/').some(part => part.startsWith('.') || part.startsWith('_'))) throw new Error(`${note.file}: 链接超出公开内容目录：${raw}`)
        const fragment = match[3] ? '#' + encodeURIComponent(headingId(decodeURIComponent(match[3].slice(1)))) : ''
        let target = notes.get(file) || (!path.extname(file) ? notes.get(file + '.md') : undefined)
        if (target) {
            if (image) throw new Error(`${note.file}: 请使用 Markdown 链接引用笔记，笔记嵌入暂不支持`)
            const relative = path.posix.relative(path.posix.dirname(note.output), target.output)
            return urlPath(relative) + (match[2] || '') + fragment
        }
        if (file.endsWith('.md') || !path.extname(file)) throw new Error(`${note.file}: 链接的笔记不存在或没有发布：${raw}`)
        if (!attachmentTypes.has(path.extname(file).toLowerCase())) throw new Error(`${note.file}: 不支持的附件类型：${raw}`)
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`${note.file}: 附件不存在：${raw}`)
        const real = path.relative(root, fs.realpathSync(absolute))
        if (real.startsWith('..') || path.isAbsolute(real) || real.split(path.sep).some(part => part.startsWith('.') || part.startsWith('_'))) throw new Error(`${note.file}: 附件不能链接到笔记库外`)
        attachments.set(file, absolute)
        return urlPath(path.posix.relative(path.posix.dirname(note.output), 'content-assets/' + file)) + (match[2] || '') + fragment
    }
    for (const note of notes.values()) {
        const md = new MarkdownIt({ html: false, linkify: true })
        const seenHeadings = new Map()
        md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
            const label = tokens[index + 1].children?.map(token => token.content).join('') || tokens[index + 1].content
            const base = headingId(label)
            const count = seenHeadings.get(base) || 0
            seenHeadings.set(base, count + 1)
            tokens[index].attrSet('id', base + (count ? '-' + count : ''))
            return self.renderToken(tokens, index, options)
        }
        const tokens = md.parse(note.body, {})
        const visit = list => {
            for (const token of list) {
                if (token.type === 'link_open') token.attrSet('href', resolveLink(token.attrGet('href'), note))
                if (token.type === 'image') {
                    token.attrSet('src', resolveLink(token.attrGet('src'), note, true))
                    token.attrSet('loading', 'lazy')
                }
                if (token.children) visit(token.children)
            }
        }
        visit(tokens)
        note.html = md.renderer.render(tokens, md.options, {})
        const firstParagraph = tokens.find((token, index) => token.type === 'inline' && tokens[index - 1]?.type === 'paragraph_open')
        const text = firstParagraph?.children?.filter(token => ['text', 'code_inline'].includes(token.type)).map(token => token.content).join('') || ''
        note.summary = note.metadata.summary || (text.length > 150 ? text.slice(0, 150) + '…' : text)
        if (note.metadata.image) note.image = resolveLink(note.metadata.image, note, true)
        if (note.metadata.href) {
            if (!md.validateLink(note.metadata.href)) throw new Error(`${note.file}: href 链接不合法`)
            note.href = resolveLink(note.metadata.href, note)
        }
    }
    for (const channel of Object.values(channels)) {
        channel.items.sort((a, b) => (a.metadata.order ?? Infinity) - (b.metadata.order ?? Infinity) || b.date.localeCompare(a.date) || a.file.localeCompare(b.file))
    }
    return { channels, notes, attachments }
}

function buildContent({ contentRoot, outputRoot, templateData, templateRoot }) {
    const content = loadContent(contentRoot)
    const renderer = require('pug')
    const output = path.resolve(outputRoot)
    fs.rmSync(path.join(output, 'content-assets'), { recursive: true, force: true })
    for (const [slug, channel] of Object.entries(content.channels)) {
        const folder = path.join(output, slug)
        fs.rmSync(folder, { recursive: true, force: true })
        fs.mkdirSync(folder, { recursive: true })
        const data = { ...templateData, channels: content.channels, channel, current: slug, rootPrefix: '../' }
        const items = channel.items.map(note => ({ ...note, url: urlPath(path.posix.relative(slug, note.output)) }))
        // Channel cards only show portable text summaries; full Markdown is on each article page.
        fs.writeFileSync(path.join(folder, 'index.html'), renderer.renderFile(path.join(templateRoot, 'channel.pug'), { ...data, channel: { ...channel, items } }))
        for (const note of channel.items) {
            const file = path.join(output, note.output)
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, renderer.renderFile(path.join(templateRoot, 'article.pug'), {
                ...data, note, rootPrefix: '../'.repeat(note.output.split('/').length - 1)
            }))
        }
    }
    for (const [file, source] of content.attachments) {
        const destination = path.join(output, 'content-assets', file)
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.copyFileSync(source, destination)
    }
    return content
}
module.exports = { parseNote, loadContent, buildContent, headingId }
