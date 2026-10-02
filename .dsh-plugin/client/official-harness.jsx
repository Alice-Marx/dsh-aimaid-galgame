import React from 'react'
import { Button, SettingsForm, SettingsFormModel, SettingsValueField, settingsNumberField } from '@deepseek-ai/dsh-client-ui-primitives'
import { GalModulePage, GalPanelIcon } from './gal-module-page.jsx'
import { GAL_CLIENT_REMOTE, GAL_REMOTE_NAMESPACE } from '../shared/gal-remote.mjs'

export const GAL_NAMESPACE = 'dsh-galgame'
export const GAL_PACKAGE = '@ljwei-stak/dsh-galgame'
// Preserve the familiar panel ID after migrating from the combined plugin.
export const GAL_PANEL = 'model-router-gal'
export const inject = ['remote']

const UI_INJECT = ['slots', 'configForms', 'remote', 'remote.session', `remote.${GAL_REMOTE_NAMESPACE}`, 'layout']

export class GalHostSettingsController {
  constructor(scope) {
    const numeric = settingsNumberField('maxReplyCharacters')
    this.form = new SettingsFormModel(scope, [{
      ...numeric,
      parse(text) {
        const write = numeric.parse(text)
        if (write?.kind !== 'set') return write
        return Number.isSafeInteger(write.value) && write.value >= 500 && write.value <= 8_000 ? write : undefined
      },
    }])
    this.store = this.form.bind(() => ({ ...this.form.shell(), maxReplyCharacters: this.form.field('maxReplyCharacters') }))
  }
  inject() { return { hooks: { galHostSettings: this.store }, ...this.form.actions() } }
  dispose() { this.form.dispose() }
}

export function GalBundleSettings(props) {
  const state = props.useGalHostSettings(snapshot => snapshot)
  if (props.view === 'summary') return '独立 Gal 插件：回声之城·正篇与旧城迁移篇。立绘、音乐、阅读和存档设置请在 Gal 设置中调整。'
  return <SettingsForm state={state} onSave={props.save} onDiscard={props.discard} labels={{ unavailable: '插件未加载，暂时无法配置。', readOnly: '当前配置为只读。', saveFailed: '设置没有被保存，请检查后重试。', save: '保存设置', saving: '保存中…' }}>
    <SettingsValueField id="dsh-galgame-reply-characters" label="自由模式最大回复字符数" hint="500–8000；默认 8000。仅限制本轮返回文本，模型仍按实际请求计费。人物、阅读与音乐请在 Gal 设置中调整。" numeric disabled={!state.writable || state.saving} {...state.maxReplyCharacters} overriddenLabel="已覆盖" resetLabel="恢复默认" invalidLabel="请输入 500–8000 的整数。" onEdit={text => props.edit('maxReplyCharacters', text)} onReset={() => props.resetField('maxReplyCharacters')} />
  </SettingsForm>
}

function OpenGalWorkspace({ subject, openPanel }) {
  if (subject?.kind !== 'bundle' || subject.pkg?.name !== GAL_PACKAGE) return null
  return <Button variant="outline" size="sm" type="button" onClick={openPanel}>打开 Gal 模块</Button>
}

export function registerUi(ctx) {
  const galRemote = ctx.remote[GAL_REMOTE_NAMESPACE]
  const card = new GalHostSettingsController(ctx.configForms.get(GAL_NAMESPACE))
  ctx.effect(() => () => card.dispose(), 'dsh-galgame: settings subscription')
  const served = register => ctx.configForms.whileServed([GAL_NAMESPACE], register)
  ctx.effect(() => served(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: GAL_PANEL,
    inject: () => ({
      loadCatalog: () => ctx.remote.session.modelCatalog(),
      galReply: request => galRemote.galReply(request),
      cancelGalReply: requestId => galRemote.cancelGalReply(requestId),
    }),
  }, GalModulePage))), 'dsh-galgame: main workspace')
  ctx.effect(() => served(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: GAL_PANEL, order: 31, label: 'Gal 模块',
  }, GalPanelIcon))), 'dsh-galgame: sidebar entry')
  ctx.effect(() => served(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: GAL_PACKAGE, inject: () => card.inject(),
  }, GalBundleSettings))), 'dsh-galgame: installed bundle settings')
  ctx.effect(() => served(() => ctx.slots.inject('plugins.detail.actions', () => ctx.slots.register({
    name: 'plugins.detail.actions', id: 'dsh-galgame-open-workspace', order: 31,
    inject: () => ({ openPanel: () => ctx.layout.selectPanel(GAL_PANEL) }),
  }, OpenGalWorkspace))), 'dsh-galgame: bundle open action')
}

export async function apply(ctx) {
  const disposeRemote = await ctx.remote.$mount(GAL_CLIENT_REMOTE)
  const ui = ctx.inject(UI_INJECT, registerUi)
  try { await ui } catch (error) {
    await ui.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await disposeRemote()
  }
}
